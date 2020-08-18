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
/**
 * Class that extends Sizzle and adds support for "matches-attr" pseudo element.
 */
const AttributesMatcher = (() => {
    /**
     * Class that matches element attributes against the specified expressions
     * @param {string} attrFilter - argument of matches-attr pseudo
     * @param {string} pseudoElement
     * @constructor
     *
     * @member {RegExp} attrNameRegexp
     * @member {RegExp} attrValueRegexp
     */
    const AttrMatcher = function (attrFilter, pseudoElement) {
        this.pseudoElement = pseudoElement;
        try {
            const [rawName, rawValue] = attrFilter.split('=').map((el) => el.trim());

            if (/^\/.*\/$/.test(rawName) && /^\/.*\/$/.test(rawValue)) {
                this.attrNameRegexp = utils.pseudoArgToRegex(rawName.slice(1, -1));
                this.attrValueRegexp = utils.pseudoArgToRegex(rawValue.slice(1, -1));
            }
        } catch (ex) {
            utils.logError(`AttributesMatcher: invalid match string ${attrFilter}`);
        }
    };

    /**
     * Function to check if element attributes matches filter pattern
     * @param {Element} element to check
     */
    AttrMatcher.prototype.matches = function (element) {
        const elAttrs = element.attributes;
        if (elAttrs.length === 0
            || !this.attrNameRegexp
            || !this.attrValueRegexp) {
            return false;
        }

        let matched = false;
        let i = 0;

        // check element attributes until we find one that matches
        while (i < elAttrs.length && !matched) {
            const attr = elAttrs[i];
            const attrMatched = this.attrNameRegexp.test(attr.name)
                && this.attrValueRegexp.test(attr.value);
            matched = attrMatched || matched;
            i += 1;
        }

        return matched;
    };

    /**
     * Creates a new pseudo-class and registers it in Sizzle
     */
    const extendSizzle = function (sizzle) {
        // First of all we should prepare Sizzle engine
        sizzle.selectors.pseudos['matches-attr'] = sizzle.selectors.createPseudo((attrFilter) => {
            const matcher = new AttrMatcher(attrFilter);
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
