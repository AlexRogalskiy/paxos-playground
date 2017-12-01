import {allRoles} from "../../main/js/paxos/Node";
import Cluster from "../../main/js/paxos/Cluster";
import Proposer from "../../main/js/paxos/Proposer";
import AcceptorMock from "./mocks/AcceptorMock";
import ImmediateDeliveryMessageHandler from "./mocks/ImmediateDeliveryMessageHandler";
import ResolutionNode from "../../main/js/paxos/ResolutionStrategy.js";

const assert = require('assert');

const _mockSetupAndStart = (node, cluster, messageHandler) => {
	node.setup(cluster, messageHandler);
	node._paxosInstance._acceptor = new AcceptorMock();
	node.start();
};
describe('Proposer', function () {

	describe('A Proposer in a 3 node cluster', function () {
		beforeEach(function () {
			const allNodes = [];
			for (let i = 0; i < 3; i++) {
				allNodes.push(new ResolutionNode(i, allRoles));
			}

			this.cluster = new Cluster(allNodes);

			const messageHandler = new ImmediateDeliveryMessageHandler(this.cluster);
			allNodes.forEach((node) => _mockSetupAndStart(node, this.cluster, messageHandler));

			this.proposer = allNodes[0];
		});

		describe('prepareValue()', function () {
			beforeEach(function () {
				this.proposer.prepareValue("some value");
			});

			it(`each acceptor should have received 1 message`, function () {
				this.cluster.acceptors.forEach(node => {
					const mockAcceptor = node._paxosInstance.acceptor;
					assert.equal(1, mockAcceptor.receivedPrepares.length);
				});
			});

		});

	});
});