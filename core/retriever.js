var Collector = require(__dirname + "/images-collector");
var processingStarted = false;

process.on('message', function(msg) {

	this.dataCollectionTask = function(message) {
		if (processingStarted) {
			return;
		}
		processingStarted = true;
		var collector = new Collector(message);
		var self = this;
		collector.getData(function(images) {
			process.send(images);
		});
	};
	
	this._init = function() {
		if(msg) {
			this.dataCollectionTask(msg);
		} else {
			console.log("Child process resieved empty message. Unable to start processing.");
		}
	}.bind(this)();
});