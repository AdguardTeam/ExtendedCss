/**
 * Copyright 2016 Adguard Software Ltd
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

/* eslint-disable no-console */

const utils = {};
utils.MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

utils.isSafariBrowser = (function () {
    const isChrome = navigator.userAgent.indexOf('Chrome') > -1;
    const isSafari = navigator.userAgent.indexOf('Safari') > -1;

    if (isSafari) {
        if (isChrome) {
            // Chrome seems to have both Chrome and Safari userAgents
            return false;
        }
        return true;
    }
    return false;
})();

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
 * Converts string to the regexp
 * @param {string} str
 * @returns {RegExp}
 */
utils.toRegExp = (str) => {
    if (str[0] === '/' && str[str.length - 1] === '/') {
        return new RegExp(str.slice(1, -1));
    }
    const escaped = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escaped);
};

utils.startsWith = function (str, prefix) {
    // if str === '', (str && false) will return ''
    // that's why it has to be !!str
    return !!str && str.indexOf(prefix) === 0;
};

utils.endsWith = function (str, postfix) {
    if (!str || !postfix) {
        return false;
    }

    if (str.endsWith) {
        return str.endsWith(postfix);
    }
    const t = String(postfix);
    const index = str.lastIndexOf(t);
    return index >= 0 && index === str.length - t.length;
};

/**
 * Helper function for creating regular expression from a url filter rule syntax.
 */
utils.createURLRegex = (function () {
    // Constants
    const regexConfiguration = {
        maskStartUrl: '||',
        maskPipe: '|',
        maskSeparator: '^',
        maskAnySymbol: '*',

        regexAnySymbol: '.*',
        regexSeparator: '([^ a-zA-Z0-9.%_-]|$)',
        regexStartUrl: '^(http|https|ws|wss)://([a-z0-9-_.]+\\.)?',
        regexStartString: '^',
        regexEndString: '$',
    };

    // https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/regexp
    // should be escaped . * + ? ^ $ { } ( ) | [ ] / \
    // except of * | ^
    const specials = [
        '.', '+', '?', '$', '{', '}', '(', ')', '[', ']', '\\', '/',
    ];
    const specialsRegex = new RegExp(`[${specials.join('\\')}]`, 'g');

    /**
     * Escapes regular expression string
     */
    const escapeRegExp = function (str) {
        return str.replace(specialsRegex, '\\$&');
    };

    const replaceAll = function (str, find, replace) {
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
    const createRegexText = function (str) {
        let regex = escapeRegExp(str);

        if (utils.startsWith(regex, regexConfiguration.maskStartUrl)) {
            regex = regex.substring(0, regexConfiguration.maskStartUrl.length)
                + replaceAll(regex.substring(regexConfiguration.maskStartUrl.length, regex.length - 1), '\|', '\\|')
                + regex.substring(regex.length - 1);
        } else if (utils.startsWith(regex, regexConfiguration.maskPipe)) {
            regex = regex.substring(0, regexConfiguration.maskPipe.length)
                + replaceAll(regex.substring(regexConfiguration.maskPipe.length, regex.length - 1), '\|', '\\|')
                + regex.substring(regex.length - 1);
        } else {
            regex = replaceAll(regex.substring(0, regex.length - 1), '\|', '\\|')
                + regex.substring(regex.length - 1);
        }

        // Replacing special url masks
        regex = replaceAll(regex, regexConfiguration.maskAnySymbol, regexConfiguration.regexAnySymbol);
        regex = replaceAll(regex, regexConfiguration.maskSeparator, regexConfiguration.regexSeparator);

        if (utils.startsWith(regex, regexConfiguration.maskStartUrl)) {
            regex = regexConfiguration.regexStartUrl + regex.substring(regexConfiguration.maskStartUrl.length);
        } else if (utils.startsWith(regex, regexConfiguration.maskPipe)) {
            regex = regexConfiguration.regexStartString + regex.substring(regexConfiguration.maskPipe.length);
        }
        if (utils.endsWith(regex, regexConfiguration.maskPipe)) {
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
    const anchor = document.createElement('a');
    anchor.href = href;
    if (anchor.host === '') {
        anchor.href = anchor.href; // eslint-disable-line no-self-assign
    }
    return anchor;
};

/**
 * Checks whether A has the same origin as B.
 * @param {string} urlA location.href of A.
 * @param {Location} locationB location of B.
 * @param {string} domainB document.domain of B.
 * @return {boolean}
 */
utils.isSameOrigin = function (urlA, locationB, domainB) {
    const locationA = utils.createLocation(urlA);
    // eslint-disable-next-line no-script-url
    if (locationA.protocol === 'javascript:' || locationA.href === 'about:blank') {
        return true;
    }
    if (locationA.protocol === 'data:' || locationA.protocol === 'file:') {
        return false;
    }
    return locationA.hostname === domainB && locationA.port === locationB.port && locationA.protocol === locationB.protocol;
};

/**
 * A helper class to throttle function calls with setTimeout and requestAnimationFrame.
 */
utils.AsyncWrapper = (function () {
    /**
     * PhantomJS passes a wrong timestamp to the requestAnimationFrame callback and that breaks the AsyncWrapper logic
     * https://github.com/ariya/phantomjs/issues/14832
     */
    const supported = (typeof window.requestAnimationFrame !== 'undefined') && !/phantom/i.test(navigator.userAgent);
    const rAF = supported ? requestAnimationFrame : setTimeout;
    const cAF = supported ? cancelAnimationFrame : clearTimeout;
    const perf = supported ? performance : Date;

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
        delete this.rAFid;
        delete this.timerId;
        delete this.asapScheduled;
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
            const elapsed = perf.now() - this.lastRun;
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
    AsyncWrapper.prototype.runAsap = function () {
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
            delete this.rAFid;
            delete this.timerId;
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
    let counter = Date.now() % 1e9;

    const WeakMap = function () {
        this.name = `__st${Math.random() * 1e9 >>> 0}${counter++}__`;
    };

    WeakMap.prototype = {
        set(key, value) {
            const entry = key[this.name];
            if (entry && entry[0] === key) {
                entry[1] = value;
            } else {
                utils.defineProperty(key, this.name, { value: [key, value], writable: true });
            }
            return this;
        },
        get(key) {
            const entry = key[this.name];
            return entry && entry[0] === key ? entry[1] : undefined;
        },
        delete(key) {
            const entry = key[this.name];
            if (!entry) {
                return false;
            }
            const hasValue = entry[0] === key;
            delete entry[0];
            delete entry[1];
            return hasValue;
        },
        has(key) {
            const entry = key[this.name];
            if (!entry) {
                return false;
            }
            return entry[0] === key;
        },
    };

    return WeakMap;
})();

utils.Set = typeof Set !== 'undefined' ? Set : (function () {
    let counter = Date.now() % 1e9;
    /**
     * A polyfill which covers only the basic usage.
     * Only supports methods that are supported in IE11.
     * {@link https://docs.microsoft.com/en-us/scripting/javascript/reference/set-object-javascript}
     * Assumes that 'key's are all objects, not primitives such as a number.
     *
     * @param {Array} items Initial items in this set
     */
    const Set = function (items) {
        this.name = `__st${Math.random() * 1e9 >>> 0}${counter++}__`;
        this.keys = [];

        if (items && items.length) {
            let iItems = items.length;
            while (iItems--) {
                this.add(items[iItems]);
            }
        }
    };

    Set.prototype = {
        add(key) {
            if (!isNumber(key[this.name])) {
                const index = this.keys.push(key) - 1;
                utils.defineProperty(key, this.name, { value: index, writable: true });
            }
        },
        delete(key) {
            if (isNumber(key[this.name])) {
                const index = key[this.name];
                delete this.keys[index];
                key[this.name] = undefined;
            }
        },
        has(key) {
            return isNumber(key[this.name]);
        },
        clear() {
            this.keys.forEach(function (key) {
                key[this.name] = undefined;
            });
            this.keys.length = 0;
        },
        forEach(cb) {
            const that = this;
            this.keys.forEach((value) => {
                cb(value, value, that);
            });
        },
    };

    utils.defineProperty(Set.prototype, 'size', {
        get() {
            // Skips holes.
            return this.keys.reduce((acc) => acc + 1, 0);
        },
    });

    return Set;
})();

/**
 * Vendor-specific Element.prototype.matches
 */
utils.matchesPropertyName = (function () {
    const props = ['matches', 'matchesSelector', 'mozMatchesSelector',
        'msMatchesSelector', 'oMatchesSelector', 'webkitMatchesSelector'];

    for (let i = 0; i < 6; i++) {
        if (Element.prototype.hasOwnProperty(props[i])) {
            return props[i];
        }
    }
})();

/**
 * Provides stats information
 */
utils.Stats = function () {
    /** @member {Array<number>} */
    this.array = [];
    /** @member {number} */
    this.length = 0;
    const zeroDescriptor = {
        value: 0,
        writable: true,
    };
    /** @member {number} @private */
    Object.defineProperty(this, 'sum', zeroDescriptor);
    /** @member {number} @private */
    Object.defineProperty(this, 'squaredSum', zeroDescriptor);
};

/**
 * @param {number} dataPoint data point
 */
utils.Stats.prototype.push = function (dataPoint) {
    this.array.push(dataPoint);
    this.length++;
    this.sum += dataPoint;
    this.squaredSum += dataPoint * dataPoint;
    /** @member {number} */
    this.mean = this.sum / this.length;
    /** @member {number} */
    // eslint-disable-next-line no-restricted-properties
    this.stddev = Math.sqrt((this.squaredSum / this.length) - Math.pow(this.mean, 2));
};

/** Safe console.error version */
utils.logError = (
    typeof console !== 'undefined'
    && console.error
    && Function.prototype.bind
    && console.error.bind
) ? console.error.bind(window.console) : console.error;

/** Safe console.info version */
utils.logInfo = (
    typeof console !== 'undefined'
    && console.info
    && Function.prototype.bind
    && console.info.bind
) ? console.info.bind(window.console) : console.info;

function isNumber(obj) {
    return typeof obj === 'number';
}

/**
 * Returns path to element we will use as element identifier
 * @param {Element} inputEl
 * @returns {string} - path to the element
 */
utils.getNodeSelector = function (inputEl) {
    if (!(inputEl instanceof Element)) {
        throw new Error('Function received argument with wrong type');
    }

    let el = inputEl;
    const path = [];
    // we need to check '!!el' first because it is possible
    // that some ancestor of the inputEl was removed before it
    while (!!el && el.nodeType === Node.ELEMENT_NODE) {
        let selector = el.nodeName.toLowerCase();
        if (el.id && typeof el.id === 'string') {
            selector += `#${el.id}`;
            path.unshift(selector);
            break;
        } else {
            let sibling = el;
            let nth = 1;
            while (sibling.previousSibling) {
                sibling = sibling.previousSibling;
                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName.toLowerCase() === selector) {
                    nth++;
                }
            }
            if (nth !== 1) {
                selector += `:nth-of-type(${nth})`;
            }
        }
        path.unshift(selector);
        el = el.parentNode;
    }
    return path.join(' > ');
};

export default utils;
