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

import matcherUtils from './matcher-utils';

/**
 * Class that extends Sizzle and adds support for "matches-attr" pseudo element.
 */
const AttributesMatcher = (() => {
    /**
     * Class that matches element attributes against the specified expressions
     * @param {ArgData} nameArg - parsed name argument
     * @param {ArgData} valueArg - parsed value argument
     * @param {string} pseudoElement
     * @constructor
     *
     * @member {string|RegExp} attrName
     * @member {boolean} isRegexpName
     * @member {string|RegExp} attrValue
     * @member {boolean} isRegexpValue
     */
    const AttrMatcher = function (nameArg, valueArg, pseudoElement) {
        this.pseudoElement = pseudoElement;
        ({ arg: this.attrName, isRegexp: this.isRegexpName } = nameArg);
        ({ arg: this.attrValue, isRegexp: this.isRegexpValue } = valueArg);
    };

    /**
     * Function to check if element attributes matches filter pattern
     * @param {Element} element to check
     */
    AttrMatcher.prototype.matches = function (element) {
        const elAttrs = element.attributes;
        if (elAttrs.length === 0
            || !this.attrName) {
            return false;
        }

        let i = 0;
        while (i < elAttrs.length) {
            const attr = elAttrs[i];
            let matched = false;

            const attrNameMatched = this.isRegexpName
                ? this.attrName.test(attr.name)
                : this.attrName === attr.name;

            if (!this.attrValue) {
                // for :matches-attr("/regex/") or :matches-attr("attr-name")
                matched = attrNameMatched;
            } else {
                const attrValueMatched = this.isRegexpValue
                    ? this.attrValue.test(attr.value)
                    : this.attrValue === attr.value;
                matched = attrNameMatched && attrValueMatched;
            }

            if (matched) {
                return true;
            }
            i += 1;
        }
    };

    /**
     * Creates a new pseudo-class and registers it in Sizzle
     */
    const extendSizzle = function (sizzle) {
        // First of all we should prepare Sizzle engine
        sizzle.selectors.pseudos['matches-attr'] = sizzle.selectors.createPseudo((attrFilter) => {
            const [rawName, rawValue] = matcherUtils.parseMatcherFilter(attrFilter);
            const nameArg = matcherUtils.parseRawMatcherArg(rawName);
            const valueArg = matcherUtils.parseRawMatcherArg(rawValue);

            if (!attrFilter || !matcherUtils.validatePropMatcherArgs(nameArg, valueArg)) {
                throw new Error(`Invalid argument of :matches-attr pseudo class: ${attrFilter}`);
            }

            const matcher = new AttrMatcher(nameArg, valueArg);
            return function (element) {
                return matcher.matches(element);
            };
        });
    };

    // EXPOSE
    return {
        extendSizzle,
    };
})();

export default AttributesMatcher;
