import Node from "./Node.js";
import {CatchUp, SyncRequest} from "./Messages.js";

const SyncMixin = (nodeClass) => class extends nodeClass {
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

	start() {
		super.start();
		this._sendSyncRequest(); // eager sync when coming back online
	}

	_randomElementFromArray(array) {
		return array[Math.floor(Math.random() * array.length)];
	}

};

class NodeWithSync extends SyncMixin(Node) {
	constructor(...args) {
		super(...args);
		setInterval(this._sendSyncRequest.bind(this), SYNC_INTERVAL);
	}
}

const SYNC_INTERVAL = 10000;

export default NodeWithSync