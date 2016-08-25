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
    var domObserver;

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
     * Checks if specified element is already in the affectedElements collection
     * 
     * @param element
     */
    var checkElementIsAffected = function (element) {
        var iAffectedElements = affectedElements.length;
        while (iAffectedElements--) {
            if (affectedElements[iAffectedElements].element === element) {
                return true;
            }
        }
        return false;
    };

    /**
     * Applies style to an element
     * 
     * @param element DOM node
     * @param style   Plain JS object with styles
     */
    var applyStyle = function (element, style) {

        for (var prop in style) {

            // Apply this style only to existing properties
            // We can't use hasOwnProperty here (does not work in FF)
            if (typeof element.style.getPropertyValue(prop) !== "undefined") {
                var value = style[prop];

                // First we should remove !important attribute (or it won't be applied')
                value = value.split("!")[0].trim();
                element.style.setProperty(prop, value, "important");
            }
        }
    };

    /**
     * Reverts style for the affected object
     */
    var revertStyle = function (affectedElement) {
        affectedElement.element.style.cssText = affectedElement.originalStyle;
    };

    /**
     * Applies specified rule and returns list of elements affected
     * 
     * @param rule Rule to apply
     * @returns List of elements affected by this rule
     */
    var applyRule = function (rule) {
        var selector = rule.selector;
        var elements = selector.querySelectorAll();

        var iElements = elements.length;
        while (iElements--) {
            var element = elements[iElements];
            if (checkElementIsAffected(element)) {
                // We have already applied style to this element
                // Let's re-apply style to it
                applyStyle(element, rule.style);
            } else {
                // Applying style first time
                var originalStyle = element.style.cssText;
                applyStyle(element, rule.style);

                affectedElements.push({
                    element: element,
                    rule: rule,
                    originalStyle: originalStyle
                });
            }
        }

        return elements;
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
            var elements = applyRule(rule);
            elementsIndex = elementsIndex.concat(elements);
        }

        // Now revert styles for elements which are no more affected
        var iAffectedElements = affectedElements.length;
        while (iAffectedElements--) {
            var obj = affectedElements[iAffectedElements];
            if (elementsIndex.indexOf(obj.element) === -1) {
                // Time to revert style
                revertStyle(obj);
                affectedElements.splice(iAffectedElements, 1);
            }
        }
    };

    var domChanged = false;

    /**
     * Called on any DOM change, we should examine extended CSS again.
     */
    var handleDomChange = function () {
        if (!domChanged) {
            return;
        }

        domChanged = false;
        applyRules(rules);
    };

    /**
     * Throttles handleDomChange function
     */
    var handleDomChangeAsync = function () {

        if (domChanged) {
            return;
        }
        domChanged = true;
        setTimeout(handleDomChange, 10);
    };

    /**
     * Observe changes
     */
    var observe = function () {
        if (domObserver) {
            // Observer is already here
            return;
        }

        // Handle dynamically added elements
        domObserver = new DomObserver(handleDomChangeAsync);
        domObserver.observe();
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
        domObserver.dispose();
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