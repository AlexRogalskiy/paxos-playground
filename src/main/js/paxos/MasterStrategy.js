import {Prepare, Promise, ProposalBuilder, ProposalId} from "./Messages.js";
import {EntryType} from "./Node.js";

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
			if (this._masterId !== undefined) {
				console.log(`Node ${super.id} says: My lease expired while waiting for confirmation, I'm no longer the master`);
				//Reset master but don't start election because there's one in progress already
				this._masterId = undefined;
			}
		} else if (!this._electionsGoingOn() && this._hasLeaseExpired(time)) {
			console.log(`Node ${super.id} says: The lease has expired, we don't have a master anymore`);
			this._leaseExpired();
		}

		if (this.isMaster() && time - this._leaseStartTime >= this._renewLeaseWindow && !this._electionsGoingOn()) {
			// renew lease
			console.log(`Node ${super.id} says: time to renew master lease`);
			this.proposeUpdate(super.id, true);
		}

		super.updateTime(time)
	}

	_electionsGoingOn() {
		return this._proposedLeaseStartTime !== undefined;
	}

	_hasLeaseExpired(time) {
		return ( this._leaseStartTime === undefined || time - this._leaseStartTime >= LEASE_WINDOW );
	}

	proposeUpdate(value, isElectionValue = false) {
		if (isElectionValue) {
			// If I don't know who the master is or trying to update lease
			if (this._masterId === undefined || this.isMaster()) {
				this._startElection();
			}
		} else {
			if (this.isMaster()) {
				super.proposeUpdate(new LogEntry(value, EntryType.APPLICATION_LEVEL))
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

	stop() {
		this._masterId = undefined;
		super.stop();
	}

	resolutionAchieved(resolution) {
		const resolutionEntry = resolution.value;
		// unwrap resolution
		resolution.value = resolutionEntry.value;

		if (resolutionEntry.entryType === EntryType.ELECTION) {
			this._updateLease(resolutionEntry.value);
		}

		super.resolutionAchieved(resolution, resolutionEntry.entryType);

		// master optimizations
		if (this._enableOptimizations && this._masterId !== undefined) {
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
	}

	_startElection() {
		// resetting the time here is a sure way of knowing that it'll time out before any other peer.
		this._proposedLeaseStartTime = this._model.time;
		// proposing myself as master
		super.proposeUpdate(new LogEntry(super.id, EntryType.ELECTION));
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

	_leaseExpired() {
		this._masterId = undefined;
		this._startElection();
	}

};

class LogEntry {
	// _value;
	// _entryType;

	constructor(value, entryType = EntryType.APPLICATION_LEVEL) {
		this._value = value;
		this._entryType = entryType;
	}

	get value() {
		return this._value;
	}

	get entryType() {
		return this._entryType;
	}
}

const LEASE_WINDOW = 200000;