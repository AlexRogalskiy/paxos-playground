/* jshint globalstrict: true */
/* jshint browser: true */
/* jshint devel: true */
/* jshint jquery: true */
/* global paxos */
/* global makeState */
/* global render */
/* global graphics */
/* global playback */
/* global presenter */
/* global util */
/* global speedSlider */
'use strict';
import Node, {allRoles} from "../paxos/Node.js";
import Cluster from "../paxos/Cluster.js";
import UiMessageHandler from "./UiMessageHandler.js";
import {MasterMixin} from "../paxos/MasterStrategy.js";
import {SyncMixin} from "../paxos/SyncStrategy.js";

//this is just short-hand to call document.onReady(function)
$(function () {
	const INITIAL_SERVER_NUMBER = 4;

	// Initializes servers and state
	window.state = makeState({ // this is "current"
		cluster: undefined,
		messageHandler: undefined,
		servers: [],
		messages: [],
		pendingConf: [], //TODO not used for now
		deadServersWalking: {},
		channelNoise: 0,
	});

	// create servers
	(function () {
		const allNodes = [];
		for (let i = 0; i < INITIAL_SERVER_NUMBER; i++) {
			const urlParams = new URLSearchParams(window.location.search);
			const config = urlParams.get('config');
			let node;
			if (config === 'master-optimized') {
				node = new NodeWithMaster(i, allRoles, window.state.current, true)
			} else if (config === 'master') {
				node = new NodeWithMaster(i, allRoles, window.state.current, false)
			} else if (config === 'sync') {
				node = new NodeWithSync(i, allRoles)
			} else {
				node = new Node(i, allRoles)
			}

			allNodes.push(node);
		}

		const cluster = new Cluster(allNodes);
		window.state.current.cluster = cluster;

		const messageHandler = new UiMessageHandler(window.state.current, cluster);
		window.state.current.messageHandler = messageHandler;

		allNodes.forEach(node => {
			node.setup(cluster, messageHandler);
			node.start();
			window.state.current.servers.push(node);
		});
	})();

	window.state.current.servers.forEach(graphics.get_creator(window.state.current.servers.length));


	// Disabled for now, they don't seem to behave reliably.
	// // enable tooltips
	// $('[data-toggle="tooltip"]').tooltip();

	window.state.init();

	// This is the main function which determines each tick in the simulation
	(function () {
		let last = null;
		const step = function (timestamp) {
			if (!playback.isPaused() && last !== null && timestamp - last < 500) {
				const wallMicrosElapsed = (timestamp - last) * 1000;
				const speed = util.speedSliderTransform(speedSlider.slider('getValue'));
				const modelMicrosElapsed = wallMicrosElapsed / speed;
				const modelMicros = window.state.current.time + modelMicrosElapsed;
				window.state.seek(modelMicros);
				if (modelMicros >= window.state.getMaxTime() && presenter.recorder.onReplayDone !== undefined) {
					const f = presenter.recorder.onReplayDone;
					presenter.recorder.onReplayDone = undefined;
					f();
				}
				render.update();
			}
			last = timestamp;
			window.requestAnimationFrame(step);
		};

		window.requestAnimationFrame(step); //initial step
	})();

});

//TODO can we simplify this?
class NodeWithMaster extends MasterMixin(SyncMixin(Node)) {
	constructor(...args) {
		super(...args);
	}
}

class NodeWithSync extends SyncMixin(Node) {
	constructor(...args) {
		super(...args);
	}
}
