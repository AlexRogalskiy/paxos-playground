import {Accept, Accepted, Prepare, Promise, ProposalBuilder, ProposalId, Resolution} from "./Messages.js";
import {EntryType} from "./LogEntry.js";
import {Role} from "./Node.js";


export const MasterMixin = (nodeClass) => class extends nodeClass {
	// mixins should either:
	//   a) not define a constructor,
	//   b) require a specific constructor signature
	//   c) pass along all arguments.
	constructor(id, roles, model, enableOptimizations) {
		super(id, roles, enableOptimizations);
		this._model = model;
		this._masterId = undefined;
		this._leaseStartTime = undefined;
		this._proposedLeaseStartTime = undefined;
		this._enableOptimizations = enableOptimizations;
		this._renewLeaseWindow = enableOptimizations ? 160000 : 120000;
	}

	updateTime(time) {
		if (this._electionsGoingOn() && this._hasLeaseExpired(time)) {
			if (this._masterId !== undefined && this.isMaster()) {
				console.log(`Node ${super.id} says: My lease expired while waiting for confirmation, I'm no longer the master`);
				//Reset master but don't start election because there's one in progress already
				this._masterId = undefined;
			}
		} else if (!this._electionsGoingOn() && this._hasLeaseExpired(time)) {
			console.log(`Node ${super.id} says: The lease has expired, we don't have a master anymore`);
			this.leaseExpired();
		}

		if (this.isMaster() && time - this._leaseStartTime >= this._renewLeaseWindow && !this._electionsGoingOn()) {
			// renew lease
			this.renewLease();
		}

		super.updateTime(time)
	}

	renewLease() {
		console.log(`Node ${super.id} says: time to renew master lease`);
		this.proposeUpdate(super.id, EntryType.ELECTION);
	}

	_electionsGoingOn() {
		return this._proposedLeaseStartTime !== undefined;
	}

	_hasLeaseExpired(time) {
		return ( this._leaseStartTime === undefined || time - this._leaseStartTime >= LEASE_WINDOW );
	}

	proposeUpdate(value, entryType = EntryType.APPLICATION_LEVEL) {
		if (entryType === EntryType.ELECTION) {
			// If I don't know who the master is or trying to update lease
			if (this._masterId === undefined || this.isMaster()) {
				this._startElection();
			}
		} else {
			if (this.isMaster()) {
				super.proposeUpdate(value, entryType)
			} else {
				console.log(`Node ${super.id} says: Ignoring client requests. Current leader is ${this._masterId}`)
			}
		}
	}

	isMaster() {
		return this._masterId === super.id;
	}

	handlePrepare(prepare) {
		// drop non-master requests
		if (this._masterId !== undefined && prepare.sourceNodeId !== this._masterId) return;

		super.handlePrepare(prepare);
	}

	handleAccept(accept) {
		// drop non-master requests
		if (this._masterId !== undefined && accept.sourceNodeId !== this._masterId) return;

		super.handleAccept(accept);
	}

	handleAccepted(accepted) {
		if (!this._enableOptimizations || this.isMaster() || this._masterId === undefined) {
			super.handleAccepted(accepted)
		} else {
			if (accepted.sourceNodeId === this._masterId) {
				//trust whatever the master says
				this._trustMasterHandleAccepted(accepted);
			}
		}
	}
	_trustMasterHandleAccepted(accepted) {
		if (super.isDown()) return;
		if (!super.roles.includes(Role.LEARNER)) return;
		if (!this.isFromCurrentPaxosInstance(accepted)) return;

		//trust whatever the master says
		const resolution = new Resolution(accepted);
		this.resolutionAchieved(resolution);
	};

	broadcastAccepted(accept) {
		if (!this._enableOptimizations || this._masterId === undefined) {
			super.broadcastAccepted(accept);
		} else {
			// answer only to the designated learner -> aka the master
			const accepted = new Accepted(accept, this._masterId);
			this.messageHandler.send(accepted);
		}
	}

	stop() {
		this._leaseStartTime = undefined;
		this._proposedLeaseStartTime = undefined;
		this._masterId = undefined;
		super.stop();
	}

	resolutionAchieved(resolution) {
		const resolutionEntry = resolution.value;

		if (this._enableOptimizations && this.isMaster()) {
			this._notifyNonLeaderLearners(resolution);
		}

		if (resolutionEntry.entryType === EntryType.ELECTION) {
			this._updateLease(resolutionEntry.value);
		}

		super.resolutionAchieved(resolution);

		// master optimizations
		if (this._enableOptimizations && this._masterId !== undefined) {
			this._doPhase1Optimizations();
		}
	}

	_doPhase1Optimizations() {
		if (this.isMaster()) {
			//call prepare on me but don't broadcast
			const prepareMsgs = super.prepare(false);

			// synthesize Promise messages from other nodes
			prepareMsgs.forEach(prepare => {
				if (ProposalId.compare(prepare.proposalId, ProposalBuilder.buildMasterProposalId(super.id)) !== 0) {
					throw Error('The prepared proposal does not match with the master proposal id')
				}
				const promise = new Promise(super.paxosInstanceNumber, prepare, undefined, undefined);
				super.handlePromise(promise, false)
			});
		} else {
			// synthesize Prepare from master node
			const proposalId = ProposalBuilder.buildMasterProposalId(this._masterId);
			const prepare = new Prepare(super.paxosInstanceNumber, this._masterId, super.id, proposalId);
			super.handlePrepare(prepare, false)
		}
	}

	_notifyNonLeaderLearners(resolution) {
		const learners = this._cluster.learners;
		learners
			.filter(learner => learner.id !== this.id)
			.forEach(learner => {
				//reconstruct accept
				const accept = new Accept(resolution.paxosInstanceNumber, undefined, this.id, resolution.proposalId, resolution.value);
				const accepted = new Accepted(accept, learner.id);
				this.messageHandler.send(accepted);
			});
	}

	_startElection() {
		// resetting the time here is a sure way of knowing that it'll time out before any other peer.
		this._proposedLeaseStartTime = this._model.time;
		// proposing myself as master
		super.proposeUpdate(super.id, EntryType.ELECTION);
	}

	_updateLease(leaderNodeId) {
		console.log(`Lease granted. New master is: ${leaderNodeId}`);

		this._masterId = leaderNodeId;

		if (!this.isMaster()) {
			// If I'm not the master reset timer
			this._leaseStartTime = this._model.time;
		} else {
			// make the proposed lease start time effective
			this._leaseStartTime = this._proposedLeaseStartTime;
		}

		this._proposedLeaseStartTime = undefined;
	}

	handleSyncRequest(syncRequest) {
		super.handleSyncRequest(syncRequest, this._masterId);
	}

	handleCatchup(catchUp) {
		if (this.isDown()) return;
		if (catchUp.paxosInstanceNumber <= super.paxosInstanceNumber) return;

		super.doCatchup(catchUp.paxosInstanceNumber, catchUp.missingLogEntries, catchUp.cluster);

		this._masterId = catchUp.masterId;
	}

	leaseExpired() {
		this._masterId = undefined;
		this._startElection();
	}

	get masterId() {
		return this._masterId;
	}

	get leaseStartTime() {
		return this._leaseStartTime;
	}

};

export const LEASE_WINDOW = 200000;