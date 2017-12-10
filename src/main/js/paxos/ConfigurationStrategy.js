import {EntryType} from "./LogEntry.js";
import Cluster from "./Cluster.js";

export const ConfigMixin = (nodeClass) => class extends nodeClass {
	// mixins should either:
	//   a) not define a constructor,
	//   b) require a specific constructor signature
	//   c) pass along all arguments.
	constructor(id, roles, model, enableOptimizations) {
		super(id, roles, model, enableOptimizations)
	}

	addNode(newNode, callback) {
		const newCluster = new Cluster(this.cluster.nodes.concat(newNode));
		const operation = new ConfigOperation(ConfigOperationType.ADD_NODE, newCluster, newNode, callback);
		this.proposeUpdate(operation, EntryType.CONFIG_CHANGE);
	}

	removeNode(nodeToRemove, callback) {
		const currentNodes = this.cluster.nodes;
		if (currentNodes.includes(nodeToRemove)) {
			const newCluster = new Cluster(currentNodes.concat().filter(n => n !== nodeToRemove));
			const operation = new ConfigOperation(ConfigOperationType.REMOVE_NODE, newCluster, nodeToRemove, callback);
			this.proposeUpdate(operation, EntryType.CONFIG_CHANGE);
		}
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

		if (resolutionEntry.entryType === EntryType.CONFIG_CHANGE
			&& operation.operationType === ConfigOperationType.REMOVE_NODE && operation.node.id === this._masterId) {
			//The master is gone! start election
			this.leaseExpired();
		}
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