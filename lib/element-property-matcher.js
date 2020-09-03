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
import matcherUtils from './matcher-utils';

/**
 * Parses raw property arg
 * @param {string} input
 * @returns {ArgData[]} array of objects
 */
const parseRawPropChain = (input) => {
    const PROPS_DIVIDER = '.';
    const REGEXP_MARKER = '/';
    const propsArr = [];
    let str = input;

    while (str.length > 0) {
        if (utils.startsWith(str, PROPS_DIVIDER)) {
            // for cases like '.prop.id' and 'nested..test'
            throw new Error(`Invalid chain property: ${input}`);
        }

        if (!utils.startsWith(str, REGEXP_MARKER)) {
            const isRegexp = false;
            const dividerIndex = str.indexOf(PROPS_DIVIDER);
            if (str.indexOf(PROPS_DIVIDER) === -1) {
                // if there is no '.' left in str
                // take the rest of str as prop
                propsArr.push({ arg: str, isRegexp });
                return propsArr;
            }
            // else take prop from str
            const prop = str.slice(0, dividerIndex);
            // for cases like 'asadf.?+/.test'
            if (prop.indexOf(REGEXP_MARKER) > -1) {
                // prop is '?+/'
                throw new Error(`Invalid chain property: ${prop}`);
            }
            propsArr.push({ arg: prop, isRegexp });
            // delete prop from str
            str = str.slice(dividerIndex);
        } else {
            // deal with regexp
            const propChunks = [];
            propChunks.push(str.slice(0, 1));
            // if str starts with '/', delete it from str and find closing regexp slash.
            // note that chained property name can not include '/' or '.'
            // so there is no checking for escaped characters
            str = str.slice(1);
            const regexEndIndex = str.indexOf(REGEXP_MARKER);
            if (regexEndIndex < 1) {
                // regexp should be at least === '/./'
                // so we should avoid args like '/id' and 'test.//.id'
                throw new Error(`Invalid regexp: ${REGEXP_MARKER}${str}`);
            }
            const isRegexp = true;
            // take the rest regexp part
            propChunks.push(str.slice(0, regexEndIndex + 1));
            const prop = utils.toRegExp(propChunks.join(''));
            propsArr.push({ arg: prop, isRegexp });
            // delete prop from str
            str = str.slice(regexEndIndex + 1);
        }

        if (!str) {
            return propsArr;
        }

        // str should be like '.nextProp' now
        // so 'zx.prop' or '.' is invalid
        if (!utils.startsWith(str, PROPS_DIVIDER)
            || (utils.startsWith(str, PROPS_DIVIDER) && str.length === 1)) {
            throw new Error(`Invalid chain property: ${input}`);
        }
        str = str.slice(1);
    }
};

const convertTypeFromStr = (value) => {
    const numValue = Number(value);
    let output;
    if (!Number.isNaN(numValue)) {
        output = numValue;
    } else {
        switch (value) {
            case 'undefined':
                output = undefined;
                break;
            case 'null':
                output = null;
                break;
            case 'true':
                output = true;
                break;
            case 'false':
                output = false;
                break;
            default:
                output = value;
        }
    }
    return output;
};

const convertTypeIntoStr = (value) => {
    let output;
    switch (value) {
        case undefined:
            output = 'undefined';
            break;
        case null:
            output = 'null';
            break;
        default:
            output = value.toString();
    }
    return output;
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
        const ownerObjArr = matcherUtils.filterRootsByRegexpChain(element, this.chainedProps);
        if (ownerObjArr.length === 0) {
            return false;
        }

        let matched = true;
        if (this.propValue) {
            for (let i = 0; i < ownerObjArr.length; i += 1) {
                const realValue = ownerObjArr[i].value;

                if (this.isRegexpValue) {
                    matched = this.propValue.test(convertTypeIntoStr(realValue));
                } else {
                    // handle 'null' and 'undefined' property values set as string
                    if (realValue === 'null' || realValue === 'undefined') {
                        matched = this.propValue === realValue;
                        break;
                    }
                    matched = convertTypeFromStr(this.propValue) === realValue;
                }

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

            const [rawProp, rawValue] = matcherUtils.parseMatcherFilter(propertyFilter);

            // chained property name can not include '/' or '.'
            // so regex prop names with such escaped characters are invalid
            if (rawProp.indexOf('\\/') > -1
                || rawProp.indexOf('\\.') > -1) {
                throw new Error(`Invalid property name: ${rawProp}`);
            }

            const propsChainArg = parseRawPropChain(rawProp);
            const valueArg = matcherUtils.parseRawMatcherArg(rawValue);

            const propsToValidate = [...propsChainArg, valueArg];

            if (!matcherUtils.validatePropMatcherArgs(propsToValidate)) {
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
