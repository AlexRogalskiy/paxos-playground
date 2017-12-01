import {requestValue, startNode, stopNode} from "./PaxosTestHelper.js";

describe('Paxos Scope with Sync', function () {
	describe('Nodes configured with SyncStrategy', function () {
		before(function () {
			cy.visit('/index.html?config=sync');

			stopNode(3);

			requestValue(0);
		});

		it('Node 3 stays out of date', function () {
			cy.get('#cell-0-1').should('have.text', '0');
			cy.get('#cell-1-1').should('have.text', '0');
			cy.get('#cell-2-1').should('have.text', '0');

			startNode(3);

			cy.get('#cell-3-1').should('have.text', '0');
		});
	});
});