class ProposerMock {
	_receivedPromises;

	constructor() {
		this._receivedPromises = [];
	}

	handlePromise(promise) {
		this._receivedPromises.push(promise)
	}

	get receivedPromises() {
		return this._receivedPromises;
	}

}

export default ProposerMock;