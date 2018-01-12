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

/* global Sizzle, ExtendedSelector */

/**
 * A helper function that parses stylesheets containing extended selectors
 * into ExtendedSelector instances and key-value maps of style declarations.
 */
var ExtendedCssParser = (function() { // jshint ignore:line

    /**
     * Regex that matches AdGuard's backward compatible syntaxes.
     */
    var reAttrFallback = /\[-ext-([a-z-_]+)=(["'])((?:(?=(\\?))\4.)*?)\2\]/g;

    /**
     * Complex replacement function. 
     * Unescapes quote characters inside of an extended selector.
     * 
     * @param match     Whole matched string
     * @param name      Group 1
     * @param quoteChar Group 2
     * @param value     Group 3
     */
    var evaluateMatch = function (match, name, quoteChar, value) {
        // Unescape quotes
        var re = new RegExp("([^\\\\]|^)\\\\" + quoteChar, "g");
        value = value.replace(re, "$1" + quoteChar);
        return ":" + name + "(" + value + ")";
    };

    // Sizzle's parsing of pseudo class arguments is buggy on certain circumstances
    // We support following form of arguments:
    // 1. for :matches-css, those of a form {propertyName}: /.*/
    // 2. for :contains, those of a form /.*/
    // We transform such cases in a way that Sizzle has no ambiguity in parsing arguments.
    var reMatchesCss = /\:(matches-css(?:-after|-before)?)\(([a-z-\s]*\:\s*\/(?:\\.|[^\/])*?\/\s*)\)/g;
    var reContains = /:(contains|has-text)\((\s*\/(?:\\.|[^\/])*?\/\s*)\)/g;
    // Note that we require `/` character in regular expressions to be escaped.

    /**
     * Used for pre-processing pseud-classes values with above two regexes.
     */
    var addQuotes = function (_, c1, c2) { 
        return ':' + c1 + '("' + c2.replace(/["\\]/g, '\\$&') + '")';
    };

    /**
     * Normalizes specified css text in a form that can be parsed by the
     * Sizzle engine.
     * Normalization means 
     *  1. transforming [-ext-*=""] attributes to pseudo classes
     *  2. enclosing arguments of `:contains`, `:matches-css` pseudo classes
     *     with quotes.
     */
    var normalize = function (cssText) {
        cssText = cssText.replace(reAttrFallback, evaluateMatch);
        cssText = cssText.replace(reMatchesCss, addQuotes);
        cssText = cssText.replace(reContains, addQuotes);
        return cssText;
    };

    /**
     * Keeps the offset of `cssText` with respect to its original value,
     * to provide a meaningful error position.
     */
    var posOffset;    
    /**
     * Throws an error.
     */
    var parseError = function (position) {
        throw new Error('CssParser: parse error at position ' + (posOffset + position));
    };

    var reDeclEnd = /[;}]/g;
    var reDeclDivider = /[;:}]/g;
    var reNonWhitespace = /\S/g;

    /**
     * Parses css text into ExtendedSelector instances and style declarations.
     */
    var parseCss = function (cssText) {
        if (!cssText) {
            parseError(0);
        }
        cssText = normalize(cssText);
        var cssLength = cssText.length;
        var results = []; // An array to be returned.

        posOffset = 0;

        // Start of the stylesheet parse loop
        while (cssText) {
            // Apply tolerant tokenization.
            var parseResult = Sizzle.tokenize(cssText, false, true);
            if (typeof parseResult === 'string') {
                parseError(cssLength);
            }
            var selector = parseResult.selector;
            var tokens = parseResult.tokens;
            var nextIndex = parseResult.nextIndex;

            if (cssText.charCodeAt(nextIndex) !== 123 /* charCode of '{' */) {
                parseError(nextIndex);
            }

            // Selector may end with whitespaces, and Sizzle
            // treat it as a descendant combinator.
            // We strip it out.
            var lastTokens = tokens[tokens.length - 1];
            var l = lastTokens.length;

            if (lastTokens[l - 1].type === ' ') {
                lastTokens.length = l - 1;
            }
            selector = selector.trim();

            // Start of style declaration parse loop 
            var styles = Object.create(null);
            var match, matchPos, matched;
            nextIndex++; // Move the pointer to the start of style declaration.
            while (true) {
                untilClosingBracket: {
                    // Expects ":", ";", and "}".
                    reDeclDivider.lastIndex = nextIndex;
                    match = reDeclDivider.exec(cssText);
                    if (match === null) {
                        parseError(nextIndex);
                    }
                    matchPos = match.index;
                    matched = match[0];
                    if (matched === '}') { break untilClosingBracket; }
                    if (matched === ':') {
                        var colonIndex = matchPos;
                        // Expect ";" and "}".
                        reDeclEnd.lastIndex = colonIndex;
                        match = reDeclEnd.exec(cssText);
                        if (match === null) {
                            parseError(colonIndex);
                        }
                        matchPos = match.index;
                        matched = match[0];
                        // Populates the `styles` key-value map.
                        var property = cssText.slice(nextIndex, colonIndex).trim();
                        var value = cssText.slice(colonIndex + 1, matchPos).trim();
                        styles[property] = value;
                        // If found "}", re-run the outer loop.
                        if (matched === '}') { break untilClosingBracket; }
                    }
                    // matchPos is the position of the next ';'.
                    // Increase 'nextIndex' and re-run the loop.
                    nextIndex = matchPos + 1;
                    continue;
                }

                // Matched the closing bracket - cut out matched portion
                // from cssText and re-run the outer loop.
                reNonWhitespace.lastIndex = matchPos + 1;
                match = reNonWhitespace.exec(cssText);
                if (match === null) {
                    cssText = '';
                    break;
                }
                matchPos = match.index;

                cssText = cssText.slice(matchPos);
                posOffset += matchPos;
                break;
            }
            // End of style declaration parse loop 

            results.push({
                selector: new ExtendedSelector(selector, tokens),
                style: styles
            });
        }
        // End of the stylesheet parse loop

        return results;
    };

    return {
        normalize: normalize,
        parseCss: parseCss
    };

})();
