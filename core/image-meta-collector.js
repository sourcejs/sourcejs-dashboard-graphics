module.exports = (function() {
	var im = require('imagemagick');
	var async = require('async');

	var MetaInfoWrapper = {
		getData: function(item, callback) {
			try {
				im.identify(item.getPath(), function(err, metadata) {
					callback(undefined, metadata || {});
				});
			} catch(e) {
				console.log(e);
				callback(undefined, {});
			}
			
		}
	};

	return function(items, done) {
		async.mapSeries(items, MetaInfoWrapper.getData.bind(MetaInfoWrapper), function(err, result) {
			if (result) {
				done(result);
			}
		});
	};

})();