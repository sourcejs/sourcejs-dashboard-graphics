(function(app, config, storage) {
	"use strict";

	var glob = require("multi-glob").glob;
	var fs = require('fs');
	var router = require('express').Router();
	var childProcess = require("child_process");
	var path = require('path');

	// simplified jQuery.extend function
	var extend = function() {
		var options, name, src, copy, copyIsArray, clone,
			i = 1,
			target = arguments[0];

		if ((typeof target !== 'object' && typeof target !== 'function') || target == null) {
			target = {};
		}

		for (; i < arguments.length; ++i) {
			options = arguments[i];
			if (options != null) {
				for (name in options) {
					src = target[name];
					copy = options[name];
					if (target === copy) {
						continue;
					}
					if (copy && (isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {
						if (copyIsArray) {
							copyIsArray = false;
							clone = src && Array.isArray(src) ? src : [];
						} else {
							clone = src && isPlainObject(src) ? src : {};
						}
						target[name] = extend(clone, copy);
					} else if (copy !== undefined) {
						target[name] = copy;
					}
				}
			}
		}
		return target;
	};

	// there is no constructor processing here!
	var isPlainObject = function(obj) {
		if (!obj || Object.prototype.toString.call(obj) !== '[object Object]') {
			return false;
		}
		var key;
		for (key in obj) {}
		return key === undefined || Object.prototype.hasOwnProperty.call(obj, key);
	};

	config = extend(config, {
		'enabled': true,
		'options': {
			'isUsageRequired': false,
			'isMetaRequired': true,
			'target': [],
			'targetCSS': [],
			'masterAppPath': global.opts.core.masterApp.path,
			'storageFilePath': path.join(__dirname, "./images-data.json")
		},
		'unavailibleImagesMessage': "Requested data is unavailible. Please try again later."
	});

	console.log(config);

	if (!config.enabled) return;

	storage = storage || {
		"images": []
	};

	var _retrieveChild = childProcess.fork(path.join(__dirname, "/retriever"));
	_retrieveChild.on('message', function(images) {
		if (images && images.length) {
			storage.images = images;
			fs.writeFile(config.options.storageFilePath, JSON.stringify(images), function (err) {
				if (err) throw err;
			});
		}
	}.bind(app));

	var formatException = function() {
		return {'error': config.unavailibleImagesMessage};
	}

	var requestImagesData = function() {
		glob(config.options.target, {}, function (er, images) {
			glob(config.options.targetCSS, {}, function (er, styles) {
				_retrieveChild.send({"options": config.options, "images": images, "styles": styles});
			});
		});
	};

	router.get('/images/data/', function (req, res, next) {
		if (storage.images && storage.images.length) {
			res.send(storage.images);
			return;
		}
		res.send(formatException());
		requestImagesData();
	}, function (req, res, next) {
		res.render('regular');
	});

	router.get('/images', function(req, res, next) {
		var headerFooter = require(path.join(global.pathToApp, '/core/headerFooter')).getHeaderAndFooter();
		var template;
		var data = {
			'header': headerFooter.header,
			'footer': headerFooter.footer
		};

		if (storage.images && storage.images.length) {
			template = require('fs').readFileSync(path.join(__dirname, "/templates/images.ejs"), 'utf8');
			data['images'] = storage.images;
		} else {
			template = require('fs').readFileSync(path.join(__dirname, "/templates/empty.ejs"), 'utf8');
		}

		res.send(require('ejs').render(template, data));
	}, function (req, res, next) {
		res.render('regular');
	});

	router.get('/images/res/styles.css', function (req, res, next) {
		res.set('Content-Type', 'text/css');
		res.send(require('fs').readFileSync(path.resolve(__dirname + '/../assets/css/styles.css')));
	});

	router.get('/images/res/app.js', function (req, res, next) {
		res.set('Content-Type', 'application/javascript');
		res.send(require('fs').readFileSync(path.resolve(__dirname + '/../assets/js/app.js')));
	});

	(function() {
		fs.readFile(config.options.storageFilePath, 'utf8', function(err, data) {
			try {
				data = JSON.parse(data);
				storage.images = data;
			} catch(e) {}
			requestImagesData();
		});
	})();

	app.use('/dashboards', router);

})(global.app, global.opts.assets.pluginsOptions.graphicsDashboard, global.dataStorage);
