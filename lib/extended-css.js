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

import utils from './utils';
import ExtendedCssParser from './extended-css-parser';
import ExtendedSelectorFactory from './extended-css-selector';

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
 * @param {beforeStyleApplied} [configuration.beforeStyleApplied] - the callback that handles affected elements
 * @constructor
 */
function ExtendedCss(configuration) {
    if (!configuration) {
        throw new Error('Configuration is not provided.');
    }

    const { styleSheet } = configuration;
    const { beforeStyleApplied } = configuration;

    if (beforeStyleApplied && typeof beforeStyleApplied !== 'function') {
        // eslint-disable-next-line max-len
        throw new Error(`Wrong configuration. Type of 'beforeStyleApplied' field should be a function, received: ${typeof beforeStyleApplied}`);
    }

    // We use EventTracker to track the event that is likely to cause the mutation.
    // The problem is that we cannot use `window.event` directly from the mutation observer call
    // as we're not in the event handler context anymore.
    const EventTracker = (function () {
        const ignoredEventTypes = ['mouseover', 'mouseleave', 'mouseenter', 'mouseout'];
        const LAST_EVENT_TIMEOUT_MS = 10;

        const EVENTS = [
            // keyboard events
            'keydown', 'keypress', 'keyup',
            // mouse events
            'auxclick', 'click', 'contextmenu', 'dblclick', 'mousedown', 'mouseenter',
            'mouseleave', 'mousemove', 'mouseover', 'mouseout', 'mouseup', 'pointerlockchange',
            'pointerlockerror', 'select', 'wheel',
        ];

        // 'wheel' event makes scrolling in Safari twitchy
        // https://github.com/AdguardTeam/ExtendedCss/issues/120
        const safariProblematicEvents = ['wheel'];

        const trackedEvents = utils.isSafariBrowser
            ? EVENTS.filter((el) => !(safariProblematicEvents.indexOf(el) > -1))
            : EVENTS;

        let lastEventType;
        let lastEventTime;

        const trackEvent = function (e) {
            lastEventType = e.type;
            lastEventTime = Date.now();
        };

        trackedEvents.forEach((evName) => {
            document.documentElement.addEventListener(evName, trackEvent, true);
        });

        const getLastEventType = function () {
            return lastEventType;
        };

        const getTimeSinceLastEvent = function () {
            return Date.now() - lastEventTime;
        };

        return {
            isIgnoredEventType() {
                return ignoredEventTypes.indexOf(getLastEventType()) > -1 && getTimeSinceLastEvent() < LAST_EVENT_TIMEOUT_MS;
            },
        };
    })();

    let rules = [];
    const affectedElements = [];
    const removalsStatistic = {};
    let domObserved;
    const eventListenerSupported = window.addEventListener;
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
            domMutationObserver = new utils.MutationObserver(((mutations) => {
                if (!mutations || mutations.length === 0) {
                    return;
                }

                if (EventTracker.isIgnoredEventType() && isIgnoredMutation(mutations)) {
                    return;
                }

                callback();
            }));

            domMutationObserver.observe(document, {
                childList: true,
                subtree: true,
                attributes: true,
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
        attributeFilter: ['style'],
    };

    /**
     * Creates MutationObserver protection function
     *
     * @param styles
     * @return {protectionFunction}
     */
    function createProtectionFunction(styles) {
        function protectionFunction(mutations, observer) {
            if (!mutations.length) {
                return;
            }
            const mutation = mutations[0];
            const { target } = mutation;
            observer.disconnect();
            styles.forEach((style) => {
                setStyleToElement(target, style);
            });
            if (++observer.styleProtectionCount < MAX_STYLE_PROTECTION_COUNT) {
                observer.observe(target, protectionObserverOption);
            } else {
                utils.logError('ExtendedCss: infinite loop protection for style');
            }
        }

        return protectionFunction;
    }

    /**
     * Sets up a MutationObserver which protects style attributes from changes
     * @param node DOM node
     * @param rules rules
     * @returns Mutation observer used to protect attribute or null if there's nothing to protect
     */
    function protectStyleAttribute(node, rules) {
        if (!utils.MutationObserver) {
            return null;
        }
        const styles = rules.map((r) => r.style);
        const protectionObserver = new utils.MutationObserver(createProtectionFunction(styles));
        protectionObserver.observe(node, protectionObserverOption);
        // Adds an expando to the observer to keep 'style fix counts'.
        protectionObserver.styleProtectionCount = 0;
        return protectionObserver;
    }

    function removeSuffix(str, suffix) {
        const index = str.indexOf(suffix, str.length - suffix.length);
        if (index >= 0) { return str.substring(0, index); }
        return str;
    }

    /**
     * Finds affectedElement object for the specified DOM node
     * @param node  DOM node
     * @returns     affectedElement found or null
     */
    function findAffectedElement(node) {
        for (let i = 0; i < affectedElements.length; i += 1) {
            if (affectedElements[i].node === node) {
                return affectedElements[i];
            }
        }
        return null;
    }

    function removeElement(affectedElement) {
        const { node } = affectedElement;

        affectedElement.removed = true;

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

        const { node } = affectedElement;
        for (let i = 0; i < affectedElement.rules.length; i++) {
            const { style } = affectedElement.rules[i];
            if (style['remove'] === 'true') {
                removeElement(affectedElement);
                return;
            }

            setStyleToElement(node, style);
        }
    }

    /**
     * Sets style to the specified DOM node
     * @param node element
     * @param style style
     */
    function setStyleToElement(node, style) {
        Object.keys(style).forEach((prop) => {
            // Apply this style only to existing properties
            // We can't use hasOwnProperty here (does not work in FF)
            if (typeof node.style.getPropertyValue(prop) !== 'undefined') {
                let value = style[prop];
                // First we should remove !important attribute (or it won't be applied')
                value = removeSuffix(value.trim(), '!important').trim();
                node.style.setProperty(prop, value, 'important');
            }
        });
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
        const debug = rule.selector.isDebugging();
        let start;
        if (debug) {
            start = utils.AsyncWrapper.now();
        }

        const { selector } = rule;
        const nodes = selector.querySelectorAll();

        nodes.forEach((node) => {
            let affectedElement = findAffectedElement(node);

            if (affectedElement) {
                affectedElement.rules.push(rule);
                applyStyle(affectedElement);
            } else {
                // Applying style first time
                const originalStyle = node.style.cssText;
                affectedElement = {
                    node,                       // affected DOM node
                    rules: [rule],              // rules to be applied
                    originalStyle,              // original node style
                    protectionObserver: null,   // style attribute observer
                };
                applyStyle(affectedElement);
                affectedElements.push(affectedElement);
            }
        });

        if (debug) {
            const elapsed = utils.AsyncWrapper.now() - start;
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
        const elementsIndex = [];
        // some rules could make call - selector.querySelectorAll() temporarily to change node id attribute
        // this caused MutationObserver to call recursively
        // https://github.com/AdguardTeam/ExtendedCss/issues/81
        stopObserve();
        rules.forEach((rule) => {
            const nodes = applyRule(rule);
            Array.prototype.push.apply(elementsIndex, nodes);
        });
        // Now revert styles for elements which are no more affected
        let l = affectedElements.length;
        // do nothing if there is no elements to process
        if (elementsIndex.length > 0) {
            while (l--) {
                const obj = affectedElements[l];
                if (elementsIndex.indexOf(obj.node) === -1) {
                    // Time to revert style
                    revertStyle(obj);
                    affectedElements.splice(l, 1);
                } else if (!obj.removed) {
                    // Add style protection observer
                    // Protect "style" attribute from changes
                    if (!obj.protectionObserver) {
                        obj.protectionObserver = protectStyleAttribute(obj.node, obj.rules);
                    }
                }
            }
        }
        // After styles are applied we can start observe again
        observe();
        printTimingInfo();
    }

    const APPLY_RULES_DELAY = 150;
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

        if (document.readyState !== 'complete') {
            document.addEventListener('DOMContentLoaded', applyRules);
        }
    }

    /**
     * Disposes ExtendedCss and removes our styles from matched elements
     */
    function dispose() {
        stopObserve();
        affectedElements.forEach((obj) => {
            revertStyle(obj);
        });
    }

    let timingsPrinted = false;
    /**
     * Prints timing information for all selectors marked as "debug"
     */
    function printTimingInfo() {
        if (timingsPrinted) { return; }
        timingsPrinted = true;

        const timings = rules.filter((rule) => rule.selector.isDebugging()).map((rule) => ({
            selectorText: rule.selector.selectorText,
            timingStats: rule.timingStats,
        }));

        if (timings.length === 0) { return; }
        // Add location.href to the message to distinguish frames
        utils.logInfo('[ExtendedCss] Timings for %o:\n%o (in milliseconds)', window.location.href, timings);
    }

    // First of all parse the stylesheet
    rules = ExtendedCssParser.parseCss(styleSheet);

    // EXPOSE
    this.dispose = dispose;
    this.apply = apply;

    /** Exposed for testing purposes only */
    this._getAffectedElements = function () {
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
ExtendedCss.query = function (selectorText, noTiming) {
    if (typeof selectorText !== 'string') {
        throw new Error('Selector text is empty');
    }

    const { now } = utils.AsyncWrapper;
    const start = now();

    try {
        return ExtendedSelectorFactory.createSelector(selectorText).querySelectorAll();
    } finally {
        const end = now();
        if (!noTiming) {
            utils.logInfo(`[ExtendedCss] Elapsed: ${Math.round((end - start) * 1000)} μs.`);
        }
    }
};

export default ExtendedCss;
