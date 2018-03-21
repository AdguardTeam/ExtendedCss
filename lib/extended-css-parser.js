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

/* global initializeSizzle, Sizzle, ExtendedSelectorFactory, utils */

/**
 * A helper class that parses stylesheets containing extended selectors
 * into ExtendedSelector instances and key-value maps of style declarations.
 * Please note, that it does not support any complex things like media queries and such.
 */
const ExtendedCssParser = (function () { // jshint ignore:line

    /**
     * Regex that matches AdGuard's backward compatible syntaxes.
     */
    const reAttrFallback = /\[-(?:ext|abp)-([a-z-_]+)=(["'])((?:(?=(\\?))\4.)*?)\2\]/g;

    /**
     * Complex replacement function.
     * Unescapes quote characters inside of an extended selector.
     *
     * @param match     Whole matched string
     * @param name      Group 1
     * @param quoteChar Group 2
     * @param value     Group 3
     */
    const evaluateMatch = function (match, name, quoteChar, value) {
        // Unescape quotes
        let re = new RegExp("([^\\\\]|^)\\\\" + quoteChar, "g");
        value = value.replace(re, "$1" + quoteChar);
        return ":" + name + "(" + value + ")";
    };

    // Sizzle's parsing of pseudo class arguments is buggy on certain circumstances
    // We support following form of arguments:
    // 1. for :matches-css, those of a form {propertyName}: /.*/
    // 2. for :contains and :properties, those of a form /.*/
    // We transform such cases in a way that Sizzle has no ambiguity in parsing arguments.
    const reMatchesCss = /\:(matches-css(?:-after|-before)?)\(([a-z-\s]*\:\s*\/(?:\\.|[^\/])*?\/\s*)\)/g;
    const reContains = /:(?:-abp-)?(contains|has-text|properties)\((\s*\/(?:\\.|[^\/])*?\/\s*)\)/g;
    // Note that we require `/` character in regular expressions to be escaped.

    /**
     * Used for pre-processing pseudo-classes values with above two regexes.
     */
    const addQuotes = function (_, c1, c2) {
        return ':' + c1 + '("' + c2.replace(/["\\]/g, '\\$&') + '")';
    };

    /**
     * Normalizes specified css text in a form that can be parsed by the
     * Sizzle engine.
     * Normalization means
     *  1. transforming [-ext-*=""] attributes to pseudo classes
     *  2. enclosing possibly ambiguous arguments of `:contains`,
     *     `:matches-css` pseudo classes with quotes.
     * @param {string} cssText
     * @return {string}
     */
    const normalize = function (cssText) {
        cssText = cssText.replace(reAttrFallback, evaluateMatch);
        cssText = cssText.replace(reMatchesCss, addQuotes);
        cssText = cssText.replace(reContains, addQuotes);
        return cssText;
    };

    const reDeclEnd = /[;}]/g;
    const reDeclDivider = /[;:}]/g;
    const reNonWhitespace = /\S/g;

    /**
     * @param {string} cssText
     * @constructor
     */
    function Parser(cssText) {
        this.cssText = cssText;
    }

    Parser.prototype = {
        error: function (position) {
            throw new Error('CssParser: parse error at position ' + (this.posOffset + position));
        },

        /**
         * Validates that the tokens correspond to a valid selector.
         * Sizzle is different from browsers and some selectors that it tolerates aren't actually valid.
         * For instance, "div >" won't work in a browser, but it will in Sizzle (it'd be the same as "div > *").
         *
         * @param {*} selectors An array of SelectorData (selector, groups)
         * @returns {boolean} false if any of the groups are invalid
         */
        validateSelectors: function (selectors) {

            let iSelectors = selectors.length;
            while (iSelectors--) {
                let groups = selectors[iSelectors].groups;
                let iGroups = groups.length;

                while (iGroups--) {
                    let tokens = groups[iGroups];
                    let lastToken = tokens[tokens.length - 1];
                    if (Sizzle.selectors.relative[lastToken.type]) {
                        return false;
                    }
                }
            }

            return true;
        },

        /**
         * Parses a stylesheet and returns a list of pairs of an ExtendedSelector and a styles map.
         * This method will throw an error in case of an obviously invalid input.
         * If any of the selectors used in the stylesheet cannot be compiled into an ExtendedSelector, it will be ignored.
         *
         * @typedef {Object} ExtendedStyle
         * @property {Object} selector An instance of the {@link ExtendedSelector} class
         * @property {Object} styleMap A map of styles parsed
         *
         * @returns {Array.<ExtendedStyle>} An array of the styles parsed
         */
        parseCss: function () {
            this.posOffset = 0;
            if (!this.cssText) { this.error(0); }
            let results = [];

            while (this.cssText) {
                // Apply tolerant tokenization.
                let parseResult = Sizzle.tokenize(this.cssText, false, {
                    tolerant: true,
                    returnUnsorted: true
                });

                let selectorData = parseResult.selectors;
                this.nextIndex = parseResult.nextIndex;

                if (this.cssText.charCodeAt(this.nextIndex) !== 123 /* charCode of '{' */ ||
                    !this.validateSelectors(selectorData)) {
                    this.error(this.nextIndex);
                }

                this.nextIndex++; // Move the pointer to the start of style declaration.
                let styleMap = this.parseNextStyle();

                let debug = false;

                // If there is a style property 'debug', mark the selector
                // as a debuggable selector, and delete the style declaration.
                let debugPropertyValue = styleMap['debug'];
                if (typeof debugPropertyValue !== 'undefined') {
                    if (debugPropertyValue === 'global') {
                        ExtendedSelectorFactory.enableGlobalDebugging();
                    }
                    debug = true;
                    delete styleMap['debug'];
                }

                // Creating an ExtendedSelector instance for every selector we got from Sizzle.tokenize.
                // This is quite important as Sizzle does a poor job at executing selectors like "selector1, selector2".
                for (let i = 0, l = selectorData.length; i < l; i++) {
                    let data = selectorData[i];
                    try {
                        let extendedSelector = ExtendedSelectorFactory.createSelector(data.selectorText, data.groups, debug);
                        results.push({
                            selector: extendedSelector,
                            style: styleMap
                        });
                    } catch (ex) {
                        utils.logError("ExtendedCssParser: ignoring invalid selector " + data.selectorText);
                    }
                }
            }

            return results;
        },

        parseNextStyle: function () {
            let styleMap = Object.create(null);

            let bracketPos = this.parseUntilClosingBracket(styleMap);

            // Cut out matched portion from cssText.
            reNonWhitespace.lastIndex = bracketPos + 1;
            let match = reNonWhitespace.exec(this.cssText);
            if (match === null) {
                this.cssText = '';
                return styleMap;
            }
            let matchPos = match.index;

            this.cssText = this.cssText.slice(matchPos);
            this.posOffset += matchPos;
            return styleMap;
        },

        /**
         * @return {number} an index of the next '}' in `this.cssText`.
         */
        parseUntilClosingBracket: function (styleMap) {
            // Expects ":", ";", and "}".
            reDeclDivider.lastIndex = this.nextIndex;
            let match = reDeclDivider.exec(this.cssText);
            if (match === null) {
                this.error(this.nextIndex);
            }
            let matchPos = match.index;
            let matched = match[0];
            if (matched === '}') {
                return matchPos;
            }
            if (matched === ':') {
                let colonIndex = matchPos;
                // Expects ";" and "}".
                reDeclEnd.lastIndex = colonIndex;
                match = reDeclEnd.exec(this.cssText);
                if (match === null) {
                    this.error(colonIndex);
                }
                matchPos = match.index;
                matched = match[0];
                // Populates the `styleMap` key-value map.
                let property = this.cssText.slice(this.nextIndex, colonIndex).trim();
                let value = this.cssText.slice(colonIndex + 1, matchPos).trim();
                styleMap[property] = value;
                // If found "}", re-run the outer loop.
                if (matched === '}') {
                    return matchPos;
                }
            }
            // matchPos is the position of the next ';'.
            // Increase 'nextIndex' and re-run the loop.
            this.nextIndex = matchPos + 1;
            return this.parseUntilClosingBracket(styleMap); // Should be a subject of tail-call optimization.
        }
    };

    return {
        normalize: normalize,
        parseCss: function (cssText) {
            initializeSizzle();
            return (new Parser(normalize(cssText))).parseCss();
        }
    };

})();
