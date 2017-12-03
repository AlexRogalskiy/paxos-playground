export const checkLog = function (expectedValues) {
	let i = 1;
	for (let expectedValue of expectedValues) {
		cy.get(`#cell-0-${i}`).should('have.text', expectedValue);
		cy.get(`#cell-1-${i}`).should('have.text', expectedValue);
		cy.get(`#cell-2-${i}`).should('have.text', expectedValue);
		cy.get(`#cell-3-${i}`).should('have.text', expectedValue);
		i++;
	}
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