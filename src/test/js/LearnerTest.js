import Node, {allRoles} from "../../main/js/paxos/Node";
import Cluster from "../../main/js/paxos/Cluster";
import Learner from "../../main/js/paxos/Learner";
import {Accept, Accepted, ProposalId} from "../../main/js/paxos/Messages";

const assert = require('assert');

describe('Learner', function () {

	describe('An acceptor in a 3 node cluster', function () {
		beforeEach(function () {
			this.node0 = new Node(0, allRoles);
			this.node1 = new Node(1, allRoles);
			this.node2 = new Node(2, allRoles);

			this.cluster = new Cluster([
				this.node0,
				this.node1,
				this.node2
			]);

			this.node0.setup(this.cluster);
			this.node0.start();

			this.node1.setup(this.cluster);
			this.node1.start();

			this.node2.setup(this.cluster);
			this.node2.start();

			this.learner = new Learner(this.cluster);
		});

		describe('handleAccepted()', function () {
			it(`it should register new accepted message`, function () {
				const proposalId = new ProposalId(0);
				const accept = new Accept(1, 1, proposalId, "some value");
				const accepted = new Accepted(accept);
				this.learner.handleAccepted(accepted);

				assert.equal(1, this.learner._fetchProposal(proposalId)._acceptedSet.size)
			});

			it(`it should get to resolution once the quorum is achieved`, function () {
				const value = "some value";
				const proposalId = new ProposalId(0);

				const accept0 = new Accept(0, 0, proposalId, value);
				const accepted0 = new Accepted(accept0);
				this.learner.handleAccepted(accepted0);

				const accept1 = new Accept(0, 1, proposalId, value);
				const accepted1 = new Accepted(accept1);
				this.learner.handleAccepted(accepted1);

				assert.equal(value, this.learner._finalValue);
			});

			it(`it should ignore messages once resolution was achieved`, function () {
				const value = "some value";
				const proposalId = new ProposalId(0);

				const accept0 = new Accept(0, 0, proposalId, value);
				const accepted0 = new Accepted(accept0);
				this.learner.handleAccepted(accepted0);

				const accept1 = new Accept(0, 1, proposalId, value);
				const accepted1 = new Accepted(accept1);
				this.learner.handleAccepted(accepted1);

				const accept2 = new Accept(0, 2, proposalId, value);
				const accepted2 = new Accepted(accept2);
				this.learner.handleAccepted(accepted2);

				assert.equal(2, this.learner._fetchProposal(proposalId)._acceptedSet.size);
			});

			it(`it should throw exception if we receive same proposalId for different values`, function () {
				const proposalId = new ProposalId(0);

				const accept0 = new Accept(0, 0, proposalId, "some value");
				const accepted0 = new Accepted(accept0);
				this.learner.handleAccepted(accepted0);

				const accept1 = new Accept(0, 1, proposalId, "some other value");
				const accepted1 = new Accepted(accept1);
				assert.throws(() => this.learner.handleAccepted(accepted1));
			});

			it(`it should ignore messages older than the highest proposalId`, function () {
				const proposalIdOld = new ProposalId(0);
				const proposalIdNew = new ProposalId(0);

				const accept0 = new Accept(0, 0, proposalIdNew, "some value");
				const accepted0 = new Accepted(accept0);
				this.learner.handleAccepted(accepted0);

				const accept1 = new Accept(0, 0, proposalIdOld, "some other value");
				const accepted1 = new Accepted(accept1);
				this.learner.handleAccepted(accepted1);

				assert.equal(1, this.learner._fetchProposal(proposalIdNew)._acceptedSet.size);
				assert.equal(0, this.learner._fetchProposal(proposalIdOld)._acceptedSet.size);
			});
		});

	});
});