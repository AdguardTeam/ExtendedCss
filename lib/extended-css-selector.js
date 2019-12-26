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

/* eslint-disable no-use-before-define */

import utils from './utils';
import cssUtils from './css-utils';
import initializeSizzle from './sizzle.patched';
import StylePropertyMatcher from './style-property-matcher';

/**
 * Extended selector factory module, for creating extended selector classes.
 *
 * Extended selection capabilities description:
 * https://github.com/AdguardTeam/ExtendedCss/blob/master/README.md
 */

const ExtendedSelectorFactory = (function () {
    const PSEUDO_EXTENSIONS_MARKERS = [':has', ':contains', ':has-text', ':matches-css',
        ':-abp-has', ':-abp-has-text', ':if', ':if-not'];
    let initialized = false;

    let Sizzle;
    /**
     * Lazy initialization of the ExtendedSelectorFactory and objects that might be necessary for creating and applying styles.
     * This method extends Sizzle engine that we use under the hood with our custom pseudo-classes.
     */
    function initialize() {
        if (initialized) { return; }
        initialized = true;

        // Our version of Sizzle is initialized lazily as well
        Sizzle = initializeSizzle();

        // Add :matches-css-*() support
        StylePropertyMatcher.extendSizzle(Sizzle);

        // Add :contains, :has-text, :-abp-contains support
        const containsPseudo = Sizzle.selectors.createPseudo((text) => {
            if (/^\s*\/.*\/\s*$/.test(text)) {
                text = text.trim().slice(1, -1).replace(/\\([\\"])/g, '$1');
                let regex;
                try {
                    regex = new RegExp(text);
                } catch (e) {
                    throw new Error(`Invalid argument of :contains pseudo class: ${text}`);
                }
                return function (elem) {
                    return regex.test(elem.textContent);
                };
            }
            text = text.replace(/\\([\\()[\]"])/g, '$1');
            return function (elem) {
                return elem.textContent.indexOf(text) > -1;
            };
        });
        Sizzle.selectors.pseudos['contains'] = containsPseudo;
        Sizzle.selectors.pseudos['has-text'] = containsPseudo;
        Sizzle.selectors.pseudos['-abp-contains'] = containsPseudo;

        // Add :if, :-abp-has support
        Sizzle.selectors.pseudos['if'] = Sizzle.selectors.pseudos['has'];
        Sizzle.selectors.pseudos['-abp-has'] = Sizzle.selectors.pseudos['has'];

        // Add :if-not support
        Sizzle.selectors.pseudos['if-not'] = Sizzle.selectors.createPseudo((selector) => {
            if (typeof selector === 'string') {
                Sizzle.compile(selector);
            }
            return function (elem) {
                return Sizzle(selector, elem).length === 0;
            };
        });

        // Define :xpath support in Sizzle, to make tokenize work properly
        Sizzle.selectors.pseudos['xpath'] = Sizzle.selectors.createPseudo(() => function () {
            return true;
        });
    }

    /**
     * Checks if specified token can be used by document.querySelectorAll.
     */
    function isSimpleToken(token) {
        const { type } = token;
        if (type === 'ID' || type === 'CLASS' || type === 'ATTR' || type === 'TAG' || type === 'CHILD') {
            // known simple tokens
            return true;
        }

        if (type === 'PSEUDO') {
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
        const { type } = token;
        return type === ' ' || type === '>' || type === '+' || type === '~';
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
     */
    function ExtendedSelectorParser(selectorText, tokens, debug) {
        initialize();

        if (typeof tokens === 'undefined') {
            this.selectorText = cssUtils.normalize(selectorText);
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
        createSelector() {
            const { debug } = this;
            let { tokens } = this;
            const { selectorText } = this;
            if (tokens.length !== 1) { // Comma-separate selector - can't optimize further
                return new TraitLessSelector(selectorText, debug);
            }

            const xpathToken = this.getXpathToken();
            if (typeof xpathToken !== 'undefined') {
                return new XpathSelector(selectorText, xpathToken.value, debug);
            }

            tokens = tokens[0];
            const l = tokens.length;
            const lastRelTokenInd = this.getSplitPoint();
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
            for (; i < l; i++) {
                complex += tokens[i].value;
            }

            return lastRelTokenInd === -1
                ? new TraitLessSelector(selectorText, debug)
                : new SplittedSelector(selectorText, simple, relation, complex, debug);
        },
        /**
         * @private
         * @return {number|undefined} An index of a token that is split point.
         * returns undefined if the selector does not contain any complex tokens
         * or it is not eligible for splitting.
         * Otherwise returns an integer indicating the index of the last relation token.
         */
        getSplitPoint() {
            const tokens = this.tokens[0];
            // We split selector only when the last compound selector
            // is the only extended selector.
            let latestRelationTokenIndex = -1;
            let haveMetComplexToken = false;
            for (let i = 0, l = tokens.length; i < l; i++) {
                const token = tokens[i];
                if (isRelationToken(token)) {
                    if (haveMetComplexToken) {
                        return;
                    }
                    latestRelationTokenIndex = i;
                } else if (!isSimpleToken(token)) {
                    haveMetComplexToken = true;
                }
            }
            if (!haveMetComplexToken) { return; }
            return latestRelationTokenIndex;
        },
        /**
         * @private
         * @return {string|undefined} xpath pseudo token if exists
         * returns undefined if the selector does not contain xpath tokens
         */
        getXpathToken() {
            const tokens = this.tokens[0];
            for (let i = 0, l = tokens.length; i < l; i++) {
                const token = tokens[i];
                if (token.type === 'PSEUDO') {
                    if (token.value && token.value.indexOf(':xpath(') > -1) {
                        return token;
                    }
                }
            }
        },
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
        querySelectorAll() {
            return document.querySelectorAll(this.selectorText);
        },
        matches(element) {
            return element[utils.matchesPropertyName](this.selectorText);
        },
        isDebugging,
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
        querySelectorAll() {
            return Sizzle(this.selectorText);
        },
        /** @final */
        matches(element) {
            return Sizzle.matchesSelector(element, this.selectorText);
        },
        /** @final */
        isDebugging,
    };

    /**
     * Xpath selector class
     * Limited to support xpath to be only the last one token in selector
     *
     * @param {string} selectorText
     * @param {string} xpath value
     * @param {boolean=}debug
     * @constructor
     */
    function XpathSelector(selectorText, xpath, debug) {
        // Xpath is limited to be the last one token
        this.selectorText = selectorText.substring(0, selectorText.indexOf(xpath));
        this.xpath = xpath.substring(':xpath('.length, xpath.length - 1);
        this.debug = debug;
        Sizzle.compile(this.selectorText);
    }

    XpathSelector.prototype = {
        querySelectorAll() {
            const resultNodes = [];
            let simpleNodes;
            if (this.selectorText) {
                simpleNodes = Sizzle(this.selectorText);
                if (!simpleNodes || !simpleNodes.length) {
                    return resultNodes;
                }
            } else {
                simpleNodes = [document];
            }

            for (const node of simpleNodes) {
                this.xpathSearch(node, this.xpath, resultNodes);
            }

            return Sizzle.uniqueSort(resultNodes);
        },
        /** @final */
        matches(element) {
            const results = this.querySelectorAll();
            return results.indexOf(element) > -1;
        },
        /** @final */
        isDebugging,
        /**
         * Applies xpath to provided context node
         *
         * @param {Object} node context element
         * @param {string} xpath
         * @param {Array} result
         */
        xpathSearch(node, xpath, result) {
            const xpathResult = document.evaluate(xpath, node, null,
                XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
            let iNode;
            // eslint-disable-next-line no-cond-assign
            while (iNode = xpathResult.iterateNext()) {
                result.push(iNode);
            }
        },
    };

    /**
     * A splitted extended selector class.
     *
     * #container #feedItem:has(.ads)
     * +--------+                     simple
     *           +                    relation
     *            +-----------------+ complex
     * We split selector only when the last selector is complex
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
        const resultNodes = [];
        let simpleNodes;

        const { simple } = this;
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
            relation = ' ';
        }

        switch (relation) {
            case ' ':
                for (const node of simpleNodes) {
                    this.relativeSearch(node, resultNodes);
                }
                break;
            case '>': {
                for (const node of simpleNodes) {
                    for (const childNode of node.children) {
                        if (this.matches(childNode)) {
                            resultNodes.push(childNode);
                        }
                    }
                }
                break;
            }
            case '+': {
                for (const node of simpleNodes) {
                    const { parentNode } = node;
                    if (!parentNode) { continue; }
                    for (const childNode of parentNode.children) {
                        if (this.matches(childNode) && childNode.previousElementSibling === node) {
                            resultNodes.push(childNode);
                        }
                    }
                }
                break;
            }
            case '~': {
                for (const node of simpleNodes) {
                    const { parentNode } = node;
                    if (!parentNode) { continue; }
                    for (const childNode of parentNode.children) {
                        if (this.matches(childNode) && node.compareDocumentPosition(childNode) === 4) {
                            resultNodes.push(childNode);
                        }
                    }
                }
                break;
            }
            default:
                break;
        }

        return Sizzle.uniqueSort(resultNodes);
    };

    /**
     * Performs a search of "complex" part relative to results for the "simple" part.
     * @param {Node} node a node matching the "simple" part.
     * @param {Node[]} result an array to append search result.
     */
    SplittedSelector.prototype.relativeSearch = function (node, results) {
        Sizzle(this.complex, node, results);
    };

    return {
        /**
         * Wraps the inner class so that the instance is not exposed.
         */
        createSelector(selector, tokens, debug) {
            return new ExtendedSelectorParser(selector, tokens, debug).createSelector();
        },
        /**
         * Mark every selector as a selector being debugged, so that timing information
         * for the selector is printed to the console.
         */
        enableGlobalDebugging() {
            globalDebuggingFlag = true;
        },
    };
})();

export default ExtendedSelectorFactory;
