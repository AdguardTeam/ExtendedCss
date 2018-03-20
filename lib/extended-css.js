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
 * Extended css class
 *
 * @param {string} styleSheet CSS stylesheet text
 * @param {Array.<HTMLElement>} propertyFilterIgnoreStyleNodes A list of stylesheet nodes that should be ignored by the StyleObserver (":properties" matching object)
 * @constructor
 */
const ExtendedCss = function (styleSheet, propertyFilterIgnoreStyleNodes) { // jshint ignore:line
    let rules = [];
    let affectedElements = [];
    let domObserved;
    let eventListenerSupported = window.addEventListener;
    let domMutationObserver;

    const observeDocument = function (callback) {
        if (utils.MutationObserver) {
            domMutationObserver = new utils.MutationObserver(function (mutations) {
                if (mutations && mutations.length) {
                    callback();
                }
            });
            domMutationObserver.observe(document.documentElement, {
                childList: true,
                subtree: true,
                attributes: false
            });
        } else if (eventListenerSupported) {
            document.addEventListener('DOMNodeInserted', callback, false);
            document.addEventListener('DOMNodeRemoved', callback, false);
            document.addEventListener('DOMAttrModified', callback, false);
        }
    };
    const disconnectDocument = function (callback) {
        if (domMutationObserver) {
            domMutationObserver.disconnect();
        } else if (eventListenerSupported) {
            document.removeEventListener('DOMNodeInserted', callback, false);
            document.removeEventListener('DOMNodeRemoved', callback, false);
            document.removeEventListener('DOMAttrModified', callback, false);
        }
    };

    const MAX_STYLE_PROTECTION_COUNT = 50;

    const protectionObserverOption = {
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ['style']
    };

    const protectionFunction = function (mutations, observer) {
        if (!mutations.length) { return; }
        let target = mutations[0].target;
        observer.disconnect();
        for (let mutation of mutations) {
            if (mutation.attributeName === 'style') {
                target.setAttribute('style', mutation.oldValue);
            }
        }
        if (++observer.styleProtectionCount < MAX_STYLE_PROTECTION_COUNT) {
            observer.observe(target, protectionObserverOption);
        }
    };

    /**
     * Sets up a MutationObserver which protects style attributes from changes
     * @param node DOM node
     * @returns Mutation observer used to protect attribute or null if there's nothing to protect
     */
    const protectStyleAttribute = function (node) {
        if (!utils.MutationObserver) { return null; }
        let protectionObserver = new utils.MutationObserver(protectionFunction);
        protectionObserver.observe(node, protectionObserverOption);
        // Adds an expando to the observer to keep 'style fix counts'.
        protectionObserver.styleProtectionCount = 0;
        return protectionObserver;
    };

    const removeSuffix = function (str, suffix) {
        let index = str.indexOf(suffix, str.length - suffix.length);
        if (index >= 0) { return str.substring(0, index); }
        return str;
    };

    /**
     * Finds affectedElement object for the specified DOM node
     * @param node  DOM node
     * @returns     affectedElement found or null
     */
    const findAffectedElement = function (node) {
        for (let affectedElement of affectedElements) {
            if (affectedElement.node === node) {
                return affectedElement;
            }
        }
        return null;
    };

    /**
     * Applies style to the specified DOM node
     * @param affectedElement Object containing DOM node and rule to be applied
     */
    const applyStyle = function (affectedElement) {
        if (affectedElement.protectionObserver) {
            // Style is already applied and protected by the observer
            return;
        }
        let node = affectedElement.node;
        let style = affectedElement.rule.style;
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
    };

    /**
     * Reverts style for the affected object
     */
    const revertStyle = function (affectedElement) {
        if (affectedElement.protectionObserver) {
            affectedElement.protectionObserver.disconnect();
        }
        affectedElement.node.style.cssText = affectedElement.originalStyle;
    };

    /**
     * Applies specified rule and returns list of elements affected
     * @param rule Rule to apply
     * @returns List of elements affected by this rule
     */
    const applyRule = function (rule) {
        let debug = rule.selector.debug;
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
            if (!('timings' in rule)) {
                rule.timings = [];
            }
            rule.timings.push(elapsed);
        }

        return nodes;
    };

    /**
     * Applies filtering rules
     */
    const applyRules = function () {
        let elementsIndex = [];
        let printTiming = false;

        for (let rule of rules) {
            let nodes = applyRule(rule);
            if ('timings' in rule) {
                // Timings are recorded at least for one rule
                // We should print them to the console
                printTiming = true;
            }

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

        if (printTiming) {
            printTimingInfo();
        }
    };

    const APPLY_RULES_DELAY = 50;
    const applyRulesScheduler = new utils.AsyncWrapper(applyRules, APPLY_RULES_DELAY);
    const mainCallback = applyRulesScheduler.run.bind(applyRulesScheduler);

    const observe = function () {
        if (domObserved) { return; }

        // Handle dynamically added elements
        domObserved = true;
        observeDocument(mainCallback);
    };

    const apply = function () {
        applyRules();
        observe();

        if (document.readyState !== "complete") {
            document.addEventListener("DOMContentLoaded", applyRules);
        }
    };

    /**
     * Disposes ExtendedCss and removes our styles from matched elements
     */
    const dispose = function () {
        if (domObserved) {
            disconnectDocument(mainCallback);
            domObserved = false;
        }
        for (let obj of affectedElements) {
            revertStyle(obj);
        }
    };

    /**
     * This is a helper object that is used for the only purpose - to prevent spamming
     * the console with new records every time and just update this object state instead.
     */
    const timings = Object.create(null);
    let timingsPrinted = false;

    /**
     * Prints timing information for all selectors marked as "debug"
     */
    const printTimingInfo = function () {
        let debugRules = rules.filter(function (rule) {
            return 'timings' in rule;
        });

        if (debugRules.length === 0) {
            // No timings recorded
            return;
        }

        timings.stats = debugRules.map(function (rule) {
            return {
                selectorText: rule.selector.selectorText,
                stats: new utils.Stats(rule.timings)
            };
        });

        if (!timingsPrinted) {
            timingsPrinted = true;
            // Add window.location to the message to distinguish frames
            utils.logInfo("[ExtendedCss] Timings for %o:\n%o", window, timings);
        }
    };

    // Let StyleObserver know which stylesheets should not be used for :properties matching
    StyleObserver.setIgnoredStyleNodes(propertyFilterIgnoreStyleNodes);

    // First of all parse the stylesheet
    rules = ExtendedCssParser.parseCss(styleSheet);

    // EXPOSE
    this.dispose = dispose;
    this.apply = apply;

    /** Exposed for testing purposes only */
    this._getAffectedElements = function () {
        return affectedElements;
    };
};

// Expose querySelectorAll for debugging selectors
ExtendedCss.query = function(selectorText) {
    let now = utils.AsyncWrapper.now;
    let selector = ExtendedSelectorFactory.createSelector(selectorText);
    let start = now();
    let matched = selector.querySelectorAll();
    let end = now();
    utils.logInfo('[ExtendedCss] Elapsed: ' + Math.round((end - start)*1000) + ' μs.');
    StyleObserver.clear();
    return matched;
};