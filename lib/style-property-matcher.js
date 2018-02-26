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

/* global console, utils */
/**
 * Class that extends Sizzle and adds support for "matches-css" pseudo element.
 */
var StylePropertyMatcher = (function (window, document) { // jshint ignore:line

    var useFallback = navigator.vendor && navigator.vendor.indexOf('Apple') > -1 &&
               navigator.userAgent && !navigator.userAgent.match('CriOS') &&
               !!window.getMatchedCSSRules;

    /**
     * Unquotes specified value
     * Webkit-based browsers singlequotes <string> content property values
     * Other browsers doublequotes content property values.
     */
    var removeContentQuotes = function(value) {
        if(typeof value === "string") {
            return value.replace(/^(["'])([\s\S]*)\1$/,  '$2');
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


    var getComputedStyle = window.getComputedStyle.bind(window);
    if (useFallback) {
        var getMatchedCSSRules = window.getMatchedCSSRules.bind(window);
    }
    /**
     * There is a known issue in Safari browser:
     * getComputedStyle(el, ":before") is empty if element is not visible.
     *
     * To circumvent this issue we use getMatchedCSSRules instead.
     *
     * It appears that getMatchedCSSRules sorts the CSS rules
     * in increasing order of specifities of corresponding selectors.
     * We pick the css rule that is being applied to an element based on this assumption.
     *
     * @param element       DOM node
     * @param pseudoElement Optional pseudoElement name
     * @param propertyName  CSS property name
     */
    var getComputedStylePropertyValue = function (element, pseudoElement, propertyName) {
        var value = '';
        if (useFallback && pseudoElement) {
            var cssRules = getMatchedCSSRules(element, pseudoElement) || [];
            var i = cssRules.length;
            while(i-- > 0 && !value) { value = cssRules[i].style.getPropertyValue(propertyName); }
        } else {
            var style = getComputedStyle(element, pseudoElement);
            if(style) { value = style.getPropertyValue(propertyName); }
        }

        value = removeUrlQuotes(value);
        if (propertyName === "content") {
            value = removeContentQuotes(value);
        }

        return value;
    };

    /**
     * Class that matches element style against the specified expression
     * @member {string} propertyName
     * @member {string} pseudoElement
     * @member {RegExp} regex
     */
    var Matcher = function (propertyFilter, pseudoElement) {
        this.pseudoElement = pseudoElement;
        try {
            var index = propertyFilter.indexOf(":");
            this.propertyName = propertyFilter.substring(0, index).trim();
            var pattern = propertyFilter.substring(index + 1).trim();

            // Unescaping pattern
            // For non-regex patterns, (,),[,] should be unescaped, because we require escaping them in filter rules.
            // For regex patterns, ",\ should be escaped, because we manually escape those in extended-css-selector.js.
            if(/^\/.*\/$/.test(pattern)) {
                pattern = pattern.slice(1,-1);
                this.regex = utils.pseudoArgToRegex(pattern);
            }
            else {
                pattern = pattern.replace(/\\([\\()[\]"])/g, '$1');
                this.regex = utils.createURLRegex(pattern);
            }
        } catch (ex) {
            if (typeof console !== 'undefined' && console.error) {
                console.error('StylePropertyMatcher: invalid match string ' + propertyFilter);
            }
        }
    };

    /**
     * Function to check if element CSS property matches filter pattern
     * @param {Element} element to check
     */
    Matcher.prototype.matches = function (element) {
        if (!this.regex || !this.propertyName) { return false; }
        var value = getComputedStylePropertyValue(element, this.pseudoElement, this.propertyName);
        return value && this.regex.test(value);
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
