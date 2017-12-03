export const checkLog = function (expectedValue) {
	cy.get('#cell-0-1').should('have.text', expectedValue);
	cy.get('#cell-1-1').should('have.text', expectedValue);
	cy.get('#cell-2-1').should('have.text', expectedValue);
	cy.get('#cell-3-1').should('have.text', expectedValue);
};

export const stopNode = function (nodeId) {
	cy.get(`#server-${nodeId}`).trigger('contextmenu');
	cy.get('a[name="stop"]').click();
};

export const startNode = function (nodeId) {
	cy.get(`#server-${nodeId}`).trigger('contextmenu');
	cy.get('a[name="resume"]').click();
};

export const requestValue = function (nodeId) {
	cy.get(`#server-${nodeId}`).trigger('contextmenu');
	cy.get('a[name="request"]').click();
};