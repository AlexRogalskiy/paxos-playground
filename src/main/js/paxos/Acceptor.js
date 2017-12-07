import {Accepted, Promise, ProposalId} from "./Messages.js";

/**
 * Acceptors act as the fault-tolerant memory for Paxos. To ensure correctness
 * in the presence of failure, Acceptors must be able to remember the promises
 * they've made even in the event of power outages. Consequently, any changes
 * to the promised_id, accepted_id, and/or accepted_value must be persisted to
 * stable media prior to sending promise and accepted messages.
 */
class Acceptor {
	// _cluster;
	//
	// //Non-volatile fields
	// _promisedProposalId;
	// _acceptedProposalId;
	// _acceptedValue;
	// _paxosInstanceNumber;
	// _messageHandler;

	constructor(messageHandler, paxosInstanceNumber, cluster) {
		this.messageHandler = messageHandler;
		this._paxosInstanceNumber = paxosInstanceNumber;
		this._cluster = cluster;
	}

	handlePrepare(prepare, broadcast = true) {
		const proposalId = prepare.proposalId;

		let promise;
		if (this._honorsPromise(proposalId) && !this._isAccepted(proposalId)) {
			// accept prepare
			promise = new Promise(this._paxosInstanceNumber, prepare, this._acceptedValue, this._acceptedProposalId);
			this._promisedProposalId = proposalId;
			if (broadcast) {
				this.messageHandler.send(promise);
			}
		} else {
			// reject prepare
			console.log(`I'm not preparing ${proposalId}, already promised to ${this._promisedProposalId.toString()} and 
				accepted ${this._acceptedProposalId !== undefined ? this._acceptedProposalId.toString() : 'nothing'}`)
		}
	}

	handleAccept(accept) {
		const proposalId = accept.proposalId;
		const value = accept.value;

		if (this._honorsPromise(proposalId)) {
			// accept accept
			this._promisedProposalId = proposalId; // update proposal id number here too
			this._acceptedProposalId = proposalId;
			this._acceptedValue = value;
			return true;
		} else {
			//TODO should we also reject if a value has already been accepted?
			// reject accept
			console.log(`I'm not accepting ${proposalId} it doesn't honor my promise or previous committed values`);
			return false;
		}
	}

	broadcastAccepted(accept) {
		const learners = this._cluster.learners;
		learners.forEach(learner => {
			const accepted = new Accepted(accept, learner.id);
			this.messageHandler.send(accepted);
		});
	}

	_honorsPromise(proposalId) {
		return this._promisedProposalId === undefined || ProposalId.compare(proposalId, this._promisedProposalId) >= 0
	}

	_isAccepted(proposalId) {
		return this._acceptedProposalId !== undefined && proposalId <= this._acceptedProposalId;
	}
}

export default Acceptor;