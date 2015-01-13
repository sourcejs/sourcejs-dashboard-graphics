module.exports = (function() {
	"use strict";

	var path = require('path');
	var fs = require('fs');

	var defaults = {
		"url": "",
		"path": "",
		"filename": "",
		"modifiedDate": new Date().toString(),
		"createdDate": new Date().toString(),
		"metaInfo": {},
		"usages": [],
		"size": 0
	};

	var data;

	var ImageItem = function(path, stat, masterAppPath) {
		if (!path || !fs.existsSync(path)) {
			throw "IllegalArgumentException: Incorrect path argument [" + path + "]";
		}
		for (var prop in defaults) {
			this[prop] = defaults[prop];
		}
		this.basePath = masterAppPath;
		this.setPath(path);
		this.initItemFields(stat);
	};

	ImageItem.isImage = function(filename) {
		return /\.(gif|jpg|jpeg|tiff|png)$/i.test(filename);
	}

	ImageItem.prototype = {
		'setPath': function(path) {
			this.path = path;
		},

		'getPath': function() {
			return this.path;
		},

		'getUrl': function() {
			return this.url;
		},

		/**
		 * @param [Object] stat - fs.stat() or fs.statSync() result:
		 */
		'initItemFields': function(stat) {
			stat = stat || fs.statSync(this.getPath());
			this.url = this.getPath().replace(this.basePath, "");
			this.filename = path.basename(this.getPath());

			if (!stat) return;
			this.modifiedDate = stat.mtime || _defaults.modifiedDate;
			this.createdDate = stat.ctime || _defaults.createdDate;
			this.size = stat.size || _defaults.size;
		},

		'deletePixelsMap': function(meta) {
			for (var prop in meta) {
				if (prop.match(/[0-9]+/)) {
					delete meta[prop];
				}
			}
		},

		'setMeta': function(meta) {
			this.deletePixelsMap(meta);
			this.metaInfo = meta || _defaults.metaInfo;
		},

		'setUsages': function(usages) {
			if (this.usages && this.usages.length) {
				this.usages = this.usages.concat(usages);
			} else {
				this.usages = usages;
			}
		}
	};

	return ImageItem;

})();