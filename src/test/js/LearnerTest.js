import Node, {allRoles} from "../../main/js/paxos/Node";
import Cluster from "../../main/js/paxos/Cluster";
import Learner from "../../main/js/paxos/Learner";
import {Accept, Accepted, ProposalId} from "../../main/js/paxos/Messages";
import ImmediateDeliveryMessageHandler from "./mocks/ImmediateDeliveryMessageHandler";

const assert = require('assert');

describe('Learner', function () {

	describe('An acceptor in a 3 node cluster', function () {
		beforeEach(function () {
			const allNodes = [];
			for (let i = 0; i < 3; i++) {
				allNodes.push(new Node(i, allRoles));
			}

			this.cluster = new Cluster(allNodes);

			const messageHandler = new ImmediateDeliveryMessageHandler(this.cluster);
			allNodes.forEach(node => {
				node.setup(this.cluster, messageHandler);
				node.start();
			});

			this.learner = new Learner(messageHandler, 0, this.cluster);
		});

		describe('handleAccepted()', function () {
			it(`it should register new accepted message`, function () {
				const proposalId = new ProposalId(0);
				const accept = new Accept(0, 1, 1, proposalId, "some value");
				const accepted = new Accepted(accept, 0);
				this.learner.handleAccepted(accepted);

				assert.equal(1, this.learner._fetchProposal(proposalId)._acceptedSet.size)
			});

			it(`it should get to resolution once the quorum is achieved`, function () {
				const value = "some value";
				const proposalId = new ProposalId(0);

				const accept0 = new Accept(0, 0, 0, proposalId, value);
				const accepted0 = new Accepted(accept0, 0);
				this.learner.handleAccepted(accepted0);

				const accept1 = new Accept(0, 0, 1, proposalId, value);
				const accepted1 = new Accepted(accept1, 0);
				const resolution = this.learner.handleAccepted(accepted1);

				assert.equal(value, resolution.value);
			});

			it(`it should ignore message and return resolution once resolution was achieved`, function () {
				const value = "some value";
				const proposalId = new ProposalId(0);

				const accept0 = new Accept(0, 0, 0, proposalId, value);
				const accepted0 = new Accepted(accept0, 0);
				this.learner.handleAccepted(accepted0);

				const accept1 = new Accept(0, 0, 1, proposalId, value);
				const accepted1 = new Accepted(accept1, 0);
				const resolution1 = this.learner.handleAccepted(accepted1);

				const accept2 = new Accept(0, 0, 2, proposalId, value);
				const accepted2 = new Accepted(accept2, 0);
				const resolution2 = this.learner.handleAccepted(accepted2);

				//ignore message
				assert.equal(2, this.learner._fetchProposal(proposalId)._acceptedSet.size);
				//return resolution
				assert.equal(resolution1, resolution2);
			});

			it(`it should throw exception if we receive same proposalId for different values`, function () {
				const proposalId = new ProposalId(0);

				const accept0 = new Accept(0, 0, 0, proposalId, "some value");
				const accepted0 = new Accepted(accept0, 0);
				this.learner.handleAccepted(accepted0);

				const accept1 = new Accept(0, 0, 1, proposalId, "some other value");
				const accepted1 = new Accepted(accept1, 0);
				assert.throws(() => this.learner.handleAccepted(accepted1));
			});

			it(`it should ignore messages older than the highest proposalId`, function () {
				const proposalIdOld = new ProposalId(0);
				const proposalIdNew = new ProposalId(0);

				const accept0 = new Accept(0, 0, 0, proposalIdNew, "some value");
				const accepted0 = new Accepted(accept0, 0);
				this.learner.handleAccepted(accepted0, 0);

				const accept1 = new Accept(0, 0, 0, proposalIdOld, "some other value");
				const accepted1 = new Accepted(accept1, 0);
				this.learner.handleAccepted(accepted1);

				assert.equal(1, this.learner._fetchProposal(proposalIdNew)._acceptedSet.size);
				assert.equal(0, this.learner._fetchProposal(proposalIdOld)._acceptedSet.size);
			});
		});

	});
});