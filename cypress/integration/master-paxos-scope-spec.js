import {stopNode} from "./PaxosTestHelper.js";

describe('Paxos Scope with Sync and Master', function () {
	describe('Normal operation', function () {
		before(function () {
			cy.visit('/index.html?config=master');
		});

		it('Should elect a leader at the start of the simulation', function () {
			cy.get('.server.leader').should('have.length', 1);
		});

		it('The leader should renew lease before it expires', function () {
			cy.get('a.message.Prepare').each(prepare => {
				cy.get('.server.leader').then($leader => {
					expect(prepare.attr('data-from')).to.eq($leader.attr('id').slice(-1));
				});
			});
		});

		it('Should elect a new leader if the current one stops', function () {
			cy.get('.server.leader').then($leader => {
				const leaderId = $leader.attr('id');
				stopNode(leaderId.slice(-1));

				cy.get('.server.leader', {timeout: 15000})
					.should('have.length', 1)
					.and('not.have.id', leaderId)
			});
		});
	});
});