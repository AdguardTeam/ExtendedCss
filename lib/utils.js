var utils = {};

utils.toRegex = function (regexSrc, flag) {
    flag = flag || 'i';
    regexSrc = regexSrc.trim().replace(/\\(["\\])/g, '$1');
    return new RegExp(regexSrc, flag);
};

utils.createSimpleRegex = (function() { // jshint ignore:line
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
     * Main function: Creates regex
     */
    var createRegexText = function(str) {
        var regex = escapeRegExp(str);

        if (startsWith(regex, regexConfiguration.maskStartUrl)) {
            regex = regex.substring(0, regexConfiguration.maskStartUrl.length) + 
                replaceAll(regex.substring(regexConfiguration.maskStartUrl.length, regex.length - 1), "\|", "\\|") +
                regex.substring(regex.length - 1);
        } else if (startsWith(regex, regexConfiguration.maskPipe)){
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

        return regex;        
    };

    return createRegexText;
})();

// https://github.com/AdguardTeam/FingerprintingBlocker/blob/master/src/shared/url.ts#L64
utils.createLocation = function (href) {
    var anchor = document.createElement('a');
    anchor.href = href;
    if (anchor.host === "") {
        anchor.href = anchor.href;
    }
    return anchor;
};

utils.isSameOrigin = function (url_A, location_B, domain_B) {
    var location_A = utils.createLocation(url_A);
    if (location_A.protocol === 'javascript:' || location_A.href === 'about:blank') {
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
utils.AsyncWrapper = (function() {
    var supported = typeof window.requestAnimationFrame !== 'undefined';
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
    }
    /** @private */
    AsyncWrapper.prototype.wrappedCallback = function(ts) {
        this.lastRun = ts || perf.now();
        this.rAFid = this.timerId = undefined;
        this.callback();
    };
    /**
     * Schedules a function call before the next animation frame.
     */
    AsyncWrapper.prototype.run = function() {
        if (typeof this.rAFid === 'number' || typeof this.timerId === 'number') {
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
     * Runs scheduled execution immediately, if there were any.
     */
    AsyncWrapper.prototype.runImmediately = function() {
        if (typeof this.rAFid === 'number' || typeof this.timerId === 'number') {
            cAF(this.rAFid);
            clearTimeout(this.timerId);
            this.rAFid = this.timerId = undefined;
            this.wrappedCallback();
        }
    };

    return AsyncWrapper;
})();

utils.defineProperty = Object.defineProperty;

utils.WeakMap = typeof WeakMap !== 'undefined' ? WeakMap : (function() {
    var counter = Date.now() % 1e9;

    var WeakMap = function() {
      this.name = '__st' + (Math.random() * 1e9 >>> 0) + (counter++ + '__');
    };

    WeakMap.prototype = {
      set: function(key, value) {
        var entry = key[this.name];
        if (entry && entry[0] === key) {
          entry[1] = value;
        } else {
          utils.defineProperty(key, this.name, {value: [key, value], writable: true});
        }
        return this;
      },
      get: function(key) {
        var entry;
        return (entry = key[this.name]) && entry[0] === key ?
            entry[1] : undefined;
      },
      delete: function(key) {
        var entry = key[this.name];
        if (!entry) {
            return false;
        }
        var hasValue = entry[0] === key;
        entry[0] = entry[1] = undefined;
        return hasValue;
      },
      has: function(key) {
        var entry = key[this.name];
        if (!entry) {
            return false;
        }
        return entry[0] === key;
      }
    };

    return WeakMap;
})();

utils.Set = typeof Set !== 'undefined' ? Set : (function() {
    var counter = Date.now() % 1e9;
    /**
     * A polyfill which covers only the basic usage, as supported by IE11.
     * {@link https://docs.microsoft.com/en-us/scripting/javascript/reference/set-object-javascript}
     * Assumes that 'key's are all objects, not primitives such as a number.
     */
    var Set = function () {
        this.name = '__st' + (Math.random() * 1e9 >>> 0) + (counter++ + '__');
        this.keys = [];
    };

    var isNumber = function (obj) {
        return typeof obj === 'number';
    };

    Set.prototype = {
        add: function (key) {
            if (isNumber(key[this.name])) {
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
            return isNumber(typeof key[this.name] === 'number');
        },
        clear: function() {
            this.keys.forEach(function (key) {
                key[this.name] = undefined;
            });
            this.keys.length = 0;
        },
        forEach: function(cb) {
            var that = this;
            this.keys.forEach(function(value) {
                cb(value, value, that);
            });
        }
    };

    utils.defineProperty(Set.prototype, 'size', {
        get: function() {
            return this.keys.length;
        }
    });

    return Set;
})();

utils.matchesPropertyName = (function() {
    var props = ['matches', 'matchesSelector', 'mozMatchesSelector', 'msMatchesSelector', 'oMatchesSelector', 'webkitMatchesSelector'];

    for (var i = 0; i < 6; i++) {
        if (Element.prototype.hasOwnProperty(props[i])) {
            return props[i];
        }
    }
})();

utils.MutationObserver = window.MutationObserver || window.WebKitMutationObserver;