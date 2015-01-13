module.exports = (function() {
	var postcss = require('postcss');
	var path = require('path');
	var async = require('async');

	var MetaInfoWrapper = function(data) {

		var isBackground = function(decl) {
			return decl && decl.prop && decl.value
				&& ~decl.prop.indexOf('background')
				&& ~decl.value.indexOf('url');
		};

		var getImageUsages = function(styles, filePath, url) {
			var usages = [];
			try {
				postcss(function(css) {
					css.eachRule(function(rule) {
						rule.childs.forEach(function(decl) {
							if (isBackground(decl) && ~decl.value.indexOf(url)) {
								usages.push({
									"file": filePath,
									"line": (decl.source && decl.source.start && decl.source.start.line) ? decl.source.start.line : 0,
									"selector": rule.selector
								});
							}
						});
					});
				}).process(styles).css;
			} catch(e) {}
			return usages;
		};

		return {
			"getData": function(item, callback) {
				var usages = [];
				data.styles.map(function(css) {
					usages = usages.concat(getImageUsages(css.content, css.path, item.getUrl()));
				});
				item.setUsages(usages);
				callback(undefined, {});
			}
		};
	};

	return function(data, done) {
		async.map(data.images, MetaInfoWrapper(data).getData.bind(MetaInfoWrapper), function(err, result) {
			if (result) {
				done(result);
			}
		});
	};

})();