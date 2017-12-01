export const MasterMixin = (nodeClass) => class extends nodeClass {
	// mixins should either:
	//   a) not define a constructor,
	//   b) require a specificconstructor signature
	//   c) pass along all arguments.
	constructor(model, ...args) {
		super(...args);
		this._model = model;
		this._masterId = undefined //TODO initial value for leader?
	}

	updateTime(time) {
		if (this._lastLeaseStartTime === undefined || time - this._lastLeaseStartTime >= LEASE_WINDOW) {
			console.log("");
			this._leaseExpired();
		}

		if (this.isMaster() && time - this._lastLeaseStartTime >= RENEW_LEASE_WINDOW) {
			// renew lease
			console.log("time to renew master lease");
			this.proposeUpdate(super.id, true);
		}

		super.updateTime(time)
	}

	proposeUpdate(value, isElectionValue = false) {
		if (isElectionValue) {
			// If I don't know who the master is or trying to update lease
			if (this._masterId === undefined || this.isMaster()) {
				this._startElection();
			}
		} else {
			if (this.isMaster()) {
				super.proposeUpdate(new LogEntry(value, EntryType.APPLICATION_LEVEL))
			} else {
				console.log(`Ignoring client requests. Current leader is ${this._masterId}`)
			}
		}
	}

	isMaster() {
		return this._masterId === super.id;
	}

	handlePrepare(prepare) {
		// drop non-master requests
		if (this._masterId !== undefined && prepare.sourceNodeId !== this._masterId) return;

		super.handlePrepare(prepare);
	}

	handleAccept(accept) {
		// drop non-master requests
		if (this._masterId !== undefined && accept.sourceNodeId !== this._masterId) return;

		super.handleAccept(accept);
	}

	stop() {
		this._masterId = undefined;
		super.stop();
	}

	resolutionAchieved(resolution) {
		const resolutionEntry = resolution.value;
		// unwrap resolution
		resolution.value = resolutionEntry.value;

		let persist = true;
		if (resolutionEntry.entryType === EntryType.ELECTION) {
			this._updateLease(resolutionEntry.value);
			persist = false;
		}

		super.resolutionAchieved(resolution, persist);

		//TODO other optimizations to cut down the number of messages
	}

	_startElection() {
		// resetting the time here is a sure way of knowing that it'll time out before any other peer.
		this._lastLeaseStartTime = this._model.time;
		// proposing myself as master
		super.proposeUpdate(new LogEntry(super.id, EntryType.ELECTION));
	}

	_updateLease(leaderNodeId) {
		console.log(`Lease granted. New master is: ${leaderNodeId}`);

		this._masterId = leaderNodeId;

		if (!this.isMaster()) {
			// If I'm not the master reset timer
			this._lastLeaseStartTime = this._model.time;
		}
	}

	_leaseExpired() {
		this._masterId = undefined;
		this._startElection();
	}

};

class LogEntry {
	// _value;
	// _entryType;

	constructor(value, entryType = EntryType.APPLICATION_LEVEL) {
		this._value = value;
		this._entryType = entryType;
	}

	get value() {
		return this._value;
	}

	get entryType() {
		return this._entryType;
	}
}

const EntryType = {
	APPLICATION_LEVEL: Symbol("application_level"),
	ELECTION: Symbol("election")
};

const LEASE_WINDOW = 100000;
const RENEW_LEASE_WINDOW = 80000;