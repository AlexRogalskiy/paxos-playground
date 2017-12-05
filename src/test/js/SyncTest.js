import DoNothingMessageHandler from "./mocks/DoNothingMessageHandler";
import {SyncRequest} from "../../main/js/paxos/Messages";
import {SyncMixin} from "../../main/js/paxos/SyncStrategy";

const assert = require('assert');

describe('Sync strategy test', () => {
	describe('handleSyncRequest', function () {

		it('Should send missing log pieces', function () {
			const log = [
				{value: 'v', paxosInstanceNumber: 0},
				{value: 'v', paxosInstanceNumber: 5},
				{value: 'v', paxosInstanceNumber: 13}
			];

			const node = new MockWithSync(log, 20);

			const syncRequest = new SyncRequest(3, 0, 0);
			node.handleSyncRequest(syncRequest);

			const messages = node.messageHandler.messages;
			assert.equal(messages.length, 1);
			const catchUpMessage = messages[0];
			assert.equal(catchUpMessage.missingLogEntries.length, 2);
			assert.equal(catchUpMessage.paxosInstanceNumber, 20);
		});

		it('Should sync cluster', function () {
			const cluster = "newCluster";
			const node = new MockWithSync([], 20, cluster);

			const syncRequest = new SyncRequest(3, 0, 0);
			node.handleSyncRequest(syncRequest);

			const messages = node.messageHandler.messages;
			assert.equal(messages.length, 1);
			const catchUpMessage = messages[0];
			assert.equal(catchUpMessage.cluster, cluster);
		});

		it('Should ignore if up to date', function () {
			const node = new MockWithSync([], 20);

			const syncRequest = new SyncRequest(20, 0, 0);
			node.handleSyncRequest(syncRequest);

			const messages = node.messageHandler.messages;
			assert.equal(messages.length, 0);
		});

		it('Should ignore if down', function () {
			const node = new MockWithSync([], 20);
			node.setIsDown(true);

			const syncRequest = new SyncRequest(3, 0, 0);
			node.handleSyncRequest(syncRequest);

			const messages = node.messageHandler.messages;
			assert.equal(messages.length, 0);
		});
	});
});

class MockNode {
	constructor(log, paxosInstanceNumber, cluster) {
		this._log = log;
		this._paxosInstanceNumber = paxosInstanceNumber;
		this._messageHandler = new DoNothingMessageHandler();
		this._isDown = false;
		this._cluster = cluster;
	}

	doCatchUp() {
		//Do nothing
	}

	isDown() {
		return this._isDown;
	}

	setIsDown(value) {
		this._isDown = value;
	}

	get log() {
		return this._log;
	}

	get paxosInstanceNumber() {
		return this._paxosInstanceNumber;
	}

	set paxosInstanceNumber(value) {
		this._paxosInstanceNumber = value;
	}

	get messageHandler() {
		return this._messageHandler;
	}
	
	get cluster() {
		return this._cluster;
	}
}

class MockWithSync extends SyncMixin(MockNode) {
	constructor(...args) {
		super(...args);
	}
}