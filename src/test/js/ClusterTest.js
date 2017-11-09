import Cluster from "../../main/js/paxos/Cluster";
import Node, {allRoles, Role} from "../../main/js/paxos/Node";

const assert = require('assert');

const _testQuorum = (cluster, expectedQuorum) => {
	describe('get quorum()', () => {
		it(`should return ${expectedQuorum} for a ${cluster.length}`, () => {
			assert.equal(expectedQuorum, cluster.quorum);
		});
	});
};

const _testGetProposers = (cluster, expectedProposers) => {
	describe('get proposers()', () => {
		it(`should return ${expectedProposers}`, () => {
			assert.equal(expectedProposers, cluster.proposers.length);
		});
	});
};

const _testGetAcceptors = (cluster, expectedAcceptors) => {
	describe('get acceptors()', () => {
		it(`should return ${expectedAcceptors}`, () => {
			assert.equal(expectedAcceptors, cluster.acceptors.length);
		});
	});
};

const _testGetLearners = (cluster, expectedLearners) => {
	describe('get learners()', () => {
		it(`should return ${expectedLearners}`, () => {
			assert.equal(expectedLearners, cluster.learners.length);
		});
	});
};


describe('Cluster', () => {
	describe('A 5 node cluster', () => {
		const fiveNodeCluster = new Cluster([
			new Node(1, allRoles),
			new Node(2, allRoles),
			new Node(3, allRoles),
			new Node(4, allRoles),
			new Node(5, allRoles),
		]);

		_testQuorum(fiveNodeCluster, 3);
		_testGetProposers(fiveNodeCluster, 5);
		_testGetAcceptors(fiveNodeCluster, 5);
		_testGetLearners(fiveNodeCluster, 5);
	});

	describe('A 3 node cluster', () => {
		const threeNodeCluster = new Cluster([
			new Node(1, allRoles),
			new Node(2, allRoles),
			new Node(3, allRoles),
		]);

		_testQuorum(threeNodeCluster, 2);
		_testGetProposers(threeNodeCluster, 3);
		_testGetAcceptors(threeNodeCluster, 3);
		_testGetLearners(threeNodeCluster, 3);
	});

	describe('A 1 node cluster', () => {
		const fiveNodeCluster = new Cluster([
			new Node(1, allRoles),
		]);

		_testQuorum(fiveNodeCluster, 1);
		_testGetProposers(fiveNodeCluster, 1);
		_testGetAcceptors(fiveNodeCluster, 1);
		_testGetLearners(fiveNodeCluster, 1);
	});

	describe('A asymmetric 5 node cluster', () => {
		const cluster = new Cluster([
			new Node(1, [Role.PROPOSER, Role.LEARNER]),
			new Node(2, [Role.PROPOSER, Role.LEARNER]),
			new Node(3, [Role.ACCEPTOR, Role.LEARNER]),
			new Node(4, [Role.ACCEPTOR, Role.LEARNER]),
			new Node(5, [Role.ACCEPTOR]),
		]);

		_testQuorum(cluster, 2);
		_testGetProposers(cluster, 2);
		_testGetAcceptors(cluster, 3);
		_testGetLearners(cluster, 4);
	});
});