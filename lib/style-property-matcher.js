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

import utils from './utils';
/**
 * Class that extends Sizzle and adds support for "matches-css" pseudo element.
 */
const StylePropertyMatcher = (function (window) {
    const isPhantom = !!window._phantom;
    const useFallback = isPhantom && !!window.getMatchedCSSRules;

    /**
     * Unquotes specified value
     * Webkit-based browsers singlequotes <string> content property values
     * Other browsers doublequotes content property values.
     */
    const removeContentQuotes = function (value) {
        if (typeof value === 'string') {
            return value.replace(/^(["'])([\s\S]*)\1$/, '$2');
        }
        return value;
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
            const cssRules = getMatchedCSSRules(element, pseudoElement) || [];
            let i = cssRules.length;
            while (i-- > 0 && !value) { value = cssRules[i].style.getPropertyValue(propertyName); }
        } else {
            const style = getComputedStyle(element, pseudoElement);
            if (style) {
                value = style.getPropertyValue(propertyName);
                // https://bugs.webkit.org/show_bug.cgi?id=93445
                if (propertyName === 'opacity' && utils.isSafariBrowser) {
                    value = (Math.round(parseFloat(value) * 100) / 100).toString();
                }
            }
        }

        if (propertyName === 'content') {
            value = removeContentQuotes(value);
        }

        return value;
    };

    /**
     * Adds url parameter quotes for non-regex pattern
     * @param {string} pattern
     */
    const addUrlQuotes = function (pattern) {
        // for regex patterns
        if (pattern[0] === '/'
            && pattern[pattern.length - 1] === '/'
            && pattern.indexOf('\\"') < 10) {
            // e.g. /^url\\([a-z]{4}:[a-z]{5}/
            // or /^url\\(data\\:\\image\\/gif;base64.+/
            const re = /(\^)?url(\\)?\\\((\w|\[\w)/g;
            return pattern.replace(re, '$1url$2\\\(\\"?$3');
        }
        // for non-regex patterns
        if (pattern.indexOf('url("') === -1) {
            const re = /url\((.*?)\)/g;
            return pattern.replace(re, 'url("$1")');
        }
        return pattern;
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
            const index = propertyFilter.indexOf(':');
            this.propertyName = propertyFilter.substring(0, index).trim();
            let pattern = propertyFilter.substring(index + 1).trim();
            pattern = addUrlQuotes(pattern);

            // Unescaping pattern
            // For non-regex patterns, (,),[,] should be unescaped, because we require escaping them in filter rules.
            // For regex patterns, ",\ should be escaped, because we manually escape those in extended-css-selector.js.
            if (/^\/.*\/$/.test(pattern)) {
                pattern = pattern.slice(1, -1);
                this.regex = utils.pseudoArgToRegex(pattern);
            } else {
                pattern = pattern.replace(/\\([\\()[\]"])/g, '$1');
                this.regex = utils.createURLRegex(pattern);
            }
        } catch (ex) {
            utils.logError(`StylePropertyMatcher: invalid match string ${propertyFilter}`);
        }
    };

    /**
     * Function to check if element CSS property matches filter pattern
     * @param {Element} element to check
     */
    Matcher.prototype.matches = function (element) {
        if (!this.regex || !this.propertyName) { return false; }
        const value = getComputedStylePropertyValue(element, this.pseudoElement, this.propertyName);
        return value && this.regex.test(value);
    };

    /**
     * Creates a new pseudo-class and registers it in Sizzle
     */
    const extendSizzle = function (sizzle) {
        // First of all we should prepare Sizzle engine
        sizzle.selectors.pseudos['matches-css'] = sizzle.selectors.createPseudo((propertyFilter) => {
            const matcher = new Matcher(propertyFilter);
            return function (element) {
                return matcher.matches(element);
            };
        });
        sizzle.selectors.pseudos['matches-css-before'] = sizzle.selectors.createPseudo((propertyFilter) => {
            const matcher = new Matcher(propertyFilter, ':before');
            return function (element) {
                return matcher.matches(element);
            };
        });
        sizzle.selectors.pseudos['matches-css-after'] = sizzle.selectors.createPseudo((propertyFilter) => {
            const matcher = new Matcher(propertyFilter, ':after');
            return function (element) {
                return matcher.matches(element);
            };
        });
    };

    // EXPOSE
    return {
        extendSizzle,
    };
})(window);

export default StylePropertyMatcher;
