var assign = require('object-assign');

var smooth = require('./smooth');

var easing = smooth.defaultEasing;

var cancelEvents = require('./cancel-events');

var events = require('./scroll-events');

/*
 * Function helper
 */
var functionWrapper = function(value) {
  return typeof value === 'function' ? value : function() { return value; };
};

/*
 * Sets the cancel trigger
 */

cancelEvents.register(function() {
  __cancel = true;
});

/*
 * Wraps window properties to allow server side rendering
 */
var currentWindowProperties = function() {
  if (typeof window !== 'undefined') {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame;
  }
};

/*
 * Helper function to never extend 60fps on the webpage.
 */
var requestAnimationFrameHelper = (function () {
  return  currentWindowProperties() ||
          function (callback, element, delay) {
              window.setTimeout(callback, delay || (1000/60), new Date().getTime());
          };
})();


var __currentPositionY  = 0;
var __startPositionY    = 0;
var __targetPositionY   = 0;
var __progress          = 0;
var __duration          = 0;
var __cancel            = false;

var __target;
var __containerElement;
var __to;
var __start;
var __deltaTop;
var __percent;
var __delayTimeout;


var currentPositionY = function() {
  if (__containerElement) {
        return __containerElement.scrollTop;
	} else {
    var supportPageOffset = window.pageXOffset !== undefined;
    var isCSS1Compat = ((document.compatMode || "") === "CSS1Compat");
    return supportPageOffset ? window.pageYOffset : isCSS1Compat ?
           document.documentElement.scrollTop : document.body.scrollTop;
   }
};

var scrollContainerHeight = function() {
  if(__containerElement) {
    return Math.max(
      __containerElement.scrollHeight,
      __containerElement.offsetHeight,
      __containerElement.clientHeight
    );
  } else {
    var body = document.body;
    var html = document.documentElement;

    return Math.max(
      body.scrollHeight,
      body.offsetHeight,
      html.clientHeight,
      html.scrollHeight,
      html.offsetHeight
    );
  }
};

var animateTopScroll = function(timestamp) {
  // Cancel on specific events
  if(__cancel) { return };

  __deltaTop = Math.round(__targetPositionY - __startPositionY);

  if (__start === null) {
    __start = timestamp;
  }

  __progress = timestamp - __start;

  __percent = (__progress >= __duration ? 1 : easing(__progress/__duration));

  __currentPositionY = __startPositionY + Math.ceil(__deltaTop * __percent);

  if(__containerElement) {
    __containerElement.scrollTop = __currentPositionY;
  } else {
    window.scrollTo(0, __currentPositionY);
  }

  if(__percent < 1) {
    requestAnimationFrameHelper.call(window, animateTopScroll);
    return;
  }

  if(events.registered['end']) {
    events.registered['end'](__to, __target, __currentPositionY);
  }

};

var setContainer = function (options) {
  if(!options || !options.containerId) {
    __containerElement = null;
    return;
  }

  __containerElement = document.getElementById(options.containerId);
};

var startAnimateTopScroll = function(y, options, to, target) {

  window.clearTimeout(__delayTimeout);

  setContainer(options);


  __start           = null;
  __cancel          = false;
  __startPositionY  = currentPositionY();
  __targetPositionY = options.absolute ? y : y + __startPositionY;
  __deltaTop        = Math.round(__targetPositionY - __startPositionY);

  __duration        = functionWrapper(options.duration)(__deltaTop);
  __duration        = isNaN(parseFloat(__duration)) ? 1000 : parseFloat(__duration);
  __to              = to;
  __target          = target;

  if(options && options.delay > 0) {
    __delayTimeout = window.setTimeout(function animate() {
      requestAnimationFrameHelper.call(window, animateTopScroll);
    }, options.delay);
    return;
  }

  requestAnimationFrameHelper.call(window, animateTopScroll);

};

var scrollToTop = function (options) {
  startAnimateTopScroll(0, assign(options || {}, { absolute : true }));
};

var scrollTo = function (toY, options) {
  startAnimateTopScroll(toY, assign(options || {}, { absolute : true }));
};

var scrollToBottom = function(options) {
  setContainer(options);
  startAnimateTopScroll(scrollContainerHeight(), assign(options || {}, { absolute : true }));
};

var scrollMore = function(toY, options) {
  setContainer(options);
  startAnimateTopScroll(currentPositionY() + toY, assign(options || {}, { absolute : true }));
};

module.exports = {
  animateTopScroll: startAnimateTopScroll,
  scrollToTop: scrollToTop,
  scrollToBottom: scrollToBottom,
  scrollTo: scrollTo,
  scrollMore: scrollMore,
};
