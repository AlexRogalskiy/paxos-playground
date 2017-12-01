import Node from "./Node.js";

const ResolutionMixin = (nodeClass) => class extends nodeClass {
	// mixins should either:
	//   a) not define a constructor,
	//   b) require a specificconstructor signature
	//   c) pass along all arguments.

	prepareValue(value) {
		super.prepareValue(value);

		this.prepareRetryTaskId = setInterval(super.proposer.broadcastPrepare(), 10000);
	}

	handlePromise(promise) {
		super.handlePromise(promise);

		this.acceptRetryTaskId = setInterval(super.proposer.broadcastAccept(), 10000);
	}

};

class NodeWithResolution extends ResolutionMixin(Node) {
	constructor(...args) {
		super(...args);
	}
}

const RETRANSMIT_INTERVAL = 20000;

export default NodeWithResolution