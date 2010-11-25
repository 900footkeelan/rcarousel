(function ($) {
	$.widget("ui.rcarousel", {
		_create: function () {
			var self = this,
				options = self.options,
				_root = $(this.element),
				structure;

			// for every carousel create a structure object and keep its reference in options
			options.structure = self._createStructureObject();
			structure = options.structure;

			// if options were default there should be no problem
			// check if user set options before init: $('element').rcarousel({with: "foo", visible: 3});
			// in above example exception will be thrown bacause 'with' should be a number!
			self._checkOptionsValidity(self.options);

			// check if structure is hardcoded and valid
			if ($(_root).children("div.wrapper").length === 1) {
				if ($(_root).children("div.wrapper").find("ul > li").length < 1) {
					// there is DIV element inside element rcarousel is invoked on; check if it contains
					// UL and at least one LI element
					throw new Error("Inside DIV.wrapper you should have placed UL element with at least one LI element");
				} else {
					self._configure(true);
				}
			} else if ($(_root).children("div.wrapper").length > 1) {
				throw new Error("You are not allowed to use more than one div.wrapper in carousel's container!");
			} else if ($(_root).children("div.wrapper").length < 1) {
				// structure hasn't been created yet - create it
				self._configure(false);
			}
		},
		_checkOptionsValidity: function(options) {
			var	self = this,
				options = self.options,
				_correctSteps = "",
				_key, _value, i;

			// for every element in options object check its validity
			for (_key in options) {
				_value = options[_key];
				switch (_key) {
					case "visible":
						// visible should be a integer positive number
						if (typeof _value !== "number" || _value <= 0 || (Math.ceil(_value) - _value > 0)) {
							throw new Error("visible should be defined as a positive integer number!");
						}
						break;

					case "step":
						if (_value && typeof _value !== "number" || _value <= 0) {
							throw new Error("step should be a positive number");
						} else {
							// for example for visible: 3 the following array of values for 'step' is valid
							// 3 <= step >= 1 by 1 ==> [1,2,3]
							if (_value < 1 || _value > options.visible) {
								// output correct values
								for (i = 1; i<= Math.floor(options.visible); i++) {
									_correctSteps += (i < Math.floor(_value)) ? i + ", " : i;
								}
								throw new Error("Only following mode.step values are correct: " + _correctSteps);
							}
						}
						break;

					case "width":
						// width & height is defined by default so you can omit them to some extent
						if (_value && (isNaN(_value) || typeof _value !== "number" || _value <= 0 || (Math.ceil(_value) - _value > 0))) {
							throw new Error("width should be a positive integer number!");
						}
						break;

					case "height":
						if (_value && (isNaN(_value) || typeof _value !== "number" || _value <= 0 || (Math.ceil(_value) - _value > 0))) {
							throw new Error("height should be a positive number!");
						}
						break;

					case "speed":
						if (!_value && _value !== 0) {
							throw new Error("speed should be defined as a number or a string");
						}

						if (typeof _value === "number" && _value < 0) {
							throw new Error("speed " + "should be a positive number");
						} else if (typeof _value === "string" && !(_value === "slow" || _value === "normal" || _value === "fast")) {
							throw new Error('Only "slow", "normal" and "fast" values are valid');
						}
						break;

					case "remote":
						if (!_value || !(typeof _value === "object")) {
							throw new Error("remote should be defined as object with path and format properties in it!");
						}

						if (!(typeof _value.path === "string")) {
							throw new Error("remote.path should be defined as string!");
						}

						if (!(typeof _value.format === "string")) {
							throw new Error("remote.format should be defined as a string!");
						} else if (!(_value.format === "json" || _value.format === "xml")) {
							throw new Error("remote.format: '" + _value.format + "' is not valid. Only remote.format: 'json' and remote.format: 'xml' are valid!");
						}
						break;

					case "navigation":
						if (!_value || typeof _value !== "object") {
							throw new Error("navigation should be defined as object with at least one of the properties: 'prev' or 'next' in it!");
						}

						if (_value.prev && typeof _value.prev !== "string") {
							throw new Error("navigation.prev should be defined as a string and points to '.class' or '#id' of an element");
						}

						if (_value.next && typeof _value.next !== "string") {
							throw new Error("navigation.next should be defined as a string and points to '.class' or '#id' of an element");
						}
						break;
				}
			}
		},
		_configure: function(hardcoded) {
			// configuration depends on if carousel was hardcoded or not
			var self = this,
				options = self.options,
				structure = options.structure;

			if (hardcoded) {
				self._setStructure();
				structure.hardcoded = true;
			} else {
				self._createStructure();
				self.load();
				structure.hardcoded = false;
			}
			self._setCarouselWidth();
			self._setCarouselHeight();
			// TODO ujednolicić
			self._setEventHandlers("next");
			self._setEventHandlers("prev");
			self._setStep();
		},
		_createNewElement: function(image, dir) {
			// create new LI element with IMG inside it
			var self = this,
				options = self.options,
				structure = options.structure,
				_li = $("<li></li>");

			$(_li)
				.width(options.width)
				.append(image);
			if (dir === "prev") {
				$(structure.list).prepend(_li);
			} else {
				$(_li).appendTo(structure.list);
			}
			// change UL width to fit newly created elements
			self._setInnerWidth();
		},
		_createStructure: function() {
			var	self = this,
				options = self.options,
				structure = options.structure,
				_carousel = $(this.element),
				_wrapper, _list;

			_wrapper = $("<div class='wrapper'></div>")
				.appendTo(_carousel);
			structure.wrapper = _wrapper;

			_list = $("<ul></ul>")
				.appendTo(_wrapper);
			structure.list = _list;

			$(_carousel).appendTo("body");
		},
		_createStructureObject: function() {
			var self = this;

			self.carousels[self.carousels.length] = {
				paths: [],
				pathsLen: 0,
				pages: [],
				firstPage: [],
				currentPage: [],
				pageIndex: 0,
				navigation: {},
				animated: false,
			}

			return self.carousels[self.carousels.length - 1];
		},
		_generatePages: function() {
			var self = this,
				options = self.options,
				structure = options.structure;

			function _init() {
				var i;

				// in case of changing step at runtime
				structure.pages = [];
				structure.firstPage = [];
				structure.currentPage = [];
				structure.pageIndex = 0;

				structure.pages[0] = [];
				for (i = 0; i < options.visible; i++) {
					structure.pages[0][structure.pages[0].length] = structure.paths[i];
					structure.firstPage[i] = structure.paths[i];
					structure.currentPage[i] = structure.paths[i];
				}
			}

			function _isFirstPage(page) {
				var isFirst = false,
					i;

				for (i = 0; i < structure.firstPage.length; i++) {
					if (structure.firstPage[i] === page[i]) {
						isFirst = true;
					} else {
						isFirst = false;
						break;
					}
				}
				return isFirst;
			}

			function _append(start, end, atIndex) {
				var _index = atIndex || structure.pages.length,
					i;

				if (!atIndex) {
					structure.pages[_index] = [];
				}

				for (i = start; i < end; i++) {
					structure.pages[_index].push(structure.paths[i]);
				}
				return _index;
			}

			function _paginate() {
				var _len = structure.paths.length,
					_beginning = true,
					_complement = false,
					_start = options.step,
					_end, _index, _add;

				while (!_isFirstPage(structure.pages[structure.pages.length - 1]) || _beginning) {
					_beginning = false;

					_end = _start + options.visible;

					if (_end > _len) {
						_end = _len;
					}

					if (_end - _start < options.visible) {
						_complement = true;

					} else {
						_complement = false;
					}

					if (_complement) {
						// old elements
						_index = _append(_start, _end);
						// new elements
						_append(0, options.visible - (_end - _start), _index);
						_add = false;

						if (_start + options.step >= _len) {
							// calculate new _start
							// 0 is position of A
							// (_end - _start) is the number of elements before A
							_start = 0 - (_end - _start) + options.step;
							_add = true;
						}

					} else {
						_append(_start, _end);
						_add = false;

						if (_start + options.step >= _len) {
							_start = 0;
							_add = true;
						}
					}

					if (!_add) {
						_start += options.step;
						_add = false;
					}
				}
				// remove last page (that refers to first page)
				structure.pages.length -= 1;
			}

			// go!
			_init();
			_paginate();
		},
		load: function(obj) {
			var self = this,
				options = self.options,
				structure = options.structure;

			// check object validity
			if (obj) {
				self._checkOptionsValidity({remote: obj});
			}

			_object = obj || {};
			_path = _object.path || options.remote.path;
			_format = _object.format || options.remote.format;

			// remove old LI elements before populating
			$(structure.list).empty()

			// we don't want to manipulate doubled elements
			structure.paths.length = 0;

			// now elements are not hardcoded
			structure.hardcoded = false;

			// load a file
			if (_format === "json") {
				$.getJSON(_path, function(data) {
					$.each(data.paths, function(i, item) {
						// store path to a file
						structure.paths.push(item);
					});

					// check if we had enough elements
					if (structure.paths.length < options.visible) {
						throw new Error("At least " + options.visible + " elements are required");
					}

					self._generatePages();
					// now load new items
					self._loadElements(0);
				});

			} else if (_format === "xml") {
				$.get(_path, function(data) {
					_nodes = $(data).find("path");
					$.each(_nodes, function(i, item) {
						structure.paths.push($(item).text());
					});

					// check if we had enough elements
					if (structure.paths.length < options.visible) {
						throw new Error("At least " + options.visible + " elements are required");
					}

					self._generatePages();
					self._loadElements(0);
				});
			}
		},
		_loadElement: function (path) {
			var _image = new Image(),
				_loadWatch;

			_image.src = path;

			function _watch() {
				if (_image.complete) {
					clearInterval(_loadWatch);
				}
			}
			_loadWatch = setInterval(_watch, 100);
			return _image;
		},
		_loadElements: function(elements, direction) {
			var self = this,
				options = self.options,
				structure = options.structure,
				_dir = direction || "next",
				_elem = elements || structure.pages[0],
				_start = 0,
				_end = _elem.length,
				i = 0;

			if (_dir === "next") {
				for (i = _start; i < _end; i++) {
					self._createNewElement(self._loadElement(_elem[i]), _dir);
				}
			} else {
				for (i = _end - 1; i >= _start; i--) {
					self._createNewElement(self._loadElement(_elem[i]), _dir);
				}
			}
		},
		next: function() {
			var	self = this,
				options = self.options,
				structure = options.structure,
				_step = options.step ? options.step : options.visible,
				_temporaryPage = [],
				_page, i, j;

			if (!structure.animated) {
				structure.animated = true;

				structure.pageIndex += 1;
				if (structure.pageIndex > structure.pages.length - 1) {
					structure.pageIndex = 0;
				}

				// pick the page
				_page = structure.pages[structure.pageIndex];

				// choose only new elements
				for (i = options.visible - options.step; i < _page.length; i++) {
					_temporaryPage.push(_page[i]);
				}

				// load new elements
				self._loadElements(_temporaryPage, "next");

				_dist = options.width * _step;
				$(structure.wrapper)
					.animate({scrollLeft: "+=" + _dist}, options.speed, function() {
					self._removeOldElements("first", _step);
					$(structure.wrapper).scrollLeft(0);
					structure.animated = false;
				});

				// set new current page
				structure.currentPage = [];
				structure.currentPage = _page.slice(0);
			}
		},
		prev: function() {
			var	self = this,
				options = self.options,
				structure = options.structure,
				_step = options.step ? options.step : options.visible,
				_temporaryPage = [],
				_unique = true,
				_page, i, j;

			if (!structure.animated) {
				structure.animated = true;

				structure.pageIndex -= 1;
				if (structure.pageIndex < 0) {
					structure.pageIndex = structure.pages.length - 1;
				}

				// pick the page
				_page = structure.pages[structure.pageIndex];

				// choose only new elements
				for (i = 0; i < options.step; i++) {
					_temporaryPage.push(_page[i]);
				}

				// load new elements
				self._loadElements(_temporaryPage, "prev");

				_dist = options.width * _step;
				$(structure.wrapper).scrollLeft(_dist);
				$(structure.wrapper)
					.animate({scrollLeft: 0}, options.speed, function() {
						self._removeOldElements("last", _step);
						structure.animated = false;
				});

				// set new current page
				structure.currentPage = [];
				structure.currentPage = _page.slice(0);
			}
		},
		_removeOldElements: function(position, length) {
			// remove 'step' elements
			var self = this,
				options = self.options,
				structure = options.structure,
				i, _arr, _len;

			for (i = 0; i < length; i++) {
				if (position === "first") {
					$("li", structure.list).eq(0).remove();
				} else {
					_arr = $("li", structure.list);
					_len = $(_arr).length;
					$(_arr).eq(_len - 1).remove();
				}
			}
		},
		_setInnerWidth: function() {
			// recalculate UL's width to fit all elements
			// in case of fixed mode with hardcoded elements it's simple:
			// all elements are known for the beginning so only count them and multiply by common width
			var self = this,
				options = self.options,
				structure = options.structure,
				_counter, _innerWidth;

			_counter = $("li", structure.list).length;

			// set the width
			_innerWidth = _counter * options.width;
			$(structure.list).width(_innerWidth);
			// save UL width for navigation purposes
			structure.innerWidth = _innerWidth;

		},
		_setOption: function(key, value) {
			var self = this,
				options = self.options,
				structure = options.structure,
				_newOptions;

			switch (key) {
				case "step":
					self._checkOptionsValidity({step: value});
					self._setStep(value);
					self._generatePages();

					// remove old LI elements before populating
					$(structure.list).empty();
					self._loadElements();
					break;

				case "speed":
					self._checkOptionsValidity({speed: value});
					options.speed = value;
					break;

				case "navigation":
					self._checkOptionsValidity({navigation: value});
					if (value.next) {
						self._setEventHandlers("next");
					}

					if (value.prev) {
						self._setEventHandlers("prev");
					}
					break;
			}
			$.Widget.prototype._setOption.apply(this, arguments);

		},
		_setStep: function(s) {
			// calculate a step
			var self = this,
				options = self.options,
				structure = options.structure,
				_step;

			_step = s || options.step;
			// first we set visible/step to e.g 6/6
			// then during runtime we change step to e.g 3
			// so this is not valid situation - trim step to visible
			if (_step > options.visible) {
				_step = options.visible;
			}
			options.step = _step;
			structure.step = options.width * _step;
		},
		_setStructure: function() {
			var self = this,
				_root = $(this.element),
				options = self.options,
				structure = options.structure,
				_lis, _li, i;

			// wrapper holds UL with LIs
			structure.wrapper = $("div.wrapper", _root);
			structure.list = $("ul", structure.wrapper);
			// check if we had enough elements
			_lis = $("li", structure.list);
			if (_lis.length < options.visible) {
				throw new Error("At least " + options.visible + " elements are required");
			}

			// hold only n visible elements in the UL list
			// save all paths (src attribute) in paths array
			for (i = _lis.length - 1; i >= 0; i--) {
				_lis = $("li", structure.list);
				if (i >= options.visible) {
					_li = $(_lis).eq(_lis.length - 1);
					// remove li
					$(_li).remove();
				} else {
					_li = $(_lis).eq(i);
				}
				// save the path
				structure.paths.unshift($("img", _li).attr("src"));
			}

			// just init
			self._generatePages();

			// save basic navigation
			structure.navigation.next = $(options.navigation.next);
			structure.navigation.prev = $(options.navigation.prev);
		},
		_setCarouselHeight: function(h) {
			var self = this,
				options = self.options,
				structure = options.structure,
				_height;

			_height = h || options.height;
			$(structure.wrapper).height(_height);
		},
		_setCarouselWidth: function(w) {
			var self = this,
				options = self.options,
				structure = options.structure,
				_width, _newWidth;

			_width = w || options.width;
			_newWidth = options.visible * _width;

			// set carousel width and disable overflow: auto
			$(structure.wrapper).css({
				width: _newWidth,
				overflow: "hidden"
			});
			// change UL width
			self._setInnerWidth();


		},
		_setEventHandlers: function(action) {
			// basic navigation: next and previous item
			var self = this,
				options = self.options;

			if (action === "next") {
				$(options.navigation.next).click(function() {
					self.next();
				});
			}

			if (action === "prev") {
				$(options.navigation.prev).click(function() {
					self.prev();
				});
			}
		},
		options: {
			visible: 3,
			step: 3,
			width: 200,
			height: 200,
			speed: 1000,
			structure: null,
			navigation: {
				next: ".carouselNext",
				prev: ".carouselPrev"
			}
		},
		carousels: []
	});
} (jQuery));