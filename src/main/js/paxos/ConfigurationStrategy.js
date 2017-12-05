import {EntryType} from "./LogEntry.js";
import Cluster from "./Cluster.js";

export const ConfigMixin = (nodeClass) => class extends nodeClass {
	// mixins should either:
	//   a) not define a constructor,
	//   b) require a specific constructor signature
	//   c) pass along all arguments.

	addNode(node, callback) {
		const newCluster = new Cluster(this.cluster.nodes.concat(node));
		const operation = new ConfigOperation(ConfigOperationType.ADD_NODE, newCluster, node, callback);
		this.proposeUpdate(operation, EntryType.CONFIG_CHANGE);
	}

	removeNode(node) {
		//TODO implement
	}

	resolutionAchieved(resolution) {
		const resolutionEntry = resolution.value;
		const operation = resolutionEntry.value;

		let quorumIncreased = false;
		if (resolutionEntry.entryType === EntryType.CONFIG_CHANGE) {
			const newCluster = operation.newCluster;
			const oldCluster = super.cluster;
			quorumIncreased = newCluster.quorum > oldCluster.quorum;

			super.cluster = newCluster; //Update cluster for this node
			operation.callback(newCluster, operation.node);
		}

		super.resolutionAchieved(resolution);

		//handle quorum increase
		if (quorumIncreased && this.isMaster()) {
			this.renewLease();
		}

		//TODO consider removed master scenario!
		//TODO consider messages lost after node removal. What will happen to them
	}

};

class ConfigOperation {
	constructor(operationType, newCluster, node, callback) {
		this._operationType = operationType;
		this._newCluster = newCluster;
		this._node = node;
		this._callback = callback
	}

	get operationType() {
		return this._operationType;
	}

	get newCluster() {
		return this._newCluster;
	}


	get node() {
		return this._node;
	}

	get callback() {
		return this._callback;
	}
}

const ConfigOperationType = {
	ADD_NODE: Symbol("add_node"),
	REMOVE_NODE: Symbol("remove_node"),
};