let checkLog = function () {
	cy.get('#cell-0-1').should('have.text', '0');
	cy.get('#cell-1-1').should('have.text', '0');
	cy.get('#cell-2-1').should('have.text', '0');
	cy.get('#cell-3-1').should('have.text', '0');
};

let stopNode = function (nodeId) {
	cy.get(`#server-${nodeId}`).trigger('contextmenu');
	cy.get('a[name="stop"]').click();
};

let requestValue = function (nodeId) {
	cy.get(`#server-${nodeId}`).trigger('contextmenu');
	cy.get('a[name="request"]').click();
};
describe('Paxos Scope', function () {
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

		it('see 3 prepare messages', function () {
			cy.get('.message.Prepare').should('have.length', 3);
		});

		it('see 3 promises', function () {
			cy.get('.message.Promise').should('have.length', 3);
		});

		it('see 3 accept', function () {
			cy.get('.message.Accept').should('have.length', 3);
		});

		//TODO accepted messages are hard to test

		it('should add value to the log', function () {
			checkLog();
		});
	});

	describe('Request value concurrently', function () {
		before(function () {
			cy.visit('/');

			//right click
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
			checkLog();
		});
	});
});