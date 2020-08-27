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
 * Parses raw property arg
 * @param {string} rawProp
 * @returns {ArgData[]} array of objects
 */
const parseRawPropChain = (input) => {
    const PROPS_DIVIDER = '.';
    const REGEXP_MARKER = '/';
    const propsArr = [];
    let str = input;

    while (str.length > 0) {
        const firstChar = str[0];
        if (firstChar === PROPS_DIVIDER) {
            // for cases like '.prop.id' and 'nested..test'
            throw new Error(`Invalid chain property: ${input}`);
        }

        if (firstChar !== REGEXP_MARKER) {
            const isRegexpProp = false;
            const dividerIndex = str.indexOf(PROPS_DIVIDER);
            if (dividerIndex > -1) {
                // take prop from str
                const prop = str.slice(0, dividerIndex);
                // for cases like 'asadf.?+/.test'
                if (prop.indexOf(REGEXP_MARKER) > -1) {
                    throw new Error(`Invalid chain property: ${prop}`);
                }
                propsArr.push({ arg: prop, isRegexpProp });
                // delete prop from str
                str = str.slice(dividerIndex);
            } else {
                // if there is no '.' left
                // take the rest of str as prop
                propsArr.push({ arg: str, isRegexpProp });
                return propsArr;
            }
        } else {
            const propChunks = [];
            propChunks.push(str.slice(0, REGEXP_MARKER.length));
            // if str starts with '/', delete it from str and find closing regexp slash.
            // note that chained property name can not include '/' or '.'
            // so there is no checking for escaped characters
            str = str.slice(REGEXP_MARKER.length);
            const regexEndIndex = str.indexOf(REGEXP_MARKER);
            if (regexEndIndex < 1) {
                // regexp should be at least === '/./'
                // so we should avoid args like '/id' and 'test.//.id'
                throw new Error(`Invalid regexp: ${REGEXP_MARKER}${str}`);
            } else {
                const isRegexpProp = true;
                // take the rest regexp part
                propChunks.push(str.slice(0, regexEndIndex + REGEXP_MARKER.length));
                const prop = utils.toRegExp(propChunks.join(''));
                propsArr.push({ arg: prop, isRegexpProp });
                // delete prop from str
                str = str.slice(regexEndIndex + REGEXP_MARKER.length);
            }
        }

        if (!str) {
            return propsArr;
        }

        // str should be like '.nextProp' now
        // so 'zx.prop' or '.' is invalid
        const dividerIndex = str.indexOf(PROPS_DIVIDER);
        if (dividerIndex !== 0) {
            throw new Error(`Invalid chain property: ${input}`);
        }
        str = str.slice(1);
    }
};

/**
 * Class that extends Sizzle and adds support for "matches-property" pseudo element.
 */
const ElementPropertyMatcher = (() => {
    /**
     * Class that matches element properties against the specified expressions
     * @param {ArgData[]} propsChainArg - array of parsed props chain objects
     * @param {ArgData} valueArg - parsed value argument
     * @param {string} pseudoElement
     * @constructor
     *
     * @member {Array} chainedProps
     * @member {boolean} isRegexpName
     * @member {string|RegExp} propValue
     * @member {boolean} isRegexpValue
     */
    const PropMatcher = function (propsChainArg, valueArg, pseudoElement) {
        this.pseudoElement = pseudoElement;
        (this.chainedProps = propsChainArg);
        ({ arg: this.propValue, isRegexp: this.isRegexpValue } = valueArg);
    };

    /**
     * Function to check if element properties matches filter pattern
     * @param {Element} element to check
     */
    PropMatcher.prototype.matches = function (element) {
        let matched = false;
        const ownerObjArr = utils.getRegexpPropertyInChain(element, this.chainedProps);
        const isPropMatched = ownerObjArr.length > 0;

        if (!this.propValue) {
            matched = isPropMatched;
        } else {
            for (let i = 0; i < ownerObjArr.length; i += 1) {
                const realValue = ownerObjArr[i].value.toString();
                const isValueMatched = this.isRegexpValue
                    ? this.propValue.test(realValue)
                    : this.propValue === realValue;
                matched = isPropMatched && isValueMatched;
                if (matched) {
                    break;
                }
            }
        }
        return matched;
    };

    /**
     * Creates a new pseudo-class and registers it in Sizzle
     */
    const extendSizzle = function (sizzle) {
        // First of all we should prepare Sizzle engine
        sizzle.selectors.pseudos['matches-property'] = sizzle.selectors.createPseudo((propertyFilter) => {
            if (!propertyFilter) {
                throw new Error('No argument is given for :matches-property pseudo class');
            }

            const [rawProp, rawValue] = utils.parseMatcherFilter(propertyFilter);

            // chained property name can not include '/' or '.'
            // so regex prop names with such escaped characters are invalid
            if (rawProp.indexOf('\\/') > -1
                || rawProp.indexOf('\\.') > -1) {
                throw new Error(`Invalid property name: ${rawProp}`);
            }

            const propsChainArg = parseRawPropChain(rawProp);
            const valueArg = utils.parseRawMatcherArg(rawValue);

            const propsToValidate = [];
            propsChainArg.forEach((el) => propsToValidate.push(el));
            propsToValidate.push(valueArg);

            if (!utils.validatePropMatcherArgs(propsToValidate)) {
                throw new Error(`Invalid argument of :matches-property pseudo class: ${propertyFilter}`);
            }

            const matcher = new PropMatcher(propsChainArg, valueArg);
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

export default ElementPropertyMatcher;
