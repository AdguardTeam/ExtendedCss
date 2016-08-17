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
        var cssRules = CssParser.parse(styleSheet);
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
     * Applies filtering rules
     *
     * @param rules Rules to apply
     */
    var applyRules = function (rules) {
        for (var i = 0; i < rules.length; i++) {
            var rule = rules[i];

            var selector = rule.selector;
            var elements = selector.querySelectorAll();

            var iElements = elements.length;
            while (iElements--) {
                var el = elements[iElements];
                var originalStyle = el.style.cssText;
                applyStyle(el, rule.style);

                affectedElements.push({
                    element: el,
                    rule: rule,
                    originalStyle: originalStyle
                });
            }
        }
    };

    /**
     * Applies style to an element
     * 
     * @element DOM node
     * @style   Plain JS object with styles
     */
    var applyStyle = function(element, style) {
        
        for (var prop in style) {
            if (element.style.hasOwnProperty(prop)) {
                var value = style[prop];
                // First we should remove !important attribute (or it won't be applied')
                value = value.split("!")[0].trim();
                element.style[prop] = value;
            }
        }
    };

    /**
     * Reverts style for the affected object
     */
    var revertStyle = function(affectedElement) {
        affectedElement.element.style.cssText = affectedElement.originalStyle;
    };

    /**
     * Checks that affected elements are still matching our selectors
     */
    var checkAffectedElements = function () {
        var iElements = affectedElements.length;
        while (iElements--) {
            var obj = affectedElements[iElements];
            var matchedSelector = obj.rule.selector;
            if (matchedSelector.matches(obj.element)) {
                // We're good, re-apply that style
                applyStyle(obj.element, obj.rule.style);
            } else {
                revertStyle(obj);
                affectedElements.slice(iElements, 1);
            }
        }
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
        domObserver = new DomObserver(onDomChanged);
        domObserver.observe();
    };

    /**
     * Called on any DOM change, we should examine extended CSS again
     */
    var onDomChanged = function () {
        
        // TODO: Throttle this call
        applyRules(rules);
        checkAffectedElements();
    };

    /**
     * Applies extended CSS rules
     */
    var apply = function () {
        applyRules(rules);
        observe();
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
};