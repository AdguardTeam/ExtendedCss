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

/* global SimpleRegex, console */
/**
 * Class that extends Sizzle and adds support for "matches-css" pseudo element.
 */
var StylePropertyMatcher = (function (window, document) { // jshint ignore:line

    var isWebKit = navigator.vendor && navigator.vendor.indexOf('Apple') > -1 &&
               navigator.userAgent && !navigator.userAgent.match('CriOS') && 
               window.getMatchedCSSRules;

    /**
     * There is a known issue in Safari browser:
     * getComputedStyle(el, ":before") is empty if element is not visible.
     * 
     * To circumvent this issue we use getMatchedCSSRules instead.
     */
    var getPseudoElementComputedStyle = function(element, pseudoElement) {
        var styles = [];
        var cssRules = window.getMatchedCSSRules(element, pseudoElement) || [];

        var iCssRules = cssRules.length;
        while (iCssRules--) {
            var style = cssRules[iCssRules].style;
            var iStyle = style.length;
            while (iStyle--) {
                var name = style[iStyle];
                styles[name] = style.getPropertyValue(name);
                styles.push(name);
            }
        }

        styles.sort();
        styles.getPropertyValue = function(name) {
            return styles[name];
        };
        return styles;
    };

    /**
     * Unquotes specified value
     */
    var removeDoubleQuotes = function(value) {
        if (typeof value === "string" && value.length > 1 && value[0] === '"' && value[value.length - 1] === '"') {
            // Remove double-quotes
            value = value.substring(1, value.length - 1);
        }
        return value;
    };

    /**
     * Unlike Safari, Chrome and FF doublequotes url() property value.
     * I suppose it would be better to leave it unquoted.
     */
    var removeUrlQuotes = function(value) {
        if (typeof value !== "string" || value.indexOf("url(\"") < 0) {
            return value;
        }

        var re = /url\(\"(.*?)\"\)/g;
        return value.replace(re, "url($1)");
    };

    /**
     * Cross-browser getComputedStyle function.
     * 
     * Known WebKit issue: 
     * getComputedStyle(el, ":before").content returns empty string if element is not visible. 
     */
    var getComputedStyle = function (element, pseudoElement) {
        var style;

        if (isWebKit && pseudoElement) {
            style = getPseudoElementComputedStyle(element, pseudoElement);
        } else {
            style = window.getComputedStyle(element, pseudoElement);
        }
        
        return style;
    };

    /**
     * Gets CSS property value
     * 
     * @param element       DOM node
     * @param pseudoElement Optional pseudoElement name
     * @param propertyName  CSS property name
     */
    var getComputedStylePropertyValue = function (element, pseudoElement, propertyName) {
        var style = getComputedStyle(element, pseudoElement);
        if (!style) {
            return null;
        }

        var value = style.getPropertyValue(propertyName);
        value = removeUrlQuotes(value);
        if (propertyName === "content") {
            // FF doublequotes content property value
            value = removeDoubleQuotes(value);
        }

        return value;
    };

    /**
     * Class that matches element style against the specified expression
     */
    var Matcher = function (propertyFilter, pseudoElement) {

        var propertyName;
        var regex;

        try {
            var parts = propertyFilter.split(":", 2);
            propertyName = parts[0].trim();
            var regexText = SimpleRegex.createRegexText(parts[1].trim());
            regex = new RegExp(regexText, "i");
        } catch (ex) {
            if (typeof console !== 'undefined' && console.error) {
                console.error('StylePropertyMatcher: invalid match string ' + propertyFilter);
            }
        }

        /**
         * Function to check if element CSS property matches filter pattern
         * 
         * @element Element to check
         */
        var matches = function (element) {
            if (!regex || !propertyName) {
                return false;
            }

            var value = getComputedStylePropertyValue(element, pseudoElement, propertyName);
            return value && regex.test(value);
        };

        this.matches = matches;
    };

    /**
     * Creates a new pseudo-class and registers it in Sizzle
     */
    var extendSizzle = function (sizzle) {
        // First of all we should prepare Sizzle engine
        sizzle.selectors.pseudos["matches-css"] = sizzle.selectors.createPseudo(function (propertyFilter) {
            var matcher = new Matcher(propertyFilter);
            return function (element) {
                return matcher.matches(element);
            };
        });
        sizzle.selectors.pseudos["matches-css-before"] = sizzle.selectors.createPseudo(function (propertyFilter) {
            var matcher = new Matcher(propertyFilter, ":before");
            return function (element) {
                return matcher.matches(element);
            };
        });
        sizzle.selectors.pseudos["matches-css-after"] = sizzle.selectors.createPseudo(function (propertyFilter) {
            var matcher = new Matcher(propertyFilter, ":after");
            return function (element) {
                return matcher.matches(element);
            };
        });
    };

    // EXPOSE
    return {
        extendSizzle: extendSizzle
    };
})(window, document);