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
     * A common use case is using 'content' CSS property, which has <string> type value.
     * In the result of getComputedStyle, Webkit based browsers encloses such value with single quotes.
     * Other browsers encloses such value with double quotes.
     * In order to normalize this, we do a quick check here.
     */
    var quote, useFallback = false;

    (function() {
        var root = document.createElement('div');
        var styleEl = document.createElement('style');
        styleEl.appendChild(document.createTextNode('#EXTCSS_TEMP::after{content:""}'));
        var testEl = document.createElement('div');
        testEl.setAttribute('style', 'display:none!important;');
        testEl.id = "EXTCSS_TEMP";
        root.appendChild(styleEl);
        root.appendChild(testEl);
        document.documentElement.appendChild(root);
        var propValue = window.getComputedStyle(testEl, ':after').getPropertyValue('content');
        if(propValue.length === 0 && typeof window.getMatchedCSSRules == 'function') {
            useFallback = true;
            propValue = window.getMatchedCSSRules(testEl, ':after')[0].style.getPropertyValue('content');
        }
        quote = propValue.charAt(0);
        document.documentElement.removeChild(root);
    })();


    /**
     * There is a known issue in Safari browser:
     * getComputedStyle(el, ":before") is empty if element is not visible.
     * 
     * To circumvent this issue we use getMatchedCSSRules instead.
     *
     * It appears that getMatchedCSSRules sorts the CSS rules
     * in increasing order of specifities of corresponding selectors.
     */
    function CSSStyleDec(cssRules) {
        this.cssRules = cssRules;
    }

    CSSStyleDec.prototype.getPropertyValue = function(name) {
        // If there is no css rules that applies to a queried element, getPseudoElementComputedStyle
        // will return '', which is incorrect. There could be ways to get default styles, but
        // It will be of little practical use, because in most of cases :matches-css is applied to elements
        // whose style is explicitly set by stylesheets in its containing document.
        var i = this.cssRules.length, value = '';
        while(i-- > 0 && !value) {
            value = this.cssRules[i].style.getPropertyValue(name);
        }
        return value;
    };

    var getPseudoElementComputedStyle = function(element, pseudoElement) {
        return new CSSStyleDec(window.getMatchedCSSRules(element, pseudoElement) || []);
    };

    /**
     * Unquotes specified value
     */
    var removeDoubleQuotes = function(value) {
        var l;
        if(typeof value === "string" && value.length > 1 && value[0] == quote && value[(l = value.length) -1] == quote) {
            return value.substring(1, l - 1);
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

        if (useFallback && pseudoElement) {
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
            var index = propertyFilter.indexOf(":");
            propertyName = propertyFilter.substring(0, index).trim();
            var pattern = propertyFilter.substring(index + 1).trim();

            // Unescaping pattern
            // For non-regex patterns, (,),[,] should be unescaped, because we require escaping them in filter rules.
            // For regex patterns, ",\ should be escaped, because we manually escape those in extended-css-selector.js.
            if(/^\/.*\/$/.test(pattern)) {
                pattern = pattern.slice(1,-1).replace(/\\(["\\])/g, '$1');
                regex = new RegExp(pattern);
            }
            else {
                pattern = pattern.replace(/\\([\\()[\]])/g, '$1');
                var regexText = SimpleRegex.createRegexText(pattern);
                regex = new RegExp(regexText, "i");
            }
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
