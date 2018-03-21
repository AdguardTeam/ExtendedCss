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

/* global Sizzle, StylePropertyMatcher, ExtendedCssParser, initializeSizzle, StyleObserver, utils */

/**
 * Extended selector factory module, for creating extended selector classes.
 *
 * Extended selection capabilities description:
 * https://github.com/AdguardTeam/ExtendedCss/blob/master/README.md
 */

const ExtendedSelectorFactory = (function () { // jshint ignore:line

    const PSEUDO_EXTENSIONS_MARKERS = [":has", ":contains", ":has-text", ":matches-css", ":properties",
        ":-abp-has", ":-abp-has-text", ":-abp-properties", ":if", ":if-not"];
    let initialized = false;
    /**
     * Lazy initialization of the ExtendedSelectorFactory and objects that might be necessary for creating and applying styles.
     * This method extends Sizzle engine that we use under the hood with our custom pseudo-classes.
     */
    function initialize() {
        if (initialized) { return; }
        initialized = true;

        // Our version of Sizzle is initialized lazily as well
        initializeSizzle();

        // Add :matches-css-*() support
        StylePropertyMatcher.extendSizzle(Sizzle);

        // Add :contains, :has-text, :-abp-contains support
        Sizzle.selectors.pseudos["contains"] = Sizzle.selectors.pseudos["has-text"] = Sizzle.selectors.pseudos["-abp-contains"] = Sizzle.selectors.createPseudo(function (text) {
            if (/^\s*\/.*\/\s*$/.test(text)) {
                text = text.trim().slice(1, -1).replace(/\\([\\"])/g, '$1');
                let regex;
                try {
                    regex = new RegExp(text);
                } catch (e) {
                    throw new Error('Invalid argument of :contains pseudo class: ' + text);
                }
                return function (elem) {
                    return regex.test(elem.textContent);
                };
            } else {
                text = text.replace(/\\([\\()[\]"])/g, '$1');
                return function (elem) {
                    return elem.textContent.indexOf(text) > -1;
                };
            }
        });

        // Add :if, :-abp-has support
        Sizzle.selectors.pseudos["if"] = Sizzle.selectors.pseudos["-abp-has"] = Sizzle.selectors.pseudos["has"];

        // Add :if-not support
        Sizzle.selectors.pseudos["if-not"] = Sizzle.selectors.createPseudo(function (selector) {
            if (typeof selector === "string") {
                Sizzle.compile(selector);
            }
            return function (elem) {
                return Sizzle(selector, elem).length === 0; // jshint ignore:line
            };
        });

        // Add :properties, :-abp-properties support
        StyleObserver.extendSizzle(Sizzle);
    }

    /**
     * Checks if specified token can be used by document.querySelectorAll.
     */
    function isSimpleToken(token) {
        let type = token.type;
        if (type === "ID" || type === "CLASS" || type === "ATTR" || type === "TAG" || type === "CHILD") {
            // known simple tokens
            return true;
        }

        if (type === "PSEUDO") {
            // check if value contains any of extended pseudo classes
            let i = PSEUDO_EXTENSIONS_MARKERS.length;
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
    function isRelationToken(token) {
        let type = token.type;
        return type === " " || type === ">" || type === '+' || type === '~';
    }

    /**
     * A selector obtained from `:properties` pseudo usually contains id or class selector;
     * We apply 'properties reverse search' when `:properties` is the most specific part.
     */
    function tokenHasHigherSpecificityThanPropertiesPseudo(token) {
        let type = token.type;
        return type === 'ID' || type === 'CLASS';
    }

    function isPropertiesPseudo(token) {
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
     * ExtendedSelectorParser is a helper class for creating various selector instances which
     * all shares a method `querySelectorAll()` and `matches()` implementing different search strategies
     * depending on a type of selector.
     *
     * Currently, there are 3 types:
     *  A trait-less extended selector
     *    - we directly feed selector strings to Sizzle.
     *  A splitted extended selector
     *    - such as #container #feedItem:has(.ads), where it is splitted to `#container` and `#feedItem:has(.ads)`.
     *  A properties-heavy extended selector
     *    - such as `*:properties(background-image:/data\:/), where we apply "Properties Reverse Search".
     *
     * For a compound selector `X:-abp-properties(Y)`, we apply the reverse search iff `X` does not contain
     * an id selector or a class selector. This is based on an observation that in most of use cases, a selector
     * obtained from `-abp-properties(Y)` contains id or class selectors.
     */
    function ExtendedSelectorParser(selectorText, tokens, debug) {
        initialize();

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

    ExtendedSelectorParser.prototype = {
        /**
         * The main method, creates a selector instance depending on the type of a selector.
         * @public
         */
        createSelector: function () {
            let debug = this.debug;
            let tokens = this.tokens;
            let selectorText = this.selectorText;
            if (tokens.length !== 1) { // Comma-separate selector - can't optimize further
                return new TraitLessSelector(selectorText, debug);
            }
            tokens = tokens[0];
            let l = tokens.length;
            let lastRelTokenInd = this.getSplitPoint();
            if (typeof lastRelTokenInd === 'undefined') {
                try {
                    document.querySelector(selectorText);
                } catch (e) {
                    return new TraitLessSelector(selectorText, debug);
                }
                return new NotAnExtendedSelector(selectorText, debug);
            }
            let simple = '';
            let relation = null;
            let complex = '';
            let i = 0;
            for (; i < lastRelTokenInd; i++) { // build simple part
                simple += tokens[i].value;
            }
            if (i > 0) { // build relation part
                relation = tokens[i++].type;
            }
            // i is pointing to the start of a complex part.
            let firstPropertiesPseudoIndex = this.getHeavyPropertiesPseudoIndex(i);
            for (; i < l; i++) {
                if (i === firstPropertiesPseudoIndex) { continue; }
                complex += tokens[i].value;
            }
            if (firstPropertiesPseudoIndex !== -1) {
                let propertyFilter = tokens[firstPropertiesPseudoIndex].matches[1];
                return new PropertiesHeavySelector(selectorText, simple, relation, complex, propertyFilter, debug);
            }
            return lastRelTokenInd === -1 ?
                new TraitLessSelector(selectorText, debug) :
                new SplittedSelector(selectorText, simple, relation, complex, debug);
        },
        /**
         * @private
         * @return {number|undefined} An index of a token that is split point.
         * returns undefined if the selector does not contain any complex tokens
         * or it is not eligible for splitting.
         * Otherwise returns an integer indicating the index of the last relation token.
         */
        getSplitPoint: function () {
            let tokens = this.tokens[0];
            // We split selector only when the last compound selector
            // is the only extended selector.
            let latestRelationTokenIndex = -1;
            let haveMetComplexToken = false;
            for (let i = 0, l = tokens.length; i < l; i++) {
                let token = tokens[i];
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
        },
        /**
         * @private
         * @return {number} An index of the first "heavy" properties pseudo, from startIndex.
         * -1 if there is no properties pseudo after then, or there is a token that is heavier than
         * the properties pseudo.
         */
        getHeavyPropertiesPseudoIndex: function (startIndex) {
            let tokens = this.tokens[0];
            let haveMetTokenSpecificEnough = false;
            let firstPropertiesPseudoIndex = -1;
            for (let i = startIndex, l = tokens.length; i < l; i++) {
                let token = tokens[i];
                if (!haveMetTokenSpecificEnough && tokenHasHigherSpecificityThanPropertiesPseudo(token)) {
                    haveMetTokenSpecificEnough = true;
                }
                if (firstPropertiesPseudoIndex === -1 && isPropertiesPseudo(token)) {
                    firstPropertiesPseudoIndex = i;
                }
            }
            if (haveMetTokenSpecificEnough) { return -1; }
            return firstPropertiesPseudoIndex;
        }
    };

    let globalDebuggingFlag = false;
    function isDebugging() {
        return globalDebuggingFlag || this.debug;
    }


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
        },
        isDebugging: isDebugging
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
        },
        /** @final */
        isDebugging: isDebugging
    };

    /**
     * A splitted extended selector class.
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
    function SplittedSelector(selectorText, simple, relation, complex, debug) {
        TraitLessSelector.call(this, selectorText, debug);
        this.simple = simple;
        this.relation = relation;
        this.complex = complex;
        Sizzle.compile(complex);
    }

    SplittedSelector.prototype = Object.create(TraitLessSelector.prototype);
    SplittedSelector.prototype.constructor = SplittedSelector;
    /** @override */
    SplittedSelector.prototype.querySelectorAll = function () {
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
            simpleNodes = [document];
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
    SplittedSelector.prototype.relativeSearch = function (node, results) {
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
     * @extends SplittedSelector
     */
    function PropertiesHeavySelector(selectorText, simple, rel, complex, propertyFilter, debug) {
        SplittedSelector.call(this, selectorText, simple, rel, complex, debug);
        this.propertyFilter = propertyFilter;
    }

    PropertiesHeavySelector.prototype = Object.create(SplittedSelector.prototype);
    PropertiesHeavySelector.prototype.constructor = PropertiesHeavySelector;
    /**
     * @param {Node[]} result an array to append search result.
     * @override
     */
    PropertiesHeavySelector.prototype.relativeSearch = function (node, results) {
        if (!node) { node = document; }
        let selectors = StyleObserver.getSelector(this.propertyFilter);
        if (selectors.length === 0) { return; }

        let nodes = node.querySelectorAll(selectors.join(','));

        for (let node of nodes) {
            if (!this.complex.length || Sizzle.matchesSelector(node, this.complex)) {
                results.push(node);
            }
        }
    };

    return {
        /**
         * Wraps the inner class so that the instance is not exposed.
         */
        createSelector: function (selector, tokens, debug) {
            return new ExtendedSelectorParser(selector, tokens, debug).createSelector();
        },
        /**
         * Mark every selector as a selector being debugged, so that timing information
         * for the selector is printed to the console.
         */
        enableGlobalDebugging: function() {
            globalDebuggingFlag = true;
        }
    };
})();
