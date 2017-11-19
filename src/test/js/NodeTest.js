import Node, {allRoles} from "../../main/js/paxos/Node";
import Cluster from "../../main/js/paxos/Cluster";
import ImmediateDeliveryMessageHandler from "./mocks/ImmediateDeliveryMessageHandler";

const assert = require('assert');


describe('a Node', () => {
	beforeEach(function () {
		this.node0 = new Node(0, allRoles);
		this.node1 = new Node(1, allRoles);
		this.node2 = new Node(2, allRoles);

		const allNodes = [
			this.node0,
			this.node1,
			this.node2
		];
		this.cluster = new Cluster(allNodes);

		const messageHandler = new ImmediateDeliveryMessageHandler(this.cluster);
		allNodes.forEach(node => {
			node.setup(this.cluster, messageHandler);
			node.start();
		});
	});

	describe('peers()', function () {

		it('should return 2 peers', function () {
			const peers = this.node0.peers;
			const expectedResponse = [this.node1, this.node2];
			assert.deepEqual(peers, expectedResponse);
		});

	});

});