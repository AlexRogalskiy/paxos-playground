/* jshint globalstrict: true */
/* jshint browser: true */
/* jshint devel: true */
/* jshint jquery: true */
/* global util */
/* global graphics */
/* global INITIAL_SERVER_NUMBER */
'use strict';

const paxos = {};
const RPC_TIMEOUT = 50000; //TODO use it to make progress
const MIN_RPC_LATENCY = 10000;
const MAX_RPC_LATENCY = 15000;
const ELECTION_TIMEOUT = 100000;

(function () {
	paxos.getServerIndexById = (model, id) => model.servers.findIndex(srv => srv.id === id);

	paxos.update = (model) => {
		model.messageHandler.update(model);
		model.messages = model.messageHandler.inFlightMessages;
	};

	paxos.stop = (server) => {
		server.stop();
	};

	paxos.resume = (server) => {
		server.start();
	};

	paxos.resumeAll = (model) => {
		model.servers.forEach(server => paxos.resume(server));
	};

	paxos.restart = (server) => {
		paxos.stop(server);
		paxos.resume(server);
	};

	paxos.drop = (model, message) => {
		model.messages = model.messages.filter(m => m !== message);
	};

	paxos.clientRequest = (server) => {
		//TODO let the user specify value
		server.clientRequest("v")
	};

	// Leadership is not implemented yet. If no server is leader all are leaders
	paxos.getLeader = (model) => model.servers[0]

})();
