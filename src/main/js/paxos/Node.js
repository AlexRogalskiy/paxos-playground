import Proposer from "./Proposer.js";
import Acceptor from "./Acceptor.js";
import Learner from "./Learner.js";

class Node {
	// _id;
	// _roles;
	// _state;
	// _log;
	//
	// _cluster;
	// _paxosInstance;
	// _messageHandler;

	constructor(id, roles) {
		this._id = id;
		this._roles = roles;
		this._state = State.DOWN;
		this._log = [];
	}

	setup(cluster, messageHandler) {
		this._cluster = cluster;
		this.messageHandler = messageHandler;

		//Initial paxos instance creation
		this._paxosInstance = new PaxosInstance(this.messageHandler, 0, this.id, cluster);
	}

	start() {
		if (this._cluster === undefined) {
			throw new Error("You can't start node before calling setup() first")
		}

		this._state = State.UP;
	}

	stop() {
		this._state = State.DOWN;
	}

	// ---- PROPOSER ----

	clientRequest(value) {
		this.prepareValue(value);
	}

	prepareValue(value) {
		if (this._isDown()) return;

		this._paxosInstance.proposer.prepareValue(value)
	}

	handlePromise(promise) {
		if (this._isDown()) return;
		if (!this._isFromCurrentPaxosInstance(promise)) return;

		this._paxosInstance.proposer.handlePromise(promise);
	}

	// ---- ACCEPTOR ----

	handlePrepare(prepare) {
		if (this._isDown()) return;
		if (!this._isFromCurrentPaxosInstance(prepare)) return;

		this._paxosInstance.acceptor.handlePrepare(prepare);
	}

	handleAccept(accept) {
		if (this._isDown()) return;
		if (!this._isFromCurrentPaxosInstance(accept)) return;

		this._paxosInstance.acceptor.handleAccept(accept);
	}

	// ---- LEARNER ----

	handleAccepted(accepted) {
		if (this._isDown()) return;
		if (!this._isFromCurrentPaxosInstance(accepted)) return;

		const resolution = this._paxosInstance.learner.handleAccepted(accepted);

		if (resolution !== undefined && this._isFromCurrentPaxosInstance(resolution)) {
			//store final value
			this._log.push(resolution.value);

			//advance paxos instance
			const newInstanceNumber = this._paxosInstance.paxosInstanceNumber + 1;
			this._paxosInstance = new PaxosInstance(this.messageHandler, newInstanceNumber, this.id, this._cluster)
		}
	}

	_isDown() {
		return this._state === State.DOWN;
	}

	get roles() {
		return this._roles
	}

	get id() {
		return this._id;
	}

	_isFromCurrentPaxosInstance(msg) {
		return msg.paxosInstanceNumber === this._paxosInstance.paxosInstanceNumber;
	}

	get log() {
		return this._log;
	}

	get paxosInstanceNumber() {
		return this._paxosInstance.paxosInstanceNumber;
	}
}

class PaxosInstance {
	// _proposer;
	// _acceptor;
	// _learner;

	constructor(messageHandler, paxosInstanceNumber, id, cluster) {
		this._paxosInstanceNumber = paxosInstanceNumber;
		this._proposer = new Proposer(messageHandler, this._paxosInstanceNumber, cluster, id);
		this._acceptor = new Acceptor(messageHandler, this._paxosInstanceNumber, cluster);
		this._learner = new Learner(messageHandler, this._paxosInstanceNumber, cluster);
	}


	get proposer() {
		return this._proposer;
	}

	get acceptor() {
		return this._acceptor;
	}

	get learner() {
		return this._learner;
	}

	get paxosInstanceNumber() {
		return this._paxosInstanceNumber;
	}
}

export const Role = {
	PROPOSER: Symbol("proposer"),
	ACCEPTOR: Symbol("acceptor"),
	LEARNER: Symbol("learner")
};

export const allRoles = [Role.PROPOSER, Role.ACCEPTOR, Role.LEARNER];

export const State = {
	UP: Symbol("proposer"),
	DOWN: Symbol("down"),
};

export default Node;