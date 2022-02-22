import {
    ASTERISK,
    COLON,
    REGEXP_WITH_FLAGS_REGEXP,
    SLASH,
} from './constants';

import utils from './utils';

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
        arg = utils.replaceAll(arg, ASTERISK, '.*');
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
        if (propertyName === 'opacity' && utils.isSafariBrowser) {
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
    value: string,
}

const getPseudoArgData = (pseudoArg: string, separator: string): PseudoArgData => {
    const index = pseudoArg.indexOf(separator);
    const name = pseudoArg.substring(0, index).trim();
    const value = pseudoArg.substring(index + 1).trim();
    return { name, value };
};

/**
 * Checks whether the domElement is matched by :matches-css arg
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
        utils.logError(e);
        throw new Error(`Invalid argument of :${pseudoName} pseudo-class: ${pseudoArg}`);
    }

    const value = getComputedStylePropertyValue(domElement, regularPseudo, matchName);

    return valueRegexp && valueRegexp.test(value);
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
