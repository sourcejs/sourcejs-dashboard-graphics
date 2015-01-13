require(['jquery'], function($) {

"use strict";

window.App = {
	"_instances": {}
};

var escapeStr = function(str) {
	return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

App.Item = (function($, App) {
	if (App.Item) return;

	var Item = function(data, config) {
		this.data = data;
		this.config = config;
		this.views = {};
		return this;
	};

	Item.renderers = {};

	Item.renderers.usages = function(asString) {
		if (!this.data.usages.length) return "";
		var result = ['<div class="image-proplist-container">',
			'<div class="image-usages-data">',
			'<label class="image-usages-label">Usages:</label><ul>'];
		this.data.usages.forEach(function(usageItem) {
			result.push('<li><i>' + usageItem.file + " (" + usageItem.line  + ') </i><code> ' + usageItem.selector + '</code></li>');
		});
		result.push('</ul></div></div>');
		return asString ? result.join('') : $(result.join(''));
	};

	Item.renderers.colors = function(asString) {
		if (!this.data.metaInfo.histogram) return "";
		var histogram = this.data.metaInfo.histogram;
		var result = ['<div class="image-proplist-container">',
			'<div class="image-colors-data">',
			'<label class="image-colors-label">Histogram:</label><ul>'];
		Object.keys(histogram).forEach(function(id) {
			var color = /\([0-9,]+\)/.exec(histogram[id]);
			result.push('<li><i class="color-demo" style="background-color: rgba', color, '"></i>'
				+ '<span class="color-id">' + id + ':</span>'
				+ '<span class="color-scheme">' + histogram[id] + '</span></li>');
		});
		result.push('</ul></div></div>');
		return asString ? result.join('') : $(result.join(''));
	};

	Item.renderers.imageSize = function(asString) {
		if (!this.data.metaInfo.width || !this.data.metaInfo.height) return "";
		var result = ['<div class="item-field-wrapper"><b>Width: </b><span  class="item-field-value">',
			this.data.metaInfo.width, 'px; Height: ', this.data.metaInfo.height, 'px </span></div>'];
		return asString ? result.join('') : $(result.join(''));
	};

	Item.renderers.fileSize = function(asString) {
		if (!this.data.metaInfo.width || !this.data.metaInfo.height) return "";
		var result = ['<div class="item-field-wrapper"><b>File size: </b><span class="item-field-value">',
			this.data.size, ' bytes </span></div>'];
		return asString ? result.join('') : $(result.join(''));
	};

	Item.renderers.lastModified = function(asString) {
		if (!this.data.modifiedDate) return "";
		var result = ['<div class="item-field-wrapper"><b>Modified: </b>', 
			'<span class="item-field-value">', this.getMDateString(), '</span></div>'];
		return asString ? result.join('') : $(result.join(''));
	};

	Item.renderers.imageURL = function(asString) {
		if (!this.data.url) return "";
		var result = ['<div class="item-field-wrapper"><b>URL: </b>',
			'<span class="item-field-value">', this.data.url, '</span></div>'];
		return asString ? result.join('') : $(result.join(''));
	};

	Item.renderers.compact = function(asString) {
		var data = this.data;
		return $(['<div id="', data.url, '"class="item-container compact ', this.getUsagesAmount() ? '':'unused', '">',
			'<div class="image-item-header">', data.url, '</div>',
			'<a href="', this.data.url, '" downliad="', this.data.url, '"  target="_blank">',
				'<img class="item-demo compact" src="', data.url, '"/>',
			'</a>',
		'</div>'].join(''));
	};

	Item.renderers.extended = function(asString) {
		return $([
			'<div class="image-item-wrapper item-container extended ', this.getUsagesAmount() ? '':'unused', '">',
				'<div class="image-demo-wrapper">',
					'<a href="', this.data.url, '" downliad="', this.data.url, '"  target="_blank">',
						'<img src="', this.data.url, '">',
					'</a>',
				'</div>',
					'<div class="image-item-info">',
							Item.renderers.imageURL.call(this, true),
							Item.renderers.lastModified.call(this, true),
							Item.renderers.imageSize.call(this, true),
							Item.renderers.fileSize.call(this, true),
							Item.renderers.colors.call(this, true),
							Item.renderers.usages.call(this, true),	
					'</div>',
					'<div style="clear: both;"></div>',
				'</div>'
		].join(''));
	};

	Item.prototype.getView = function(templateName) {
		if (!this.views[templateName]) {
			this.render();
		}
		return this.views[templateName];
	};

	Item.prototype.getUsagesAmount = function() {
		return this.data && this.data.usages ? this.data.usages.length : 0;
	};

	Item.prototype.render = function() {
		var self = this;
		Object.keys(Item.renderers).forEach(function(rendererName) {
			self.views[rendererName] = Item.renderers[rendererName].call(self);
		});
	};

	Item.prototype.getMDateString = function() {
		return (new Date(Date.parse(this.data.modifiedDate))).toLocaleString();
	};

	Item.prototype.bindEvents = function() {

	};

	return Item;

})($, window.App);

App.Container = (function($, App) {
	if (App.Container) return;

	var Container = function(target, config, data) {
		this.target = target;
		this.config = config;
		this.init(data);
		this.loaded = 0;
		return this;
	};

	Container.renderers = {};

	Container.renderers.body = function(asString) {
		var data = this.config;
		return $([
			'<div class="', data.classes.controls, '"></div>',
			'<div class="', data.classes.images, '"></div>',
			'<div class="', data.classes.loadMore, '">',
				'<div class="btn-wrapper"><a id="load-more" data-loaded="0" class="btn">', this.getLabel("loadMore"), '</a></div>',
			'</div>'].join(''));
	};

	Container.renderers.controls = function(asString) {
		var data = this.config;
		return $(['<div class="search-container control-container">',
			'<label class="search">', this.getLabel("findImage"), '</label>',
			'<input type="text" class="', data.classes.search, '" placeholder="', this.getLabel("searchPlaceholder"),'"/>',
			'<div class="btn-wrapper"><a class="search-clear-button btn">', this.getLabel("clear"), '</a></div></div>',
			'<div class="', data.classes.viewSwitchersWrapper, '">',
				'<span>', this.getLabel("viewType"), '</span>',
				'<div class="btn-wrapper"><a id="compact" class="', data.classes.viewSwitcher, ' btn active">', this.getLabel("compactView"),'</a></div>',
				'<div class="btn-wrapper"><a id="extended" class="', data.classes.viewSwitcher, ' btn">', this.getLabel("extendedView"),'</a></div>',
			'</div>',
			'<div class="filters-wrapper">',
				'<label class="search">', this.getLabel('imageUsage'), '</label>',
				'<select id="usage-filter" class="', data.classes.usageFilter, '">',
					'<option value="-1">', this.getLabel('any'), '</option>',
					'<option value="0">', this.getLabel('unused'), '</option>',
					'<option value="1">', this.getLabel('onceUsed'), '</option>',
					'<option value="2">', this.getLabel('repeatedlyUsed'), '</option>',
				'</select>',
			'</div>',
		'</div>'].join(''));
	};

	Container.prototype.showItems = function(offset, amount, clearBeforeShow) {
		clearBeforeShow = clearBeforeShow || false;
		var itemsToShow = this.filterItems();

		offset = Math.max(Number(offset), 0);
		amount = itemsToShow.length > (offset + amount) ? amount : itemsToShow.length;

		var viewType = this.config.item.view;
		var imagesContainer = this.target.find("." + this.config.classes.images);
		var renderedItemsList = [];
		itemsToShow.slice(offset, offset + amount).forEach(function(item) {
			renderedItemsList.push(item.getView(viewType));
		});
		var $metaContainer = $('<div>').append(renderedItemsList);

		if (clearBeforeShow) {
			imagesContainer.html($metaContainer.children());
		} else {
			imagesContainer.append($metaContainer.children());
		}
		this.loaded = imagesContainer.children().length;

		if (this.loaded >= itemsToShow.length) {
			$("#load-more").addClass('inactive');
		} else {
			$("#load-more").removeClass('inactive');
		}
	};

	Container.prototype.filterItems = function() {
		var filtered = [];
		var showCondition = this.config.showCondition;
		var pattern = this.config.searchPattern || ".*";

		this.items.forEach(function(item) {
			var isValidToSearch = item.data.url && item.data.url.search(pattern) !== -1;
			var isValidToUsageFilter = !showCondition || showCondition(item);
			if (isValidToSearch && isValidToUsageFilter) {
				filtered.push(item);
			}
		});
		return filtered;
	};

	Container.prototype.init = function(data) {
		this.items = [];
		if (!data || !data.length) return;

		var itemConfig = this.config.item || {};
		var self = this;

		$.map(data, function(itemJSON) {
			self.items.push(new App.Item(itemJSON, itemConfig));
		});
	};

	Container.prototype.show = function() {
		this.target.html(Container.renderers.body.call(this));
		this.showControls();
		this.showItems(0, this.config.itemsPerPage, false);
	};

	Container.prototype.showControls = function() {
		this.target.find("." + this.config.classes.controls)
			.html(Container.renderers.controls.call(this));

		this.initControlls();
	};

	Container.prototype.getLabel = function(name) {
		return this.config.labels[name] ? this.config.labels[name] : name;
	}

	Container.prototype.initControlls = function() {
		var self = this;
		// "load more" handler
		this.target.find("." + this.config.classes.loadMore).click(function() {
			var isInactive = $(this).hasClass("inactive");
			if(isInactive) return false;
			self.showItems(self.loaded, self.config.itemsPerPage, false);

		});
		// "view-switchers" handler
		this.target.find("." + this.config.classes.viewSwitcher).click(function() {
			if (!this.id || !this.id.length || this.id === self.config.item.view) {
				return false;
			}
			self.target.find("." + self.config.classes.viewSwitcher).removeClass("active");
			$(this).addClass("active");
			self.config.item.view = this.id;
			self.showItems(0, self.config.itemsPerPage, true);
		});
		// "usage selector handler"
		this.target.find("." + this.config.classes.usageFilter).on('change', function() {
			var selected = Number(this.selectedOptions[0].value);
			var showCondition;
			switch(selected) {
				case 0:
					showCondition = function(item) { return item.getUsagesAmount() === 0; };
					break;
				case 1:
					showCondition = function(item) { return item.getUsagesAmount() === 1; };
					break;
				case 2:
					showCondition = function(item) { return item.getUsagesAmount() > 1; };
					break;
				default:
					showCondition = function(item) { return true; }
			}
			self.config.showCondition = showCondition;
			self.showItems(0, self.config.itemsPerPage, true);
		});
		// search controll
		this.target.find("." + this.config.classes.search).on("input", function() {
			var value = escapeStr(this.value);
			self.config.searchPattern = escapeStr(this.value);
			self.showItems(0, self.config.itemsPerPage, true);

		});

		this.target.find("." + "search-clear-button").click(function() {
			self.target.find("." + self.config.classes.search).val('');
			self.config.searchPattern = '';
			self.showItems(0, self.config.itemsPerPage, true);
		});

		this.target.parent().find("#images-counter").html(this.getLabel("totalCount") + this.items.length);
	};

	return Container;

})($, window.App);

$.ajax({ "url": "/dashboards/images/data" }).done(function(data) {
	window.App._instances._container = new App.Container(
		$('.dashboard-container'),
		{
			"itemsPerPage": 200,
			"hideItemsOnLoadMore": true,
			"item": {
				"view": "compact"
			},
			"classes": {
				"controls": "controls-wrapper",
				"images": "images-container",
				"loadMore": "load-more-button",
				"viewSwitchersWrapper": "view-switchers-wrapper",
				"viewSwitcher": "view-switcher",
				"usageFilter": "items-filter-select",
				"search": "images-search-field"
			},
			"labels": {
				"clear": "Очистить",
				"findImage": "Поиск:",
				"loadMore": "Еще...",
				"searchPlaceholder": "Введите путь или имя файла...",
				"totalCount": " Обработанно изображений: ",
				"viewType": "Вид: ",
				"compactView": "Сжатый",
				"extendedView": "Полный",
				"imageUsage": "Использование: ",
				"any": "Любые",
				"unused": "Не используемые",
				"onceUsed": "Единожды используемые",
				"repeatedlyUsed": "Многократно используемые"
			}
		},
		data
	).show();
});

});