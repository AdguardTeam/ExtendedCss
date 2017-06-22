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

/* global CssParser, DomObserver, ExtendedSelector */

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

    /**
     * Removes specified suffix from the string
     */
    var removeSuffix = function(str, suffix) {

        var index = str.indexOf(suffix, str.length - suffix.length);
        if (index >= 0) {
            return str.substring(0, index);
        }

        return str;
    };

    /**
     * Parses specified styleSheet in a number of rule objects
     *
     * @param styleSheet String with the stylesheet
     */
    var parse = function (styleSheet) {

        var result = [];
        var cssRules = CssParser.parseCss(styleSheet);
        var iCssRules = cssRules.length;
        while (iCssRules--) {
            var cssRule = cssRules[iCssRules];

            var ruleObject = Object.create(null);
            ruleObject.selector = new ExtendedSelector(cssRule.selectors);
            ruleObject.style = cssRule.style;
            result.push(ruleObject);
        }

        return result;
    };

    /**
     * Finds affectedElement object for the specified DOM node
     * 
     * @param node  DOM node
     * @returns     affectedElement found or null
     */
    var findAffectedElement = function (node) {
        var iAffectedElements = affectedElements.length;
        while (iAffectedElements--) {
            var affectedElement = affectedElements[iAffectedElements];
            if (affectedElement.node === node) {
                return affectedElement;
            }
        }
        return null;
    };

    /**
     * Applies style to the specified DOM node
     * 
     * @param affectedElement    Object containing DOM node and rule to be applied
     */
    var applyStyle = function (affectedElement) {

        if (affectedElement.protectionObserver) {
            // Style is already applied and protected by the observer
            return;
        }

        // DOM node
        var node = affectedElement.node;
        // Plain JS object with styles
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
        affectedElement.protectionObserver = DomObserver.protectAttribute(node, 'style');
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
     * 
     * @param rule Rule to apply
     * @returns List of elements affected by this rule
     */
    var applyRule = function (rule) {
        var selector = rule.selector;
        var nodes = selector.querySelectorAll();

        var iNodes = nodes.length;
        while (iNodes--) {
            var node = nodes[iNodes];
            var affectedElement = findAffectedElement(node); 

            if (affectedElement) {
                // We have already applied style to this node
                // Let's re-apply style to it
                applyStyle(affectedElement);
            } else {
                // Applying style first time
                var originalStyle = node.style.cssText;
                affectedElement = {
                    // affected DOM node
                    node: node,
                    // rule to be applied
                    rule: rule,
                    // original node style
                    originalStyle: originalStyle,
                    // style attribute observer
                    protectionObserver: null
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

        var elementsIndex = [];
        var iRules = rules.length;
        while (iRules--) {
            var rule = rules[iRules];
            var nodes = applyRule(rule);
            Array.prototype.push.apply(elementsIndex, nodes);
        }

        // Now revert styles for elements which are no more affected
        var iAffectedElements = affectedElements.length;
        while (iAffectedElements--) {
            var obj = affectedElements[iAffectedElements];
            if (elementsIndex.indexOf(obj.node) === -1) {
                // Time to revert style
                revertStyle(obj);
                affectedElements.splice(iAffectedElements, 1);
            }
        }
    };

    var domChanged = false;
    var lastTimeDomChanged = 0;

    /**
     * Called on any DOM change, we should examine extended CSS again.
     */
    var handleDomChange = function () {
        if (!domChanged) {
            return;
        }

        domChanged = false;
        applyRules(rules);
        lastTimeDomChanged = new Date().getTime();
    };

    /**
     * Schedules handleDomChange using requestAnimationFrame
     */
    var handleDomChangeAsync = function() {
        if (window.requestAnimationFrame) {
            window.requestAnimationFrame(handleDomChange);
        } else {
            handleDomChange();
        }
    };

    /**
     * Throttles handleDomChange function.
     */
    var handleDomChangeThrottle = function () {

        if (domChanged) {
            return;
        }
        domChanged = true;
        
        // Checking time since last time rules were applied.
        // We shouldn't allow it to trigger applying extended CSS rules too often.
        var timeSinceLastDomChange = new Date().getTime() - lastTimeDomChanged;
        var timeToNextDomChange = 50 - timeSinceLastDomChange;
        if (timeToNextDomChange > 0) {
            setTimeout(function() {
                handleDomChangeAsync();
            }, timeToNextDomChange);
        } else {
            handleDomChangeAsync();
        }
    };

    /**
     * Observe changes
     */
    var observe = function () {
        if (domObserved) {
            // Observer is already here
            return;
        }

        // Handle dynamically added elements
        domObserved = true;
        DomObserver.observeDom(handleDomChangeThrottle);
    };

    /**
     * Applies extended CSS rules
     */
    var apply = function () {
        applyRules(rules);
        observe();

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
            DomObserver.disconnectDom(handleDomChangeThrottle);
            domObserved = false;
        }
        var iElements = affectedElements.length;
        while (iElements--) {
            var obj = affectedElements[iElements];
            revertStyle(obj);
        }
    };

    // First of all parse the stylesheet
    rules = parse(styleSheet);

    // EXPOSE
    this.dispose = dispose;
    this.apply = apply;
    this.getAffectedElements = function () {
        return affectedElements;
    };
};

// Expose querySelectorAll for debugging selectors
ExtendedCss.query = function(selectorText) {
    return (new ExtendedSelector(selectorText)).querySelectorAll();
};
