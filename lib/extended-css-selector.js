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

/* global Sizzle, console, StylePropertyMatcher */

/**
 * Extended selector class.
 * The purpose of this class is to add support for extended pseudo-classes:
 * https://github.com/AdguardTeam/AdguardBrowserExtension/issues/321
 * https://github.com/AdguardTeam/AdguardBrowserExtension/issues/322
 * <br/>
 * Please note, that instead of using the pseudo-classes we use a bit different syntax.
 * This saves us from backward compatibility issues.
 * <br/>
 * Extended selection capabilities:<br/>
 * [-ext-has="selector"] - the same as :has() pseudo class from CSS4 specification
 * [-ext-contains="string"] - allows to select elements containing specified string
 * [-ext-matches-css="|background-image: url(data:*)"]
 */


var ExtendedSelector = (function () { // jshint ignore:line
    
        var PSEUDO_EXTENSIONS_MARKERS = [ ":has", ":contains", ":has-text", ":matches-css" ];
    
        // Add :matches-css-*() support
        StylePropertyMatcher.extendSizzle(Sizzle);
    
        // Add :contains, :has-text, :-abp-contains support
        Sizzle.selectors.pseudos["contains"] = Sizzle.selectors.pseudos["has-text"] = Sizzle.selectors.pseudos["-abp-contains"] = Sizzle.selectors.createPseudo(function( text ) {
            if(/^\s*\/.*\/\s*$/.test(text)) {
                text = text.trim().slice(1, -1).replace(/\\([\\"])/g, '$1');
                var regex;
                try {
                    regex = new RegExp(text);
                } catch(e) {
                    throw new Error('Invalid argument of :contains pseudo class: ' + text);
                }
                return function( elem ) {
                    return regex.test(elem.textContent);
                };
            } else {
                text = text.replace(/\\([\\()[\]"])/g, '$1');
                return function( elem ) {
                    return elem.textContent.indexOf( text ) > -1;
                };
            }
        });
    
        // Add :-abp-has support
        Sizzle.selectors.pseudos["-abp-has"] = Sizzle.selectors.pseudos["has"];
    
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
    
        /**
         * Checks if specified token is simple and can be used by document.querySelectorAll. 
         */
        var isSimpleToken = function (token) {
    
            if (token.type === "ID" ||
                token.type === "CLASS" ||
                token.type === "ATTR" ||
                token.type === "TAG" ||
                token.type === "CHILD") {
                // known simple tokens
                return true;
            }
    
            if (token.type === "PSEUDO") {
                // check if value contains any of extended pseudo classes
                var i = PSEUDO_EXTENSIONS_MARKERS.length;
                while (i--) {
                    if (token.value.indexOf(PSEUDO_EXTENSIONS_MARKERS[i]) >= 0) {
                        return false;
                    }
                }
                return true;
            }
    
            // all others aren't simple
            return false;
        };
    
        /**
         * Checks if specified token is parenthesis relation
         */
        var isRelationToken = function(token) {
            var type = token.type;
            return type === " " || type === ">" || type === '+' || type === '~';
        };
    
        var getEasyTokenization = function(selectorText) {
            return {
                simple: null,
                relation: null,
                complex: selectorText,
                selectorText: selectorText
            };
        };

        /**
         * Parses selector into two parts:
         * 1. Simple selector, which can be used by document.querySelectorAll.
         * 2. Complex selector, which is a single compound selector and to be used with Sizzle.
         * 
         * @returns object with three fields: simple, complex and relation (and also "selectorText" with source selector)
         */
        var tokenizeSelector = function (selectorText) {
            var tokens = Sizzle.tokenize(selectorText);

            if (tokens.length !== 1) {
                // Do not optimize complex selectors
                return getEasyTokenization(selectorText);
            }
            tokens = tokens[0];

            // We split selector only when the last compound selector
            // is the only extended selector.
            var latestRelationToken = -1;
            var haveMetComplexToken = false;
            var iToken, lToken;
            for (iToken = 0, lToken = tokens.length; iToken < lToken; iToken++) {
                var token = tokens[iToken];
                if (isRelationToken(token)) {
                    if (haveMetComplexToken) {
                        return getEasyTokenization(selectorText);
                    } else {
                        latestRelationToken = iToken;
                    }
                } else if (!isSimpleToken(token)) {
                    haveMetComplexToken = true;
                }
            }

            var simple = "";
            var relation = null;
            var complex = "";

            if (haveMetComplexToken) {
                for (iToken = 0; iToken < latestRelationToken; iToken++) {
                    simple += tokens[iToken].value;
                }
                if (iToken > -1) {
                    relation = tokens[iToken].type;
                }
                iToken++;
                for (; iToken < lToken; iToken++) {
                    complex += tokens[iToken].value;
                }
            } else {
                simple = selectorText;
            }

            // Validate simple token
            try {
                document.querySelector(simple);
            } catch(e) {
                // Simple token appears to be invalid
                return getEasyTokenization(selectorText);
            }
            return {
                simple: simple || null,
                relation: relation,
                complex: complex || null,
                selectorText: selectorText 
            };
        };

        /**
         * Used for pre-processing pseud-classes values (see prepareSelector)
         */
        var addQuotes = function(_, c1, c2) { return ':' + c1 + '("' + c2.replace(/["\\]/g, '\\$&') + '")'; };
    
        /**
         * Prepares specified selector and compiles it with the Sizzle engine.
         * Preparation means transforming [-ext-*=""] attributes to pseudo classes.
         * 
         * @param selectorText Selector text
         */
        var prepareSelector = function (selectorText) {
            try {
                // Prepare selector to be compiled with Sizzle
                // Which means transform [-ext-*=""] attributes to pseudo classes
                var re = /\[-ext-([a-z-_]+)=(["'])((?:(?=(\\?))\4.)*?)\2\]/g;
                var str = selectorText.replace(re, evaluateMatch);
    
                // Sizzle's parsing of pseudo class arguments is buggy on certain circumstances
                // We support following form of arguments:
                // 1. for :matches-css, those of a form {propertyName}: /.*/
                // 2. for :contains, those of a form /.*/
                // We transform such cases in a way that Sizzle has no ambiguity in parsing arguments.
                str = str.replace(/\:(matches-css(?:-after|-before)?)\(([a-z-\s]*\:\s*\/(?:\\.|[^\/])*?\/\s*)\)/g, addQuotes);
                str = str.replace(/:(contains|has-text)\((\s*\/(?:\\.|[^\/])*?\/\s*)\)/g, addQuotes);
                // Note that we require `/` character in regular expressions to be escaped.
    
                var compiledSelector = tokenizeSelector(str);
    
                // Compiles and validates selector
                // Compilation in Sizzle means that selector will be saved to the inner cache and then reused
                // Directly compiling unprocessed selectorText can cause problems.
                // For instance, one of tests in test/test-selector.html fails without this change.
                // It will fall into the same pitfall we were trying to fix in https://github.com/AdguardTeam/ExtendedCss/issues/23
                Sizzle.compile(compiledSelector.selectorText);
    
                if (compiledSelector.complex) {
                    Sizzle.compile(compiledSelector.complex);
                }
                return compiledSelector;
            } catch (ex) {
                if (typeof console !== 'undefined' && console.error) {
                    console.error('Extended selector is invalid: ' + selectorText);
                }
                return null;
            }
        };

        /**
         * Does the complex search (first executes document.querySelectorAll, then Sizzle)
         * 
         * @param compiledSelector Compiled selector (simple, complex and relation)
         */
        var complexSearch = function(compiledSelector) {
            var resultNodes = [];

            // First we use simple selector to narrow our search
            var simpleNodes = document.querySelectorAll(compiledSelector.simple);
            if (!simpleNodes || !simpleNodes.length) {
                return resultNodes;
            }
            var iSimpleNodes = simpleNodes.length;
            var node, childNodes, iChildNodes, childNode, parentNode;
            switch (compiledSelector.relation) {
                case " ":
                    while (iSimpleNodes--) {
                        node = simpleNodes[iSimpleNodes];
                        Sizzle(compiledSelector.complex, node, resultNodes); // jshint ignore:line
                    }
                    break;
                case ">":
                    // buffer array
                    childNodes = [];
                    while (iSimpleNodes--) {
                        node = simpleNodes[iSimpleNodes];
                        Sizzle(compiledSelector.complex, node, childNodes); // jshint ignore:line
                        iChildNodes = childNodes.length;
                        while (iChildNodes--) {
                            childNode = childNodes[iChildNodes];
                            if (childNode.parentNode === node) {
                                resultNodes.push(childNode);
                            }
                        }
                        // clears the buffer
                        childNodes.length = 0;
                    }
                    break;
                case "+":
                    childNodes = [];
                    while (iSimpleNodes--) {
                        node = simpleNodes[iSimpleNodes];
                        parentNode = node.parentNode;
                        if (!parentNode) { continue; }
                        Sizzle(compiledSelector.complex, parentNode, childNodes); // jshint ignore:line
                        iChildNodes = childNodes.length;
                        while (iChildNodes--) {
                            childNode = childNodes[iChildNodes];
                            if (childNode.previousElementSibling === node) {
                                resultNodes.push(childNode);
                            }
                        }
                        childNodes.length = 0;
                    }
                    break;
                case "~":
                    childNodes = [];
                    while (iSimpleNodes--) {
                        node = simpleNodes[iSimpleNodes];
                        parentNode = node.parentNode;
                        if (!parentNode) { continue; }
                        Sizzle(compiledSelector.complex, parentNode, childNodes); // jshint ignore:line
                        iChildNodes = childNodes.length;
                        while (iChildNodes--) {
                            childNode = childNodes[iChildNodes];
                            if (childNode.parentNode === parentNode && node.compareDocumentPosition(childNode) === 4) {
                                resultNodes.push(childNode);
                            }
                        }
                        childNodes.length = 0;
                    }
            }

            return Sizzle.uniqueSort(resultNodes);
        };
        
        // Constructor
        return function (selectorText) {
            var compiledSelector = prepareSelector(selectorText);
    
            // EXPOSE
            this.compiledSelector = compiledSelector;
            this.selectorText = (compiledSelector == null ? null : compiledSelector.selectorText);
    
            /**
             * Selects all DOM nodes matching this selector.
             */
            this.querySelectorAll = function () {
                if (compiledSelector === null) {
                    // Invalid selector, always return empty array
                    return [];
                }
    
                if (!compiledSelector.simple) {
                    // No simple selector applied
                    return Sizzle(compiledSelector.complex); // jshint ignore:line
                }
    
                if (!compiledSelector.complex) {
                    // There is no complex selector, so we could simply return it immediately
                    return document.querySelectorAll(compiledSelector.simple);
                }
    
                return complexSearch(compiledSelector);
            };
    
            /**
             * Checks if the specified element matches this selector
             */
            this.matches = function (element) {
                return Sizzle.matchesSelector(element, compiledSelector.selectorText);
            };
        };
    })();