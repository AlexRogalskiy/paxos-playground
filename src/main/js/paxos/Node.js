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
		if (this._isDown()) return;

		this._proposer.prepareValue(value)
	}

	handlePromise(promise) {
		if (this._isDown()) return;

		this._proposer.handlePromise(promise);
	}

	// ---- ACCEPTOR ----

	handlePrepare(prepare) {
		if (this._isDown()) return;

		this._acceptor.handlePrepare(prepare);
	}

	handleAccept(accept) {
		if (this._isDown()) return;

		this._acceptor.handleAccept(accept);
	}

	// ---- LEARNER ----

	handleAccepted(accepted) {
		if (this._isDown()) return;

		this._learner.handleAccepted(accepted);
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