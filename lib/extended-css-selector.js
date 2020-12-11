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
import AttributesMatcher from './attributes-matcher';
import ElementPropertyMatcher from './element-property-matcher';
import IsAnyMatcher from './is-any-matcher';

/**
 * Extended selector factory module, for creating extended selector classes.
 *
 * Extended selection capabilities description:
 * https://github.com/AdguardTeam/ExtendedCss/blob/master/README.md
 */

const ExtendedSelectorFactory = (function () {
    // while adding new markers, constants in other AdGuard repos should be corrected
    // AdGuard browser extension : CssFilterRule.SUPPORTED_PSEUDO_CLASSES and CssFilterRule.EXTENDED_CSS_MARKERS
    // tsurlfilter, SafariConverterLib : EXT_CSS_PSEUDO_INDICATORS
    const PSEUDO_EXTENSIONS_MARKERS = [':has', ':contains', ':has-text', ':matches-css',
        ':-abp-has', ':-abp-has-text', ':if', ':if-not', ':xpath', ':nth-ancestor', ':upward',
        ':remove', ':matches-attr', ':matches-property', ':-abp-contains', ':is'];
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

        // Add :matches-attr() support
        AttributesMatcher.extendSizzle(Sizzle);

        // Add :matches-property() support
        ElementPropertyMatcher.extendSizzle(Sizzle);

        // Add :is() support
        IsAnyMatcher.extendSizzle(Sizzle);

        // Add :contains, :has-text, :-abp-contains support
        const containsPseudo = Sizzle.selectors.createPseudo((text) => {
            if (/^\s*\/.*\/[gmisuy]*\s*$/.test(text)) {
                text = text.trim();
                const flagsIndex = text.lastIndexOf('/');
                const flags = text.substring(flagsIndex + 1);
                text = text.substr(0, flagsIndex + 1).slice(1, -1).replace(/\\([\\"])/g, '$1');
                let regex;
                try {
                    regex = new RegExp(text, flags);
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

        registerParserOnlyTokens();
    }

    /**
     * Registrate custom tokens for parser.
     * Needed for proper work of pseudos:
     * for checking if the token is last and pseudo-class arguments validation
     */
    function registerParserOnlyTokens() {
        Sizzle.selectors.pseudos['xpath'] = Sizzle.selectors.createPseudo((selector) => {
            try {
                document.createExpression(selector, null);
            } catch (e) {
                throw new Error(`Invalid argument of :xpath pseudo class: ${selector}`);
            }
            return () => true;
        });
        Sizzle.selectors.pseudos['nth-ancestor'] = Sizzle.selectors.createPseudo((selector) => {
            const deep = Number(selector);
            if (Number.isNaN(deep) || deep < 1 || deep >= 256) {
                throw new Error(`Invalid argument of :nth-ancestor pseudo class: ${selector}`);
            }
            return () => true;
        });
        Sizzle.selectors.pseudos['upward'] = Sizzle.selectors.createPseudo((input) => {
            if (input === '') {
                throw new Error(`Invalid argument of :upward pseudo class: ${input}`);
            } else if (Number.isInteger(+input) && (+input < 1 || +input >= 256)) {
                throw new Error(`Invalid argument of :upward pseudo class: ${input}`);
            }
            return () => true;
        });
        Sizzle.selectors.pseudos['remove'] = Sizzle.selectors.createPseudo((input) => {
            if (input !== '') {
                throw new Error(`Invalid argument of :remove pseudo class: ${input}`);
            }
            return () => true;
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

            const xpathPart = this.getXpathPart();
            if (typeof xpathPart !== 'undefined') {
                return new XpathSelector(selectorText, xpathPart, debug);
            }

            const upwardPart = this.getUpwardPart();
            if (typeof upwardPart !== 'undefined') {
                let output;
                const upwardDeep = parseInt(upwardPart, 10);
                // if upward parameter is not a number, we consider it as a selector
                if (Number.isNaN(upwardDeep)) {
                    output = new UpwardSelector(selectorText, upwardPart, debug);
                } else {
                    // upward works like nth-ancestor
                    const xpath = this.convertNthAncestorToken(upwardDeep);
                    output = new XpathSelector(selectorText, xpath, debug);
                }
                return output;
            }

            // argument of pseudo-class remove;
            // it's defined only if remove is parsed as last token
            // and it's valid only if remove arg is empty string
            const removePart = this.getRemovePart();
            if (typeof removePart !== 'undefined') {
                const hasValidRemovePart = removePart === '';
                return new RemoveSelector(selectorText, hasValidRemovePart, debug);
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
         * @return {string|undefined} xpath selector part if exists
         * returns undefined if the selector does not contain xpath tokens
         */
        getXpathPart() {
            const tokens = this.tokens[0];
            for (let i = 0, tokensLength = tokens.length; i < tokensLength; i++) {
                const token = tokens[i];
                if (token.type === 'PSEUDO') {
                    const { matches } = token;
                    if (matches && matches.length > 1) {
                        if (matches[0] === 'xpath') {
                            if (this.isLastToken(tokens, i)) {
                                throw new Error('Invalid pseudo: \':xpath\' should be at the end of the selector');
                            }
                            return matches[1];
                        }
                        if (matches[0] === 'nth-ancestor') {
                            if (this.isLastToken(tokens, i)) {
                                throw new Error('Invalid pseudo: \':nth-ancestor\' should be at the end of the selector');
                            }
                            const deep = matches[1];
                            if (deep > 0 && deep < 256) {
                                return this.convertNthAncestorToken(deep);
                            }
                        }
                    }
                }
            }
        },
        /**
         * converts nth-ancestor/upward deep value to xpath equivalent
         * @param {number} deep
         * @return {string}
         */
        convertNthAncestorToken(deep) {
            let result = '..';
            while (deep > 1) {
                result += '/..';
                deep--;
            }
            return result;
        },
        /**
         * Checks if the token is last,
         * except of remove pseudo-class
         * @param {Array} tokens
         * @param {number} i index of token
         * @returns {boolean}
         */
        isLastToken(tokens, i) {
            // check id the next parsed token is remove pseudo
            const isNextRemoveToken = tokens[i + 1]
                && tokens[i + 1].type === 'PSEUDO'
                && tokens[i + 1].matches
                && tokens[i + 1].matches[0] === 'remove';

            // check if the token is last
            // and if it is not check if it is remove one
            // which should be skipped
            return i + 1 !== tokens.length && !isNextRemoveToken;
        },
        /**
         * @private
         * @return {string|undefined} upward parameter
         * or undefined if the input does not contain upward tokens
         */
        getUpwardPart() {
            const tokens = this.tokens[0];
            for (let i = 0, tokensLength = tokens.length; i < tokensLength; i++) {
                const token = tokens[i];
                if (token.type === 'PSEUDO') {
                    const { matches } = token;
                    if (matches && matches.length > 1) {
                        if (matches[0] === 'upward') {
                            if (this.isLastToken(tokens, i)) {
                                throw new Error('Invalid pseudo: \':upward\' should be at the end of the selector');
                            }
                            return matches[1];
                        }
                    }
                }
            }
        },
        /**
         * @private
         * @return {string|undefined} remove parameter
         * or undefined if the input does not contain remove tokens
         */
        getRemovePart() {
            const tokens = this.tokens[0];
            for (let i = 0, tokensLength = tokens.length; i < tokensLength; i++) {
                const token = tokens[i];
                if (token.type === 'PSEUDO') {
                    const { matches } = token;
                    if (matches && matches.length > 1) {
                        if (matches[0] === 'remove') {
                            if (i + 1 !== tokensLength) {
                                throw new Error('Invalid pseudo: \':remove\' should be at the end of the selector');
                            }
                            return matches[1];
                        }
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
     * Parental class for such pseudo-classes as xpath, upward, remove
     * which are limited to be the last one token in selector
     *
     * @param {string} selectorText
     * @param {string} pseudoClassArg pseudo-class arg
     * @param {boolean=} debug
     * @constructor
     */
    function BaseLastArgumentSelector(selectorText, pseudoClassArg, debug) {
        this.selectorText = selectorText;
        this.pseudoClassArg = pseudoClassArg;
        this.debug = debug;
        Sizzle.compile(this.selectorText);
    }

    BaseLastArgumentSelector.prototype = {
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

            simpleNodes.forEach((node) => {
                this.searchResultNodes(node, this.pseudoClassArg, resultNodes);
            });

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
         * Primitive method that returns all nodes if pseudo-class arg is defined.
         * That logic works for remove pseudo-class,
         * but for others it should be overridden.
         * @param {Object} node context element
         * @param {string} pseudoClassArg pseudo-class argument
         * @param {Array} result
         */
        searchResultNodes(node, pseudoClassArg, result) {
            if (pseudoClassArg) {
                result.push(node);
            }
        },
    };

    /**
     * Xpath selector class
     * Limited to support 'xpath' to be only the last one token in selector
     * @param {string} selectorText
     * @param {string} xpath value
     * @param {boolean=} debug
     * @constructor
     * @augments BaseLastArgumentSelector
     */
    function XpathSelector(selectorText, xpath, debug) {
        const NO_SELECTOR_MARKER = ':xpath(//';
        const BODY_SELECTOR_REPLACER = 'body:xpath(//';

        let modifiedSelectorText = selectorText;
        // Normally, a pseudo-class is applied to nodes selected by a selector -- selector:xpath(...).
        // However, :xpath is special as the selector can be ommited.
        // For any other pseudo-class that would mean "apply to ALL DOM nodes",
        // but in case of :xpath it just means "apply me to the document".
        if (utils.startsWith(selectorText, NO_SELECTOR_MARKER)) {
            modifiedSelectorText = selectorText.replace(NO_SELECTOR_MARKER, BODY_SELECTOR_REPLACER);
        }
        BaseLastArgumentSelector.call(this, modifiedSelectorText, xpath, debug);
    }
    XpathSelector.prototype = Object.create(BaseLastArgumentSelector.prototype);
    XpathSelector.prototype.constructor = XpathSelector;
    /**
     * Applies xpath pseudo-class to provided context node
     * @param {Object} node context element
     * @param {string} pseudoClassArg xpath
     * @param {Array} result
     * @override
     */
    XpathSelector.prototype.searchResultNodes = function (node, pseudoClassArg, result) {
        const xpathResult = document.evaluate(pseudoClassArg, node, null,
            XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        let iNode;
        // eslint-disable-next-line no-cond-assign
        while (iNode = xpathResult.iterateNext()) {
            result.push(iNode);
        }
    };

    /**
     * Upward selector class
     * Limited to support 'upward' to be only the last one token in selector
     * @param {string} selectorText
     * @param {string} upwardSelector value
     * @param {boolean=} debug
     * @constructor
     * @augments BaseLastArgumentSelector
     */
    function UpwardSelector(selectorText, upwardSelector, debug) {
        BaseLastArgumentSelector.call(this, selectorText, upwardSelector, debug);
    }
    UpwardSelector.prototype = Object.create(BaseLastArgumentSelector.prototype);
    UpwardSelector.prototype.constructor = UpwardSelector;
    /**
     * Applies upward pseudo-class to provided context node
     * @param {Object} node context element
     * @param {string} upwardSelector upward selector
     * @param {Array} result
     * @override
     */
    UpwardSelector.prototype.searchResultNodes = function (node, upwardSelector, result) {
        if (upwardSelector !== '') {
            const parent = node.parentElement;
            if (parent === null) {
                return;
            }
            node = parent.closest(upwardSelector);
            if (node === null) {
                return;
            }
        }
        result.push(node);
    };

    /**
     * Remove selector class
     * Limited to support 'remove' to be only the last one token in selector
     * @param {string} selectorText
     * @param {boolean} hasValidRemovePart
     * @param {boolean=} debug
     * @constructor
     * @augments BaseLastArgumentSelector
     */
    function RemoveSelector(selectorText, hasValidRemovePart, debug) {
        const REMOVE_PSEUDO_MARKER = ':remove()';
        const removeMarkerIndex = selectorText.indexOf(REMOVE_PSEUDO_MARKER);
        // deleting remove part of rule instead of which
        // pseudo-property property 'remove' will be added by ExtendedCssParser
        const modifiedSelectorText = selectorText.slice(0, removeMarkerIndex);
        BaseLastArgumentSelector.call(this, modifiedSelectorText, hasValidRemovePart, debug);
        // mark extendedSelector as Remove one for ExtendedCssParser
        this.isRemoveSelector = true;
    }
    RemoveSelector.prototype = Object.create(BaseLastArgumentSelector.prototype);
    RemoveSelector.prototype.constructor = RemoveSelector;

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
            ({ relation } = this);
        } else {
            simpleNodes = [document];
            relation = ' ';
        }

        switch (relation) {
            case ' ':
                simpleNodes.forEach((node) => {
                    this.relativeSearch(node, resultNodes);
                });
                break;
            case '>': {
                simpleNodes.forEach((node) => {
                    Object.values(node.children).forEach((childNode) => {
                        if (this.matches(childNode)) {
                            resultNodes.push(childNode);
                        }
                    });
                });

                break;
            }
            case '+': {
                simpleNodes.forEach((node) => {
                    const { parentNode } = node;
                    Object.values(parentNode.children).forEach((childNode) => {
                        if (this.matches(childNode) && childNode.previousElementSibling === node) {
                            resultNodes.push(childNode);
                        }
                    });
                });
                break;
            }
            case '~': {
                simpleNodes.forEach((node) => {
                    const { parentNode } = node;
                    Object.values(parentNode.children).forEach((childNode) => {
                        if (this.matches(childNode) && node.compareDocumentPosition(childNode) === 4) {
                            resultNodes.push(childNode);
                        }
                    });
                });
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
