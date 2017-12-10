/* jshint globalstrict: true */
/* jshint browser: true */
/* jshint devel: true */
/* jshint jquery: true */
/* global util */
/* global raft */
/* global paxos */
/* global state */
/* global render */
/* global playback */
/* global speedSlider */
/* global MAX_RPC_LATENCY */
'use strict';

const presenter = {};

$(function () {
	presenter.recorder = {};

	presenter.recorder.onReplayDone = undefined;
	presenter.recorder.record = function (name) {
		localStorage.setItem(name, state.exportToString());
	};

	presenter.recorder.replay = function (name, done) {
		state.importFromString(localStorage.getItem(name));
		render.update();
		presenter.recorder.onReplayDone = done;
	};

	$("#help").click(function () {
		playback.pause();
		$('#modal-help').modal('show');
	});

	$("#reset-simulation").click(function () {
		state.clear();
		state.save();
		playback.pause();
		// noinspection ES6ModulesDependencies
		render.update();
	});

	window.onkeydown = function (e) {
		return !(e.keyCode === 32);
	};

	$(window).keyup(function (e) {
		if (e.target.id === "title") {
			return;
		}

		let processed = false;
		if (e.keyCode === ' '.charCodeAt(0) || e.keyCode === 190 /* dot, emitted by Logitech remote */) {
			$('.modal').modal('hide');
			playback.toggle();
			processed = true;
		} else if (e.keyCode === 191 && e.shiftKey) { /* question mark */
			playback.pause();
			$('#modal-help').modal('show');
			processed = true;
		} else if (e.keyCode === 107 || e.keyCode === 221 || e.keyCode === 187) { /* numpad + and keyboard ] */
			speedSlider.slider('setValue', util.clamp(speedSlider.slider('getValue') - 0.3, 0, 3));
			render.update();
			$('.modal').modal('hide');
			processed = true;
		} else if (e.keyCode === 109 || e.keyCode === 219 || e.keyCode === 189) { /* numpad - and keyboard [ */
			speedSlider.slider('setValue', util.clamp(speedSlider.slider('getValue') + 0.3, 0, 3));
			render.update();
			$('.modal').modal('hide');
			processed = true;
		} else if (e.keyCode === 'N'.charCodeAt(0)) {
			speedSlider.slider('setValue', 2.0);
			render.update();
			$('.modal').modal('hide');
			processed = true;
		}
		//TODO not implemented yet
		// else if (e.keyCode === 'G'.charCodeAt(0)) {
		// 	state.fork();
		// 	raft.addServer(state.current);
		// 	state.save();
		// 	render.update();
		// 	$('.modal').modal('hide');
		// 	processed = true;
		// }
		// else if (e.keyCode == 'J'.charCodeAt(0)) {
		//     e.preventDefault();
		//     state.clear();
		//     state.save();
		//     playback.pause();
		//     render.update();
		// }
		return !processed;
	});

});
