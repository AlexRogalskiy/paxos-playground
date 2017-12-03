class MockMessageHandler {

	constructor() {
		this._messages = [];
	}

	send(message) {
		this._messages.push(message);
	}

	get messages() {
		return this._messages;
	}
}


export default MockMessageHandler;