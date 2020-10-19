/**
 * Copyright 2016 Adguard Software Ltd
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

const matcherUtils = {};
matcherUtils.MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

/**
 * Parses argument of matcher pseudo (for matches-attr and matches-property)
 * @param {string} matcherFilter argument of pseudo class
 * @returns {Array}
 */
matcherUtils.parseMatcherFilter = (matcherFilter) => {
    const FULL_MATCH_MARKER = '"="';
    const rawArgs = [];
    if (matcherFilter.indexOf(FULL_MATCH_MARKER) === -1) {
        // if there is only one pseudo arg
        // e.g. :matches-attr("data-name") or :matches-property("inner.prop")
        // Sizzle will parse it and get rid of quotes
        // so it might be valid arg already without them
        rawArgs.push(matcherFilter);
    } else {
        matcherFilter
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
 * Parses raw matcher arg
 * @param {string} rawArg
 * @returns {ArgData}
 */
matcherUtils.parseRawMatcherArg = (rawArg) => {
    let arg = rawArg;
    const isRegexp = !!rawArg && rawArg[0] === '/' && rawArg[rawArg.length - 1] === '/';
    if (isRegexp) {
        // to avoid at least such case — :matches-property("//")
        if (rawArg.length > 2) {
            arg = utils.toRegExp(rawArg);
        } else {
            throw new Error(`Invalid regexp: ${rawArg}`);
        }
    }
    return { arg, isRegexp };
};

/**
 * @typedef Chain
 * @property {Object} base
 * @property {string} prop
 * @property {string} value
 */

/**
 * Checks if the property exists in the base object (recursively).
 * @param {Object} base
 * @param {ArgData[]} chain array of objects - parsed string property chain
 * @param {Array} [output=[]] result acc
 * @returns {Chain[]} array of objects
 */
matcherUtils.filterRootsByRegexpChain = (base, chain, output = []) => {
    const tempProp = chain[0];

    if (chain.length === 1) {
        // eslint-disable-next-line no-restricted-syntax
        for (const key in base) {
            if (tempProp.isRegexp) {
                if (tempProp.arg.test(key)) {
                    output.push({ base, prop: key, value: base[key] });
                }
            } else if (tempProp.arg === key) {
                output.push({ base, prop: tempProp.arg, value: base[key] });
            }
        }

        return output;
    }

    // if there is a regexp prop in input chain
    // e.g. 'unit./^ad.+/.src' for 'unit.ad-1gf2.src unit.ad-fgd34.src'),
    // every base keys should be tested by regexp and it can be more that one results
    if (tempProp.isRegexp) {
        const nextProp = chain.slice(1);

        const baseKeys = [];
        // eslint-disable-next-line no-restricted-syntax
        for (const key in base) {
            if (tempProp.arg.test(key)) {
                baseKeys.push(key);
            }
        }

        baseKeys.forEach((key) => {
            const item = base[key];
            matcherUtils.filterRootsByRegexpChain(item, nextProp, output);
        });
    }

    // avoid TypeError while accessing to null-prop's child
    if (base === null) {
        return;
    }

    const nextBase = base[tempProp.arg];
    chain = chain.slice(1);
    if (nextBase !== undefined) {
        matcherUtils.filterRootsByRegexpChain(nextBase, chain, output);
    }

    return output;
};

/**
 * Validates parsed args of matches-property pseudo
 * @param {...ArgData} args
 */
matcherUtils.validatePropMatcherArgs = (...args) => {
    for (let i = 0; i < args.length; i += 1) {
        if (args[i].isRegexp) {
            if (!utils.startsWith(args[i].arg.toString(), '/')
                || !utils.endsWith(args[i].arg.toString(), '/')) {
                return false;
            }
        // simple arg check if it is not a regexp
        } else if (!(/^[\w-]+$/.test(args[i].arg))) {
            return false;
        }
    }
    return true;
};

export default matcherUtils;
