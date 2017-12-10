import {Accept, Prepare, ProposalBuilder, ProposalId} from "./Messages.js";

class Proposer {
	// _isLeader; //this represents the node belief. Might be inaccurate
	// _cluster;
	// _nodeId;
	// _currentProposal;
	// _acceptSent;
	// _paxosInstanceNumber;
	// _messageHandler;

	constructor(messageHandler, paxosInstanceNumber, cluster, nodeId, proposalBuilder) {
		this.messageHandler = messageHandler;
		this._paxosInstanceNumber = paxosInstanceNumber;
		this._nodeId = nodeId;
		this._cluster = cluster;
		this._proposalBuilder = proposalBuilder;
		this._currentProposal = undefined;
		this._acceptSent = false;
	}

	proposeUpdate(value) {
		if (this._proposedValue === undefined) {
			this._proposedValue = value;
		} else {
			console.log(`You already proposed value ${this._proposedValue} for paxos instance ${this._paxosInstanceNumber}`)
		}
	}

	prepare(broadcast = true) {
		const isMasterProposal = !broadcast;
		const proposal = new Proposal(this.messageHandler, this._paxosInstanceNumber, this._nodeId,
			this._cluster, this._proposalBuilder, isMasterProposal);
		this._currentProposal = proposal;
		const prepareMsgs = proposal.buildPrepareMessages();

		if (broadcast) {
			proposal.broadcastPrepare(prepareMsgs);
		}

		return prepareMsgs;
	}


	handlePromise(promise, broadcast = true) {
		if (promise.proposalId !== this._currentProposal.proposalId) {
			console.log(`Ignoring received promise ${promise.proposalId.toString()} as it does not match the current 
				proposal ${this._currentProposal.proposalId}`);
			return
		}

		this._currentProposal.registerPromise(promise);
		if (this._currentProposal.isPrepared() && !this._acceptSent) {
			this._acceptSent = true;
			if (broadcast) {
				this._currentProposal.broadcastAccept(this._proposedValue);
			}
		}
	}

	//This should be called only when you're the master
	broadcastAccept() {
		this._currentProposal.broadcastAccept(this._proposedValue);
	}

	get proposedValue() {
		return this._proposedValue;
	}
}

class Proposal {
	// _nodeId;
	// _proposalId;
	// _participantAcceptors;
	// _promisesMap;
	// _quorum;
	// _paxosInstanceNumber;
	// _messageHandler;

	constructor(messageHandler, paxosInstanceNumber, nodeId, cluster, proposalBuilder, isMasterProposal) {
		this.messageHandler = messageHandler;
		this._paxosInstanceNumber = paxosInstanceNumber;
		this._nodeId = nodeId;
		this._proposalId = isMasterProposal ? ProposalBuilder.buildMasterProposalId(nodeId) : proposalBuilder.buildProposal(nodeId);
		this._participantAcceptors = cluster.acceptors;
		this._promisesMap = new Map();
		this._quorum = cluster.quorum;
	}

	registerPromise(promise) {
		const sourceNodeId = promise.sourceNodeId;
		if (!this._isSourceNodePartOfTheProposal(sourceNodeId)) {
			console.log(`Source node ${sourceNodeId} is not part of the proposal`);
			return
		}

		this._promisesMap.set(sourceNodeId, promise)
	}

	isPrepared() {
		return this._promises().length >= this._quorum;
	}

	buildPrepareMessages() {
		return Array.from(this._participantAcceptors, acceptor => {
			return new Prepare(this._paxosInstanceNumber, this._nodeId, acceptor.id, this._proposalId);
		})
	}

	broadcastPrepare(prepareMsgs) {
		prepareMsgs.forEach(prepare => this.messageHandler.send(prepare))
	}

	broadcastAccept(proposedValue) {
		this._participantAcceptors.forEach(acceptor => {
			const prepare = new Accept(this._paxosInstanceNumber, this._nodeId, acceptor.id, this.proposalId,
				this._calculateProposalValue(proposedValue));
			this.messageHandler.send(prepare);
		})
	}

	_isSourceNodePartOfTheProposal(sourceNodeId) {
		if (!this._participantAcceptors.some((acceptor) => acceptor.id === sourceNodeId)) {
			console.log(`Node ${sourceNodeId} is not part of this proposal`);
			return false
		}

		return true
	}

	_promises() {
		return Array.from(this._promisesMap.values())
	}

	_calculateProposalValue(proposedValue) {
		if (!this.isPrepared) {
			console.log(`Proposal is not prepared yet. You shouldn't care about the value.`);
			return
		}

		const everyoneRepliedNull = this._promises()
			.every(promise => promise.lastAcceptedValue === undefined);
		if (everyoneRepliedNull) {
			return proposedValue;
		} else {
			// use the one from the highest proposalId number seen
			const highestPromiseSeen = this._promises()
				.sort((a, b) => ProposalId.compare(a.lastAcceptedProposalId, b.lastAcceptedProposalId))
				.reverse()
				[0];

			return highestPromiseSeen.lastAcceptedValue;
		}
	}

	get proposalId() {
		return this._proposalId;
	}
}

export default Proposer;