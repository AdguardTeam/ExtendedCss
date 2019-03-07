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

/* global ExtendedCssParser, ExtendedSelectorFactory, StyleObserver, utils */

/**
 * This callback is used to get affected node elements and handle style properties
 * before they are applied to them if it is necessary
 * @callback beforeStyleApplied
 * @param {object} affectedElement - Object containing DOM node and rule to be applied
 * @return {object} affectedElement - Same or modified object containing DOM node and rule to be applied
 */

/**
 * Extended css class
 *
 * @param {Object} configuration
 * @param {string} configuration.styleSheet - the CSS stylesheet text
 * @param {Array.<HTMLElement>} [configuration.propertyFilterIgnoreStyleNodes] - A list of stylesheet nodes that should be ignored by the StyleObserver (":properties" matching object)
 * @param {beforeStyleApplied} [configuration.beforeStyleApplied] - the callback that handles affected elements
 * @constructor
 */
function ExtendedCss(configuration) { // jshint ignore:line
    if (!configuration) {
        throw 'Configuration is not provided.';
    }

    const styleSheet = configuration.styleSheet;
    const propertyFilterIgnoreStyleNodes = configuration.propertyFilterIgnoreStyleNodes;
    const beforeStyleApplied = configuration.beforeStyleApplied;

    if (beforeStyleApplied && typeof beforeStyleApplied !== 'function') {
        throw "Wrong configuration. Type of 'beforeStyleApplied' field should be a function, received: " + typeof beforeStyleApplied;
    }

    // We use EventTracker to track the event that is likely to cause the mutation.
    // The problem is that we cannot use `window.event` directly from the mutation observer call
    // as we're not in the event handler context anymore.
    const EventTracker = (function() {

        const ignoredEventTypes = ['mouseover', 'mouseleave', 'mouseenter', 'mouseout'];
        const LAST_EVENT_TIMEOUT_MS = 10;

        const TRACKED_EVENTS = [
            // keyboard events
            "keydown", "keypress", "keyup",
            // mouse events
            "auxclick", "click", "contextmenu", "dblclick", "mousedown", "mouseenter",
            "mouseleave", "mousemove", "mouseover", "mouseout", "mouseup", "pointerlockchange",
            "pointerlockerror", "select", "wheel",
        ];

        let lastEventType;
        let lastEventTime;

        const trackEvent = function(e) {
            lastEventType = e.type;
            lastEventTime = Date.now();
        };

        for (let evName of TRACKED_EVENTS) {
            document.documentElement.addEventListener(evName, trackEvent, true);
        }

        const getLastEventType = function() {
            return lastEventType;
        };

        const getTimeSinceLastEvent = function() {
            return Date.now() - lastEventTime;
        };

        return {
            isIgnoredEventType: function () {
                return ignoredEventTypes.includes(getLastEventType()) && getTimeSinceLastEvent() < LAST_EVENT_TIMEOUT_MS;
            }
        };
    })();

    let rules = [];
    let affectedElements = [];
    let removalsStatistic = {};
    let domObserved;
    let eventListenerSupported = window.addEventListener;
    let domMutationObserver;

    function observeDocument(callback) {
        // We are trying to limit the number of callback calls by not calling it on all kind of "hover" events.
        // The rationale behind this is that "hover" events often cause attributes modification,
        // but re-applying extCSS rules will be useless as these attribute changes are usually transient.
        const isIgnoredMutation = function (mutations) {
            for (let i = 0; i < mutations.length; i += 1) {
                if (mutations.type !== 'attributes') {
                    return false;
                }
            }
            return true;
        };

        if (utils.MutationObserver) {
            domMutationObserver = new utils.MutationObserver(function(mutations) {
                if (!mutations || mutations.length === 0) {
                    return;
                }

                if (EventTracker.isIgnoredEventType() && isIgnoredMutation(mutations)) {
                    return;
                }

                callback();
            });

            domMutationObserver.observe(document.documentElement, {
                childList: true,
                subtree: true,
                attributeFilter: ['id', 'class'],
            });
        } else if (eventListenerSupported) {
            document.addEventListener('DOMNodeInserted', callback, false);
            document.addEventListener('DOMNodeRemoved', callback, false);
            document.addEventListener('DOMAttrModified', callback, false);
        }
    }

    function disconnectDocument(callback) {
        if (domMutationObserver) {
            domMutationObserver.disconnect();
        } else if (eventListenerSupported) {
            document.removeEventListener('DOMNodeInserted', callback, false);
            document.removeEventListener('DOMNodeRemoved', callback, false);
            document.removeEventListener('DOMAttrModified', callback, false);
        }
    }

    const MAX_STYLE_PROTECTION_COUNT = 50;

    const protectionObserverOption = {
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ['style']
    };

    function protectionFunction(mutations, observer) {
        if (!mutations.length) { return; }
        let mutation = mutations[0];
        let target = mutation.target;
        observer.disconnect();
        target.setAttribute('style', mutation.oldValue);
        if (++observer.styleProtectionCount < MAX_STYLE_PROTECTION_COUNT) {
            observer.observe(target, protectionObserverOption);
        } else {
            utils.logError('ExtendedCss: infinite loop protection for style');
        }
    }

    /**
     * Sets up a MutationObserver which protects style attributes from changes
     * @param node DOM node
     * @returns Mutation observer used to protect attribute or null if there's nothing to protect
     */
    function protectStyleAttribute(node) {
        if (!utils.MutationObserver) { return null; }
        let protectionObserver = new utils.MutationObserver(protectionFunction);
        protectionObserver.observe(node, protectionObserverOption);
        // Adds an expando to the observer to keep 'style fix counts'.
        protectionObserver.styleProtectionCount = 0;
        return protectionObserver;
    }

    function removeSuffix(str, suffix) {
        let index = str.indexOf(suffix, str.length - suffix.length);
        if (index >= 0) { return str.substring(0, index); }
        return str;
    }

    /**
     * Finds affectedElement object for the specified DOM node
     * @param node  DOM node
     * @returns     affectedElement found or null
     */
    function findAffectedElement(node) {
        for (let affectedElement of affectedElements) {
            if (affectedElement.node === node) {
                return affectedElement;
            }
        }
        return null;
    }

    function removeElement(affectedElement) {
        const node = affectedElement.node;

        const elementSelector = utils.getNodeSelector(node);

        // check if the element has been already removed earlier
        const elementRemovalsCounter = removalsStatistic[elementSelector] || 0;

        // if removals attempts happened more than specified we do not try to remove node again
        if (elementRemovalsCounter > MAX_STYLE_PROTECTION_COUNT) {
            utils.logError('ExtendedCss: infinite loop protection for SELECTOR', elementSelector);
            return;
        }

        if (node.parentNode) {
            node.parentNode.removeChild(node);
            removalsStatistic[elementSelector] = elementRemovalsCounter + 1;
        }
    }

    /**
     * Applies style to the specified DOM node
     * @param affectedElement Object containing DOM node and rule to be applied
     */
    function applyStyle(affectedElement) {
        if (affectedElement.protectionObserver) {
            // Style is already applied and protected by the observer
            return;
        }

        if (beforeStyleApplied) {
            affectedElement = beforeStyleApplied(affectedElement);
            if (!affectedElement) {
                return;
            }
        }

        let node = affectedElement.node;
        let style = affectedElement.rule.style;
        if (style['remove'] === 'true') {
            removeElement(affectedElement);
            return;
        }

        for (let prop in style) {
            // Apply this style only to existing properties
            // We can't use hasOwnProperty here (does not work in FF)
            if (typeof node.style.getPropertyValue(prop) !== "undefined") {
                let value = style[prop];
                // First we should remove !important attribute (or it won't be applied')
                value = removeSuffix(value.trim(), "!important").trim();
                node.style.setProperty(prop, value, "important");
            }
        }
        // Protect "style" attribute from changes
        affectedElement.protectionObserver = protectStyleAttribute(node);
    }

    /**
     * Reverts style for the affected object
     */
    function revertStyle(affectedElement) {
        if (affectedElement.protectionObserver) {
            affectedElement.protectionObserver.disconnect();
        }
        affectedElement.node.style.cssText = affectedElement.originalStyle;
    }

    /**
     * Applies specified rule and returns list of elements affected
     * @param rule Rule to apply
     * @returns List of elements affected by this rule
     */
    function applyRule(rule) {
        let debug = rule.selector.isDebugging();
        let start;
        if (debug) {
            start = utils.AsyncWrapper.now();
        }

        let selector = rule.selector;
        let nodes = selector.querySelectorAll();

        for (let node of nodes) {
            let affectedElement = findAffectedElement(node);

            if (affectedElement) {
                // We have already applied style to this node
                // Let's re-apply style to it
                applyStyle(affectedElement);
            } else {
                // Applying style first time
                let originalStyle = node.style.cssText;
                affectedElement = {
                    node: node,                   // affected DOM node
                    rule: rule,                   // rule to be applied
                    originalStyle: originalStyle, // original node style
                    protectionObserver: null      // style attribute observer
                };
                applyStyle(affectedElement);
                affectedElements.push(affectedElement);
            }
        }

        if (debug) {
            let elapsed = utils.AsyncWrapper.now() - start;
            if (!('timingStats' in rule)) {
                rule.timingStats = new utils.Stats();
            }
            rule.timingStats.push(elapsed);
        }

        return nodes;
    }


    /**
     * Applies filtering rules
     */
    function applyRules() {
        let elementsIndex = [];
        // some rules could make call - selector.querySelectorAll() temporarily to change node id attribute
        // this caused MutationObserver to call recursively
        // https://github.com/AdguardTeam/ExtendedCss/issues/81
        stopObserve();
        for (let rule of rules) {
            let nodes = applyRule(rule);
            Array.prototype.push.apply(elementsIndex, nodes);
        }

        // Now revert styles for elements which are no more affected
        let l = affectedElements.length;
        while (l--) {
            let obj = affectedElements[l];
            if (elementsIndex.indexOf(obj.node) === -1) {
                // Time to revert style
                revertStyle(obj);
                affectedElements.splice(l, 1);
            }
        }
        // After styles are applied we can start observe again
        observe();
        printTimingInfo();
    }

    const APPLY_RULES_DELAY = 50;
    const applyRulesScheduler = new utils.AsyncWrapper(applyRules, APPLY_RULES_DELAY);
    const mainCallback = applyRulesScheduler.run.bind(applyRulesScheduler);

    function observe() {
        if (domObserved) { return; }

        // Handle dynamically added elements
        domObserved = true;
        observeDocument(mainCallback);
    }

    function stopObserve() {
        if (!domObserved) { return; }
        domObserved = false;
        disconnectDocument(mainCallback);
    }

    function apply() {
        applyRules();

        if (document.readyState !== "complete") {
            document.addEventListener("DOMContentLoaded", applyRules);
        }
    }

    /**
     * Disposes ExtendedCss and removes our styles from matched elements
     */
    function dispose() {
        stopObserve();
        for (let obj of affectedElements) {
            revertStyle(obj);
        }
    }

    let timingsPrinted = false;
    /**
     * Prints timing information for all selectors marked as "debug"
     */
    function printTimingInfo() {
        if (timingsPrinted) { return; }
        timingsPrinted = true;

        const timings = rules.filter(function(rule) {
            return rule.selector.isDebugging();
        }).map(function(rule) {
            return {
                selectorText: rule.selector.selectorText,
                timingStats: rule.timingStats
            };
        });

        if (timings.length === 0) { return; }
        // Add location.href to the message to distinguish frames
        utils.logInfo("[ExtendedCss] Timings for %o:\n%o (in milliseconds)", location.href, timings);
    }

    // Let StyleObserver know which stylesheets should not be used for :properties matching
    StyleObserver.setIgnoredStyleNodes(propertyFilterIgnoreStyleNodes);

    // First of all parse the stylesheet
    rules = ExtendedCssParser.parseCss(styleSheet);

    // EXPOSE
    this.dispose = dispose;
    this.apply = apply;

    /** Exposed for testing purposes only */
    this._getAffectedElements = function() {
        return affectedElements;
    };
}

/**
 * Expose querySelectorAll for debugging and validating selectors
 *
 * @param {string} selectorText selector text
 * @param {boolean} noTiming if true -- do not print the timing to the console
 * @returns {Array<Node>|NodeList} a list of elements found
 * @throws Will throw an error if the argument is not a valid selector
 */
ExtendedCss.query = function(selectorText, noTiming) {
    if (typeof selectorText !== 'string') {
        throw 'Selector text is empty';
    }

    let now = utils.AsyncWrapper.now;
    let start = now();

    try {
        return ExtendedSelectorFactory.createSelector(selectorText).querySelectorAll();
    } finally {
        StyleObserver.clear();

        let end = now();
        if (!noTiming) {
            utils.logInfo('[ExtendedCss] Elapsed: ' + Math.round((end - start)*1000) + ' μs.');
        }
    }
};
