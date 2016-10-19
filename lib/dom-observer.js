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
    var domMutationObserver;

    /**
     * Sets up a MutationObserver which protects attributes from changes
     * 
     * @param node          DOM node
     * @param attributeName Name of the attribute you want to have protected
     * @returns Mutation observer used to protect attribute or null if there's nothing to protect
     */
    var protectAttribute = function(node, attributeName) {

        if (!MutationObserver) {
            return null;
        }

        /**
         * Restores previous attribute value
         */
        var protectionFunction = function(mutations, observer) {
            if (!mutations.length) {
                return;
            }

            var target = mutations[0].target;
            observer.disconnect();
            var iMutations = mutations.length;
            while (iMutations--) {
                var mutation = mutations[iMutations];
                if (mutation.attributeName === attributeName) {
                    target.setAttribute(mutation.attributeName, mutation.oldValue);
                }
            }

            observer.observe(target, {
                attributes: true, 
                attributeOldValue: true,
                attributeFilter: [ attributeName ]
            });
        };

        var protectionObserver = new MutationObserver(protectionFunction);
        protectionObserver.observe(node, {
            attributes: true, 
            attributeOldValue: true,
            attributeFilter: [ attributeName ]
        });
        
        return protectionObserver;
    };

    /**
     * Observes changes to DOM nodes
     * 
     * @param callback Callback method to be called when anything has changed
     */
    var observeDom = function(callback) {
        if (!document.body) {
            // Do nothing if there is no body
            return;
        }

        if (MutationObserver) {
            domMutationObserver = new MutationObserver(function(mutations) {
                if (mutations && mutations.length) {
                    callback();
                }
            });
            domMutationObserver.observe(document.body, { 
                childList: true,
                subtree: true,
                attributes: false
            });
        } else if (eventListenerSupported) {
            document.addEventListener('DOMNodeInserted', callback, false);
            document.addEventListener('DOMNodeRemoved', callback, false);
        }
    };

    /**
     * Disconnects DOM observer
     */
    var disconnectDom = function(callback) {
        if (domMutationObserver) {
            domMutationObserver.disconnect();
        } else if (eventListenerSupported) {
            document.removeEventListener('DOMNodeInserted', callback, false);
            document.removeEventListener('DOMNodeRemoved', callback, false);
        }
    };

    // EXPOSE
    return {
        observeDom: function(callback) {
            if (!document.body) {
                document.addEventListener('DOMContentLoaded', function() {
                    observeDom(callback);
                });
            } else {
                observeDom(callback);
            }
        },
        disconnectDom: disconnectDom,
        protectAttribute: protectAttribute 
    };
})();