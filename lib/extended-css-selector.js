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

/* global Sizzle, console */

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
 */
var ExtendedSelector = (function () {

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
            var str = selectorText.replace(/\[-ext-([a-z-_]+)=(["'])((?:(?=(\\?))\4.)*?)\2\]/g, ':$1($3)');
            
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
            return Sizzle(compiledSelector);
        };

        /**
         * Checks if the specified element matches this selector
         */
        this.matches = function(element) {
            return Sizzle.matchesSelector(element, compiledSelector);
        };
    };
})();