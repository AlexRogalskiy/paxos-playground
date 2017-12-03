import {checkLog, requestValue, stopNode} from "./PaxosTestHelper.js";

describe('Simple Paxos Scope', function () {
	describe('Initial state', function () {
		before(function () {
			cy.visit('/')
		});

		it('should have 4 nodes', function () {
			cy.get('.server').should('have.length', 4);
		});

		it('should have an empty log', function () {
			cy.get('td').each($td => cy.wrap($td).should('not.have.class', 'commited'))
		});

		it('should have all nodes up', function () {
			cy.get('.server').find('.background').should('not.have.class', 'color-stopped');
		});
	});

	describe('Stop node', function () {
		before(function () {
			cy.visit('/');
			stopNode(0);
		});

		it('should have 3 nodes running 1 stopped', function () {
			cy.get('.server').find('.background').should('have.length', 4);
			cy.get('.server').find('.background.color-stopped').should('have.length', 1);
		});

		describe('Resume node after restart', function () {
			before(function () {
				cy.get('#server-0').click();
				cy.get('button[value="resume"]').click();
			});

			it('should have all nodes up', function () {
				cy.get('.server').find('.background').should('not.have.class', 'color-stopped');
			});
		});
	});

	describe('Request value', function () {
		before(function () {
			cy.visit('/');
			requestValue(0)
		});

		it('should send messages and add the value to the log', function () {
			cy.get('.message.Prepare').should('have.length', 3);
			cy.get('.message.Promise').should('have.length', 3);
			cy.get('.message.Accepted').should('have.length', 3);

			//TODO other messages are hard to test

			checkLog(['0']);
		});
	});

	describe('Request value with only 2 nodes', function () {
		before(function () {
			cy.visit('/');

			stopNode(2);
			stopNode(3);

			requestValue(0);
		});

		it('should not reach conclusion', function () {
			//TODO not a great way of testing it because it's indistinguishable from the initial state
			for (let i = 0; i < 4; i++) {
				cy.get(`#cell-${i}-1`).should('have.text', '');
			}
		});
	});

	describe('Request value with only 2 nodes', function () {
		before(function () {
			cy.visit('/');

			requestValue(0);
			requestValue(1);
		});

		it('should add only one value to the log', function () {
			checkLog(['0']);
		});
	});

	//TODO test dropping messages
});