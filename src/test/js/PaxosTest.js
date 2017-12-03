import Node, {allRoles} from "../../main/js/paxos/Node";
import Cluster from "../../main/js/paxos/Cluster";
import ImmediateDeliveryMessageHandler from "./mocks/ImmediateDeliveryMessageHandler";

const assert = require('assert');

const _checkLogValues = (node, ...values) => {
	const nodeLog = node.log;
	assert.equal(values.length, nodeLog.length);
	values.forEach((value, idx) => assert.equal(value, nodeLog[idx].value));
};

describe('Paxos in a 3 node cluster', () => {
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

		this.proposer = this.cluster.proposers[0];
	});

	describe('Single decree paxos', function () {

		it('Should agree on a given value', function () {
			const value = "some value";
			this.proposer.proposeUpdate(value);

			this.cluster.learners.forEach(node => _checkLogValues(node, value))
		});

		it('Should agree on a given value even with only 2 nodes up', function () {
			this.node2.stop();

			const value = "some value";
			this.proposer.proposeUpdate(value);


			_checkLogValues(this.cluster.learners[0], value);
			_checkLogValues(this.cluster.learners[1], value);
			_checkLogValues(this.cluster.learners[2]);
		});

		it('Should not be able to agree on value with only 1 node up', function () {
			this.node1.stop();
			this.node2.stop();

			const value = "some value";
			this.proposer.proposeUpdate(value);

			this.cluster.learners.forEach(node => _checkLogValues(node))
		})
	});

	describe('Multi-paxos', function () {
		it('Should advance paxos instance number after resolution', function () {
			const value1 = "value1";
			this.proposer.proposeUpdate(value1);

			this.cluster.learners.forEach(node => assert.equal(1, node._paxosInstance.paxosInstanceNumber))
		});

		it('Should agree on 2 values', function () {
			const value1 = "value1";
			const value2 = "value2";

			this.proposer.proposeUpdate(value1);

			this.proposer.proposeUpdate(value2);

			this.cluster.learners.forEach(node => _checkLogValues(node, value1, value2))
		});
	});
});