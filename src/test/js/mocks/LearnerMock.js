class LearnerMock {
	_receivedAccepted;

	constructor() {
		this._receivedAccepted = [];
	}

	handleAccepted(accepted) {
		this._receivedAccepted.push(accepted)
	}

	get receivedAccepted() {
		return this._receivedAccepted;
	}

}

export default LearnerMock;