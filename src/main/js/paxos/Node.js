import Proposer from "./Proposer.js";
import Acceptor from "./Acceptor.js";
import Learner from "./Learner.js";
import {ProposalBuilder} from "./Messages.js";
import {EntryType, LogEntry} from "./LogEntry.js";

/**
 * Models a paxos node. Responsibilities:
 *  - Handle the log state
 *  - Handle the node state
 *  - Advance paxos instance
 *  - Enforce messages are from the current paxos instance.
 */
class Node {
	// _id;
	// _roles;
	// _state;
	// _log;
	//
	// _cluster;
	// _paxosInstance;
	// _messageHandler;

	constructor(id, roles, enableOptimizations = false) {
		this._id = id;
		this._roles = roles;
		this._state = State.DOWN;
		this._log = [];
		this._enableOptimizations = enableOptimizations;
	}

	setup(cluster, messageHandler) {
		this._cluster = cluster;
		this._messageHandler = messageHandler;

		//Initial paxos instance creation
		this._paxosInstance = new PaxosInstance(this._messageHandler, 0, this.id, cluster);
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

	proposeUpdate(value, entryType = EntryType.APPLICATION_LEVEL) {
		if (this.isDown()) return;
		if (!this.roles.includes(Role.PROPOSER)) return;

		const proposer = this._paxosInstance.proposer;
		proposer.proposeUpdate(new LogEntry(value, entryType));

		if (!this._enableOptimizations || !this.isMaster()) {
			// If you're not the master, but you got here it means that there is no master,
			// so you should kick-off the prepare
			this.prepare();
		} else {
			// If you're the master jump directly to the 2nd phase
			proposer.broadcastAccept();
		}
	}

	prepare(broadcast = true) {
		if (this.isDown()) return;
		if (!this.roles.includes(Role.PROPOSER)) return;

		return this._paxosInstance.proposer.prepare(broadcast)
	}

	handlePromise(promise, broadcast = true) {
		if (this.isDown()) return;
		if (!this.roles.includes(Role.PROPOSER)) return;
		if (!this._isFromCurrentPaxosInstance(promise)) return;

		this._paxosInstance.proposer.handlePromise(promise, broadcast);
	}

	// ---- ACCEPTOR ----

	handlePrepare(prepare, broadcast = true) {
		if (this.isDown()) return;
		if (!this.roles.includes(Role.ACCEPTOR)) return;
		if (!this._isFromCurrentPaxosInstance(prepare)) return;

		this._paxosInstance.acceptor.handlePrepare(prepare, broadcast);
	}

	handleAccept(accept) {
		if (this.isDown()) return;
		if (!this.roles.includes(Role.ACCEPTOR)) return;
		if (!this._isFromCurrentPaxosInstance(accept)) return;

		const accepted = this._paxosInstance.acceptor.handleAccept(accept);
		if (accepted) {
			this.broadcastAccepted(accept);
		}
	}

	broadcastAccepted(accept) {
		this._paxosInstance.acceptor.broadcastAccepted(accept);
	}

	// ---- LEARNER ----

	handleAccepted(accepted) {
		if (this.isDown()) return;
		if (!this.roles.includes(Role.LEARNER)) return;
		if (!this._isFromCurrentPaxosInstance(accepted)) return;

		const resolution = this._paxosInstance.learner.handleAccepted(accepted);

		if (resolution !== undefined && this._isFromCurrentPaxosInstance(resolution)) {
			this.resolutionAchieved(resolution);
		}
	}

	resolutionAchieved(resolution) {
		const logEntry = resolution.value;
		this._log.push({
			value: logEntry.value,
			paxosInstanceNumber: this.paxosInstanceNumber,
			type: logEntry.entryType
		});

		//advance paxos instance
		const newInstanceNumber = this._paxosInstance.paxosInstanceNumber + 1;
		this._paxosInstance = new PaxosInstance(this._messageHandler, newInstanceNumber, this.id, this._cluster)
	}

	doCatchup(latestInstanceNumber, missingLogEntries, cluster) {
		missingLogEntries.forEach(entry => this.log.push(entry));
		this._cluster = cluster;

		this._paxosInstance = new PaxosInstance(this._messageHandler, latestInstanceNumber, this.id, this._cluster)
	}

	isDown() {
		return this._state === State.DOWN;
	}

	updateTime() {
	}

	isMaster() {
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

	get peers() {
		return this._cluster.nodes.filter(node => node.id !== this.id);
	}

	get messageHandler() {
		return this._messageHandler;
	}

	get cluster() {
		return this._cluster;
	}

	set cluster(newCluster) {
		this._cluster = newCluster;
	}
}

class PaxosInstance {
	// _proposer;
	// _acceptor;
	// _learner;

	constructor(messageHandler, paxosInstanceNumber, id, cluster) {
		this._paxosInstanceNumber = paxosInstanceNumber;
		this._proposer = new Proposer(messageHandler, this._paxosInstanceNumber, cluster, id, new ProposalBuilder());
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
	UP: Symbol("up"),
	DOWN: Symbol("down"),
};

export default Node;