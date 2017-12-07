import {dropMessage} from "./PaxosTestHelper";

describe('Paxos Scope with Sync and Master - Optimized and Config strategy', function () {

	describe('Add one Node', function () {
		before(function () {
			cy.visit('/index.html?config=master-optimized-config');
			cy.get('.server.leader').should('have.length', 1);
		});

		it('Should add node', function () {
			cy.get('#add-server').click();
			cy.get('.server').should('have.length', 5);
		});
	});

	describe('Add two Nodes', function () {
		before(function () {
			cy.visit('/index.html?config=master-optimized-config');
			cy.get('.server.leader').should('have.length', 1);
		});

		it('Increasing the quorum should make master renew the lease', function () {
			cy.get('#add-server').click();
			cy.get('.server').should('have.length', 5);

			cy.get('.server.leader').find('text.term').should('have.text', '2');
			cy.get('#add-server').click();
			cy.get('.server').should('have.length', 6);

			cy.get('a.message.Accept').each(prepare => {
				cy.get('.server.leader').then($leader => {
					expect(prepare.attr('data-from')).to.eq($leader.attr('id').slice(-1));
				});
			});
		});
	});

	describe('Remove a node', function () {
		before(function () {
			cy.visit('/index.html?config=master-optimized-config');
			cy.get('.server.leader').should('have.length', 1);
		});

		it('Should have only 3 nodes after removal', function () {
			cy.get(`#server-0`).trigger('contextmenu');
			cy.get('a[name="remove"]').click();

			cy.get('.server').should('have.length', 3);
		});
	});

	describe('Remove master', function () {
		before(function () {
			cy.visit('/index.html?config=master-optimized-config');
			cy.get('.server.leader').should('have.length', 1);
		});

		it('Should trigger election after master removal', function () {
			cy.get('.server.leader').trigger('contextmenu');
			cy.get('a[name="remove"]').click();

			cy.get('a.message.Prepare').should('have.length.above', 2);
		});
	});

	// TODO test 2 nodes, 1 node, 0 nodes

});
