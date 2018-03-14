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

/* global Sizzle, StylePropertyMatcher, ExtendedCssParser, initializeSizzle, StyleObserver, utils */

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

const ExtendedSelectorFactory = (function() { // jshint ignore:line

    const PSEUDO_EXTENSIONS_MARKERS = [ ":has", ":contains", ":has-text", ":matches-css", ":properties", ":-abp-has", ":-abp-has-text", ":-abp-properties" ];

    /**
     * Checks if specified token can be used by document.querySelectorAll.
     */
    function isSimpleToken (token) {
        let type = token.type;
        if (type === "ID" || type === "CLASS" || type === "ATTR" || type === "TAG" || type === "CHILD") {
            // known simple tokens
            return true;
        }

        if (type === "PSEUDO") {
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
    }

    /**
     * Checks if specified token is a combinator
     */
    function isRelationToken (token) {
        var type = token.type;
        return type === " " || type === ">" || type === '+' || type === '~';
    }

    /**
     *
     */
    function tokenHasHigherSpecificityThanPropertiesPseudo(token) {
        let type = token.type;
        return type === 'ID' || type === 'CLASS';
    }

    function isPropertiesPseudo (token) {
        let type = token.type;
        if (type === "PSEUDO") {
            let pseudo = token.matches[0];
            if (pseudo === '-abp-properties' || pseudo === 'properties') {
                return true;
            }
        }
        return false;
    }

    /**
     * ExtendedSelectorFactory is a helper class for creating various selector instances which
     * all shares a method `querySelectorAll()` and `matches()` implementing different search strategies
     * depending on a type of selector.
     *
     * Currently, there are 3 types:
     *  A trait-less extended selector
     *    - we directly feed selector strings to Sizzle.
     *  A dissected extended selector
     *    - such as #container #feedItem:has(.ads), where it is dissected to `#container` and `#feedItem:has(.ads)`.
     *  A properties-heavy extended selector
     *    - such as `*:properties(background-image:/data\:/), where we apply "Properties Reverse Search".
     *
     * For a compound selector `X:-abp-properties(Y)`, we apply the reverse search iff `X` does not contain
     * an id selector or a class selector. This is based on an observation that in most of use cases, a selector
     * obtained from `-abp-properties(Y)` contains id or class selectors.
     */
    function ExtendedSelectorFactory(selectorText, tokens, debug) {
        ExtendedSelectorFactory.initialize();
        if (typeof tokens === 'undefined') {
            this.selectorText = ExtendedCssParser.normalize(selectorText);
            // Passing `returnUnsorted` in order to receive tokens in the order that's valid for the browser
            // In Sizzle internally, the tokens are re-sorted: https://github.com/AdguardTeam/ExtendedCss/issues/55
            this.tokens = Sizzle.tokenize(this.selectorText, false, { returnUnsorted: true });
        } else {
            this.selectorText = selectorText;
            this.tokens = tokens;
        }
        if (debug === true) {
            this.debug = true;
        }
    }

    ExtendedSelectorFactory.initialized = false;
    ExtendedSelectorFactory.initialize = function() {
        if (ExtendedSelectorFactory.initialized) { return; }
        ExtendedSelectorFactory.initialized = true;
        initializeSizzle();
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
    };

    ExtendedSelectorFactory.enableGlobalDebugging = function () {
        TraitLessSelector.prototype.debug = true;
    };

    ExtendedSelectorFactory.prototype = {
        getInstance: function() {
            let debug = this.debug, tokens = this.tokens, selectorText = this.selectorText;
            if (tokens.length !== 1) { // Comma-separate selector - can't optimize further
                return new TraitLessSelector(this.selectorText, this.debug);
            }
            tokens = tokens[0];
            let l = tokens.length;
            let lastRelTokenInd = this.getDissectionPoint();
            if (typeof lastRelTokenInd === 'undefined') {
                try {
                    document.querySelector(selectorText);
                } catch (e) {
                    return new TraitLessSelector(selectorText, debug);
                }
                return new NotAnExtendedSelector(selectorText, debug);
            }
            let simple = "", relation = null, complexTokenStart, i = 0;
            for (; i < lastRelTokenInd; i++) { simple += tokens[i].value; }
            if (i > 0) { relation = tokens[i++].type; }
            complexTokenStart = i;
            let haveMetTokenSpecificEnough = false, firstPropertiesPseudoIndex = -1;
            for (; i < l; i++) {
                let token = tokens[i];
                if (!haveMetTokenSpecificEnough && tokenHasHigherSpecificityThanPropertiesPseudo(token)) {
                    haveMetTokenSpecificEnough = true;
                }
                if (firstPropertiesPseudoIndex === -1 && isPropertiesPseudo(token)) {
                    firstPropertiesPseudoIndex = i;
                }
            }
            if (lastRelTokenInd === -1 && firstPropertiesPseudoIndex === -1) {
                return new TraitLessSelector(this.selectorText, this.debug);
            }
            // At this point, the selector is eligible for complexSearch.
            let propertiesIsTheHeavyPart = firstPropertiesPseudoIndex !== -1 && !haveMetTokenSpecificEnough;
            let complex = '';
            for (let i = complexTokenStart; i < l; i++) {
                if (propertiesIsTheHeavyPart && i === firstPropertiesPseudoIndex) { continue; }
                complex += tokens[i].value;
            }
            if (propertiesIsTheHeavyPart) {
                let propertyFilter = tokens[firstPropertiesPseudoIndex].matches[1];
                return new PropertiesHeavySelector(selectorText, simple, relation, complex, propertyFilter, debug);
            }
            return new DissectedSelector(selectorText, simple, relation, complex, debug);
        },
        /**
         * @return {undefined|number} An index of a token that is dissection point. undefined
         * if the selector is not eligible for dissection.
         * Otherwise returns an integer indicating the index of the last relation token.
         */
        getDissectionPoint: function() {
            let tokens = this.tokens[0];
            // We split selector only when the last compound selector
            // is the only extended selector.
            let latestRelationTokenIndex = -1;
            let haveMetComplexToken = false;
            for (let i = 0, l = tokens.length; i < l; i++) {
                var token = tokens[i];
                if (isRelationToken(token)) {
                    if (haveMetComplexToken) {
                        return;
                    } else {
                        latestRelationTokenIndex = i;
                    }
                } else if (!isSimpleToken(token)) {
                    haveMetComplexToken = true;
                }
            }

            if (!haveMetComplexToken) { return; }
            return latestRelationTokenIndex;
        }
    };

    /**
     * This class represents a selector which is not an extended selector.
     * @param {string} selectorText 
     * @param {boolean=} debug 
     * @final
     */
    function NotAnExtendedSelector(selectorText, debug) {
        this.selectorText = selectorText;
        this.debug = debug;
    }

    NotAnExtendedSelector.prototype = {
        querySelectorAll: function () {
            return document.querySelectorAll(this.selectorText);
        },
        matches: function (element) {
            return element[utils.matchesPropertyName](this.selectorText);
        }
    };

    /**
     * A trait-less extended selector class.
     * @param {string} selectorText 
     * @param {boolean=} debug 
     * @constructor
     */
    function TraitLessSelector(selectorText, debug) {
        this.selectorText = selectorText;
        this.debug = debug;
        Sizzle.compile(selectorText);
    }

    TraitLessSelector.prototype = {
        querySelectorAll: function () {
            return Sizzle(this.selectorText); // jshint ignore:line
        },
        /** @final */
        matches: function (element) {
            return Sizzle.matchesSelector(element, this.selectorText);
        }
    };

    /**
     * A dissected extended selector class.
     * 
     * #container #feedItem:has(.ads)
     * +--------+                     simple
     *           +                    relation
     *            +-----------------+ complex
     * @param {string} selectorText 
     * @param {string} simple 
     * @param {string} relation 
     * @param {string} complex 
     * @param {boolean=} debug 
     * @constructor
     * @extends TraitLessSelector
     */
    function DissectedSelector(selectorText, simple, relation, complex, debug){
        TraitLessSelector.call(this, selectorText, debug);
        this.simple = simple;
        this.relation = relation;
        this.complex = complex;
        Sizzle.compile(complex);
    }

    DissectedSelector.prototype = Object.create(TraitLessSelector.prototype);
    DissectedSelector.prototype.constructor = DissectedSelector;
    DissectedSelector.prototype.querySelectorAll = function () {
        let resultNodes = [];
        let simpleNodes;

        let simple = this.simple;
        let relation;
        if (simple) {
            // First we use simple selector to narrow our search
            simpleNodes = document.querySelectorAll(simple);
            if (!simpleNodes || !simpleNodes.length) {
                return resultNodes;
            }
            relation = this.relation;
        } else {
            simpleNodes = [document.documentElement];
            relation = " ";
        }

        switch (relation) {
            case " ":
                for (let node of simpleNodes) {
                    this.relativeSearch(node, resultNodes);
                }
                break;
            case ">": {
                // buffer array
                let childNodes = [];
                for (let node of simpleNodes) {
                    this.relativeSearch(node, childNodes);
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
                    this.relativeSearch(parentNode, childNodes);
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
                    this.relativeSearch(parentNode, childNodes);
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

    /**
     * Performs a search of "complex" part relative to results for the "simple" part.
     * @param {Node} node a node matching the "simple" part.
     * @param {Node[]} result an array to append search result.
     */
    DissectedSelector.prototype.relativeSearch = function(node, results) {
        Sizzle(this.complex, node, results); // jshint ignore:line
    };

    /**
     * A properties-heavy extended selector class.
     * 
     * @param {string} selectorText 
     * @param {string} simple 
     * @param {string} rel 
     * @param {string} complex 
     * @param {string} propertyFilter 
     * @param {boolean=} debug 
     * @constructor
     * @extends DissectedSelector
     */
    function PropertiesHeavySelector (selectorText, simple, rel, complex, propertyFilter, debug) {
        DissectedSelector.call(this, selectorText, simple, rel, complex, debug);
        this.propertyFilter = propertyFilter;
    }

    PropertiesHeavySelector.prototype = Object.create(DissectedSelector.prototype);
    PropertiesHeavySelector.prototype.constructor = PropertiesHeavySelector;
    /**
     * @param {Node[]} result an array to append search result.
     * @override
     */
    PropertiesHeavySelector.prototype.relativeSearch = function(node, results) {
        if (node) { node = document; }
        let selectors = StyleObserver.getSelector(this.propertyFilter);
        if (selectors.length === 0) { return; }

        let nodes = node.querySelectorAll(selectors.join(','));

        for (let node of nodes) {
            if (!this.complex.length || Sizzle.matchesSelector(node, this.complex)) {
                results.push(node);
            }
        }
    };

    return ExtendedSelectorFactory;

})();
