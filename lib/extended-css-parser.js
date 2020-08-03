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
import cssUtils from './css-utils';
import initializeSizzle from './sizzle.patched';
import ExtendedSelectorFactory from './extended-css-selector';

/**
 * A helper class that parses stylesheets containing extended selectors
 * into ExtendedSelector instances and key-value maps of style declarations.
 * Please note, that it does not support any complex things like media queries and such.
 */
const ExtendedCssParser = (function () {
    const reDeclEnd = /[;}]/g;
    const reDeclDivider = /[;:}]/g;
    const reNonWhitespace = /\S/g;

    let Sizzle;

    /**
     * @param {string} cssText
     * @constructor
     */
    function Parser(cssText) {
        this.cssText = cssText;
    }

    Parser.prototype = {
        error(position) {
            throw new Error(`CssParser: parse error at position ${this.posOffset + position}`);
        },

        /**
         * Validates that the tokens correspond to a valid selector.
         * Sizzle is different from browsers and some selectors that it tolerates aren't actually valid.
         * For instance, "div >" won't work in a browser, but it will in Sizzle (it'd be the same as "div > *").
         *
         * @param {*} selectors An array of SelectorData (selector, groups)
         * @returns {boolean} false if any of the groups are invalid
         */
        validateSelectors(selectors) {
            let iSelectors = selectors.length;
            while (iSelectors--) {
                const { groups } = selectors[iSelectors];
                let iGroups = groups.length;

                while (iGroups--) {
                    const tokens = groups[iGroups];
                    const lastToken = tokens[tokens.length - 1];
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
         * If any of the selectors used in the stylesheet cannot be compiled into an ExtendedSelector,
         * it will be ignored.
         *
         * @typedef {Object} ExtendedStyle
         * @property {Object} selector An instance of the {@link ExtendedSelector} class
         * @property {Object} styleMap A map of styles parsed
         *
         * @returns {Array.<ExtendedStyle>} An array of the styles parsed
         */
        parseCss() {
            this.posOffset = 0;
            if (!this.cssText) { this.error(0); }
            const results = [];

            while (this.cssText) {
                // Apply tolerant tokenization.
                const parseResult = Sizzle.tokenize(this.cssText, false, {
                    tolerant: true,
                    returnUnsorted: true,
                });

                const selectorData = parseResult.selectors;
                this.nextIndex = parseResult.nextIndex;

                if (this.cssText.charCodeAt(this.nextIndex) !== 123
                    || /* charCode of '{' */ !this.validateSelectors(selectorData)) {
                    this.error(this.nextIndex);
                }

                this.nextIndex++; // Move the pointer to the start of style declaration.
                const styleMap = this.parseNextStyle();

                let debug = false;

                // If there is a style property 'debug', mark the selector
                // as a debuggable selector, and delete the style declaration.
                const debugPropertyValue = styleMap['debug'];
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
                    const data = selectorData[i];
                    try {
                        const extendedSelector = ExtendedSelectorFactory.createSelector(data.selectorText, data.groups, debug);
                        if (extendedSelector.pseudoClassArg && extendedSelector.isRemoveSelector) {
                            // if there is remove pseudo-class in rule,
                            // the element will be removed and no other styles will be applied
                            styleMap['remove'] = 'true';
                        }
                        results.push({
                            selector: extendedSelector,
                            style: styleMap,
                        });
                    } catch (ex) {
                        utils.logError(`ExtendedCssParser: ignoring invalid selector ${data.selectorText}`);
                    }
                }
            }

            return results;
        },

        parseNextStyle() {
            const styleMap = Object.create(null);

            const bracketPos = this.parseUntilClosingBracket(styleMap);

            // Cut out matched portion from cssText.
            reNonWhitespace.lastIndex = bracketPos + 1;
            const match = reNonWhitespace.exec(this.cssText);
            if (match === null) {
                this.cssText = '';
                return styleMap;
            }
            const matchPos = match.index;

            this.cssText = this.cssText.slice(matchPos);
            this.posOffset += matchPos;
            return styleMap;
        },

        /**
         * @return {number} an index of the next '}' in `this.cssText`.
         */
        parseUntilClosingBracket(styleMap) {
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
                const colonIndex = matchPos;
                // Expects ";" and "}".
                reDeclEnd.lastIndex = colonIndex;
                match = reDeclEnd.exec(this.cssText);
                if (match === null) {
                    this.error(colonIndex);
                }
                matchPos = match.index;
                matched = match[0];
                // Populates the `styleMap` key-value map.
                const property = this.cssText.slice(this.nextIndex, colonIndex).trim();
                const value = this.cssText.slice(colonIndex + 1, matchPos).trim();
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
        },
    };

    return {
        parseCss(cssText) {
            Sizzle = initializeSizzle();
            return (new Parser(cssUtils.normalize(cssText))).parseCss();
        },
    };
})();

export default ExtendedCssParser;
