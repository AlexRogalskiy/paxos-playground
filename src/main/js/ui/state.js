/* jshint globalstrict: true */
/* jshint browser: true */
/* jshint devel: true */
/* jshint jquery: true */
/* global util */
/* global graphics */
/* global paxos */
/* global render */
'use strict';

const makeState = function (initial) {
	let checkpoints = [];
	let maxTime = 0;
	const prev = function (time) {
		return util.greatestLower(checkpoints,
			function (m) {
				return m.time > time;
			});
	};
	const self = {
		current: initial,
		getMaxTime: function () {
			return maxTime;
		},
		init: function () {
			checkpoints.push(util.clone(self.current));
		},
		fork: function () {
			const i = prev(self.current.time);
			while (checkpoints.length - 1 > i)
				checkpoints.pop();
			maxTime = self.current.time;
		},
		fixGraphicsOnTimeChange: function (time, current, next) {
			const create = graphics.get_creator(next.servers.length);

			// Add missing servers
			const toAdd = util.srvArraySub(next.servers, current.servers);
			toAdd.forEach(function (server) {
				create(server, paxos.getServerIndexById(next, server.id));
			});

			// Remove leftovers
			const toRem = util.srvArraySub(current.servers, next.servers);
			toRem.forEach(function (server) {
				$('#server-' + server.id).remove();
			});

			// realign
			next.servers.forEach(graphics.realign(next.servers.length));
			render.update();

		},
		rewind: function (time) {
			// HANDLE: graphics changes
			const next = util.clone(checkpoints[prev(time)]);
			self.fixGraphicsOnTimeChange(time, self.current, next);
			self.current = next;
			self.current.time = time;
		},
		base: function () {
			return checkpoints[prev(self.current.time)];
		},
		advance: function (time) {
			maxTime = time;
			self.current.time = time;
			if (self.updater())
				checkpoints.push(util.clone(self.current));
		},
		save: function () {
			checkpoints.push(util.clone(self.current));
		},
		seek: function (time) {
			if (time <= maxTime) {
				self.rewind(time);
			} else if (time > maxTime) {
				self.advance(time);
			}
		},
		updater: function () {
			paxos.update(self.current);
			const time = self.current.time;
			const base = self.base(time);
			self.current.time = base.time;
			let same = util.equals(self.current, base);
			self.current.time = time;
			return !same;
		},

		// Used in presenter.js
		exportToString: function () {
			return JSON.stringify({
				checkpoints: checkpoints,
				maxTime: maxTime,
			});
		},
		importFromString: function (s) {
			const o = JSON.parse(s);
			checkpoints = o.checkpoints;
			maxTime = o.maxTime;
			self.current = util.clone(checkpoints[0]);
			self.current.time = 0;
		},
		clear: function () {
			checkpoints = [];
			self.current = initial;
			self.current.time = 0;
			maxTime = 0;
		},
	};
	self.current.time = 0;
	return self;
};
