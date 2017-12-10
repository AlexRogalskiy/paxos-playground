import {stopNode} from "./PaxosTestHelper.js";
import {checkLog, dropMessage} from "./PaxosTestHelper";

describe('Paxos Scope with Sync and Master - Optimized', function () {

	describe('Normal operation', function () {
		before(function () {
			cy.visit('/index.html?config=master-optimized');
		});

		it('Should elect a leader at the start of the simulation', function () {
			cy.get('.server.leader').should('have.length', 1);
		});

		it('The leader should renew lease before it expires', function () {
			cy.get('a.message.Accept', {timeout: 15000}).each(prepare => {
				cy.get('.server.leader').then($leader => {
					expect(prepare.attr('data-from')).to.eq($leader.attr('id').slice(-1));
				});
			});
		});
	});

	//This tests assumes master optimization
	describe("Master optimizations", function () {
		before(function () {
			cy.visit('/index.html?config=master-optimized');
			cy.get('.server.leader').should('have.length', 1);
		});

		it("Communication should be optimized for requests from master", function () {
			cy.get('.server.leader').first().trigger('contextmenu');
			cy.get('a[name="request"]').click();

			cy.get('a.message.Accept').should('have.length', 3);
			cy.get('a.message.Accepted').should('have.length', 3);
			cy.get('a.message.Accepted').should('have.length', 3);

			checkLog(['3', 'v'])
		});
	});

	//This tests assumes master optimization
	describe("Master can't communicate", function () {
		before(function () {
			cy.visit('/index.html?config=master-optimized');
			cy.get('.server.leader').should('have.length', 1);
		});

		it("Master should step down even if he has started an election", function () {
			// Drop master renewal messages
			cy.get('a.message.Accept', {timeout: 30000}).then(() => {
				cy.get('#time-button').click();
			});

			//TODO I know this sucks but is they only thing working for me right now
			cy.get('a.message.Accept').first().click({force: true});
			cy.get('button[value="drop"]').click();

			cy.get('a.message.Accept').first().click({force: true});
			cy.get('button[value="drop"]').click();

			cy.get('a.message.Accept').first().click({force: true});
			cy.get('button[value="drop"]').click();

			cy.get('#time-button').click();

			// After a while nobody should be leader. The original master has step down
			cy.get('.server.leader').should('have.length', 0);
		});
	});


	describe('Master failure', function () {
		before(function () {
			cy.visit('/index.html?config=master-optimized');
			cy.get('.server.leader').should('have.length', 1);
		});

		it('Should elect a new leader if the current one stops', function () {
			cy.get('.server.leader').then($leader => {
				const leaderId = $leader.attr('id');
				stopNode(leaderId.slice(-1));

				cy.get('.server.leader', {timeout: 30000})
					.should('have.length', 1)
					.and('not.have.id', leaderId)
			});
		});
	});

});
