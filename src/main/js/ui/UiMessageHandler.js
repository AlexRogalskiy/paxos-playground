import {Accept, Accepted, CatchUp, Prepare, Promise, SyncRequest} from "../paxos/Messages.js";
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
		this.cluster = this._model.cluster; // Update cluster in case there was a change

		// Remove messages that were sent or are to be received by dead servers
		this._removeMessagesToRemovedServers();
		this._removeMessagesFromRemovedServers();

		// Remove messages that need to be dropped
		this._removeDroppedMessages(model);

		// Deliver messages due for delivery
		this._deliverMsgsDueForDelivery(model);
	}

	_removeMessagesToRemovedServers() {
		this._inFlightMessages = this._inFlightMessages
			.filter(msg => this.cluster.nodes.some(n => n.id === msg.targetNodeId));
	}

	_removeMessagesFromRemovedServers() {
		this._inFlightMessages = this._inFlightMessages
			.filter(msg => this.cluster.nodes.some(n => n.id === msg.sourceNodeId));
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
		if (playback.isPaused() && message.constructor === SyncRequest) {
			//Hack to ignore sync messages if simulation is paused
			//TODO should fix when implementing master policy
			console.log("ignoring sync message as simulation is stopped");
			return;
		}

		const sendTime = this._model.time;
		const recvTime = this._calculateRecvTime();
		const dropTime = this._calculateDropTime(recvTime, sendTime);
		
		Object.assign(message, {
			sendTime: sendTime,
			recvTime: recvTime,
			dropTime: dropTime,
			from: message.sourceNodeId,
			to: message.targetNodeId,
			direction: UiMessageHandler._calculateDirection(message),
			type: message.constructor.name,
			term: message.paxosInstanceNumber
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

	_calculateDropTime(recvTime, sendTime) {
		if (Math.random() < this._model.channelNoise) {
			return (recvTime - sendTime) * util.randomBetween(1 / 3, 3 / 4) + sendTime;
		}
	}

	static _calculateDirection(message) {
		switch (message.constructor) {
			case Prepare:
			case Accept:
			case SyncRequest:
				return REQUEST;
			case Promise :
			case Accepted:
			case CatchUp:
				return REPLY;
			default:
				console.log(`Don't know how to handle message ${typeof message}`)
		}
	}

	dropMessage(message) {
		this._inFlightMessages = this.inFlightMessages.filter(m => m !== message);
	}

	get inFlightMessages() {
		return this._inFlightMessages;
	}
}

const REQUEST = 'request';
const REPLY = 'reply';


export default UiMessageHandler;