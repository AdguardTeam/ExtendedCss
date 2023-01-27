import {
    convertTypeFromString,
    convertTypeIntoString,
    replaceAll,
    toRegExp,
} from '../../common/utils/strings';
import { getFirst, getItemByIndex } from '../../common/utils/arrays';
import { getErrorMessage } from '../../common/utils/error';
import { logger } from '../../common/utils/logger';
import { isSafariBrowser } from '../../common/utils/user-agents';
import { getNodeTextContent } from '../../common/utils/nodes';

import {
    ASTERISK,
    DOT,
    COLON,
    DOUBLE_QUOTE,
    EQUAL_SIGN,
    SLASH,
    COMMA,
    REGULAR_PSEUDO_ELEMENTS,
} from '../../common/constants';

/**
 * CSS_PROPERTY is needed for style values normalization.
 *
 * IMPORTANT: it is used as 'const' instead of 'enum' to avoid side effects
 * during ExtendedCss import into other libraries.
 */
const CSS_PROPERTY = {
    BACKGROUND: 'background',
    BACKGROUND_IMAGE: 'background-image',
    CONTENT: 'content',
    OPACITY: 'opacity',
};

const REGEXP_ANY_SYMBOL = '.*';

const REGEXP_WITH_FLAGS_REGEXP = /^\s*\/.*\/[gmisuy]*\s*$/;

export type MatcherArgsData = {
    /**
     * Extended pseudo-class name.
     */
    pseudoName: string;

    /**
     * Extended pseudo-class arg.
     */
    pseudoArg: string;

    /**
     * Dom element to check.
     */
    domElement: Element;
};

/**
 * Removes quotes for specified content value.
 *
 * For example, content style declaration with `::before` can be set as '-' (e.g. unordered list)
 * which displayed as simple dash `-` with no quotes.
 * But CSSStyleDeclaration.getPropertyValue('content') will return value
 * wrapped into quotes, e.g. '"-"', which should be removed
 * because filters maintainers does not use any quotes in real rules.
 *
 * @param str Input string.
 *
 * @returns String with no quotes for content value.
 */
const removeContentQuotes = (str: string): string => {
    return str.replace(/^(["'])([\s\S]*)\1$/, '$2');
};

/**
 * Adds quotes for specified background url value.
 *
 * If background-image is specified **without** quotes:
 * e.g. 'background: url(data:image/gif;base64,R0lGODlhAQA7)'.
 *
 * CSSStyleDeclaration.getPropertyValue('background-image') may return value **with** quotes:
 * e.g. 'background: url("data:image/gif;base64,R0lGODlhAQA7")'.
 *
 * So we add quotes for compatibility since filters maintainers might use quotes in real rules.
 *
 * @param str Input string.
 *
 * @returns String with unified quotes for background url value.
 */
const addUrlPropertyQuotes = (str: string): string => {
    if (!str.includes('url("')) {
        const re = /url\((.*?)\)/g;
        return str.replace(re, 'url("$1")');
    }
    return str;
};

/**
 * Adds quotes to url arg for consistent property value matching.
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
 * Escapes regular expression string.
 *
 * @see {@link https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/regexp}
 *
 * @param str Input string.
 *
 * @returns Escaped regular expression string.
 */
const escapeRegExp = (str: string): string => {
    // should be escaped . * + ? ^ $ { } ( ) | [ ] / \
    // except of * | ^
    const specials = ['.', '+', '?', '$', '{', '}', '(', ')', '[', ']', '\\', '/'];
    const specialsRegex = new RegExp(`[${specials.join('\\')}]`, 'g');
    return str.replace(specialsRegex, '\\$&');
};

/**
 * Converts :matches-css() arg property value match to regexp.
 *
 * @param rawValue Style match value pattern.
 *
 * @returns Arg of :matches-css() converted to regular expression.
 */
const convertStyleMatchValueToRegexp = (rawValue: string): RegExp => {
    let value: string;
    if (rawValue.startsWith(SLASH) && rawValue.endsWith(SLASH)) {
        // For regex patterns double quotes `"` and backslashes `\` should be escaped
        value = addUrlQuotesTo.regexpArg(rawValue);
        value = value.slice(1, -1);
    } else {
        // For non-regex patterns parentheses `(` `)` and square brackets `[` `]`
        // should be unescaped, because their escaping in filter rules is required
        value = addUrlQuotesTo.noneRegexpArg(rawValue);
        value = value.replace(/\\([\\()[\]"])/g, '$1');
        value = escapeRegExp(value);
        // e.g. div:matches-css(background-image: url(data:*))
        value = replaceAll(value, ASTERISK, REGEXP_ANY_SYMBOL);
    }
    return new RegExp(value, 'i');
};

/**
 * Makes some properties values compatible.
 *
 * @param propertyName Name of style property.
 * @param propertyValue Value of style property.
 *
 * @returns Normalized values for some CSS properties.
 */
const normalizePropertyValue = (propertyName: string, propertyValue: string): string => {
    let normalized = '';
    switch (propertyName) {
        case CSS_PROPERTY.BACKGROUND:
        case CSS_PROPERTY.BACKGROUND_IMAGE:
            // sometimes url property does not have quotes
            // so we add them for consistent matching
            normalized = addUrlPropertyQuotes(propertyValue);
            break;
        case CSS_PROPERTY.CONTENT:
            normalized = removeContentQuotes(propertyValue);
            break;
        case CSS_PROPERTY.OPACITY:
            // https://bugs.webkit.org/show_bug.cgi?id=93445
            normalized = isSafariBrowser
                ? (Math.round(parseFloat(propertyValue) * 100) / 100).toString()
                : propertyValue;
            break;
        default:
            normalized = propertyValue;
    }
    return normalized;
};

/**
 * Returns domElement style property value
 * by css property name and standard pseudo-element.
 *
 * @param domElement DOM element.
 * @param propertyName CSS property name.
 * @param regularPseudoElement Standard pseudo-element — '::before', '::after' etc.
 *
 * @returns String containing the value of a specified CSS property.
 */
const getComputedStylePropertyValue = (
    domElement: Element,
    propertyName: string,
    regularPseudoElement: string | null,
): string => {
    const style = window.getComputedStyle(domElement, regularPseudoElement);
    const propertyValue = style.getPropertyValue(propertyName);
    return normalizePropertyValue(propertyName, propertyValue);
};

type PseudoArgData = {
    name: string;
    value?: string;
};

/**
 * Parses arg of absolute pseudo-class into 'name' and 'value' if set.
 *
 * Used for :matches-css() - with COLON as separator,
 * for :matches-attr() and :matches-property() - with EQUAL_SIGN as separator.
 *
 * @param pseudoArg Arg of pseudo-class.
 * @param separator Divider symbol.
 *
 * @returns Parsed 'matches' pseudo-class arg data.
 */
const getPseudoArgData = (pseudoArg: string, separator: string): PseudoArgData => {
    const index = pseudoArg.indexOf(separator);
    let name: string;
    let value: string | undefined;

    if (index > -1) {
        name = pseudoArg.substring(0, index).trim();
        value = pseudoArg.substring(index + 1).trim();
    } else {
        name = pseudoArg;
    }

    return { name, value };
};

type MatchesCssArgData = {
    regularPseudoElement: string | null;
    styleMatchArg: string;
};

/**
 * Parses :matches-css() pseudo-class arg
 * where regular pseudo-element can be a part of arg
 * e.g. 'div:matches-css(before, color: rgb(255, 255, 255))'    <-- obsolete `:matches-css-before()`.
 *
 * @param pseudoName Pseudo-class name.
 * @param rawArg Pseudo-class arg.
 *
 * @returns Parsed :matches-css() pseudo-class arg data.
 * @throws An error on invalid `rawArg`.
 */
const parseStyleMatchArg = (pseudoName: string, rawArg: string): MatchesCssArgData => {
    const { name, value } = getPseudoArgData(rawArg, COMMA);

    let regularPseudoElement: string | null = name;
    let styleMatchArg: string | undefined = value;

    // check whether the string part before the separator is valid regular pseudo-element,
    // otherwise `regularPseudoElement` is null, and `styleMatchArg` is rawArg
    if (!Object.values(REGULAR_PSEUDO_ELEMENTS).includes(name)) {
        regularPseudoElement = null;
        styleMatchArg = rawArg;
    }

    if (!styleMatchArg) {
        throw new Error(`Required style property argument part is missing in :${pseudoName}() arg: '${rawArg}'`);
    }

    // if regularPseudoElement is not `null`
    if (regularPseudoElement) {
        // pseudo-element should have two colon marks for Window.getComputedStyle() due to the syntax:
        // https://www.w3.org/TR/selectors-4/#pseudo-element-syntax
        // ':matches-css(before, content: ads)' ->> '::before'
        regularPseudoElement = `${COLON}${COLON}${regularPseudoElement}`;
    }

    return { regularPseudoElement, styleMatchArg };
};

/**
 * Checks whether the domElement is matched by :matches-css() arg.
 *
 * @param argsData Pseudo-class name, arg, and dom element to check.
 *
 @returns True if DOM element is matched.
 * @throws An error on invalid pseudo-class arg.
 */
export const isStyleMatched = (argsData: MatcherArgsData): boolean => {
    const { pseudoName, pseudoArg, domElement } = argsData;

    const { regularPseudoElement, styleMatchArg } = parseStyleMatchArg(pseudoName, pseudoArg);

    const { name: matchName, value: matchValue } = getPseudoArgData(styleMatchArg, COLON);
    if (!matchName || !matchValue) {
        throw new Error(`Required property name or value is missing in :${pseudoName}() arg: '${styleMatchArg}'`);
    }

    let valueRegexp: RegExp;
    try {
        valueRegexp = convertStyleMatchValueToRegexp(matchValue);
    } catch (e: unknown) {
        logger.error(getErrorMessage(e));
        throw new Error(`Invalid argument of :${pseudoName}() pseudo-class: '${styleMatchArg}'`);
    }

    const value = getComputedStylePropertyValue(domElement, matchName, regularPseudoElement);

    return valueRegexp && valueRegexp.test(value);
};

/**
 * Validates string arg for :matches-attr() and :matches-property().
 *
 * @param arg Pseudo-class arg.
 *
 * @returns True if 'matches' pseudo-class string arg is valid.
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
 * Returns valid arg for :matches-attr() and :matcher-property().
 *
 * @param rawArg Arg pattern.
 * @param [isWildcardAllowed=false] Flag for wildcard (`*`) using as pseudo-class arg.
 *
 * @returns Valid arg for :matches-attr() and :matcher-property().
 * @throws An error on invalid `rawArg`.
 */
export const getValidMatcherArg = (rawArg: string, isWildcardAllowed = false): string | RegExp => {
    // if rawArg is missing for pseudo-class
    // e.g. :matches-attr()
    // error will be thrown before getValidMatcherArg() is called:
    // name or arg is missing in AbsolutePseudoClass

    let arg: string | RegExp;
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

type RawMatchingArgData = {
    rawName: string;
    rawValue?: string;
};

/**
 * Parses pseudo-class argument and returns parsed data.
 *
 * @param pseudoName Extended pseudo-class name.
 * @param pseudoArg Extended pseudo-class argument.
 *
 * @returns Parsed pseudo-class argument data.
 * @throws An error if attribute name is missing in pseudo-class arg.
 */
export const getRawMatchingData = (pseudoName: string, pseudoArg: string): RawMatchingArgData => {
    const { name: rawName, value: rawValue } = getPseudoArgData(pseudoArg, EQUAL_SIGN);
    if (!rawName) {
        throw new Error(`Required attribute name is missing in :${pseudoName} arg: ${pseudoArg}`);
    }
    return { rawName, rawValue };
};

/**
 * Checks whether the domElement is matched by :matches-attr() arg.
 *
 * @param argsData Pseudo-class name, arg, and dom element to check.
 *
 @returns True if DOM element is matched.
 * @throws An error on invalid arg of pseudo-class.
 */
export const isAttributeMatched = (argsData: MatcherArgsData): boolean => {
    const { pseudoName, pseudoArg, domElement } = argsData;
    const elementAttributes = domElement.attributes;
    // no match if dom element has no attributes
    if (elementAttributes.length === 0) {
        return false;
    }

    const { rawName: rawAttrName, rawValue: rawAttrValue } = getRawMatchingData(pseudoName, pseudoArg);

    let attrNameMatch: string | RegExp;
    try {
        attrNameMatch = getValidMatcherArg(rawAttrName);
    } catch (e: unknown) {
        const errorMessage = getErrorMessage(e);
        logger.error(errorMessage);
        throw new SyntaxError(errorMessage);
    }

    let isMatched = false;
    let i = 0;
    while (i < elementAttributes.length && !isMatched) {
        const attr = elementAttributes[i];
        if (!attr) {
            break;
        }

        const isNameMatched = attrNameMatch instanceof RegExp
            ? attrNameMatch.test(attr.name)
            : attrNameMatch === attr.name;

        if (!rawAttrValue) {
            // for rules with no attribute value specified
            // e.g. :matches-attr("/regex/") or :matches-attr("attr-name")
            isMatched = isNameMatched;
        } else {
            let attrValueMatch: string | RegExp;
            try {
                attrValueMatch = getValidMatcherArg(rawAttrValue);
            } catch (e: unknown) {
                const errorMessage = getErrorMessage(e);
                logger.error(errorMessage);
                throw new SyntaxError(errorMessage);
            }
            const isValueMatched = attrValueMatch instanceof RegExp
                ? attrValueMatch.test(attr.value)
                : attrValueMatch === attr.value;
            isMatched = isNameMatched && isValueMatched;
        }

        i += 1;
    }

    return isMatched;
};

/**
 * Parses raw :matches-property() arg which may be chain of properties.
 *
 * @param input Argument of :matches-property().
 *
 * @returns Arg of :matches-property() as array of strings or regular expressions.
 * @throws An error on invalid chain.
 */
export const parseRawPropChain = (input: string): (string | RegExp)[] => {
    if (input.length > 1 && input.startsWith(DOUBLE_QUOTE) && input.endsWith(DOUBLE_QUOTE)) {
        input = input.slice(1, -1);
    }

    const chainChunks = input.split(DOT);

    const chainPatterns: string[] = [];
    let patternBuffer = '';
    let isRegexpPattern = false;
    let i = 0;
    while (i < chainChunks.length) {
        const chunk = getItemByIndex(chainChunks, i, `Invalid pseudo-class arg: '${input}'`);
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
            let validPattern: string | RegExp;
            try {
                validPattern = getValidMatcherArg(pattern, true);
            } catch (e: unknown) {
                logger.error(getErrorMessage(e));
                throw new Error(`Invalid property pattern '${pattern}' in property chain '${input}'`);
            }
            return validPattern;
        });

    return chainMatchPatterns;
};

type Chain = {
    base: Element;
    prop: string;
    value?: Element[keyof Element];
};

/**
 * Checks if the property exists in the base object (recursively).
 *
 * @param base Element to check.
 * @param chain Array of objects - parsed string property chain.
 * @param [output=[]] Result acc.
 *
 * @returns Array of parsed data — representation of `base`-related `chain`.
 */
const filterRootsByRegexpChain = (base: Element, chain: (string | RegExp)[], output: Chain[] = []): Chain[] => {
    const tempProp = getFirst(chain);

    if (chain.length === 1) {
        let key: keyof Element;
        for (key in base) {
            if (tempProp instanceof RegExp) {
                if (tempProp.test(key)) {
                    output.push({
                        base,
                        prop: key,
                        value: base[key],
                    });
                }
            } else if (tempProp === key) {
                output.push({
                    base,
                    prop: tempProp,
                    value: base[key],
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
        const baseKeys: string[] = [];
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
 * Checks whether the domElement is matched by :matches-property() arg.
 *
 * @param argsData Pseudo-class name, arg, and dom element to check.
 *
 @returns True if DOM element is matched.
 * @throws An error on invalid prop in chain.
 */
export const isPropertyMatched = (argsData: MatcherArgsData): boolean => {
    const { pseudoName, pseudoArg, domElement } = argsData;
    const { rawName: rawPropertyName, rawValue: rawPropertyValue } = getRawMatchingData(pseudoName, pseudoArg);

    // chained property name cannot include '/' or '.'
    // so regex prop names with such escaped characters are invalid
    if (rawPropertyName.includes('\\/')
        || rawPropertyName.includes('\\.')) {
        throw new Error(`Invalid :${pseudoName} name pattern: ${rawPropertyName}`);
    }

    let propChainMatches: (string | RegExp)[];
    try {
        propChainMatches = parseRawPropChain(rawPropertyName);
    } catch (e: unknown) {
        const errorMessage = getErrorMessage(e);
        logger.error(errorMessage);
        throw new SyntaxError(errorMessage);
    }

    const ownerObjArr = filterRootsByRegexpChain(domElement, propChainMatches);
    if (ownerObjArr.length === 0) {
        return false;
    }

    let isMatched = true;

    if (rawPropertyValue) {
        let propValueMatch: string | RegExp;
        try {
            propValueMatch = getValidMatcherArg(rawPropertyValue);
        } catch (e: unknown) {
            const errorMessage = getErrorMessage(e);
            logger.error(errorMessage);
            throw new SyntaxError(errorMessage);
        }

        if (propValueMatch) {
            for (let i = 0; i < ownerObjArr.length; i += 1) {
                const realValue = ownerObjArr[i]?.value;

                if (propValueMatch instanceof RegExp) {
                    isMatched = propValueMatch.test(convertTypeIntoString(realValue));
                } else {
                    // handle 'null' and 'undefined' property values set as string
                    if (realValue === 'null' || realValue === 'undefined') {
                        isMatched = propValueMatch === realValue;
                        break;
                    }
                    isMatched = convertTypeFromString(propValueMatch) === realValue;
                }

                if (isMatched) {
                    break;
                }
            }
        }
    }

    return isMatched;
};

/**
 * Checks whether the textContent is matched by :contains arg.
 *
 * @param argsData Pseudo-class name, arg, and dom element to check.
 *
 @returns True if DOM element is matched.
 * @throws An error on invalid arg of pseudo-class.
 */
export const isTextMatched = (argsData: MatcherArgsData): boolean => {
    const { pseudoName, pseudoArg, domElement } = argsData;
    const textContent = getNodeTextContent(domElement);
    let isTextContentMatched;

    let pseudoArgToMatch = pseudoArg;

    if (pseudoArgToMatch.startsWith(SLASH)
        && REGEXP_WITH_FLAGS_REGEXP.test(pseudoArgToMatch)) {
        // regexp arg
        const flagsIndex = pseudoArgToMatch.lastIndexOf('/');
        const flagsStr = pseudoArgToMatch.substring(flagsIndex + 1);
        pseudoArgToMatch = pseudoArgToMatch
            .substring(0, flagsIndex + 1)
            .slice(1, -1)
            .replace(/\\([\\"])/g, '$1');
        let regex: RegExp;
        try {
            regex = new RegExp(pseudoArgToMatch, flagsStr);
        } catch (e: unknown) {
            throw new Error(`Invalid argument of :${pseudoName}() pseudo-class: ${pseudoArg}`);
        }
        isTextContentMatched = regex.test(textContent);
    } else {
        // none-regexp arg
        pseudoArgToMatch = pseudoArgToMatch.replace(/\\([\\()[\]"])/g, '$1');
        isTextContentMatched = textContent.includes(pseudoArgToMatch);
    }

    return isTextContentMatched;
};
