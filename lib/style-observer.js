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

/* global utils, CSSRule */

/**
 * `:properties(propertyFilter)` pseudo class support works by looking up
 * selectors that are applied to styles whose style declaration matches
 * arguments passed to the pseudo class.
 * `sheetToFilterSelectorMap` contains a data mapping (stylesheets, filter)
 * -> selector.
 */
const StyleObserver = (function () { // jshint ignore:line

    // Utility functions
    const styleSelector = 'style';

    /**
     * A set of stylesheet nodes that should be ignored by the StyleObserver.
     * This field is essential in the case of AdGuard products that add regular stylesheets
     * in order to apply CSS rules
     *
     * @type {Set.<HTMLElement>}
     */
    let ignoredStyleNodes;

    /**
     * The flag is used for the StyleObserver lazy initialization
     */
    let initialized = false;

    const searchTree = function (node, selector) {
        if (node.nodeType !== Node.ELEMENT_NODE) { return; }
        let nodes = node.querySelectorAll(selector);
        if (node[utils.matchesPropertyName](selector)) {
            nodes = Array.prototype.slice.call(nodes);
            nodes.push(node);
        }
        return nodes;
    };

    const isSameOriginStyle = function (styleSheet) {
        let href = styleSheet.href;
        if (href === null) { return true; }
        return utils.isSameOrigin(href, location, document.domain);
    };

    /**
     * 'rel' attribute is a ASCII-whitespace separated list of keywords.
     * {@link https://html.spec.whatwg.org/multipage/links.html#linkTypes}
     */
    const reStylesheetRel = /(?:^|\s)stylesheet(?:$|\s)/;

    const eventTargetIsLinkStylesheet = function (target) {
        return target instanceof Element && target.nodeName === 'LINK' && reStylesheetRel.test(target.rel);
    };

    // Functions constituting mutation handler functions
    const onStyleAdd = function (style) {
        if (!sheetToFilterSelectorMap.has(style.sheet)) {
            pendingStyles.add(style);
            observeStyleModification(style);
        }
    };
    const onStyleRemove = function (style) {
        pendingStyles.delete(style);
    };
    const onAddedNode = function (addedNode) {
        if (addedNode.nodeType !== Node.ELEMENT_NODE) { return; }
        let styles = searchTree(addedNode, styleSelector);
        if (styles) {
            for (let style of styles) {
                onStyleAdd(style);
            }
        }
    };
    const onRemovedNode = function (removedNode) {
        if (removedNode.nodeType !== Node.ELEMENT_NODE) { return; }
        let styles = searchTree(removedNode, styleSelector);
        if (styles) {
            for (let style of styles) {
                onStyleRemove(style);
            }
        }
    };

    // Mutation handler functions
    const styleModHandler = function (mutations) {
        if (mutations.length) {
            for (let mutation of mutations) {
                let target;
                if (mutation.type === 'characterData') {
                    target = mutation.target.parentNode;
                } else {
                    target = mutation.target;
                }
                pendingStyles.add(target);
            }
            examineStylesScheduler.run();
            invalidateScheduler.run();
        }
    };
    const styleModListenerFallback = function (event) {
        pendingStyles.add(event.target.parentNode);
        examineStylesScheduler.run();
        invalidateScheduler.run();
    };
    const styleAdditionHandler = function (mutations) {
        let hasPendingStyles = false;
        for (let mutation of mutations) {
            let addedNodes = mutation.addedNodes,
                removedNodes = mutation.removedNodes;
            if (addedNodes) {
                for (let addedNode of addedNodes) {
                    hasPendingStyles = true;
                    onAddedNode(addedNode);
                }
            }
            if (removedNodes) {
                for (let removedNode of removedNodes) {
                    onRemovedNode(removedNode);
                }
            }
        }
        if (hasPendingStyles) {
            examineStylesScheduler.run();
            invalidateScheduler.run();
        }
    };
    const styleAdditionListenerFallback = function (event) {
        onAddedNode(event.target);
        examineStylesScheduler.run();
        invalidateScheduler.run();
    };
    const styleRemovalListenerFallback = function (event) {
        onRemovedNode(event.target);
        examineStylesScheduler.run();
        invalidateScheduler.run();
    };

    const collectLoadedLinkStyle = function (evt) {
        let target = evt.target;
        if (!eventTargetIsLinkStylesheet(target)) { return; }
        pendingStyles.add(target);
        examineStylesScheduler.run();
    };
    const discardErroredLinkStyle = function (evt) {
        let target = evt.target;
        if (!eventTargetIsLinkStylesheet(target)) { return; }
        pendingStyles.remove(target);
        examineStylesScheduler.run();
    };

    // MutationObserver instances to be used in this class.
    // Since we start calling `.observe()` on those when we are compiling filters,
    // we can ensure that mutation callbacks for those will be called before those
    // in extended-css.js.
    let styleAdditionObserver;
    let styleModObserver;
    let observing = false;

    const observeStyle = function () {
        if (observing) { return; }
        observing = true;
        if (utils.MutationObserver) {
            styleAdditionObserver = new utils.MutationObserver(styleAdditionHandler);
            styleModObserver = new utils.MutationObserver(styleModHandler);
            styleAdditionObserver.observe(document.documentElement, { childList: true, subtree: true });
        } else {
            document.documentElement.addEventListener('DOMNodeInserted', styleAdditionListenerFallback);
            document.documentElement.addEventListener('DOMNodeRemoved', styleRemovalListenerFallback);
        }
        document.addEventListener('load', collectLoadedLinkStyle, true);
        document.addEventListener('error', discardErroredLinkStyle, true);
    };

    const observeStyleModification = function (styleNode) {
        if (utils.MutationObserver) {
            styleModObserver.observe(styleNode, { childList: true, subtree: true, characterData: true });
        } else {
            styleNode.addEventListener('DOMNodeInserted', styleModListenerFallback);
            styleNode.addEventListener('DOMNodeRemoved', styleModListenerFallback);
            styleNode.addEventListener('DOMCharacterDataModified', styleModListenerFallback);
        }
    };

    /**
     * Disconnects above mutation observers: styleAdditionObserver styleModObserver
     * and remove event listeners.
     */
    const disconnectObservers = function () {
        if (utils.MutationObserver) {
            if (styleAdditionObserver) {
                styleAdditionObserver.disconnect();
            }
            if (styleModObserver) {
                styleModObserver.disconnect();
            }
        } else {
            document.documentElement.removeEventListener('DOMNodeInserted', styleAdditionListenerFallback);
            document.documentElement.removeEventListener('DOMNodeRemoved', styleRemovalListenerFallback);

            let styles = document.querySelectorAll(styleSelector);
            for (let style of styles) {
                style.removeEventListener('DOMNodeInserted', styleModListenerFallback);
                style.removeEventListener('DOMNodeRemoved', styleModListenerFallback);
                style.removeEventListener('DOMCharacterDataModified', styleModListenerFallback);
            }
        }
        document.removeEventListener('load', collectLoadedLinkStyle);
        document.removeEventListener('error', discardErroredLinkStyle);
        observing = false;
    };

    /**
     * @type {Set<HTMLStyleElement|HTMLLinkElement>}
     */
    let pendingStyles = new utils.Set();

    /**
     * sheetToFilterSelectorMap contains a data that maps
     * styleSheet -> ( filter -> selectors ).
     * @type {WeakMap<CSSStyleSheet,Object<string,string>>}
     */
    let sheetToFilterSelectorMap;

    let anyStyleWasUpdated; // A boolean flag to be accessed in `examineStyles`
    // and `readStyleSheetContent` calls.
    const examinePendingStyles = function () {
        anyStyleWasUpdated = false;
        pendingStyles.forEach(readStyleNodeContent);
        // Invalidates cache if needed.
        if (anyStyleWasUpdated) {
            invalidateScheduler.runImmediately();
        }
        pendingStyles.clear();
    };

    let examineStylesScheduler = new utils.AsyncWrapper(examinePendingStyles);

    /** @param {HTMLStyleElement} styleNode */
    const readStyleNodeContent = function (styleNode) {
        let sheet = styleNode.sheet;
        if (!sheet) {
            // This can happen when an appended style or a loaded linked stylesheet is
            // detached from the document by now.
            return;
        }
        readStyleSheetContent(sheet);
    };
    /**
     * Populates sheetToFilterSelectorMap from styleSheet's content.
     * @param {CSSStyleSheet} styleSheet
     */
    const readStyleSheetContent = function (styleSheet) {
        if (!isSameOriginStyle(styleSheet)) {
            return;
        }
        if (isIgnored(styleSheet.ownerNode)) {
            return;
        }
        let rules = styleSheet.cssRules;
        let map = Object.create(null);
        for (let rule of rules) {
            if (rule.type !== CSSRule.STYLE_RULE) {
                /**
                 * Ignore media rules; this behavior is compatible with ABP.
                 * @todo Media query support
                 */
                continue;
            }
            let stringifiedStyle = stringifyStyle(rule);

            for (let parsedFilter of parsedFilters) {
                let re = parsedFilter.re;

                if (!re.test(stringifiedStyle)) { continue; }

                anyStyleWasUpdated = true;
                // Strips out psedo elements
                // https://adblockplus.org/en/filters#elemhide-emulation
                let selectorText = rule.selectorText.replace(/::(?:after|before)/, '');
                let filter = parsedFilter.filter;

                if (typeof map[filter] === 'undefined') {
                    map[filter] = [selectorText];
                } else {
                    map[filter].push(selectorText);
                }
            }
        }
        sheetToFilterSelectorMap.set(styleSheet, map);
    };

    /**
     * Stringifies a CSSRule instances in a canonical way, compatible with ABP,
     * to be used in matching against regexes.
     * @param {CSSStyleRule} rule
     * @return {string}
     */
    const stringifyStyle = function (rule) {
        let styles = [];
        let style = rule.style;
        let i, l;
        for (i = 0, l = style.length; i < l; i++) {
            styles.push(style[i]);
        }
        styles.sort();
        for (i = 0; i < l; i++) {
            let property = styles[i];
            let value = style.getPropertyValue(property);
            let priority = style.getPropertyPriority(property);
            styles[i] += ': ' + value;
            if (priority.length) {
                styles[i] += '!' + priority;
            }
        }
        return styles.join(" ");
    };

    /**
     * A main function, to be used in Sizzle matcher.
     * returns a selector text that is
     * @param {string} filter
     * @return {Array<string>} a selector.
     */
    const getSelector = function (filter) {

        // Lazy-initialize the StyleObserver
        initialize();

        // getSelector will be triggered via mutation observer callbacks
        // and we assume that those are already throttled.
        examineStylesScheduler.runImmediately();
        invalidateScheduler.runImmediately();
        invalidateScheduler.runAsap();

        if (getSelectorCache[filter]) {
            return getSelectorCache[filter];
        }
        let styleSheets = document.styleSheets;
        let selectors = [];

        for (let styleSheet of styleSheets) {
            if (styleSheet.disabled) { continue; } // Ignore disabled stylesheets.
            let map = sheetToFilterSelectorMap.get(styleSheet);
            if (typeof map === 'undefined') {
                // This can happen with cross-origin styles.
                continue;
            }
            Array.prototype.push.apply(selectors, map[filter]);
        }
        getSelectorCache[filter] = selectors;
        getSelectorCacheHasData = true;
        return selectors;
    };

    /**
     * Caching is based on following assumptions:
     *
     *  - Content of stylesheets does not change often.
     *  - Stylesheets' disabled state does not change often.
     *
     * For each fresh `getSelector` call, one has to iterate over document.styleSheets,
     * because one has to exclude disabled stylesheets.
     * getSelector will be called a lot in MutationObserver callbacks, and we assume that
     * stylesheets critical in `:properties` pseudo class are toggled on and off during it.
     * We use AsyncWrapper.runAsap to schedule cache invalidation in the most imminent
     * microtask queue.
     *
     * This requires thorough testing of StyleObserver for mutation-heavy environments.
     * This has a possibility of less granular cache refresh on IE, for IE11 incorrectly
     * implements microtasks and IE10's setImmediate is not that immediate.
     */
    let getSelectorCache = Object.create(null);
    let getSelectorCacheHasData = false;
    const invalidateCache = function () {
        if (getSelectorCacheHasData) {
            getSelectorCache = Object.create(null);
            getSelectorCacheHasData = false;
        }

    };
    const invalidateScheduler = new utils.AsyncWrapper(invalidateCache, 0);

    const reRegexRule = /^\/(.*)\/$/;

    let parsedFilters = [];
    let registeredFiltersMap = Object.create(null);

    const registerStylePropertyFilter = function (filter) {
        filter = filter.trim();
        if (registeredFiltersMap[filter]) { return; }
        let re;
        if (reRegexRule.test(filter)) {
            filter = filter.slice(1, -1);
            re = utils.pseudoArgToRegex(filter);
        } else {
            re = utils.createURLRegex(filter);
        }
        parsedFilters.push({
            filter: filter,
            re: re
        });
        registeredFiltersMap[filter] = true;

        /**
         * Mark StyleObserver as not initialized right after
         * the new property filter is registered
         */
        initialized = false;

        // It is also necessary to invalidate getSelectorCache right away
        invalidateCache();
    };

    /**
     * Initialization means:
     *
     *  - Initial processing of stylesheets in documents.
     *  - Starting to observe addition of styles.
     *
     * This function should be called only after all selectors are compiled.
     * @return {boolean} Whether it had to be initialized. If it returns false,
     * We can clear StyleObserver from the memory.
     */
    const initialize = function () {
        if (initialized) {
            return;
        }
        initialized = true;

        // If there is no `:properties` selector registered, indicates it
        // by returning false.
        if (parsedFilters.length === 0) {
            return false;
        }

        sheetToFilterSelectorMap = new utils.WeakMap();
        pendingStyles = new utils.Set();

        // Initial processing
        observeStyle();
        let sheets = document.styleSheets;
        for (let sheet of sheets) {
            readStyleSheetContent(sheet);
            if (sheet.ownerNode.nodeName === 'STYLE' && !isIgnored(sheet.ownerNode)) {
                observeStyleModification(sheet.ownerNode);
            }
        }

        return true;
    };

    /**
     * Exported method to disconnect existing mutation observers and remove
     * event listeners, clear collections and caches.
     */
    const clear = function () {
        if (!initialized) { return; }
        initialized = false;
        invalidateCache();
        disconnectObservers();
        if (pendingStyles) {
            pendingStyles.clear();
        }
        sheetToFilterSelectorMap = pendingStyles = ignoredStyleNodes = null;
    };

    /**
     * Creates a new pseudo-class and registers it in Sizzle
     */
    const extendSizzle = function (Sizzle) {
        Sizzle.selectors.pseudos["properties"] = Sizzle.selectors.pseudos["-abp-properties"] = Sizzle.selectors.createPseudo(function (propertyFilter) {
            registerStylePropertyFilter(propertyFilter);
            return function (element) {
                let selectors = getSelector(propertyFilter);
                if (selectors.length === 0) { return false; }
                for (let selector of selectors) {
                    if (element[utils.matchesPropertyName](selector)) {
                        return true;
                    }
                }
                return false;
            };
        });
    };

    /**
     * Checks if stylesheet node is in the list of ignored
     * @param {HTMLElement} styleNode Stylesheet owner node
     */
    const isIgnored = function (styleNode) {
        return ignoredStyleNodes && ignoredStyleNodes.has(styleNode);
    };

    /**
     * Sets a list of stylesheet nodes that must be ignored by the StyleObserver.
     *
     * @param {Array.<HTMLElement>} styleNodesToIgnore A list of stylesheet nodes. Can be empty or null.
     */
    const setIgnoredStyleNodes = function (styleNodesToIgnore) {

        // StyleObserver should be fully reinitialized after that
        if (initialized || observing) {
            clear();
        }

        if (styleNodesToIgnore) {
            ignoredStyleNodes = new utils.Set(styleNodesToIgnore);
        } else {
            ignoredStyleNodes = null;
        }
    };

    return {
        clear: clear,
        extendSizzle: extendSizzle,
        getSelector: getSelector,
        setIgnoredStyleNodes: setIgnoredStyleNodes
    };
})();
