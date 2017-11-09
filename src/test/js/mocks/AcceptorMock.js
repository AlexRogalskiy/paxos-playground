class AcceptorMock {
	_receivedPrepares;
	_receivedAccepts;

	constructor() {
		this._receivedPrepares = [];
		this._receivedAccepts = [];
	}

	handlePrepare(prepare) {
		this._receivedPrepares.push(prepare)
	}

	handleAccept(accept) {
		this._receivedAccepts.push(accept)
	}

	get receivedPrepares() {
		return this._receivedPrepares;
	}

	get receivedAccepts() {
		return this._receivedAccepts;
	}
}

export default AcceptorMock;