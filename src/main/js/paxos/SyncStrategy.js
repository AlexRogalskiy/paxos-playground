import {CatchUp, SyncRequest} from "./Messages.js";

export const SyncMixin = (nodeClass) => class extends nodeClass {
	// mixins should either:
	//   a) not define a constructor,
	//   b) require a specificconstructor signature
	//   c) pass along all arguments.

	_sendSyncRequest() {
		if (this.isDown()) return;

		// select a node randomly from peers
		const targetNode = this._randomElementFromArray(super.peers);
		const syncRequest = new SyncRequest(super.paxosInstanceNumber, super.id, targetNode.id);
		super.messageHandler.send(syncRequest);
	}

	handleSyncRequest(syncRequest) {
		//Send catchup
		if (this.isDown()) return;

		const currentInstanceNumber = super.paxosInstanceNumber;
		if (syncRequest.paxosInstanceNumber >= currentInstanceNumber) return; //already up to date, ignore

		const missingLogEntries = super.log.slice(syncRequest.paxosInstanceNumber, currentInstanceNumber);
		const catchUp = new CatchUp(syncRequest, currentInstanceNumber, missingLogEntries);
		super.messageHandler.send(catchUp);
	}

	handleCatchup(catchUp) {
		if (this.isDown()) return;
		if (catchUp.paxosInstanceNumber <= super.paxosInstanceNumber) return;

		super.doCatchup(catchUp.paxosInstanceNumber, catchUp.missingLogEntries);
	}

	updateTime(time) {
		if (this.lastSyncTime === undefined || time - this.lastSyncTime >= SYNC_INTERVAL) {
			this.lastSyncTime = time;
			this._sendSyncRequest();
		}
	}

	start() {
		super.start();
		// this._sendSyncRequest(); // eager sync when coming back online
	}

	_randomElementFromArray(array) {
		return array[Math.floor(Math.random() * array.length)];
	}

};

const SYNC_INTERVAL = 100000; //10 seconds