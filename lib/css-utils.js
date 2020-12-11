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

/**
 * Helper class css utils
 *
 * @type {{normalize}}
 */
const cssUtils = (() => {
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
        const re = new RegExp(`([^\\\\]|^)\\\\${quoteChar}`, 'g');
        value = value.replace(re, `$1${quoteChar}`);
        return `:${name}(${value})`;
    };

    // Sizzle's parsing of pseudo class arguments is buggy on certain circumstances
    // We support following form of arguments:
    // 1. for :matches-css, those of a form {propertyName}: /.*/
    // 2. for :contains, those of a form /.*/
    // We transform such cases in a way that Sizzle has no ambiguity in parsing arguments.
    const reMatchesCss = /\:(matches-css(?:-after|-before)?)\(([a-z-\s]*\:\s*\/(?:\\.|[^\/])*?\/\s*)\)/g;
    const reContains = /:(?:-abp-)?(contains|has-text)\((\s*\/(?:\\.|[^\/])*?\/\s*)\)/g;
    const reScope = /\(\:scope >/g;
    // Note that we require `/` character in regular expressions to be escaped.

    /**
     * Used for pre-processing pseudo-classes values with above two regexes.
     */
    const addQuotes = function (_, c1, c2) {
        return `:${c1}("${c2.replace(/["\\]/g, '\\$&')}")`;
    };

    const SCOPE_REPLACER = '(>';

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
        cssText = cssText.replace(reScope, SCOPE_REPLACER);
        return cssText;
    };

    const isSimpleSelectorValid = function (selector) {
        try {
            document.querySelectorAll(selector);
        } catch (e) {
            return false;
        }
        return true;
    };

    return {
        normalize,
        isSimpleSelectorValid,
    };
})();

export default cssUtils;
