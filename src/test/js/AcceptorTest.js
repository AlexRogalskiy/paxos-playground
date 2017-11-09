import Node, {Role} from "../../main/js/paxos/Node";
import ProposerMock from "./mocks/ProposerMock";
import Cluster from "../../main/js/paxos/Cluster";
import LearnerMock from "./mocks/LearnerMock";
import {Accept, Prepare, ProposalId} from "../../main/js/paxos/Messages";
import Acceptor from "../../main/js/paxos/Acceptor";

const assert = require('assert');
const allRoles = [Role.PROPOSER, Role.ACCEPTOR, Role.LEARNER];

const _buildMockedNode = (nodeID) => {
	const node = new Node(nodeID, allRoles);
	node._proposer = new ProposerMock();
	node._learner = new LearnerMock();
	return node;
};

describe('Acceptor', function () {

	describe('An acceptor in a 3 node cluster', function () {
		beforeEach(function () {
			this.cluster = new Cluster([
				_buildMockedNode(1),
				_buildMockedNode(2),
				_buildMockedNode(3)
			]);

			this.acceptor = new Acceptor(this.cluster);
		});

		describe('handlePrepare()', function () {

			it(`the proposer should receive a promise`, function () {
				const prepare = new Prepare(1, 1, new ProposalId(1));
				this.acceptor.handlePrepare(prepare);

				const proposer = this.cluster.proposers[0]._proposer;
				assert.equal(1, proposer._receivedPromises.length);
				assert.equal(prepare.proposalId, proposer._receivedPromises[0].proposalId);
			});

			it(`it should honor previous promises`, function () {
				const prepare1 = new Prepare(1, 1, new ProposalId(0));
				const prepare2 = new Prepare(1, 1, new ProposalId(0));
				this.acceptor.handlePrepare(prepare2);

				this.acceptor.handlePrepare(prepare1);

				//proposer should have received only the first promise
				const proposer = this.cluster.proposers[0]._proposer;
				assert.equal(1, proposer._receivedPromises.length);
				assert.equal(prepare2.proposalId, proposer._receivedPromises[0].proposalId);
			});

			it(`it should reject prepares after a value has been accepted`, function () {
				const accept1 = new Accept(1, 1, new ProposalId(0), "some value");
				this.acceptor.handleAccept(accept1);

				const prepare1 = new Prepare(1, 1, new ProposalId(0));
				this.acceptor.handlePrepare(prepare1);

				//proposer should not receive any message
				const proposer = this.cluster.proposers[0]._proposer;
				assert.equal(0, proposer._receivedPromises.length);
			});

		});

		describe('handleAccept()', function () {
			it(`it should broadcast accepted if it didn't make any promise`, function () {
				const accept = new Accept(1, 1, new ProposalId(0), "some value");
				this.acceptor.handleAccept(accept);

				this.cluster.learners.forEach(node => {
					const mockLearner = node._learner;
					assert.equal(1, mockLearner.receivedAccepted.length);

					const accepted = mockLearner.receivedAccepted[0];
					assert.equal(accept.proposalId, accepted.proposalId);
					assert.equal(accept.value, accepted.value);
				});
			});

			it(`it should not answer old accepts if it has made a new promise`, function () {
				const accept = new Accept(1, 1, new ProposalId(0), "some value");

				const prepare = new Prepare(1, 1, new ProposalId(0));
				this.acceptor.handlePrepare(prepare);

				// there was a new promise after the accept
				this.acceptor.handleAccept(accept);

				this.cluster.learners.forEach(node => {
					const mockLearner = node._learner;
					assert.equal(0, mockLearner.receivedAccepted.length);
				});
			});
		});
	});
});