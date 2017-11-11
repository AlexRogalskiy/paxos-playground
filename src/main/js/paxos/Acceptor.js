import {Accepted, Promise, ProposalId, Reply} from "./Messages";

/**
 * Acceptors act as the fault-tolerant memory for Paxos. To ensure correctness
 * in the presence of failure, Acceptors must be able to remember the promises
 * they've made even in the event of power outages. Consequently, any changes
 * to the promised_id, accepted_id, and/or accepted_value must be persisted to
 * stable media prior to sending promise and accepted messages.
 */
class Acceptor {
	_cluster;

	//Non-volatile fields
	_promisedProposalId;
	_acceptedProposalId;
	_acceptedValue;
	_paxosInstanceNumber;

	constructor(paxosInstanceNumber, cluster) {
		this._paxosInstanceNumber = paxosInstanceNumber;
		this._cluster = cluster;
	}

	handlePrepare(prepare) {
		const proposer = this._findProposer(prepare.sourceNodeId);
		const proposalId = prepare.proposalId;

		let promise;
		if (this._honorsPromise(proposalId) && !this._isAccepted(proposalId)) {
			// accept prepare
			promise = new Promise(this._paxosInstanceNumber, prepare, this._acceptedValue, this._acceptedProposalId);
			this._promisedProposalId = proposalId;
			proposer.handlePromise(promise)
		} else {
			// reject prepare
			console.log(`I'm not preparing ${prepare}, already promised to ${this._promisedProposalId} and accepted ${this._acceptedProposalId}`)
		}
	}

	handleAccept(accept) {
		const proposalId = accept.proposalId;
		const value = accept.value;

		let accepted;
		if (this._honorsPromise(proposalId)) {
			// accept accept
			accepted = new Accepted(accept);
			this._promisedProposalId = proposalId; // update proposal id number here too
			this._acceptedProposalId = proposalId;
			this._acceptedValue = value;
			this._broadcastAccepted(accepted)
		} else {
			//TODO should we also reject if a value has already been accepted?
			// reject accept
			console.log(`I'm not accepting ${accept} it doesn't honor my promise or previous committed values`)
		}
	}

	_broadcastAccepted(accepted) {
		const learners = this._cluster.learners;
		learners.forEach(learner => learner.handleAccepted(accepted));
	}

	_honorsPromise(proposalId) {
		return this._promisedProposalId === undefined || ProposalId.compare(proposalId, this._promisedProposalId) >= 0
	}

	_isAccepted(proposalId) {
		return this._acceptedProposalId !== undefined && proposalId <= this._acceptedProposalId;
	}

	_findProposer(sourceNodeId) {
		const proposer = this._cluster.proposers
			.find(p => p.id === sourceNodeId);

		if (proposer === undefined) {
			console.log(`Don't know about proposer ${proposer}`);
			return;
		}

		return proposer;
	}
}

export default Acceptor;