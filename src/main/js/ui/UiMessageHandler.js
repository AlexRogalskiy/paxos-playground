import {Accept, Accepted, Prepare, Promise} from "../paxos/Messages.js";
import MessageHandler from "../paxos/MessageHandler.js";

/**
 * Extends messages on the message handler to contain simulation information such as
 * send and delivery time.
 *
 * It serves as a bridge between paxos model and UI
 */
class UiMessageHandler extends MessageHandler {
	// _model;

	constructor(model, cluster) {
		super(cluster);
		this._model = model;
	}

	/**
	 * Deliver messages due for delivery and remove dropped ones.
	 *
	 * @param model the model with the current time
	 */
	update(model) {
		this._model = model;

		// Deliver messages due for delivery
		this._deliverMsgsDueForDelivery(model);

		// Remove messages that need to be dropped
		this._removeDroppedMessages(model);
	}

	_removeDroppedMessages(model) {
		this._inFlightMessages = this._inFlightMessages
			.filter(msg => msg.recvTime < util.Inf && !(msg.dropTime && msg.dropTime <= model.time));
	}

	_deliverMsgsDueForDelivery(model) {
		this._inFlightMessages
			.filter(msg => msg.recvTime <= model.time)
			.forEach(msg => this.deliver(msg));
	}

	send(message) {
		Object.assign(message, {
			sendTime: this._model.time,
			recvTime: this._calculateRecvTime(),
			dropTime: this._calculateDropTime(),
			from: message.sourceNodeId,
			to: message.targetNodeId,
			direction: UiMessageHandler._calculateDirection(message),
			type: message.constructor.name
		});
		this._inFlightMessages.push(message);

		if (message.sourceNodeId === message.targetNodeId) {
			// deliver messages to myself immediately
			this.deliver(message);
		}
	}

	_calculateRecvTime() {
		return this._model.time +
			MIN_RPC_LATENCY +
			Math.random() * (MAX_RPC_LATENCY - MIN_RPC_LATENCY);
	}

	_calculateDropTime() {
		if (Math.random() < this._model.channelNoise) {
			return (message.recvTime - message.sendTime) * util.randomBetween(1 / 3, 3 / 4) + message.sendTime;
		}
	}

	static _calculateDirection(message) {
		switch (message.constructor) {
			case Prepare:
			case Accept:
				return REQUEST;
			case Promise :
			case Accepted:
				return REPLY;
			default:
				console.log(`Don't know how to handle message ${typeof message}`)
		}
	}

	get inFlightMessages() {
		return this._inFlightMessages;
	}
}

const REQUEST = 'request';
const REPLY = 'reply';


export default UiMessageHandler;