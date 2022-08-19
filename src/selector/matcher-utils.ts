import {
    convertTypeFromString,
    convertTypeIntoString,
    replaceAll,
    toRegExp,
} from '../utils/strings';
import { logger } from '../utils/logger';
import { isSafariBrowser } from '../utils/user-agents';

import {
    ASTERISK,
    DOT,
    COLON,
    DOUBLE_QUOTE,
    EQUAL_SIGN,
    REGEXP_ANY_SYMBOL,
    REGEXP_WITH_FLAGS_REGEXP,
    SLASH,
} from '../constants';

/**
 * Removes quotes for specified content value.
 *
 * getPropertyValue('content') returns value wrapped into quotes e.g. '"Chapter "',
 * but filters maintainers does not use any quotes in real rules
 * @param str
 */
const removeContentQuotes = (str: string): string => {
    return str.replace(/^(["'])([\s\S]*)\1$/, '$2');
};

/**
 * Adds quotes for specified background url value
 *
 * e.g. if background-image is specified as 'background: url(data:image/gif;base64,R0lGODlhAQA7)',
 * getPropertyValue('background-image') may return value with quotes:
 * 'background: url("data:image/gif;base64,R0lGODlhAQA7")'.
 * So we add quotes for better matching since filters maintainers might use quotes in real rules
 * @param str
 */
const addUrlPropertyQuotes = (str: string): string => {
    if (!str.includes('url("')) {
        const re = /url\((.*?)\)/g;
        return str.replace(re, 'url("$1")');
    }
    return str;
};

/**
 * Adds quotes to url arg for consistent property value matching
 */
const addUrlQuotesTo = {
    regexpArg: (str: string): string => {
        // e.g. /^url\\([a-z]{4}:[a-z]{5}/
        // or /^url\\(data\\:\\image\\/gif;base64.+/
        const re = /(\^)?url(\\)?\\\((\w|\[\w)/g;
        return str.replace(re, '$1url$2\\(\\"?$3');
    },
    noneRegexpArg: addUrlPropertyQuotes,
};

/**
 * Escapes regular expression string
 * @param str
 */
const escapeRegExp = function (str: string): string {
    // https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/regexp
    // should be escaped . * + ? ^ $ { } ( ) | [ ] / \
    // except of * | ^
    const specials = ['.', '+', '?', '$', '{', '}', '(', ')', '[', ']', '\\', '/'];
    const specialsRegex = new RegExp(`[${specials.join('\\')}]`, 'g');

    return str.replace(specialsRegex, '\\$&');
};

/**
 * Converts :matches-css arg property value match to regexp
 * @param rawArg
 */
const matchingStyleValueToRegexp = (rawArg: string): RegExp => {
    let arg;
    if (rawArg.startsWith(SLASH) && rawArg.endsWith(SLASH)) {
        // For regex patterns double quotes `"` and backslashes `\` should be escaped
        arg = addUrlQuotesTo.regexpArg(rawArg);
        arg = arg.slice(1, -1);
    } else {
        // For non-regex patterns parentheses `(` `)` and square brackets `[` `]`
        // should be unescaped, because their escaping in filter rules is required
        arg = addUrlQuotesTo.noneRegexpArg(rawArg);
        arg = arg.replace(/\\([\\()[\]"])/g, '$1');
        arg = escapeRegExp(arg);
        // e.g. div:matches-css(background-image: url(data:*))
        arg = replaceAll(arg, ASTERISK, REGEXP_ANY_SYMBOL);
    }

    return new RegExp(arg, 'i');
};

/**
 * Gets css property value by property name
 * @param domElement dom node
 * @param regularPseudo standard pseudo-class name — :before or :after
 * @param propertyName css property name
 */
const getComputedStylePropertyValue = (domElement: Element, regularPseudo: string, propertyName: string) => {
    let value = '';
    const style = getComputedStyle(domElement, regularPseudo);
    if (style) {
        value = style.getPropertyValue(propertyName);
        // https://bugs.webkit.org/show_bug.cgi?id=93445
        if (propertyName === 'opacity' && isSafariBrowser) {
            value = (Math.round(parseFloat(value) * 100) / 100).toString();
        }
    }

    if (propertyName === 'content') {
        value = removeContentQuotes(value);
    }
    if (propertyName === 'background' || propertyName === 'background-image') {
        // sometimes url property does not have quotes
        // so we add them for consistent matching
        value = addUrlPropertyQuotes(value);
    }

    return value;
};

interface PseudoArgData {
    name: string,
    value?: string,
}

/**
 * Parses arg of absolute pseudo-class into 'name' and 'value' if set.
 *
 * Used for :matches-css() - with COLON as separator,
 * for :matches-attr() and :matches-property() - with EQUAL_SIGN as separator
 * @param pseudoArg
 * @param separator
 * @returns {PseudoArgData} { name, value } where 'value' can be undefined
 */
const getPseudoArgData = (pseudoArg: string, separator: string): PseudoArgData => {
    const index = pseudoArg.indexOf(separator);
    let name;
    let value;

    if (index > -1) {
        name = pseudoArg.substring(0, index).trim();
        value = pseudoArg.substring(index + 1).trim();
    } else {
        name = pseudoArg;
    }

    return { name, value };
};

/**
 * Checks whether the domElement is matched by :matches-css() arg
 * @param domElement
 * @param pseudoName
 * @param pseudoArg
 * @param regularPseudo
 */
export const matchingStyle = (
    domElement: Element,
    pseudoName: string,
    pseudoArg: string,
    regularPseudo: string,
): boolean => {
    const { name: matchName, value: matchValue } = getPseudoArgData(pseudoArg, COLON);
    if (!matchName || !matchValue) {
        throw new Error(`Required property name or value is missing in :${pseudoName} arg: ${pseudoArg}`);
    }

    let valueRegexp;
    try {
        valueRegexp = matchingStyleValueToRegexp(matchValue);
    } catch (e) {
        logger.error(e);
        throw new Error(`Invalid argument of :${pseudoName} pseudo-class: ${pseudoArg}`);
    }

    const value = getComputedStylePropertyValue(domElement, regularPseudo, matchName);

    return valueRegexp && valueRegexp.test(value);
};

/**
 * Validates string arg for :matches-attr and :matches-property
 * @param arg
 */
const validateStrMatcherArg = (arg: string): boolean => {
    if (arg.includes(SLASH)) {
        return false;
    }
    if (!(/^[\w-]+$/.test(arg))) {
        return false;
    }
    return true;
};

/**
 * Returns valid arg for :matches-attr and :matcher-property
 * @param rawArg arg pattern
 * @param isWildcardAllowed flag for allowing of usage of '*' as pseudo-class arg
 */
export const getValidMatcherArg = (rawArg: string, isWildcardAllowed = false): string | RegExp => {
    // if rawArg is missing for pseudo-class
    // e.g. :matches-attr()
    // isAbsoluteMatching will throw error before getValidMatcherArg is called:
    // name or arg is missing in AbsolutePseudoClass

    let arg;
    if (rawArg.length > 1 && rawArg.startsWith(DOUBLE_QUOTE) && rawArg.endsWith(DOUBLE_QUOTE)) {
        rawArg = rawArg.slice(1, -1);
    }
    if (rawArg === '') {
        // e.g. :matches-property("")
        throw new Error('Argument should be specified. Empty arg is invalid.');
    }
    if (rawArg.startsWith(SLASH) && rawArg.endsWith(SLASH)) {
        // e.g. :matches-property("//")
        if (rawArg.length > 2) {
            arg = toRegExp(rawArg);
        } else {
            throw new Error(`Invalid regexp: '${rawArg}'`);
        }
    } else if (rawArg.includes(ASTERISK)) {
        if (rawArg === ASTERISK && !isWildcardAllowed) {
            // e.g. :matches-attr(*)
            throw new Error(`Argument should be more specific than ${rawArg}`);
        }
        arg = replaceAll(rawArg, ASTERISK, REGEXP_ANY_SYMBOL);
        arg = new RegExp(arg);
    } else {
        if (!validateStrMatcherArg(rawArg)) {
            throw new Error(`Invalid argument: '${rawArg}'`);
        }
        arg = rawArg;
    }
    return arg;
};

interface RawMatchingArgData {
    rawName: string,
    rawValue?: string,
}

/**
 * Parses pseudo-class argument and returns parsed data
 * @param pseudoName extended pseudo-class name
 * @param pseudoArg extended pseudo-class argument
 */
export const getRawMatchingData = (pseudoName: string, pseudoArg: string): RawMatchingArgData => {
    const { name: rawName, value: rawValue } = getPseudoArgData(pseudoArg, EQUAL_SIGN);
    if (!rawName) {
        throw new Error(`Required attribute name is missing in :${pseudoName} arg: ${pseudoArg}`);
    }
    return { rawName, rawValue };
};

/**
 * Checks whether the domElement is matched by :matches-attr() arg
 * @param domElement element to check
 * @param pseudoName name of pseudo-class
 * @param pseudoArg arg of pseudo-class
 */
export const matchingAttr = (domElement: Element, pseudoName: string, pseudoArg: string): boolean => {
    const elementAttributes = domElement.attributes;
    // no match if dom element has no attributes
    if (elementAttributes.length === 0) {
        return false;
    }

    const { rawName: rawAttrName, rawValue: rawAttrValue } = getRawMatchingData(pseudoName, pseudoArg);

    let attrNameMatch;
    try {
        attrNameMatch = getValidMatcherArg(rawAttrName);
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        logger.error(e);
        throw new SyntaxError(e.message);
    }

    let isMatching = false;
    let i = 0;
    while (i < elementAttributes.length && !isMatching) {
        const attr = elementAttributes[i];

        const isNameMatching = attrNameMatch instanceof RegExp
            ? attrNameMatch.test(attr.name)
            : attrNameMatch === attr.name;

        if (!rawAttrValue) {
            // for rules with no attribute value specified
            // e.g. :matches-attr("/regex/") or :matches-attr("attr-name")
            isMatching = isNameMatching;
        } else {
            let attrValueMatch;
            try {
                attrValueMatch = getValidMatcherArg(rawAttrValue);
            } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
                logger.error(e);
                throw new SyntaxError(e.message);
            }
            const isValueMatching = attrValueMatch instanceof RegExp
                ? attrValueMatch.test(attr.value)
                : attrValueMatch === attr.value;
            isMatching = isNameMatching && isValueMatching;
        }

        i += 1;
    }

    return isMatching;
};

/**
 * Parses raw :matches-property() arg which may be chain of properties
 * @param input argument of :matches-property()
 */
export const parseRawPropChain = (input: string): (string | RegExp)[] => {
    if (input.length > 1 && input.startsWith(DOUBLE_QUOTE) && input.endsWith(DOUBLE_QUOTE)) {
        input = input.slice(1, -1);
    }

    const chainChunks = input.split(DOT);

    const chainPatterns = [];
    let patternBuffer = '';
    let isRegexpPattern;
    let i = 0;
    while (i < chainChunks.length) {
        const chunk = chainChunks[i];
        if (chunk.startsWith(SLASH) && chunk.endsWith(SLASH) && chunk.length > 2) {
            // regexp pattern with no dot in it, e.g. /propName/
            chainPatterns.push(chunk);
        } else if (chunk.startsWith(SLASH)) {
            // if chunk is a start of regexp pattern
            isRegexpPattern = true;
            patternBuffer += chunk;
        } else if (chunk.endsWith(SLASH)) {
            isRegexpPattern = false;
            // restore dot removed while splitting
            // e.g. testProp./.{1,5}/
            patternBuffer += `.${chunk}`;
            chainPatterns.push(patternBuffer);
            patternBuffer = '';
        } else {
            // if there are few dots in regexp pattern
            // so chunk might be in the middle of it
            if (isRegexpPattern) {
                patternBuffer += chunk;
            } else {
                // otherwise it is string pattern
                chainPatterns.push(chunk);
            }
        }
        i += 1;
    }

    if (patternBuffer.length > 0) {
        throw new Error(`Invalid regexp property pattern '${input}'`);
    }

    const chainMatchPatterns = chainPatterns
        .map((pattern) => {
            if (pattern.length === 0) {
                // e.g. '.prop.id' or 'nested..test'
                throw new Error(`Empty pattern '${pattern}' is invalid in chain '${input}'`);
            }
            let validPattern;
            try {
                validPattern = getValidMatcherArg(pattern, true);
            } catch (e) {
                logger.error(e);
                throw new Error(`Invalid property pattern '${pattern}' in property chain '${input}'`);
            }
            return validPattern;
        });

    return chainMatchPatterns;
};

interface Chain {
    base: Element,
    prop: string,
    value?: string,
}

/**
 * Checks if the property exists in the base object (recursively).
 * @param base
 * @param chain array of objects - parsed string property chain
 * @param output result acc
 */
const filterRootsByRegexpChain = (base: Element, chain: (string | RegExp)[], output: Chain[] = []) => {
    const tempProp = chain[0];

    if (chain.length === 1) {
        for (const key in base) {
            if (tempProp instanceof RegExp) {
                if (tempProp.test(key)) {
                    output.push({
                        base,
                        prop: key,
                        value: Object.getOwnPropertyDescriptor(base, key)?.value,
                    });
                }
            } else if (tempProp === key) {
                output.push({
                    base,
                    prop: tempProp,
                    value: Object.getOwnPropertyDescriptor(base, key)?.value,
                });
            }
        }
        return output;
    }

    // if there is a regexp prop in input chain
    // e.g. 'unit./^ad.+/.src' for 'unit.ad-1gf2.src unit.ad-fgd34.src'),
    // every base keys should be tested by regexp and it can be more that one results
    if (tempProp instanceof RegExp) {
        const nextProp = chain.slice(1);
        const baseKeys = [];
        for (const key in base) {
            if (tempProp.test(key)) {
                baseKeys.push(key);
            }
        }
        baseKeys.forEach((key) => {
            const item = Object.getOwnPropertyDescriptor(base, key)?.value;
            filterRootsByRegexpChain(item, nextProp, output);
        });
    }

    if (base && typeof tempProp === 'string') {
        const nextBase = Object.getOwnPropertyDescriptor(base, tempProp)?.value;
        chain = chain.slice(1);
        if (nextBase !== undefined) {
            filterRootsByRegexpChain(nextBase, chain, output);
        }
    }

    return output;
};

/**
 * Checks whether the domElement is matched by :matches-property() arg
 * @param domElement element to check
 * @param pseudoName name of pseudo-class
 * @param pseudoArg arg of pseudo-class
 */
export const matchingProperty = (domElement: Element, pseudoName: string, pseudoArg: string): boolean => {
    const { rawName: rawPropertyName, rawValue: rawPropertyValue } = getRawMatchingData(pseudoName, pseudoArg);

    // chained property name can not include '/' or '.'
    // so regex prop names with such escaped characters are invalid
    if (rawPropertyName.includes('\\/')
        || rawPropertyName.includes('\\.')) {
        throw new Error(`Invalid :${pseudoName} name pattern: ${rawPropertyName}`);
    }

    let propChainMatches;
    try {
        propChainMatches = parseRawPropChain(rawPropertyName);
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        logger.error(e);
        throw new SyntaxError(e.message);
    }

    const ownerObjArr = filterRootsByRegexpChain(domElement, propChainMatches);
    if (ownerObjArr.length === 0) {
        return false;
    }

    let isMatching = true;

    if (rawPropertyValue) {
        let propValueMatch;
        try {
            propValueMatch = getValidMatcherArg(rawPropertyValue);
        } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            logger.error(e);
            throw new SyntaxError(e.message);
        }

        if (propValueMatch) {
            for (let i = 0; i < ownerObjArr.length; i += 1) {
                const realValue = ownerObjArr[i].value;

                if (propValueMatch instanceof RegExp) {
                    isMatching = propValueMatch.test(convertTypeIntoString(realValue));
                } else {
                    // handle 'null' and 'undefined' property values set as string
                    if (realValue === 'null' || realValue === 'undefined') {
                        isMatching = propValueMatch === realValue;
                        break;
                    }
                    isMatching = convertTypeFromString(propValueMatch) === realValue;
                }

                if (isMatching) {
                    break;
                }
            }
        }
    }

    return isMatching;
};

/**
 * Checks whether the textContent is matched by :contains arg
 * @param textContent dom element textContent
 * @param rawPseudoArg argument of :contains pseudo-class
 */
export const matchingText = (textContent: string, rawPseudoArg: string): boolean => {
    let isTextContentMatched;

    /**
     * TODO: add helper for parsing rawPseudoArg (string or regexp) later,
     * seems to be similar for few extended pseudo-classes
     */
    let pseudoArg = rawPseudoArg;

    if (pseudoArg.startsWith(SLASH)
        && REGEXP_WITH_FLAGS_REGEXP.test(pseudoArg)) {
        // regexp arg
        const flagsIndex = pseudoArg.lastIndexOf('/');
        const flagsStr = pseudoArg.substring(flagsIndex + 1);
        pseudoArg = pseudoArg
            .substring(0, flagsIndex + 1)
            .slice(1, -1)
            .replace(/\\([\\"])/g, '$1');
        let regex;
        try {
            regex = new RegExp(pseudoArg, flagsStr);
        } catch (e) {
            throw new Error(`Invalid argument of :contains pseudo-class: ${rawPseudoArg}`);
        }
        isTextContentMatched = regex.test(textContent);
    } else {
        // none-regexp arg
        pseudoArg = pseudoArg.replace(/\\([\\()[\]"])/g, '$1');
        isTextContentMatched = textContent.includes(pseudoArg);
    }

    return isTextContentMatched;
};
