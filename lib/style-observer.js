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

/* global  utils */

 /**
  * `:properties(propertyFilter)` pseudo class support works by looking up
  * selectors that are applied to styles whose style declaration matches
  * arguments passed to the pseudo class.
  * `sheetToFilterSelectorMap` contains a data mapping (stylesheets, filter)
  * -> selector.
  */
var StyleObserver = (function() {

    // Utility functions
    var styleSelector = 'style';
    var linkSelector = 'link[rel=stylesheet]';

    var searchTree = function (node, selector) {
        if (node.nodeType !== Node.ELEMENT_NODE) { return; }
        var nodes =  node.querySelectorAll(selector);
        if (node[utils.matchesPropertyName](selector)) {
            nodes = Array.prototype.slice.call(nodes);
            nodes.push(node);
        }
        return nodes;
    };

    var isSameOriginStyle = function (styleSheet) {
        var href = styleSheet.href;
        if (href === null) { return true; }
        return utils.isSameOrigin(href, location, document.domain);
    };

    // Functions constituting mutation handler functions
    var onStyleAdd = function (style) {
        if (!sheetToFilterSelectorMap.has(style.sheet)) {
            pendingStyles.add(style);
            observeStyleModification(style);
        }
    };
    var onStyleRemove = function (style) {
        pendingStyles.delete(style);
    };
    var onLinkStyleAdd = function (link) {
        if (link.sheet !== null) {
            pendingStyles.add(link);
        } else {
            link.addEventListener('load', onLinkStyleLoad);
        }
    };
    var onLinkStyleRemove = function (link) {
        pendingStyles.delete(link);
        link.removeEventListener('load', onLinkStyleLoad);
    };
    var onLinkStyleLoad = function () {
        pendingStyles.add(this);
        examineStylesScheduler.run();
    };

    var onAddedNode = function (addedNode) {
        if (addedNode.nodeType !== Node.ELEMENT_NODE) { return; }
        var styles = searchTree(addedNode, styleSelector);
        if (styles) {
            for (var style of styles) {
                onStyleAdd(style);
                hasPendingStyles = true;
            }
        }
        var links = searchTree(addedNode, linkSelector);
        if (links) {
            for (var link of links) {
                onLinkStyleAdd(link);
                hasPendingStyles = true;
            }
        }
    };
    var onRemovedNode = function (removedNode) {
        if (removedNode.nodeType !== Node.ELEMENT_NODE) { return; }
        var styles = searchTree(removedNode, styleSelector);
        if (styles) {
            for (var style of styles) {
                onStyleRemove(style);
            }
        }
        var links = searchTree(removedNode, linkSelector);
        if (links) {
            for (var link of links) {
                onLinkStyleRemove(link);
            }
        }
    };

    // Mutation handler functions
    var styleModHandler = function(mutations) {
        if (mutations.length) {
            var mutation = mutations[0];
            var target;
            if (mutation.type === 'characterData') {
                target = mutation.target.parentNode;
            } else {
                target = mutation.target;
            }
            modifiedStyles.add(target);
        }
    };
    var styleModListenerFallback = function (event) {
        modifiedStyles.add(event.target.parentNode);
    };
    var styleAdditionHandler = function(mutations) {
        var hasPendingStyles = false;
        /** @todo convert for .. of loops to for loops */
        for (var mutation of mutations) {
            var addedNodes = mutation.addedNodes,
                removedNodes = mutation.removedNodes;
            if (addedNodes) {
                for (var addedNode of addedNodes) {
                    hasPendingStyles = true;
                    onAddedNode(addedNode);
                }
            }
            if (removedNodes) {
                for (var removedNode of removedNodes) {
                    onRemovedNode(removedNode);
                }
            }
        }
        if (hasPendingStyles) {
            examineStylesScheduler.run();
        }
    };
    var styleAdditionListenerFallback = function (event) {
        onAddedNode(event.target);
    }
    var styleRemovalListenerFallback = function (event) {
        onRemovedNode(event.target);
    };

    // MutationObserver instances to be used in this class.
    // Since we start calling `.observe()` on those when we are compiling filters,
    // we can ensure that mutation callbacks for those will be called before those
    // in extended-css.js.
    var styleAdditionObserver;
    var styleModObserver;
    var observing = false;
    var observeStyle = function () {
        if (observing) { return; }
        observing = true;
        if (utils.MutationObserver) {
            styleAdditionObserver = new utils.MutationObserver(styleAdditionHandler);
            styleModObserver = new utils.MutationObserver(styleModHandler);
            styleAdditionObserver.observe(document.documentElement, { childList: true, subtree: true });
        } else {
            document.documentElement.addEventListener('DOMNodeInserted', tyleAdditionListenerFallback);
            document.documentElement.addEventListener('DOMNodeRemoved', styleRemovalListenerFallback);
        }
    };
    var observeStyleModification = function(styleNode) {
        if (utils.MutationObserver) {
            styleModObserver.observe(styleNode, { childList: true, subtree: true, characterData: true });
        } else {
            styleNode.addEventListener('DOMCharacterDataModified', styleModListenerFallback);
        }
    };

    /**
     * Disconnects above mutation observers: styleAdditionObserver styleModObserver
     * and remove event listeners.
     */
    var disconnectObservers = function () {
        if (utils.MutationObserver) {
            styleAdditionObserver.disconnect();
            styleModObserver.disconnect();
        } else {
            document.documentElement.removeEventListener('DOMNodeInserted', tyleAdditionListenerFallback);
            document.documentElement.removeEventListener('DOMNodeRemoved', styleRemovalListenerFallback);
            Array.prototype.forEach.call(document.querySelectorAll(styleSelector), function (style) {
                style.removeEventListener('DOMCharacterDataModified', styleModListenerFallback);
            });
        }
        Array.prototype.forEach.call(document.querySelectorAll(linkSelector), function(link) {
            link.removeEventListener('load', onLinkStyleLoad);
        });
    }

    /**
     * @type {Set<HTMLStyleElement|HTMLLinkElement>}
     */
    var pendingStyles = new utils.Set();

    /**
     * sheetToFilterSelectorMap contains a data that maps
     * styleSheet -> ( filter -> selectors ).
     * @type {WeakMap<CSSStyleSheet,Object<string,string>>}
     */
    var sheetToFilterSelectorMap;

    var anyStyleWasUpdated; // A boolean flag to be accessed in `examineStyles`
                            // and `readStyleSheetContent` calls.
    var examinePendingStyles = function() {
        // console.log('StyleObserver: examiningPendingStyles');
        anyStyleWasUpdated = false;
        pendingStyles.forEach(readStyleNodeContent);
        // Invalidates cache if needed.
        if (anyStyleWasUpdated) {
            invalidateScheduler.runImmediately();
        }
        pendingStyles.clear();
    };

    var examineStylesScheduler = new utils.AsyncWrapper(examinePendingStyles);

    /** @param {HTMLStyleElement} styleNode */
    var readStyleNodeContent = function(styleNode) {
        readStyleSheetContent(styleNode.sheet);
    };
    /**
     * Populates sheetToFilterSelectorMap from styleSheet's content.
     * @param {CSSStyleSheet} styleSheet
     */
    var readStyleSheetContent = function (styleSheet) {
        if (!isSameOriginStyle(styleSheet)) { return; }
        if (ignoredSheets.has(styleSheet)) { return; }
        var rules = styleSheet.cssRules;
        var map = Object.create(null);
        for (var l = rules.length - 1; l >= 0; l--) {
            var rule = rules[l];
            if (rule.type !== CSSRule.STYLE_RULE) {
                /**
                 * Ignore media rules; this behavior is compatible with ABP.
                 * @todo Media query support
                 */
                continue;
            }
            var stringifiedStyle = stringifyStyle(rule);

            for (var j = parsedFilters.length - 1; j >= 0; j--) {
                var parsedFilter = parsedFilters[j];
                var re = parsedFilter.re;

                if (!re.test(stringifiedStyle)) { continue; }

                anyStyleWasUpdated = true;
                // Strips out psedo elements
                // https://adblockplus.org/en/filters#elemhide-emulation
                var selectorText = rule.selectorText.replace(/::(?:after|before)/,'');

                var filter = parsedFilter.filter;

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
    var stringifyStyle = function (rule) {
        var styles = [];
        var style = rule.style;
        var i, l;
        for (i = 0, l = style.length; i < l; i++) {
            styles.push(style[i]);
        }
        styles.sort();
        for (i = 0; i < l; i++) {
            var property = styles[i];
            var value = style.getPropertyValue(property);
            var priority = style.getPropertyPriority(property);
            styles[i] += ': ' + value;
            if (priority.length) {
                styles[i] += '!' + priority;
            }
        }
        return styles.join(" ");
    };

    /**
     * @type {Set<CSSStyleSheet>}
     */
    var ignoredSheets;

    /**
     * A main function, to be used in Sizzle matcher.
     * returns a selector text that is
     * @param {string} filter
     * @return {string} a selector.
     */
    var getSelector = function (filter) {
        // getSelector will be triggered via mutation observer callbacks
        // and we assume that those are already throttled.
        examineStylesScheduler.runImmediately();
        invalidateScheduler.runAsap();

        if (getSelectorCache[filter]) {
            // console.log('StyleObserver: cache hit');
            return getSelectorCache[filter];
        }
        // console.log('StyleObserver: cache miss');
        var styleSheets = document.styleSheets;
        var selectors = [];
        for (var l = styleSheets.length - 1; l >= 0; l--) {
            var styleSheet = styleSheets[l];
            if (styleSheet.disabled) { continue; }
            var map = sheetToFilterSelectorMap.get(styleSheet);
            if (typeof map === 'undefined') {
                // This can happen with cross-origin styles.
                continue;
            }
            Array.prototype.push.apply(selectors, map[filter]);
        }
        getSelectorCache[filter] = selectors;
        // console.log('StyleObserver: new set of selector for filter ' + filter + ': ' + selectors);
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
    var getSelectorCache = Object.create(null);
    var invalidateCache = function () {
        // console.log('StyleObserver: invalidating cache');
        getSelectorCache = Object.create(null);
    };
    var invalidateScheduler = new utils.AsyncWrapper(invalidateCache, 0);

    var reRegexRule = /^\/(.*)\/$/;

    var parsedFilters = [];
    var registeredFiltersMap = Object.create(null);

    var registerStylePropertyFilter = function (filter) {
        filter = filter.trim();
        if (registeredFiltersMap[filter]) { return; }
        var re;
        if (reRegexRule.test(filter)) {
            filter = filter.slice(1, -1);
            re = utils.pseudoArgToRegex(filter);
        } else {
            re = utils.createSimpleRegex(filter);
        }
        parsedFilters.push({
            filter: filter,
            re: re
        });
        registeredFiltersMap[filter] = true;
    };

    /**
     * Initialization means:
     *
     *  - Initial processing of stylesheets in documents.
     *  - Starting to observe addition of styles.
     *
     * This function _must_ be called after all selectors are compiled.
     * This is to avoid re-parsing stylesheets whenever a new propertyFilter
     * is registered.
     * @return {boolean} Whether it had to be initialized. If it returns false,
     * We can clear StyleObserver from the memory.
     */
    var initialize = function (sheetsToIgnore) {
        if (initialized) {
            throw new Error('StyleObserver has already been initialized');
        }
        initialized = true;
        // If there is no `:properties` selector registered, indicates it
        // by returning false.
        if (parsedFilters.length === 0) {
            return false;
        }

        sheetToFilterSelectorMap = new utils.WeakMap();
        pendingStyles = new utils.Set();
        ignoredSheets = new utils.Set(sheetsToIgnore);
        window.sheetToFilterSelectorMap = sheetToFilterSelectorMap;
        observeStyle();
        // Initial processing
        var sheets = document.styleSheets;
        for (var l = sheets.length - 1; l >= 0; l--) {
            readStyleSheetContent(sheets[l]);
        }
        return true;
    };
    var initialized = false;

    /**
     * Exported method to disconnect existing mutation observers and remove
     * event listeners, clear collections and caches.
     */
    var clear = function () {
        if (initialized) { return; }
        initialized = false;
        disconnectObservers();
        pendingStyles.clear();
        sheetToFilterSelectorMap = pendingStyles = ignoredSheets = null;
    };

    /**
     * Creates a new pseudo-class and registers it in Sizzle
     */
    var extendSizzle = function(Sizzle) {
        Sizzle.selectors.pseudos["properties"] = Sizzle.selectors.pseudos["-abp-properties"] = Sizzle.selectors.createPseudo(function(propertyFilter) {
            registerStylePropertyFilter(propertyFilter);
            return function (element) {
                var selectors = getSelector(propertyFilter);
                if (selectors.length === 0) { return false; }
                return element[utils.matchesPropertyName](selectors.join(','));
            }
        });
    };

    return {
        initialize: initialize,
        clear: clear,
        extendSizzle: extendSizzle,
    };
})();
