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

/* global utils */
/**
 * Class that extends Sizzle and adds support for "matches-css" pseudo element.
 */
const StylePropertyMatcher = (function (window, document) { // jshint ignore:line

    const isSafari = navigator.vendor && navigator.vendor.indexOf('Apple') > -1 &&
        navigator.userAgent && !navigator.userAgent.match('CriOS');
    const isPhantom = !!window._phantom;
    const useFallback = isPhantom && !!window.getMatchedCSSRules;

    /**
     * Unquotes specified value
     * Webkit-based browsers singlequotes <string> content property values
     * Other browsers doublequotes content property values.
     */
    const removeContentQuotes = function (value) {
        if (typeof value === "string") {
            return value.replace(/^(["'])([\s\S]*)\1$/, '$2');
        }
        return value;
    };

    /**
     * Unlike Safari, Chrome and FF doublequotes url() property value.
     * I suppose it would be better to leave it unquoted.
     */
    const removeUrlQuotes = function (value) {
        if (typeof value !== "string" || value.indexOf("url(\"") < 0) {
            return value;
        }

        let re = /url\(\"(.*?)\"\)/g;
        return value.replace(re, "url($1)");
    };

    const getComputedStyle = window.getComputedStyle.bind(window);
    const getMatchedCSSRules = useFallback ? window.getMatchedCSSRules.bind(window) : null;

    /**
     * There is an issue in browsers based on old webkit:
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
    const getComputedStylePropertyValue = function (element, pseudoElement, propertyName) {
        let value = '';
        if (useFallback && pseudoElement) {
            let cssRules = getMatchedCSSRules(element, pseudoElement) || [];
            let i = cssRules.length;
            while (i-- > 0 && !value) { value = cssRules[i].style.getPropertyValue(propertyName); }
        } else {
            let style = getComputedStyle(element, pseudoElement);
            if (style) { 
                value = style.getPropertyValue(propertyName);
                // https://bugs.webkit.org/show_bug.cgi?id=93445
                if (propertyName === 'opacity' && isSafari) {
                    value = (Math.round(parseFloat(value) * 100) / 100).toString();
                }
            }
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
    const Matcher = function (propertyFilter, pseudoElement) {
        this.pseudoElement = pseudoElement;
        try {
            let index = propertyFilter.indexOf(":");
            this.propertyName = propertyFilter.substring(0, index).trim();
            let pattern = propertyFilter.substring(index + 1).trim();

            // Unescaping pattern
            // For non-regex patterns, (,),[,] should be unescaped, because we require escaping them in filter rules.
            // For regex patterns, ",\ should be escaped, because we manually escape those in extended-css-selector.js.
            if (/^\/.*\/$/.test(pattern)) {
                pattern = pattern.slice(1, -1);
                this.regex = utils.pseudoArgToRegex(pattern);
            }
            else {
                pattern = pattern.replace(/\\([\\()[\]"])/g, '$1');
                this.regex = utils.createURLRegex(pattern);
            }
        } catch (ex) {
            utils.logError("StylePropertyMatcher: invalid match string " + propertyFilter);
        }
    };

    /**
     * Function to check if element CSS property matches filter pattern
     * @param {Element} element to check
     */
    Matcher.prototype.matches = function (element) {
        if (!this.regex || !this.propertyName) { return false; }
        let value = getComputedStylePropertyValue(element, this.pseudoElement, this.propertyName);
        return value && this.regex.test(value);
    };

    /**
     * Creates a new pseudo-class and registers it in Sizzle
     */
    const extendSizzle = function (sizzle) {
        // First of all we should prepare Sizzle engine
        sizzle.selectors.pseudos["matches-css"] = sizzle.selectors.createPseudo(function (propertyFilter) {
            let matcher = new Matcher(propertyFilter);
            return function (element) {
                return matcher.matches(element);
            };
        });
        sizzle.selectors.pseudos["matches-css-before"] = sizzle.selectors.createPseudo(function (propertyFilter) {
            let matcher = new Matcher(propertyFilter, ":before");
            return function (element) {
                return matcher.matches(element);
            };
        });
        sizzle.selectors.pseudos["matches-css-after"] = sizzle.selectors.createPseudo(function (propertyFilter) {
            let matcher = new Matcher(propertyFilter, ":after");
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
