import Node, {allRoles} from "../../main/js/paxos/Node";
import Cluster from "../../main/js/paxos/Cluster";
import {Promise, ProposalBuilder, ProposalId} from "../../main/js/paxos/Messages";
import Proposer from "../../main/js/paxos/Proposer";
import AcceptorMock from "./mocks/AcceptorMock";
import ImmediateDeliveryMessageHandler from "./mocks/ImmediateDeliveryMessageHandler";

const assert = require('assert');

const _mockSetupAndStart = (node, cluster, messageHandler) => {
	node.setup(cluster, messageHandler);
	node._paxosInstance._acceptor = new AcceptorMock();
	node.start();
};

const _fetchReceivedPrepare = (cluster, nodeIdx) => {
	const mockAcceptor = cluster.acceptors[nodeIdx]._paxosInstance.acceptor;
	return mockAcceptor.receivedPrepares[0];
};

describe('Proposer', function () {

	describe('A Proposer in a 3 node cluster', function () {
		beforeEach(function () {
			const allNodes = [];
			for (let i = 0; i < 3; i++) {
				allNodes.push(new Node(i, allRoles));
			}

			this.cluster = new Cluster(allNodes);

			const messageHandler = new ImmediateDeliveryMessageHandler(this.cluster);
			allNodes.forEach((node) => _mockSetupAndStart(node, this.cluster, messageHandler));

			this.proposer = new Proposer(messageHandler, 0, this.cluster, 0, new ProposalBuilder());
		});

		describe('prepare()', function () {
			beforeEach(function () {
				this.proposer.prepare("some value");
			});

			it(`each acceptor should have received 1 message`, function () {
				this.cluster.acceptors.forEach(node => {
					const mockAcceptor = node._paxosInstance.acceptor;
					assert.equal(1, mockAcceptor.receivedPrepares.length);
				});
			});

			it(`prepare message should be well formed`, function () {
				const aReceivedPrepare = _fetchReceivedPrepare(this.cluster, 0);

				this.cluster.acceptors.forEach(node => {
					const mockAcceptor = node._paxosInstance.acceptor;
					const receivedPrepare = mockAcceptor.receivedPrepares[0];
					assert.equal(aReceivedPrepare.proposalId, receivedPrepare.proposalId);
					assert.equal(aReceivedPrepare.sourceNodeId, receivedPrepare.sourceNodeId);
					assert.equal(node.id, receivedPrepare.targetNodeId);
				});
			});

		});

		describe('handlePromise()', () => {
			beforeEach(function () {
				this.previousProposalId1 = new ProposalId(0);
				this.previousProposalId2 = new ProposalId(0);

				//need to call prepare first to populate currentProposal
				this._proposedValue = "some value";
				this.proposer.proposeUpdate(this._proposedValue);
				this.proposer.prepare();
			});

			it(`promise should be registered on proposer`, function () {
				const prepare0 = _fetchReceivedPrepare(this.cluster, 0);
				const promise0 = new Promise(0, prepare0, undefined, undefined);

				this.proposer.handlePromise(promise0);

				assert.equal(1, this.proposer._currentProposal._promisesMap.size)
			});

			it(`after receiving 3 promises it should broadcast accept`, function () {
				for (let i = 0; i < 3; i++) {
					const prepare = _fetchReceivedPrepare(this.cluster, i);
					const promise = new Promise(0, prepare, undefined, undefined);
					this.proposer.handlePromise(promise);
				}

				//check that the proposal is prepared
				assert.ok(this.proposer._currentProposal.isPrepared());

				//check the the accept was broadcasted
				this.cluster.acceptors.forEach(node => {
					const mockAcceptor = node._paxosInstance.acceptor;
					assert.equal(1, mockAcceptor.receivedAccepts.length);
				});
			});

			it(`if everybody answered null it should use proposer value`, function () {
				for (let i = 0; i < 3; i++) {
					const prepare = _fetchReceivedPrepare(this.cluster, i);
					const promise = new Promise(0, prepare, undefined, undefined);
					this.proposer.handlePromise(promise);
				}

				//check that the proposal is prepared
				assert.ok(this.proposer._currentProposal.isPrepared());

				//check that the accept was broadcasted
				this.cluster.acceptors.forEach(node => {
					const mockAcceptor = node._paxosInstance.acceptor;
					assert.equal(1, mockAcceptor.receivedAccepts.length);
					assert.equal(this._proposedValue, mockAcceptor.receivedAccepts[0].value);
				});
			});

			it(`if everybody answered with a previously seen value it should use that value`, function () {
				const lastAcceptedValue = "another value";
				for (let i = 0; i < 3; i++) {
					const prepare = _fetchReceivedPrepare(this.cluster, i);
					const promise = new Promise(0, prepare, this.previousProposalId1, lastAcceptedValue);
					this.proposer.handlePromise(promise);
				}

				//check that the proposal is prepared
				assert.ok(this.proposer._currentProposal.isPrepared());

				//check the the accept was broadcasted
				this.cluster.acceptors.forEach(node => {
					const mockAcceptor = node._paxosInstance.acceptor;
					assert.equal(1, mockAcceptor.receivedAccepts.length);
					assert.equal(lastAcceptedValue, mockAcceptor.receivedAccepts[0].value);
				});
			});

			it(`if someone answered with a previously seen value and everybody else null it should use that value`, function () {
				//node 0 has seen some previous value
				const lastAcceptedValue = "another value";
				const prepare = _fetchReceivedPrepare(this.cluster, 0);
				const promise = new Promise(0, prepare, this.previousProposalId1, lastAcceptedValue);
				this.proposer.handlePromise(promise);

				for (let i = 1; i < 3; i++) {
					const prepare = _fetchReceivedPrepare(this.cluster, i);
					const promise = new Promise(0, prepare, undefined, undefined);
					this.proposer.handlePromise(promise);
				}

				//check that the proposal is prepared
				assert.ok(this.proposer._currentProposal.isPrepared());

				//check the the accept was broadcasted
				this.cluster.acceptors.forEach(node => {
					const mockAcceptor = node._paxosInstance.acceptor;
					assert.equal(1, mockAcceptor.receivedAccepts.length);
					assert.equal(lastAcceptedValue, mockAcceptor.receivedAccepts[0].value);
				});
			});

			it(`if multiple previously seen values it should use the one with highest proposal id`, function () {
				//node 0 doesn't answer

				//node 1
				const lastAcceptedValue1 = "another value";
				const prepare1 = _fetchReceivedPrepare(this.cluster, 1);
				const promise1 = new Promise(0, prepare1, this.previousProposalId1, lastAcceptedValue1);
				this.proposer.handlePromise(promise1);

				//node 2
				const lastAcceptedValue2 = "yet another value";
				const prepare2 = _fetchReceivedPrepare(this.cluster, 2);
				const promise2 = new Promise(0, prepare2, this.previousProposalId2, lastAcceptedValue2);
				this.proposer.handlePromise(promise2);

				//check that the proposal is prepared
				assert.ok(this.proposer._currentProposal.isPrepared());

				//check the the accept was broadcasted
				this.cluster.acceptors.forEach(node => {
					const mockAcceptor = node._paxosInstance.acceptor;
					assert.equal(1, mockAcceptor.receivedAccepts.length);
					assert.equal(lastAcceptedValue2, mockAcceptor.receivedAccepts[0].value);
				});
			});

		});

		describe('handlePromise() - promise with a different proposal id', () => {
			//TODO
		});

	});
});