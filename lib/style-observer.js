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

/* global console, utils */

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
        if (node.nodeType !== 1) { return; }
        var nodes =  node.querySelectorAll(selector);
        if (node[utils.matchesPropertyName](selector)) {
            nodes = Array.prototype.push.call(nodes, node);
        }
        return nodes;
    };

    var isSameOriginStyle = function (styleSheet) {
        var href = styleSheet.href;
        if (href === null) { return true; }
        return utils.isSameOrigin(href, location, document.domain);
    };

    // Handler functions for MO instances.
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

    var styleAdditionHandler = function(mutations) {
        var hasPendingStyles = false;
        /** @todo convert for .. of loops to for loops */
        for (var mutation of mutations) {
            var addedNodes = mutation.addedNodes,
                removedNodes = mutation.removedNodes;
            if (addedNodes) {
                for (var addedNode of addedNodes) {
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
                }
            }
            if (removedNodes) {
                for (var removedNode of removedNodes) {
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
                }
            }
        }
        if (hasPendingStyles) {
            examineStylesScheduler.run();
        }
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
        styleAdditionObserver = new utils.MutationObserver(styleAdditionHandler);
        styleModObserver = new utils.MutationObserver(styleModHandler);
        styleAdditionObserver.observe(document.documentElement, { childList: true, subtree: true });
    };

    // Functions constituting mutation handlers
    var onStyleAdd = function (style) {
        if (!sheetToFilterSelectorMap.has(style.sheet)) {
            pendingStyles.add(style);
            styleModObserver.observe(style, { childList: true, subtree: true, characterData: true });
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

    /**/

    var pendingStyles = new utils.Set();
    var sheetToFilterSelectorMap = new utils.WeakMap();

    var anyStyleWasUpdated;
    var examineStyles = function() {
        rAFid = undefined;
        anyStyleWasUpdated = false;
        pendingStyles.forEach(readStyleNodeContent);
        // Invalidates cache.
        if (anyStyleWasUpdated) { invalidateCache(); }
        addedStyles.clear();
        removedStyles.clear();
        modifiedStyles.clear();
    };

    var examineStylesScheduler = new utils.AsyncWrapper(examineStyles);

    var readStyleNodeContent = function(styleNode) {
        readStyleSheetContent(styleNode.sheet);
    };

    var readStyleSheetContent = function (styleSheet) {
        if (!isSameOriginStyle(styleSheet)) { return; }
        if (ignoredSheets.has(styleSheet)) { return; }
        var rules = styleSheet.cssRules;
        var map = Object.create(null);
        for (var l = rules.length - 1; l >= 0; l--) {
            var rule = rules[l];
            if (rule.type !== CSSRule.STYLE_RULE) {
                /**
                 * Ignore media rules; this behavior is compatible with abp.
                 * @todo Media query support
                 */
                continue;
            }
            var style = rule.style;

            for (var j = parsedFilters.length - 1; j >= 0; j--) {
                var parsedFilter = parsedFilters[j];
                var property = parsedFilter.property;
                var val = style.getPropertyValue(property);
                var priority = style.getPropertyPriority(property);
                var strRep = val + priority;

                if (!parsedFilter.re.test(strRep)) { continue; }

                anyStyleWasUpdated = true;
                var selectorText = rule.selectorText.replace(/::(?:after|before)/,'');

                var filter = parsedFilter.filter;

                if (typeof map[filter] === 'undefined') {
                    map[filter] = [ selectorText ];
                } else {
                    map[filter].push(selectorText);
                }
            }
        }
        sheetToFilterSelectorMap.set(styleSheet, map);
    };

    var ignoredSheets = new utils.Set();
    var addIgnoredSheets = function (sheets) {
        sheets.forEach(function(sheet) {
            ignoredStyles.add(sheet)
        });
    }

    /**/

    var getSelectorCache = Object.create(null);
    var invalidateCache = function () {
        getSelectorCache = Object.create(null);
    }
    var invalidateScheduler = new utils.AsyncWrapper(invalidateCache, 0);
    var getSelector = function (filter) {
        // getSelector will be triggered via mutation observer callbacks
        // and we assume that those are already throttled.
        examineStylesScheduler.runImmediately();
        invalidateScheduler.run();

        if (getSelectorCache[filter]) {
            return getSelectorCache[filter];
        }
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
        return selectors;
    };

    var parsedFilters = [];

    window.parsedFilters = parsedFilters;

    var reRegexRule = /^\/(.*)\/$/;
    var reProperty = /[A-Za-z0-9\-]+/;
    var registerStylePropertyFilter = function (filter) {
        filter = filter.trim();
        var property, re;
        if (reRegexRule.test(filter)) {
            filter = filter.slice(1, -1);
            var index = filter.indexOf(':');
            property = filter.slice(0, index).trim();
            if (!reProperty.test(property)) {
                console.warn('Unsupported regex usage of :properties(' + filter + ')');
                return;
            }
            re = utils.toRegex(filter.slice(index + 1));
        } else {
            var index = filter.indexOf(':');
            property = filter.slice(0, index).trim();
            var simple = filter.slice(index + 1).trim();
            re = new RegExp(utils.createSimpleRegex(simple), 'i');
        }
        parsedFilters.push({
            filter: filter,
            property: property,
            re: re
        });
    };

    /**/

    var initialized = false;
    var initialize = function () {
        if (initialized) { return; }
        observeStyle();
        var sheets = document.styleSheets;
        for (var l = sheets.length - 1; l >= 0; l--) {
            readStyleSheetContent(sheets[l]);
        }
    };

    var extendSizzle = function(Sizzle) {
        Sizzle.selectors.pseudos["properties"] = Sizzle.selectors.pseudos["-abp-properties"] = Sizzle.selectors.createPseudo(function(propertyFilter) {
            registerStylePropertyFilter(propertyFilter);
            return function (element) {
                var selectors = getSelector(propertyFilter);
                return element.matches(selectors.join(','));
            }
        });
    };

    return {
        addIgnoredSheets: addIgnoredSheets,
        initialize: initialize,
        extendSizzle: extendSizzle,
        getSelector: getSelector
    };
})();
