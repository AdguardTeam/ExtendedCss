import { BRACKET, COMMA } from '../common/constants';

/**
 * Regexp that matches backward compatible syntaxes.
 */
const REGEXP_VALID_OLD_SYNTAX = /\[-(?:ext)-([a-z-_]+)=(["'])((?:(?=(\\?))\4.)*?)\2\]/g;

/**
 * Marker for checking invalid selector after old-syntax normalizing by selector converter.
 */
const INVALID_OLD_SYNTAX_MARKER = '[-ext-';

/**
 * Complex replacement function.
 * Undo quote escaping inside of an extended selector.
 *
 * @param match     Whole matched string.
 * @param name      Group 1.
 * @param quoteChar Group 2.
 * @param rawValue  Group 3.
 *
 * @returns Converted string.
 */
const evaluateMatch = (match: string, name: string, quoteChar: string, rawValue: string): string => {
    // Unescape quotes
    const re = new RegExp(`([^\\\\]|^)\\\\${quoteChar}`, 'g');
    const value = rawValue.replace(re, `$1${quoteChar}`);
    return `:${name}(${value})`;
};

// ':scope' pseudo may be at start of :has() argument
// but ExtCssDocument.querySelectorAll() already use it for selecting exact element descendants
const SCOPE_MARKER_REGEXP = /\(:scope >/g;
const SCOPE_REPLACER = '(>';

const MATCHES_CSS_PSEUDO_ELEMENT_REGEXP = /(:matches-css)-(before|after)\(/g;
const convertMatchesCss = (match: string, extendedPseudoClass: string, regularPseudoElement: string): string => {
    // ':matches-css-before('  -->  ':matches-css(before, '
    // ':matches-css-after('   -->  ':matches-css(after, '
    return `${extendedPseudoClass}${BRACKET.PARENTHESES.LEFT}${regularPseudoElement}${COMMA}`;
};

/**
 * Handles old syntax and :scope inside :has().
 *
 * @param selector Trimmed selector to normalize.
 *
 * @returns Normalized selector.
 * @throws An error on invalid old extended syntax selector.
 */
const normalize = (selector: string): string => {
    const normalizedSelector = selector
        .replace(REGEXP_VALID_OLD_SYNTAX, evaluateMatch)
        .replace(SCOPE_MARKER_REGEXP, SCOPE_REPLACER)
        .replace(MATCHES_CSS_PSEUDO_ELEMENT_REGEXP, convertMatchesCss);

    // validate old syntax after normalizing
    // e.g. '[-ext-matches-css-before=\'content:  /^[A-Z][a-z]'
    if (normalizedSelector.includes(INVALID_OLD_SYNTAX_MARKER)) {
        throw new Error(`Invalid extended-css old syntax selector: '${selector}'`);
    }

    return normalizedSelector;
};

/**
 * Prepares the rawSelector before tokenization:
 * 1. Trims it.
 * 2. Converts old syntax `[-ext-pseudo-class="..."]` to new one `:pseudo-class(...)`.
 * 3. Handles :scope pseudo inside :has() pseudo-class arg.
 *
 * @param rawSelector Selector with no style declaration.
 * @returns Prepared selector with no style declaration.
 */
export const convert = (rawSelector: string): string => {
    const trimmedSelector = rawSelector.trim();
    return normalize(trimmedSelector);
};
