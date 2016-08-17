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

/**
 * Helper class that uses either MutationObserver or DOMNode* events to keep an eye on DOM changes
 * <br/>
 * Two public methods:
 * <br/>
 * <pre>observe</pre> starts observing the DOM changes
 * <pre>dispose</pre> stops doing it
 */
var DomObserver = (function() { // jshint ignore:line

    var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
    var eventListenerSupported = window.addEventListener;

    return function(callback) {

        var mutationObserver;

        var observeDom = function(callback) {
            if (!document.body) {
                return;
            }

            if (MutationObserver) {
                mutationObserver = new MutationObserver(function(mutations) {
                    if (mutations && mutations.length) {
                        callback();
                    }
                });
                mutationObserver.observe(document.body, { childList:true, subtree:true });
            } else if (eventListenerSupported) {
                document.addEventListener('DOMNodeInserted', callback, false);
                document.addEventListener('DOMNodeRemoved', callback, false);
            }
        };
        
        // EXPOSE
        this.observe = function() {
            if (!document.body) {
                document.addEventListener('DOMContentLoaded', function() {
                    observeDom(callback);
                });
            } else {
                observeDom(callback);
            }
        };

        this.dispose = function() {
            if (mutationObserver) {
                mutationObserver.disconnect();
            } else if (eventListenerSupported) {
                document.removeEventListener('DOMNodeInserted', callback, false);
                document.removeEventListener('DOMNodeRemoved', callback, false);
            }
        };
    };
})();