module.exports = (function() {
	"use strict";

	var fs = require('fs');
	var path = require('path');
	var ImageItem = require(__dirname + "/image-item");
	var stylus = require('stylus');

	var Collector = function(data) {
		this.data = {
			"images": data.images || [],
			"styles": data.styles || []
		};
		this.initConfig(data.options || {});
	};

	Collector.prototype.initConfig = function(params) {
		this.config = {
			"target": params.target || "",
			"targetCSS": params.targetCSS || "",
			"masterAppPath": params.masterAppPath || "",
			"collectors": {
				"usageData": {
					"enabled": params.isUsageRequired || false,
					"modulePath": path.join(__dirname, "usage-stat-collector")
				},
				"metaData": {
					"enabled": params.isMetaRequired || false,
					"modulePath": path.join(__dirname, "image-meta-collector")
				}
			}
		};
	};

	Collector.prototype.dataInitializers = {};

	Collector.prototype.dataInitializers.images = function() {
		var images = this.data.images.slice(0);
		var masterAppPath = this.config.masterAppPath;

		this.data.images = initResItems(images, function(file) {
			return ImageItem.isImage(file);
		}, function(file, stat) {
			return new ImageItem(file, stat, masterAppPath);
		});
	};

	Collector.prototype.dataInitializers.styles = function() {
		if (!this.config.collectors.usageData.enabled) return;
		var styles = this.data.styles.slice(0);
		var includes = [];

		this.data.styles = initResItems(styles, function(file) {
			return file && (~file.indexOf('.css') || ~file.indexOf('.styl'));
		}, function(file) {
			if (~file.indexOf('.global.styl')) {
				includes.push(file);
				return;
			}
			return {
				"path": file,
				"content": fs.readFileSync(file, "utf-8"),
				"isStylFile": !!~file.indexOf('.styl')
			};
		});
		this.data.styles.forEach(function(item) {
			if (item.isStylFile) {
				var styl = stylus(item.content);
				includes.forEach(function(path) {
					styl.import(path);
				});
				styl.render(function(err, css) {
					if (err) throw err;
					item.content = css;
				});
				//console.log(item.content);
			}
		});		
	};

	Collector.prototype.initResourcesData = function() {
		var self = this;
		Object.keys(this.dataInitializers).forEach(function(prop) {
			self.dataInitializers.hasOwnProperty(prop) && self.dataInitializers[prop].call(self);
		});
	};

	Collector.prototype.collectStatistics = function() {
		var actions = [];
		var self = this;

		if (self.config.collectors.metaData.enabled) {
			actions.push(function(callback) {
				require(self.config.collectors.metaData.modulePath)(self.data.images, function(filesMeta) {
					filesMeta.forEach(function(meta) {
						var metaPath = meta.artifacts && meta.artifacts.filename ? meta.artifacts.filename : undefined;
						self.data.images.forEach(function(file) {
							if (file.getPath() === metaPath) file.setMeta(meta);
						});
					});
					callback();
				});
			});
		}

		if (self.config.collectors.usageData.enabled) {
			actions.push(function(callback) {
				require(self.config.collectors.usageData.modulePath)(self.data, function(cssStat) {
					callback();
				});
			});
		}

		sequentialCall(actions, function() {
			self.done();
		});
	};

	Collector.prototype.getData = function(cb) {
		var self = this;
		cb = cb || function() {};
		this.done = function() {
			return cb(self.data.images);
		};
		this.initResourcesData();
		this.collectStatistics();
	};

	var initResItems = function(list, isValid, cb) {
		var results = [];
		list.forEach(function(file) {
			var stat = fs.statSync(file);
			if (isValid(file)) {
				var newItem = cb(file, stat);
				newItem && results.push(newItem);
			}
		});

		return results;
	};

	var sequentialCall = function(actions, callback) {
		if (!actions || !actions.length) {
			callback && callback();
			return;
		}
		actions.shift()(function() {
			sequentialCall(actions, callback);
		});
	};

	return Collector;
})();