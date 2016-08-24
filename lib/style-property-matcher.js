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
 * Class that extends Sizzle and adds support for "style-properties" pseudo element.
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
     * Browser-independent function.
     * 
     * Firefox does not implement "style.cssText" property for the computedStyle, so we use this polyfill instead.
     * Details: https://bugzilla.mozilla.org/show_bug.cgi?id=137687
     * 
     * Known WebKit issue: 
     * getComputedStyle(el, ":before").content returns empty string if element is not visible. 
     * 
     * We are trying to solve multiple issues:
     * <br/>
     * 1. Firefox double-quotes string values
     * <br/>
     * 2. Chrome and FF double-quotes strings inside of a "url(...)" while Safari does not.
     * <br/>
     * 3. We remove properties inherited from the document style.
     */
    var getComputedStyleCssText = function (element, pseudoElement) {
        var style;

        if (isWebKit && pseudoElement) {
            style = getPseudoElementComputedStyle(element, pseudoElement);
        } else {
            style = window.getComputedStyle(element, pseudoElement);
        }
        if (!style) {
            return false;
        }

        var cssText = "";
        var documentStyle = window.getComputedStyle(document.documentElement || document.body);

        for (var i = 0; i < style.length; i++) {
            var name = style[i];
            var value = style.getPropertyValue(name);
            var documentValue = documentStyle.getPropertyValue(name);
            
            // Ignore inherited properties
            if (value !== documentValue) {
                value = removeDoubleQuotes(value);
                value = removeUrlQuotes(value);
                cssText += style[i] + ": " + value + "; ";
            }
        }

        return cssText;
    };

    /**
     * Class that matches element style against the specified expression
     */
    var Matcher = function (matchString, pseudoElement) {

        var regex;

        try {
            var regexText = SimpleRegex.createRegexText(matchString);
            regex = new RegExp(regexText, "i");
        } catch (ex) {
            if (typeof console !== 'undefined' && console.error) {
                console.error('StylePropertyMatcher: invalid match string ' + matchString);
            }
        }

        /**
         * Function that check if element matches specified regex
         * 
         * @element Element to check
         */
        var matches = function (element) {
            var cssText = getComputedStyleCssText(element, pseudoElement);
            return cssText && regex.test(cssText);
        };

        this.matches = matches;
    };

    /**
     * Creates new pseudo-class and registers it in Sizzle
     */
    var extendSizzle = function (sizzle) {
        // First of all we should prepare Sizzle engine
        sizzle.selectors.pseudos["style-properties"] = sizzle.selectors.createPseudo(function (matchString) {
            var matcher = new Matcher(matchString);
            return function (element) {
                return matcher.matches(element);
            };
        });
        sizzle.selectors.pseudos["style-properties-before"] = sizzle.selectors.createPseudo(function (matchString) {
            var matcher = new Matcher(matchString, ":before");
            return function (element) {
                return matcher.matches(element);
            };
        });
        sizzle.selectors.pseudos["style-properties-after"] = sizzle.selectors.createPseudo(function (matchString) {
            var matcher = new Matcher(matchString, ":after");
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