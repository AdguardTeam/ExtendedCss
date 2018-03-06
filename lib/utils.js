/**
 * Copyright 2016 Performix LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* global console */

const utils = {};

utils.MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

/**
 * Converts regular expressions passed as pseudo class arguments into RegExp instances.
 * Have to unescape doublequote " as well, because we escape them while enclosing such
 * arguments with doublequotes, and sizzle does not automatically unescapes them.
 */
utils.pseudoArgToRegex = function (regexSrc, flag) {
    flag = flag || 'i';
    regexSrc = regexSrc.trim().replace(/\\(["\\])/g, '$1');
    return new RegExp(regexSrc, flag);
};

/**
 * Helper function for creating regular expression from a url filter rule syntax.
 */
utils.createURLRegex = (function () { // jshint ignore:line
    // Constants
    var regexConfiguration = {
        maskStartUrl: "||",
        maskPipe: "|",
        maskSeparator: "^",
        maskAnySymbol: "*",

        regexAnySymbol: ".*",
        regexSeparator: "([^ a-zA-Z0-9.%]|$)",
        regexStartUrl: "^(http|https|ws|wss)://([a-z0-9-_.]+\\.)?",
        regexStartString: "^",
        regexEndString: "$"
    };

    // https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/regexp
    // should be escaped . * + ? ^ $ { } ( ) | [ ] / \
    // except of * | ^
    var specials = [
        '.', '+', '?', '$', '{', '}', '(', ')', '[', ']', '\\', '/'
    ];
    var specialsRegex = new RegExp('[' + specials.join('\\') + ']', 'g');

    /**
     * Escapes regular expression string
     */
    var escapeRegExp = function (str) {
        return str.replace(specialsRegex, "\\$&");
    };

    var startsWith = function (str, prefix) {
        return str && str.indexOf(prefix) === 0;
    };

    var endsWith = function (str, postfix) {
        if (!str || !postfix) {
            return false;
        }

        if (str.endsWith) {
            return str.endsWith(postfix);
        }
        var t = String(postfix);
        var index = str.lastIndexOf(t);
        return index >= 0 && index === str.length - t.length;
    };

    var replaceAll = function (str, find, replace) {
        if (!str) {
            return str;
        }
        return str.split(find).join(replace);
    };

    /**
     * Main function that converts a url filter rule string to a regex.
     * @param {string} str
     * @return {RegExp}
     */
    var createRegexText = function (str) {
        var regex = escapeRegExp(str);

        if (startsWith(regex, regexConfiguration.maskStartUrl)) {
            regex = regex.substring(0, regexConfiguration.maskStartUrl.length) +
                replaceAll(regex.substring(regexConfiguration.maskStartUrl.length, regex.length - 1), "\|", "\\|") +
                regex.substring(regex.length - 1);
        } else if (startsWith(regex, regexConfiguration.maskPipe)) {
            regex = regex.substring(0, regexConfiguration.maskPipe.length) +
                replaceAll(regex.substring(regexConfiguration.maskPipe.length, regex.length - 1), "\|", "\\|") +
                regex.substring(regex.length - 1);
        } else {
            regex = replaceAll(regex.substring(0, regex.length - 1), "\|", "\\|") +
                regex.substring(regex.length - 1);
        }

        // Replacing special url masks
        regex = replaceAll(regex, regexConfiguration.maskAnySymbol, regexConfiguration.regexAnySymbol);
        regex = replaceAll(regex, regexConfiguration.maskSeparator, regexConfiguration.regexSeparator);

        if (startsWith(regex, regexConfiguration.maskStartUrl)) {
            regex = regexConfiguration.regexStartUrl + regex.substring(regexConfiguration.maskStartUrl.length);
        } else if (startsWith(regex, regexConfiguration.maskPipe)) {
            regex = regexConfiguration.regexStartString + regex.substring(regexConfiguration.maskPipe.length);
        }
        if (endsWith(regex, regexConfiguration.maskPipe)) {
            regex = regex.substring(0, regex.length - 1) + regexConfiguration.regexEndString;
        }

        return new RegExp(regex, 'i');
    };

    return createRegexText;
})();

/**
 * Creates an object implementing Location interface from a url.
 * An alternative to URL.
 * https://github.com/AdguardTeam/FingerprintingBlocker/blob/master/src/shared/url.ts#L64
 */
utils.createLocation = function (href) {
    var anchor = document.createElement('a');
    anchor.href = href;
    if (anchor.host === "") {
        anchor.href = anchor.href;
    }
    return anchor;
};

/**
 * Checks whether A has the same origin as B.
 * @param {string} url_A location.href of A.
 * @param {Location} location_B location of B.
 * @param {string} domain_B document.domain of B.
 * @return {boolean}
 */
utils.isSameOrigin = function (url_A, location_B, domain_B) {
    var location_A = utils.createLocation(url_A);
    if (location_A.protocol === 'javascript:' || location_A.href === 'about:blank') { // jshint ignore:line
        return true;
    }
    if (location_A.protocol === 'data:' || location_A.protocol === 'file:') {
        return false;
    }
    return location_A.hostname === domain_B && location_A.port === location_B.port && location_A.protocol === location_B.protocol;
};

/**
 * A helper class to throttle function calls with setTimeout and requestAnimationFrame.
 */
utils.AsyncWrapper = (function () {

    /**
     * PhantomJS passes a wrong timestamp to the requestAnimationFrame callback and that breaks the AsyncWrapper logic
     * https://github.com/ariya/phantomjs/issues/14832
     */
    var supported = (typeof window.requestAnimationFrame !== 'undefined') && !/phantom/i.test(navigator.userAgent);
    var rAF = supported ? requestAnimationFrame : setTimeout;
    var cAF = supported ? cancelAnimationFrame : clearTimeout;
    var perf = supported ? performance : Date;
    /**
     * @param {Function} callback
     * @param {number} throttle number, the provided callback should be executed twice
     * in this time frame.
     * @constructor
     */
    function AsyncWrapper(callback, throttle) {
        this.callback = callback;
        this.throttle = throttle;
        this.wrappedCallback = this.wrappedCallback.bind(this);
        if (this.wrappedAsapCallback) {
            this.wrappedAsapCallback = this.wrappedAsapCallback.bind(this);
        }
    }
    /** @private */
    AsyncWrapper.prototype.wrappedCallback = function (ts) {
        this.lastRun = isNumber(ts) ? ts : perf.now();
        this.rAFid = this.timerId = this.asapScheduled = undefined;
        this.callback();
    };
    /** @private Indicates whether there is a scheduled callback. */
    AsyncWrapper.prototype.hasPendingCallback = function () {
        return isNumber(this.rAFid) || isNumber(this.timerId);
    };
    /**
     * Schedules a function call before the next animation frame.
     */
    AsyncWrapper.prototype.run = function () {
        if (this.hasPendingCallback()) {
            // There is a pending execution scheduled.
            return;
        }
        if (typeof this.lastRun !== 'undefined') {
            var elapsed = perf.now() - this.lastRun;
            if (elapsed < this.throttle) {
                this.timerId = setTimeout(this.wrappedCallback, this.throttle - elapsed);
                return;
            }
        }
        this.rAFid = rAF(this.wrappedCallback);
    };
    /**
     * Schedules a function call in the most immenent microtask.
     * This cannot be canceled.
     */
    AsyncWrapper.prototype.runAsap = function() {
        if (this.asapScheduled) { return; }
        this.asapScheduled = true;

        cAF(this.rAFid);
        clearTimeout(this.timerId);

        if (utils.MutationObserver) {
            /**
             * Using MutationObservers to access microtask queue is a standard technique,
             * used in ASAP library
             * {@link https://github.com/kriskowal/asap/blob/master/browser-raw.js#L140}
             */
            if (!this.mo) {
                this.mo = new utils.MutationObserver(this.wrappedCallback);
                this.node = document.createTextNode(1);
                this.mo.observe(this.node, { characterData: true });
            }
            this.node.nodeValue = -this.node.nodeValue;
        } else {
            setTimeout(this.wrappedCallback);
        }
    };
    /**
     * Runs scheduled execution immediately, if there were any.
     */
    AsyncWrapper.prototype.runImmediately = function () {
        if (this.hasPendingCallback()) {
            cAF(this.rAFid);
            clearTimeout(this.timerId);
            this.rAFid = this.timerId = undefined;
            this.wrappedCallback();
        }
    };

    AsyncWrapper.now = function () {
        return perf.now();
    };

    return AsyncWrapper;
})();

/**
 * Stores native OdP to be used in WeakMap and Set polyfills.
 */
utils.defineProperty = Object.defineProperty;

utils.WeakMap = typeof WeakMap !== 'undefined' ? WeakMap : (function () {
    /** Originally based on {@link https://github.com/Polymer/WeakMap} */
    var counter = Date.now() % 1e9;

    var WeakMap = function () {
        this.name = '__st' + (Math.random() * 1e9 >>> 0) + (counter++ + '__');
    };

    WeakMap.prototype = {
        set: function (key, value) {
            var entry = key[this.name];
            if (entry && entry[0] === key) {
                entry[1] = value;
            } else {
                utils.defineProperty(key, this.name, { value: [key, value], writable: true });
            }
            return this;
        },
        get: function (key) {
            var entry;
            return (entry = key[this.name]) && entry[0] === key ?
                entry[1] : undefined;
        },
        delete: function (key) {
            var entry = key[this.name];
            if (!entry) {
                return false;
            }
            var hasValue = entry[0] === key;
            entry[0] = entry[1] = undefined;
            return hasValue;
        },
        has: function (key) {
            var entry = key[this.name];
            if (!entry) {
                return false;
            }
            return entry[0] === key;
        }
    };

    return WeakMap;
})();

utils.Set = typeof Set !== 'undefined' ? Set : (function () {
    var counter = Date.now() % 1e9;
    /**
     * A polyfill which covers only the basic usage.
     * Only supports methods that are supported in IE11.
     * {@link https://docs.microsoft.com/en-us/scripting/javascript/reference/set-object-javascript}
     * Assumes that 'key's are all objects, not primitives such as a number.
     * 
     * @param {Array} items Initial items in this set
     */
    var Set = function (items) {
        this.name = '__st' + (Math.random() * 1e9 >>> 0) + (counter++ + '__');
        this.keys = [];

        if (items && items.length) {
            var iItems = items.length;
            while (iItems--) {
                this.add(items[iItems]);
            }
        }
    };

    Set.prototype = {
        add: function (key) {
            if (!isNumber(key[this.name])) {
                var index = this.keys.push(key) - 1;
                utils.defineProperty(key, this.name, { value: index, writable: true });
            }
        },
        delete: function (key) {
            if (isNumber(key[this.name])) {
                var index = key[this.name];
                delete this.keys[index];
                key[this.name] = undefined;
            }
        },
        has: function (key) {
            return isNumber(key[this.name]);
        },
        clear: function () {
            this.keys.forEach(function (key) {
                key[this.name] = undefined;
            });
            this.keys.length = 0;
        },
        forEach: function (cb) {
            var that = this;
            this.keys.forEach(function (value) {
                cb(value, value, that);
            });
        }
    };

    utils.defineProperty(Set.prototype, 'size', {
        get: function () {
            // Skips holes.
            return this.keys.reduce(function (acc) {
                return acc + 1;
            }, 0);
        }
    });

    return Set;
})();

/**
 * Vendor-specific Element.prototype.matches
 */
utils.matchesPropertyName = (function () {
    var props = ['matches', 'matchesSelector', 'mozMatchesSelector', 'msMatchesSelector', 'oMatchesSelector', 'webkitMatchesSelector'];

    for (var i = 0; i < 6; i++) {
        if (Element.prototype.hasOwnProperty(props[i])) {
            return props[i];
        }
    }
})();

/**
 * 
 * @param {Array<number>} timingArray 
 */
utils.Stats = function(timingArray) {
    this.timingArray = timingArray;
    
    var sum = 0;
    var squaredSum = 0;

    for (var i = 0, l = timingArray.length; i < l; i++) {
        var num = timingArray[i];
        sum += num;
        squaredSum += num * num;
    }

    this.mean = sum / l;
    this.stddev = Math.sqrt((squaredSum / l) - Math.pow(this.mean, 2));
};
/** 
 * Safely calls console.error if it's present
 */
utils.logError = function (message) {
    if (typeof console !== 'undefined' && console.error) {
        console.error(message);
    }
};

function isNumber(obj) {
    return typeof obj === 'number';
}