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
 * @returns {Array}
 */
const parseAttrFilter = (attrFilter) => {
    const FULL_MATCH_MARKER = '"="';
    const rawArgs = [];
    if (attrFilter.indexOf(FULL_MATCH_MARKER) === -1) {
        // if there is only one pseudo arg, e.g. :matches-attr("data-name"),
        // Sizzle will parse it and get rid of quotes
        // so it might be valid arg already without them
        rawArgs.push(attrFilter);
    } else {
        attrFilter
            .split('=')
            .forEach((arg) => {
                if (arg[0] === '"' && arg[arg.length - 1] === '"') {
                    rawArgs.push(arg.slice(1, -1));
                }
            });
    }

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
        // to avoid at least such case — :matches-attr("//")
        if (rawArg.length > 2) {
            arg = utils.toRegExp(rawArg);
        } else {
            throw new Error(`Invalid regexp: ${rawArg}`);
        }
    }
    return { arg, isRegexp };
};

/**
 * Validates parsed args of matches-attr pseudo
 */
const validateAttrMatcherArgs = (...args) => {
    for (let i = 0; i < args.length; i += 1) {
        if (!args[i].isRegexp) {
            // simple arg check if it is not a regexp
            if (!(/^[\w-]+$/.test(args[i].arg))) {
                return false;
            }
        }
    }
    return true;
};

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
            const [rawName, rawValue] = parseAttrFilter(attrFilter);
            const nameArg = parseRawArg(rawName);
            const valueArg = parseRawArg(rawValue);

            if (!attrFilter || !validateAttrMatcherArgs(nameArg, valueArg)) {
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
