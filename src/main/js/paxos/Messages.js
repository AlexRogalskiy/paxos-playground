let proposalNumber = 0; //Global proposal number. Maybe this is cheating a little bit...

class ProposalId {
	// _proposalNumber;
	// _nodeId;

	constructor(nodeId) {
		this._proposalNumber = proposalNumber++;
		this._nodeId = nodeId;
	}

	static compare(a, b) {
		if (a === undefined) return -1;
		if (b === undefined) return 1;
		const result = a._proposalNumber - b._proposalNumber;
		return result === 0 ? a._nodeId - b._nodeId : result;
	}
}

class Message {
	// _paxosInstanceNumber;
	// _sourceNodeId;
	// _targetNodeId;
	// _proposalId;

	constructor(paxosInstanceNumber, sourceNodeId, targetNodeId, proposalId) {
		this._paxosInstanceNumber = paxosInstanceNumber;
		this._sourceNodeId = sourceNodeId;
		this._targetNodeId = targetNodeId;
		this._proposalId = proposalId;
	}


	get sourceNodeId() {
		return this._sourceNodeId;
	}

	get targetNodeId() {
		return this._targetNodeId;
	}

	get proposalId() {
		return this._proposalId;
	}

	get paxosInstanceNumber() {
		return this._paxosInstanceNumber;
	}
}

class MessageWithValue extends Message {
	// _value;

	constructor(paxosInstanceNumber, sourceNodeId, targetNodeId, proposalId, value) {
		super(paxosInstanceNumber, sourceNodeId, targetNodeId, proposalId);
		this._value = value;
	}

	get value() {
		return this._value;
	}
}

class Prepare extends Message {

	constructor(paxosInstanceNumber, sourceNodeId, targetNodeId, proposalId) {
		super(paxosInstanceNumber, sourceNodeId, targetNodeId, proposalId);
		this._sourceNodeId = sourceNodeId;
		this._targetNodeId = targetNodeId;
	}
}

class Promise extends Message {
	// _lastAcceptedProposalId;
	// _lastAcceptedValue;

	constructor(paxosInstanceNumber, prepare, lastAcceptedProposalId, lastAcceptedValue) {
		// invert message source and target
		super(paxosInstanceNumber, prepare.targetNodeId, prepare.sourceNodeId, prepare.proposalId);
		this._lastAcceptedProposalId = lastAcceptedProposalId;
		this._lastAcceptedValue = lastAcceptedValue;
	}

	get lastAcceptedProposalId() {
		return this._lastAcceptedProposalId;
	}

	get lastAcceptedValue() {
		return this._lastAcceptedValue;
	}
}

class Accept extends MessageWithValue {
	constructor(paxosInstanceNumber, sourceNodeId, targetNodeId, proposalId, value) {
		super(paxosInstanceNumber, sourceNodeId, targetNodeId, proposalId, value);
	}
}

class Accepted extends MessageWithValue {
	constructor(accept, targetId) {
		// invert message source and target
		super(accept.paxosInstanceNumber, accept.targetNodeId, targetId, accept.proposalId, accept.value);
	}
}

class Resolution extends MessageWithValue {
	constructor(accepted) {
		// invert message source and target
		super(accepted.paxosInstanceNumber, accepted.targetNodeId, accepted.sourceNodeId, accepted.proposalId, accepted.value);
	}
}

class SyncRequest extends Message {
	//The paxos instance number used here is the latest one the node requesting sync knows about
	constructor(paxosInstanceNumber, sourceNodeId, targetNodeId) {
		super(paxosInstanceNumber, sourceNodeId, targetNodeId);
	}
}

class CatchUp extends Message {
	// _missingLogEntries;

	//The paxos instance number used here is the latest one the node answering sync knows about
	constructor(syncRequest, latestPaxosInstanceNumber, missingLogEntries) {
		// invert message source and target
		super(latestPaxosInstanceNumber, syncRequest.targetNodeId, syncRequest.sourceNodeId);
		this._missingLogEntries = missingLogEntries;
	}

	get missingLogEntries() {
		return this._missingLogEntries;
	}
}

//TODO support NACK??

export {ProposalId, Prepare, Promise, Accept, Accepted, Resolution, SyncRequest, CatchUp};