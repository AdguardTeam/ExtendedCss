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

/* global ExtendedCssParser, ExtendedSelector, console, utils */

/**
 * Extended css class
 *
 * @param styleSheet
 * @constructor
 */
var ExtendedCss = function (styleSheet) { // jshint ignore:line
    var rules = [];
    var affectedElements = [];
    var domObserved;

    var eventListenerSupported = window.addEventListener;

    var domMutationObserver;

    var observeDocument = function (callback) {
        if (utils.MutationObserver) {
            domMutationObserver = new utils.MutationObserver(function(mutations) {
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
    var disconnectDocument = function (callback) {
        if (domMutationObserver) {
            domMutationObserver.disconnect();
        } else if (eventListenerSupported) {
            document.removeEventListener('DOMNodeInserted', callback, false);
            document.removeEventListener('DOMNodeRemoved', callback, false);
            document.removeEventListener('DOMAttrModified', callback, false);
        }
    };

    var protectionObserverOption = {
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ['style']
    };
    var protectionFunction = function (mutations, observer) {
        if (!mutations.length) { return; }
        var target = mutations[0].target;
        observer.disconnect();
        var l = mutations.length;
        while (l--) {
            var mutation = mutations[l];
            if (mutation.attributeName === 'style') {
                target.setAttribute('style', mutation.oldValue);
            }
        }
        observer.observe(target, protectionObserverOption);
    };
     /**
     * Sets up a MutationObserver which protects style attributes from changes
     * @param node DOM node
     * @returns Mutation observer used to protect attribute or null if there's nothing to protect
     */
    var protectStyleAttribute = function (node) {
        if (!utils.MutationObserver) { return null; }
        var protectionObserver = new utils.MutationObserver(protectionFunction);
        protectionObserver.observe(node, protectionObserverOption);
        return protectionObserver;
    };

    /** Should be clear what it is. */
    var removeSuffix = function (str, suffix) {
        var index = str.indexOf(suffix, str.length - suffix.length);
        if (index >= 0) { return str.substring(0, index); }
        return str;
    };

    /**
     * Finds affectedElement object for the specified DOM node
     * @param node  DOM node
     * @returns     affectedElement found or null
     */
    var findAffectedElement = function (node) {
        var l = affectedElements.length;
        while (l--) {
            var affectedElement = affectedElements[l];
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
    var applyStyle = function (affectedElement) {
        if (affectedElement.protectionObserver) {
            // Style is already applied and protected by the observer
            return;
        }
        var node = affectedElement.node;
        var style = affectedElement.rule.style;
        for (var prop in style) {
            // Apply this style only to existing properties
            // We can't use hasOwnProperty here (does not work in FF)
            if (typeof node.style.getPropertyValue(prop) !== "undefined") {
                var value = style[prop];
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
    var revertStyle = function (affectedElement) {
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
    var applyRule = function (rule) {
        var selector = rule.selector;
        var nodes = selector.querySelectorAll();
        var l = nodes.length;
        while (l--) {
            var node = nodes[l];
            var affectedElement = findAffectedElement(node); 

            if (affectedElement) {
                // We have already applied style to this node
                // Let's re-apply style to it
                applyStyle(affectedElement);
            } else {
                // Applying style first time
                var originalStyle = node.style.cssText;
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

        return nodes;
    };

    /**
     * Applies filtering rules
     *
     * @param rules Rules to apply
     */
    var applyRules = function (rules) {

        var start = performance.now();

        var elementsIndex = [];
        var l = rules.length;
        while (l--) {
            var rule = rules[l];
            var nodes = applyRule(rule);
            Array.prototype.push.apply(elementsIndex, nodes);
        }

        // Now revert styles for elements which are no more affected
        var l = affectedElements.length;
        while (l--) {
            var obj = affectedElements[l];
            if (elementsIndex.indexOf(obj.node) === -1) {
                // Time to revert style
                revertStyle(obj);
                affectedElements.splice(l, 1);
            }
        }

        var end = performance.now();
        console.info('ExtendedCss: applyRules took ' + (end - start) + ' ms.');
    };

    var applyRulesScheduler = new utils.AsyncWrapper(function() {
        applyRules(rules);
    }, 50);

    var mainCallback = applyRulesScheduler.run.bind(applyRulesScheduler);

    var observe = function () {
        if (domObserved) { return; }

        // Handle dynamically added elements
        domObserved = true;
        observeDocument(mainCallback);
    };

    var apply = function () {
        applyRules(rules);
        observe();
        if (StyleObserver.initialize(ExtendedCss.ignoredSheets) === false) {
            StyleObserver = null;
        }

        if (document.readyState !== "complete") {
            document.addEventListener("DOMContentLoaded", function () {
                applyRules(rules);
            });
        }
    };

    /**
     * Disposes ExtendedCss and removes our styles from matched elements
     */
    var dispose = function () {
        if (domObserved) {
            disconnectDocument(mainCallback);
            domObserved = false;
        }
        var l = affectedElements.length;
        while (l--) {
            var obj = affectedElements[l];
            revertStyle(obj);
        }
    };
    
    // First of all parse the stylesheet
    rules = ExtendedCssParser.parseCss(styleSheet);

    // EXPOSE
    this.dispose = dispose;
    this.apply = apply;
    this.getAffectedElements = function () {
        return affectedElements;
    };
};

// Expose querySelectorAll for debugging selectors
ExtendedCss.query = function(selectorText) {
    var now = 'now' in performance ? performance.now.bind(performance) : Date.now;
    var selector = new ExtendedSelector(selectorText);
    StyleObserver.initialize(ExtendedCss.ignoredSheets);
    var start = now();
    var matched = selector.querySelectorAll();
    var end = now();
    console.info('[ExtendedCss] Elapsed: ' + Math.round((end - start)*1000) + ' μs.');
    StyleObserver.clear();
    return matched;
};
