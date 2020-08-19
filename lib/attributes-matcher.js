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
 * Parses
 * @param {string} attrFilter argument of matches-attr pseudo
 */
const parseAttrFilter = (attrFilter) => {
    const FULL_MATCH_MARKER = '"="';
    const rawArgs = attrFilter
        .split('=')
        .map((arg) => {
            let finalArg;
            if (attrFilter.indexOf(FULL_MATCH_MARKER) === -1) {
                // if there is only one pseudo arg, e.g. :matches-attr("data-name"),
                // Sizzle will parse it and get rid of quotes
                // so it might be valid arg already without them
                finalArg = arg;
            } else if (arg[0] === '"' && arg[arg.length - 1] === '"') {
                finalArg = arg.slice(1, -1);
            }
            return finalArg;
        });
    return rawArgs;
};

/**
 * @typedef {Object} ArgData
 * @property {string} arg
 * @property {boolean} isRegexp
 */

/**
 * Parses raw arg
 * @param {string} rawArg attribute name or value arg
 * @returns {ArgData}
 */
const parseRawArg = (rawArg) => {
    let arg = rawArg;
    const isRegexp = !!rawArg && rawArg[0] === '/' && rawArg[rawArg.length - 1] === '/';
    if (isRegexp) {
        arg = utils.toRegExp(rawArg);
    }
    return { arg, isRegexp };
};

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
     * @member {string|RegExp} attrName
     * @member {boolean} isRegexpName
     * @member {string|RegExp} attrValue
     * @member {boolean} isRegexpValue
     */
    const AttrMatcher = function (attrFilter, pseudoElement) {
        this.pseudoElement = pseudoElement;
        try {
            // For regex patterns, `"` and `\` should be escaped
            const [rawName, rawValue] = parseAttrFilter(attrFilter);

            ({ arg: this.attrName, isRegexp: this.isRegexpName } = parseRawArg(rawName));
            ({ arg: this.attrValue, isRegexp: this.isRegexpValue } = parseRawArg(rawValue));
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
            if (!attrFilter) {
                throw new Error(`Invalid argument of :matches-attr pseudo class: ${attrFilter}`);
            }
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
