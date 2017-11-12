import Node, {Role} from "../../main/js/paxos/Node";
import ProposerMock from "./mocks/ProposerMock";
import Cluster from "../../main/js/paxos/Cluster";
import LearnerMock from "./mocks/LearnerMock";
import {Accept, Prepare, ProposalId} from "../../main/js/paxos/Messages";
import Acceptor from "../../main/js/paxos/Acceptor";
import ImmediateDeliveryMessageHandler from "./mocks/ImmediateDeliveryMessageHandler";

const assert = require('assert');
const allRoles = [Role.PROPOSER, Role.ACCEPTOR, Role.LEARNER];

const _mockSetupAndStart = (node, cluster, messageHandler) => {
	node.setup(cluster, messageHandler);
	node._paxosInstance._proposer = new ProposerMock();
	node._paxosInstance._learner = new LearnerMock();
	node.start();
};

describe('Acceptor', function () {

	describe('An acceptor in a 3 node cluster', function () {
		beforeEach(function () {
			const allNodes = [];
			for (let i = 0; i < 3; i++) {
				allNodes.push(new Node(i, allRoles));
			}

			this.cluster = new Cluster(allNodes);

			const messageHandler = new ImmediateDeliveryMessageHandler(this.cluster);
			allNodes.forEach((node) => _mockSetupAndStart(node, this.cluster, messageHandler));

			this.acceptor = new Acceptor(messageHandler, 0, this.cluster);
		});

		describe('handlePrepare()', function () {

			it(`the proposer should receive a promise`, function () {
				const prepare = new Prepare(0, 0, 0, new ProposalId(1));
				this.acceptor.handlePrepare(prepare);

				const proposer = this.cluster.proposers[0]._paxosInstance.proposer;
				assert.equal(1, proposer._receivedPromises.length);
				assert.equal(prepare.proposalId, proposer._receivedPromises[0].proposalId);
			});

			it(`it should honor previous promises`, function () {
				const prepare1 = new Prepare(0, 0, 0, new ProposalId(0));
				const prepare2 = new Prepare(0, 0, 0, new ProposalId(0));
				this.acceptor.handlePrepare(prepare2);

				this.acceptor.handlePrepare(prepare1);

				//proposer should have received only the first promise
				const proposer = this.cluster.proposers[0]._paxosInstance.proposer;
				assert.equal(1, proposer._receivedPromises.length);
				assert.equal(prepare2.proposalId, proposer._receivedPromises[0].proposalId);
			});

			it(`it should reject prepares after a value has been accepted`, function () {
				const accept1 = new Accept(0, 1, 1, new ProposalId(0), "some value");
				this.acceptor.handleAccept(accept1);

				const prepare1 = new Prepare(1, 1, new ProposalId(0));
				this.acceptor.handlePrepare(prepare1);

				//proposer should not receive any message
				const proposer = this.cluster.proposers[0]._paxosInstance.proposer;
				assert.equal(0, proposer._receivedPromises.length);
			});

		});

		describe('handleAccept()', function () {
			it(`it should broadcast accepted if it didn't make any promise`, function () {
				const accept = new Accept(0, 0, 0, new ProposalId(0), "some value");
				this.acceptor.handleAccept(accept);

				this.cluster.learners.forEach(node => {
					const mockLearner = node._paxosInstance.learner;
					assert.equal(1, mockLearner.receivedAccepted.length);

					const accepted = mockLearner.receivedAccepted[0];
					assert.equal(accept.proposalId, accepted.proposalId);
					assert.equal(accept.value, accepted.value);
				});
			});

			it(`it should not answer old accepts if it has made a new promise`, function () {
				const accept = new Accept(0, 0, 0, 0, new ProposalId(0), "some value");

				const prepare = new Prepare(0, 0, 0, new ProposalId(0));
				this.acceptor.handlePrepare(prepare);

				// there was a new promise after the accept
				this.acceptor.handleAccept(accept);

				this.cluster.learners.forEach(node => {
					const mockLearner = node._paxosInstance.learner;
					assert.equal(0, mockLearner.receivedAccepted.length);
				});
			});
		});
	});
});