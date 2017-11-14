import {Accept, Accepted, Prepare, Promise} from "./Messages.js";

class MessageHandler {
	// _inFlightMessages;
	// _cluster;

	constructor(cluster) {
		this._cluster = cluster;
		this._inFlightMessages = [];
	}

	send(message) {
		this._inFlightMessages.push(message);
	}

	deliver(message) {
		const index = this._inFlightMessages.indexOf(message);
		if (index > -1) {
			this._inFlightMessages.splice(index, 1);

			const targetNode = this._cluster.nodes[message.targetNodeId];

			if (targetNode === undefined) {
				console.log(`Node ${message.targetNodeId} not found on cluster. I'm not delivering this`);
				return;
			}

			switch (message.constructor) {
				case Prepare:
					targetNode.handlePrepare(message);
					break;
				case Promise:
					targetNode.handlePromise(message);
					break;
				case Accept:
					targetNode.handleAccept(message);
					break;
				case Accepted:
					targetNode.handleAccepted(message);
					break;
				default:
					console.log(`Don't know how to handle message ${message}`)
			}
		}
	}
}


export default MessageHandler;