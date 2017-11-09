let proposalNumber = 0; //Global proposal number. Maybe this is cheating a little bit...

class ProposalId {
	_proposalNumber;
	_nodeId;

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
	_sourceNodeId;
	_targetNodeId;
	_proposalId;

	constructor(sourceNodeId, targetNodeId, proposalId) {
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
}

class Prepare extends Message {

	constructor(sourceNodeId, targetNodeId, proposalId) {
		super(sourceNodeId, targetNodeId, proposalId);
		this._sourceNodeId = sourceNodeId;
		this._targetNodeId = targetNodeId;
	}
}

class Promise extends Message {
	_lastAcceptedProposalId;
	_lastAcceptedValue;

	constructor(prepare, lastAcceptedProposalId, lastAcceptedValue) {
		// invert message source and target
		super(prepare.targetNodeId, prepare.sourceNodeId, prepare.proposalId);
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

/**
 * aka Accept
 */
class Accept extends Message {
	_value;

	constructor(sourceNodeId, targetNodeId, proposalId, value) {
		super(sourceNodeId, targetNodeId, proposalId);
		this._value = value;
	}

	get value() {
		return this._value;
	}
}

/**
 * aka Accepted
 */
class Accepted extends Accept {
	constructor(accept) {
		// invert message source and target
		super(accept.targetNodeId, accept.sourceNodeId, accept.proposalId, accept.value);
	}
}

//TODO support NACK??
//TODO support Resolution? (Optional message used to indicate that the final value has been selected)

export {ProposalId, Prepare, Promise, Accept, Accepted};