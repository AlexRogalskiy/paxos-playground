/**
 * This class listens to Accepted messages, determines when the final value is
 * selected, and tracks which peers have accepted the final value.
 */

class Learner {
	_proposalMap;
	_cluster;
	_lastAcceptedProposalsMap; // nodeId -> lastAcceptedProposalId

	_finalValue;
	_finalProposalId;

	constructor(cluster) {
		this._cluster = cluster;
		this._proposalMap = new Map();
		this._lastAcceptedProposalsMap = new Map();
		this._finalValue = undefined;
	}

	/**
	 * Called when an Accepted message is received from an acceptor. Once the final value
	 * is determined, the return value of this method will be a Resolution message containing
	 * the consentual value. Subsequent calls after the resolution is chosen will continue to add
	 * new Acceptors to the final_acceptors set and return Resolution messages.
	 *
	 * @param accepted: the accepted message
	 */
	handleAccepted(accepted) {
		if (this._finalValue !== undefined) {
			// Ignore, we already achieved resolution
			return
		}

		if (this._isOldMsg(accepted)) {
			console.log(`Message ${accepted} is old. I'll ignore it`);
			return
		}

		const proposal = this._fetchProposal(accepted.proposalId);
		proposal.registerAccepted(accepted);
		if (proposal.isAccepted()) {
			console.log(`Proposal ${proposal} has been accepted`);
			this._finalValue = accepted.value;
			this._finalProposalId = accepted.proposalId;
			//TODO should we send resolution?
		}
	}

	/**
	 * Checks if we have seen a newest proposal from the source node.
	 * Updated the latest proposalId seen from node
	 *
	 * @param accepted the accepted message
	 * @returns {boolean} true if the message is old, false otherwise
	 * @private
	 */
	_isOldMsg(accepted) {
		const lastProposalIdSeenForNode = this._lastAcceptedProposalsMap.get(accepted.sourceNodeId);
		if (lastProposalIdSeenForNode <= accepted.proposalId) {
			return true
		} else {
			//update map
			this._lastAcceptedProposalsMap.set(accepted.sourceNodeId, accepted.proposalId);
			return false
		}
	}

	/**
	 * Saves proposal on map if it wasn't there.
	 * Returns proposal from map.
	 *
	 * @param proposalId the proposal Id
	 * @returns Proposal | The saved proposal
	 * @private
	 */
	_fetchProposal(proposalId) {
		if (!this._proposalMap.has(proposalId)) {
			this._proposalMap.set(proposalId, new Proposal(this._cluster.quorum))
		}

		return this._proposalMap.get(proposalId);
	}
}

class Proposal {
	_acceptedSet;
	_quorum;
	_proposalValue;

	constructor(_quorum) {
		this._acceptedSet = new Set();
		this._quorum = _quorum;
		this.proposalValue = undefined;
	}

	registerAccepted(accepted) {
		if (this._proposalValue !== undefined) {
			if (this._proposalValue !== accepted.value) {
				throw new Error("Multiple values for same proposal Id")
			}
		} else {
			this._proposalValue = accepted.value
		}

		//TODO check the proposal value
		const sourceNodeId = accepted.sourceNodeId; //TODO not checking if sourceNode is part of the proposal
		this._acceptedSet.add(sourceNodeId)
	}

	isAccepted() {
		return this._acceptedSet.size >= this._quorum;
	}

}

export default Learner;