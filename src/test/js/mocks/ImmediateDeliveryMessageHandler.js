import MessageHandler from "../../../main/js/paxos/MessageHandler";

class ImmediateDeliveryMessageHandler extends MessageHandler {
	constructor(cluster) {
		super(cluster)
	}

	send(message) {
		super.send(message);
		super.deliver(message);
	}

}


export default ImmediateDeliveryMessageHandler;