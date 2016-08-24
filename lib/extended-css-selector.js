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
 * [-ext-style-properties="|background-image: url(data:*)"]
 */
var ExtendedSelector = (function () { // jshint ignore:line

    // Add :style-properties-*() support
    StylePropertyMatcher.extendSizzle(Sizzle);    

    /**
     * Complex replacement function. 
     * Unescapes quote characters inside of an extended selector.
     * 
     * @param match     Whole matched string
     * @param name      Group 1
     * @param quoteChar Group 2
     * @param value     Group 3
     */
    var evaluateMatch = function(match, name, quoteChar, value) { 
        // var name = match[1];
        // var quoteChar = match[2];
        // var value = match[3];

        // Unescape quotes
        var re = new RegExp("([^\\\\]|^)\\\\" + quoteChar, "g");
        value = value.replace(re, "$1" + quoteChar);
        return ":" + name + "(" + value + ")";
    };

    /**
     * Prepares specified selector and compiles it with the Sizzle engine.
     * Preparation means transforming [-ext-*=""] attributes to pseudo classes.
     * 
     * @param selectorText Selector text
     */
    var prepareSelector = function(selectorText) {
        try {
            // Prepare selector to be compiled with Sizzle
            // Which means transform [-ext-*=""] attributes to pseudo classes
            var re = /\[-ext-([a-z-_]+)=(["'])((?:(?=(\\?))\4.)*?)\2\]/g;
            var str = selectorText.replace(re, evaluateMatch);
            
            // Compiles and validates selector
            // Compilation in Sizzle means that selector will be saved to an inner cache and then reused
            Sizzle.compile(str);
            return str;
        } catch (ex) {
            if (typeof console !== 'undefined' && console.error) {
                console.error('Extended selector is invalid: ' + selectorText);
            }
            return null;
        }
    };

    // Constructor
    return function(selectorText) {
        var compiledSelector = prepareSelector(selectorText);

        // EXPOSE
        this.compiledSelector = compiledSelector;
        this.selectorText = selectorText;

        /**
         * Selects all DOM nodes matching this selector.
         */
        this.querySelectorAll = function() {
            return Sizzle(compiledSelector); // jshint ignore:line
        };

        /**
         * Checks if the specified element matches this selector
         */
        this.matches = function(element) {
            return Sizzle.matchesSelector(element, compiledSelector);
        };
    };
})();