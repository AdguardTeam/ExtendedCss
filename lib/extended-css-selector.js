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

/* global Sizzle, StylePropertyMatcher, ExtendedCssParser, initializeSizzle, StyleObserver */

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

    initializeSizzle();

    var PSEUDO_EXTENSIONS_MARKERS = [ ":has", ":contains", ":has-text", ":matches-css", ":properties", ":-abp-has", ":-abp-has-text", ":-abp-properties" ];

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

    // Add :properties, :-abp-properties support
    StyleObserver.extendSizzle(Sizzle);

    /**
     * Checks if specified token can be used by document.querySelectorAll. 
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
     * Checks if specified token is a combinator
     */
    var isRelationToken = function(token) {
        var type = token.type;
        return type === " " || type === ">" || type === '+' || type === '~';
    };

    /**
     * Does the complex search (first executes document.querySelectorAll, then Sizzle)
     * @param compiledSelector Compiled selector (simple, complex and relation)
     */
    var complexSearch = function(compiledSelector) {
        var resultNodes = [];
        var simpleNodes;
        var relation;

        if (compiledSelector.simple) {
            // First we use simple selector to narrow our search
            simpleNodes = document.querySelectorAll(compiledSelector.simple);
            if (!simpleNodes || !simpleNodes.length) {
                return resultNodes;
            }
            relation = compiledSelector.relation;
        } else {
            simpleNodes = [document.documentElement];
            relation = " ";
        }        

        switch (relation) {
            case " ":
                for (let node of simpleNodes) {
                    relativeSearch(compiledSelector, node, resultNodes);
                }
                break;
            case ">": {
                // buffer array
                let childNodes = [];
                for (let node of simpleNodes) {
                    relativeSearch(compiledSelector, node, childNodes);
                    for (let childNode of childNodes) {
                        if (childNode.parentNode === node) {
                            resultNodes.push(childNode);
                        }
                    }
                    childNodes.length = 0; // clears the buffer
                }
                break;
            }
            case "+": {
                let childNodes = [];
                for (let node of simpleNodes) {
                    let parentNode = node.parentNode;
                    if (!parentNode) { continue; }
                    relativeSearch(compiledSelector, parentNode, childNodes);
                    for (let childNode of childNodes) {
                        if (childNode.previousElementSibling === node) {
                            resultNodes.push(childNode);
                        }
                    }
                    childNodes.length = 0;
                }
                break;
            }
            case "~": {
                let childNodes = [];
                for (let node of simpleNodes) {
                    let parentNode = node.parentNode;
                    if (!parentNode) { continue; }
                    relativeSearch(compiledSelector, parentNode, childNodes);
                    for (let childNode of childNodes) {
                        if (childNode.parentNode === parentNode && node.compareDocumentPosition(childNode) === 4) {
                            resultNodes.push(childNode);
                        }
                    }
                    childNodes.length = 0;
                }
            }
        }

        return Sizzle.uniqueSort(resultNodes);
    };


    var relativeSearch = function (compiledSelector, node, results) {
        if (compiledSelector.usePropertiesReverseSearch) {
            propertiesReverseSearch(compiledSelector.complex, compiledSelector.propertyFilter, node, results);
        } else {
            Sizzle(compiledSelector.complex, node, results); // jshint ignore:line
        }
    };

    /**
     * Find matches for sel:properties(propertyFilter), in the reverse way
     * The reverse way means, we get nodes that matches :properties(propertyFilter) first,
     * and then test those against `sel`.
     * @param {string} sel
     * @param {string} propertyFilter 
     * @param {Element} node 
     * @param {Array<Element>} results matched nodes will be appended to this array.
     */
    var propertiesReverseSearch = function (sel, propertyFilter, node, results) {
        if (node) { node = document; }
        let selectors = StyleObserver.getSelector(propertyFilter);
        if (selectors.length === 0) { return; }

        let nodes = node.querySelectorAll(selectors.join(','));

        for (let node of nodes) {
            if (!sel.length || Sizzle.matchesSelector(node, sel)) {
                results.push(node);
            }
        }
    };

    /**
     * A class with methods `querySelectorAll` and `matches.
     * 
     * @param {string} selectorText 
     * @param {Array<Array<{value: string, type: string, matches: RegExpExecArray}>} tokens 
     * @param {boolean} debug 
     * @constructor
     */
    function ExtendedSelector(selectorText, tokens, debug) {
        if (typeof tokens === 'undefined') {
            this.selectorText = ExtendedCssParser.normalize(selectorText);
            // Passing `returnUnsorted` in order to receive tokens in the order that's valid for the browser
            // In Sizzle internally, the tokens are re-sorted: https://github.com/AdguardTeam/ExtendedCss/issues/55 
            this.tokens = Sizzle.tokenize(this.selectorText, false, { returnUnsorted: true });
        } else {
            this.selectorText = selectorText;
            this.tokens = tokens;
        }
        Sizzle.compile(this.selectorText);
        
        this.tokenizeSelector();

        if (debug) {
            this.debug = true;
        }
    }

    ExtendedSelector.prototype = {
        useEasyTokenization: function () {
            this.compiledSelector = {
                useComplexSearch: false,
                selectorText: this.selectorText
            };
        },
        /**
         * Parses selector into two parts:
         * 1. Simple selector, which can be used by document.querySelectorAll.
         * 2. Complex selector, which is a single compound selector and to be used with Sizzle.
         * 
         * Also, it determines whether to use 'properties reverse search' or not for a compound selector
         * containing `:properties` pseudo class.
         * For a compound selector `X:-abp-properties(Y)`, we apply the reverse search iff `X` does not contain
         * an id selector or a class selector. This is based on an observation that in most of use cases, a selector
         * obtained from `-abp-properties(Y)` contains id or class selectors.
         * @returns object with three fields: simple, complex and relation (and also "selectorText" with source selector)
         */
        tokenizeSelector: function() {
            if (this.tokens.length !== 1) {
                // Do not optimize complex selectors
                this.useEasyTokenization();
                return;
            }
            var tokens = this.tokens[0];

            // We split selector only when the last compound selector
            // is the only extended selector.
            var latestRelationTokenIndex = -1;
            var haveMetComplexToken = false;
            var iToken, lToken;
            for (iToken = 0, lToken = tokens.length; iToken < lToken; iToken++) {
                var token = tokens[iToken];
                if (isRelationToken(token)) {
                    if (haveMetComplexToken) {
                        this.useEasyTokenization();
                        return;
                    } else {
                        latestRelationTokenIndex = iToken;
                    }
                } else if (!isSimpleToken(token)) {
                    haveMetComplexToken = true;
                }
            }

            if (haveMetComplexToken) {
                let simple = "";
                let relation = null;
                
                let complexTokenStart;
                
                // Get simple token
                iToken = 0;
                while (iToken < latestRelationTokenIndex) {
                    simple += tokens[iToken].value;
                    iToken++;
                }
                // Get relation token
                if (iToken > 0) {
                    relation = tokens[iToken].type;
                    iToken++;
                }
                complexTokenStart = iToken;
                let haveMetIdOrClassToken = false;
                let firstPropertiesPseudoIndex = -1;
                // Scan complex parts
                for (; iToken < lToken; iToken++) {
                    let token = tokens[iToken];
                    let type = token.type;
                    if (!haveMetIdOrClassToken) {
                        if (type === 'ID' || type === 'CLASS') {
                            haveMetIdOrClassToken = true;
                        }
                    }
                    if (firstPropertiesPseudoIndex === -1) {
                        if (type === "PSEUDO") {
                            let pseudo = token.matches[0];
                            if (pseudo === '-abp-properties' || pseudo === 'properties') {
                                firstPropertiesPseudoIndex = iToken;
                            }
                        }
                    }
                }

                if (latestRelationTokenIndex === -1 && firstPropertiesPseudoIndex === -1) {
                    this.useEasyTokenization();
                    return;
                }

                let compiledSelector = {
                    useComplexSearch: true,
                    simple: simple || null,
                    relation: relation,
                    selectorText: this.selectorText
                };

                if (firstPropertiesPseudoIndex !== -1 && !haveMetIdOrClassToken) {
                    let propertyFilter = tokens[firstPropertiesPseudoIndex].matches[1];
                    let complex = '';
                    for (let i = complexTokenStart; i < lToken; i++) {
                        if (i === firstPropertiesPseudoIndex) { continue; }
                        complex += tokens[i].value;
                    }
                    compiledSelector.usePropertiesReverseSearch = true;
                    compiledSelector.complex = complex;
                    compiledSelector.propertyFilter = propertyFilter;
                } else {
                    let complex = '';
                    for (let i = complexTokenStart; i < lToken; i++) {
                        complex += tokens[i].value;
                    }
                    compiledSelector.usePropertiesReverseSearch = false;
                    compiledSelector.complex = complex;
                }

                this.compiledSelector = compiledSelector;
            } else {
                // validate selectorText
                try {
                    document.querySelector(this.selectorText);
                } catch (e) {
                    this.useEasyTokenization();
                    return;
                }
                this.compiledSelector = {
                    useComplexSearch: false,
                    simple: this.selectorText,
                    selectorText: this.selectorText
                };
            }
        },
        /**
         * Selects all DOM nodes matching this selector.
         */
        querySelectorAll: function () {
            var compiledSelector = this.compiledSelector;

            if (compiledSelector === null) {
                // Invalid selector, always return empty array
                return [];
            }

            if (!compiledSelector.useComplexSearch) {
                if (compiledSelector.simple && !compiledSelector.complex) {
                    // There is no complex selector, so we could simply return it immediately
                    return document.querySelectorAll(compiledSelector.simple);
                }
                return Sizzle(compiledSelector.selectorText); // jshint ignore:line
            }

            return complexSearch(compiledSelector);
        },
        /**
         * Checks if the specified element matches this selector
         */
        matches: function(element) {
            return Sizzle.matchesSelector(element, this.compiledSelector.selectorText);
        }
    };

    return ExtendedSelector;

})();