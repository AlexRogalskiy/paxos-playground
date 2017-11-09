import Proposer from "./Proposer";
import Acceptor from "./Acceptor";
import Learner from "./Learner";

class Node {
	_id;
	_roles;
	_state;

	_cluster;
	_proposer;
	_acceptor;
	_learner;

	constructor(id, roles) {
		this._id = id;
		this._roles = roles;
		this._state = State.DOWN;
	}

	setup(cluster) {
		this._cluster = cluster;

		this._proposer = new Proposer(this.id, cluster);
		this._acceptor = new Acceptor(cluster);
		this._learner = new Learner(cluster);
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

	prepareValue(value) {
		this._proposer.prepareValue(value)
	}

	handlePromise(promise) {
		this._proposer.handlePromise(promise);
	}

	// ---- ACCEPTOR ----

	handlePrepare(prepare) {
		this._acceptor.handlePrepare(prepare);
	}

	handleAccept(accept) {
		this._acceptor.handleAccept(accept);
	}

	// ---- LEARNER ----

	handleAccepted(accepted) {
		this._learner.handleAccepted(accepted);
	}

	get roles() {
		return this._roles
	}

	get id() {
		return this._id;
	}
}

export const Role = {
	PROPOSER: Symbol("proposer"),
	ACCEPTOR: Symbol("acceptor"),
	LEARNER: Symbol("learner")
};

export const allRoles = [Role.PROPOSER, Role.ACCEPTOR, Role.LEARNER];

const State = {
	UP: Symbol("proposer"),
	DOWN: Symbol("down"),
};

export default Node;