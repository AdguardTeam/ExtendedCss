/**
 * Copyright 2020 Adguard Software Ltd
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

import utils from './utils';
import cssUtils from './css-utils';

/**
 * Class that extends Sizzle and adds support for :is() pseudo element.
 */
const IsAnyMatcher = (() => {
    /**
     * Class that matches element by one of the selectors
     * https://developer.mozilla.org/en-US/docs/Web/CSS/:is
     * @param {Array} selectors
     * @param {string} pseudoElement
     * @constructor
     */
    const IsMatcher = function (selectors, pseudoElement) {
        this.selectors = selectors;
        this.pseudoElement = pseudoElement;
    };

    /**
     * Function to check if element can be matched by any passed selector
     * @param {Element} element to check
     */
    IsMatcher.prototype.matches = function (element) {
        const isMatched = !!this.selectors.find((selector) => {
            const nodes = document.querySelectorAll(selector);
            return Array.from(nodes).find((node) => node === element);
        });
        return isMatched;
    };

    /**
     * Creates a new pseudo-class and registers it in Sizzle
     */
    const extendSizzle = function (sizzle) {
        // First of all we should prepare Sizzle engine
        sizzle.selectors.pseudos['is'] = sizzle.selectors.createPseudo((input) => {
            if (input === '') {
                throw new Error(`Invalid argument of :is pseudo-class: ${input}`);
            }

            const selectors = input.split(',').map((s) => s.trim());

            // collect valid selectors and log about invalid ones
            const validSelectors = selectors
                .reduce((acc, selector) => {
                    if (cssUtils.isSimpleSelectorValid(selector)) {
                        acc.push(selector);
                    } else {
                        utils.logInfo(`Invalid selector passed to :is() pseudo-class: '${selector}'`);
                    }
                    return acc;
                }, []);

            const matcher = new IsMatcher(validSelectors);
            return function (element) {
                return matcher.matches(element);
            };
        });
    };

    return {
        extendSizzle,
    };
})();

export default IsAnyMatcher;
