
import { Context } from './parser-types';

import { tokenizeAttribute } from '../tokenizer';

import { TOKEN_TYPE } from '../../common/tokenizer';

import {
    getFirst,
    getLast,
    getItemByIndex,
    getPrevToLast,
} from '../../common/utils/arrays';
import {
    SPACE,
    EQUAL_SIGN,
    SINGLE_QUOTE,
    DOUBLE_QUOTE,
    COMBINATORS,
    ASTERISK,
    ID_MARKER,
    CLASS_MARKER,
    COLON,
    BRACKET,
    SLASH,
    BACKSLASH,
    DOT,
    CONTAINS_PSEUDO_NAMES,
    XPATH_PSEUDO_CLASS_MARKER,
    SUPPORTED_PSEUDO_CLASSES,
    OPTIMIZATION_PSEUDO_CLASSES,
    WHITE_SPACE_CHARACTERS,
} from '../../common/constants';

const ATTRIBUTE_CASE_INSENSITIVE_FLAG = 'i';

/**
 * Limited list of available symbols before slash `/`
 * to check whether it is valid regexp pattern opening.
 */
const POSSIBLE_MARKS_BEFORE_REGEXP = {
    COMMON: [
        // e.g. ':matches-attr(/data-/)'
        BRACKET.PARENTHESES.LEFT,
        // e.g. `:matches-attr('/data-/')`
        SINGLE_QUOTE,
        // e.g. ':matches-attr("/data-/")'
        DOUBLE_QUOTE,
        // e.g. ':matches-attr(check=/data-v-/)'
        EQUAL_SIGN,
        // e.g. ':matches-property(inner./_test/=null)'
        DOT,
        // e.g. ':matches-css(height:/20px/)'
        COLON,
        // ':matches-css-after( content  :   /(\\d+\\s)*me/  )'
        SPACE,
    ],
    CONTAINS: [
        // e.g. ':contains(/text/)'
        BRACKET.PARENTHESES.LEFT,
        // e.g. `:contains('/text/')`
        SINGLE_QUOTE,
        // e.g. ':contains("/text/")'
        DOUBLE_QUOTE,
    ],
};

/**
 * Checks whether the passed token is supported extended pseudo-class.
 *
 * @param tokenValue Token value to check.
 *
 * @returns True if `tokenValue` is one of supported extended pseudo-class names.
 */
export const isSupportedPseudoClass = (tokenValue: string): boolean => {
    return SUPPORTED_PSEUDO_CLASSES.includes(tokenValue);
};

/**
 * Checks whether the passed pseudo-class `name` should be optimized,
 * i.e. :not() and :is().
 *
 * @param name Pseudo-class name.
 *
 * @returns True if `name` is one if pseudo-class which should be optimized.
 */
export const isOptimizationPseudoClass = (name: string): boolean => {
    return OPTIMIZATION_PSEUDO_CLASSES.includes(name);
};

/**
 * Checks whether next to "space" token is a continuation of regular selector being processed.
 *
 * @param nextTokenType Type of token next to current one.
 * @param nextTokenValue Value of token next to current one.
 *
 * @returns True if next token seems to be a part of current regular selector.
 */
export const doesRegularContinueAfterSpace = (
    nextTokenType: string | undefined,
    nextTokenValue: string | undefined,
): boolean => {
    // regular selector does not continues after the current token
    if (!nextTokenType || !nextTokenValue) {
        return false;
    }
    return COMBINATORS.includes(nextTokenValue)
        || nextTokenType === TOKEN_TYPE.WORD
        // e.g. '#main *:has(> .ad)'
        || nextTokenValue === ASTERISK
        || nextTokenValue === ID_MARKER
        || nextTokenValue === CLASS_MARKER
        // e.g. 'div :where(.content)'
        || nextTokenValue === COLON
        // e.g. "div[class*=' ']"
        || nextTokenValue === SINGLE_QUOTE
        // e.g. 'div[class*=" "]'
        || nextTokenValue === DOUBLE_QUOTE
        || nextTokenValue === BRACKET.SQUARE.LEFT;
};

/**
 * Checks whether the regexp pattern for pseudo-class arg starts.
 * Needed for `context.isRegexpOpen` flag.
 *
 * @param context Selector parser context.
 * @param prevTokenValue Value of previous token.
 * @param bufferNodeValue Value of bufferNode.
 *
 * @returns True if current token seems to be a start of regexp pseudo-class arg pattern.
 * @throws An error on invalid regexp pattern.
 */
export const isRegexpOpening = (context: Context, prevTokenValue: string, bufferNodeValue: string): boolean => {
    const lastExtendedPseudoClassName = getLast(context.extendedPseudoNamesStack);
    if (!lastExtendedPseudoClassName) {
        throw new Error('Regexp pattern allowed only in arg of extended pseudo-class');
    }
    // for regexp pattens the slash should not be escaped
    // const isRegexpPatternSlash = prevTokenValue !== BACKSLASH;
    // regexp pattern can be set as arg of pseudo-class
    // which means limited list of available symbols before slash `/`;
    // for :contains() pseudo-class regexp pattern should be at the beginning of arg
    if (CONTAINS_PSEUDO_NAMES.includes(lastExtendedPseudoClassName)) {
        return POSSIBLE_MARKS_BEFORE_REGEXP.CONTAINS.includes(prevTokenValue);
    }
    if (prevTokenValue === SLASH
        && lastExtendedPseudoClassName !== XPATH_PSEUDO_CLASS_MARKER) {
        const rawArgDesc = bufferNodeValue
            ? `in arg part: '${bufferNodeValue}'`
            : 'arg';
        throw new Error(`Invalid regexp pattern for :${lastExtendedPseudoClassName}() pseudo-class ${rawArgDesc}`);
    }

    // for other pseudo-classes regexp pattern can be either the whole arg or its part
    return  POSSIBLE_MARKS_BEFORE_REGEXP.COMMON.includes(prevTokenValue);
};

/**
 * Checks whether the attribute starts.
 *
 * @param tokenValue Value of current token.
 * @param prevTokenValue Previous token value.
 *
 * @returns True if combination of current and previous token seems to be **a start** of attribute.
 */
export const isAttributeOpening = (tokenValue: string, prevTokenValue: string | undefined) => {
    return tokenValue === BRACKET.SQUARE.LEFT
        && prevTokenValue !== BACKSLASH;
};

/**
 * Checks whether the attribute ends.
 *
 * @param context Selector parser context.
 *
 * @returns True if combination of current and previous token seems to be **an end** of attribute.
 * @throws An error on invalid attribute.
 */
export const isAttributeClosing = (context: Context): boolean => {
    if (!context.isAttributeBracketsOpen) {
        return false;
    }
    // valid attributes may have extra spaces inside.
    // we get rid of them just to simplify the checking and they are skipped only here:
    //   - spaces will be collected to the ast with spaces as they were declared is selector
    //   - extra spaces in attribute are not relevant to attribute syntax validity
    //     e.g. 'a[ title ]' is the same as 'a[title]'
    //          'div[style *= "MARGIN" i]' is the same as 'div[style*="MARGIN"i]'
    const noSpaceAttr = context.attributeBuffer.split(SPACE).join('');
    // tokenize the prepared attribute string
    const attrTokens = tokenizeAttribute(noSpaceAttr);

    const firstAttrToken = getFirst(attrTokens);
    const firstAttrTokenType = firstAttrToken?.type;
    const firstAttrTokenValue = firstAttrToken?.value;
    // signal an error on any mark-type token except backslash
    // e.g. '[="margin"]'
    if (firstAttrTokenType === TOKEN_TYPE.MARK
        // backslash is allowed at start of attribute
        // e.g. '[\\:data-service-slot]'
        && firstAttrTokenValue !== BACKSLASH) {
        // eslint-disable-next-line max-len
        throw new Error(`'[${context.attributeBuffer}]' is not a valid attribute due to '${firstAttrTokenValue}' at start of it`);
    }

    const lastAttrToken = getLast(attrTokens);
    const lastAttrTokenType = lastAttrToken?.type;
    const lastAttrTokenValue = lastAttrToken?.value;
    if (lastAttrTokenValue === EQUAL_SIGN) {
        // e.g. '[style=]'
        throw new Error(`'[${context.attributeBuffer}]' is not a valid attribute due to '${EQUAL_SIGN}'`);
    }

    const equalSignIndex = attrTokens.findIndex((token) => {
        return token.type === TOKEN_TYPE.MARK
            && token.value === EQUAL_SIGN;
    });
    const prevToLastAttrTokenValue = getPrevToLast(attrTokens)?.value;
    if (equalSignIndex === -1) {
        // if there is no '=' inside attribute,
        // it must be just attribute name which means the word-type token before closing bracket
        // e.g. 'div[style]'
        if (lastAttrTokenType === TOKEN_TYPE.WORD) {
            return true;
        }
        return prevToLastAttrTokenValue === BACKSLASH
            // some weird attribute are valid too
            // e.g. '[class\\"ads-article\\"]'
            && (lastAttrTokenValue === DOUBLE_QUOTE
                // e.g. "[class\\'ads-article\\']"
                || lastAttrTokenValue === SINGLE_QUOTE);
    }

    // get the value of token next to `=`
    const nextToEqualSignToken = getItemByIndex(attrTokens, equalSignIndex + 1);
    const nextToEqualSignTokenValue = nextToEqualSignToken.value;
    // check whether the attribute value wrapper in quotes
    const isAttrValueQuote = nextToEqualSignTokenValue === SINGLE_QUOTE
        || nextToEqualSignTokenValue === DOUBLE_QUOTE;

    // for no quotes after `=` the last token before `]` should be a word-type one
    // e.g. 'div[style*=margin]'
    //      'div[style*=MARGIN i]'
    if (!isAttrValueQuote) {
        if (lastAttrTokenType === TOKEN_TYPE.WORD) {
            return true;
        }
        // otherwise signal an error
        // e.g. 'table[style*=border: 0px"]'
        throw new Error(`'[${context.attributeBuffer}]' is not a valid attribute`);
    }

    // otherwise if quotes for value are present
    // the last token before `]` can still be word-type token
    // e.g. 'div[style*="MARGIN" i]'
    if (lastAttrTokenType === TOKEN_TYPE.WORD
        && lastAttrTokenValue?.toLocaleLowerCase() === ATTRIBUTE_CASE_INSENSITIVE_FLAG) {
        return prevToLastAttrTokenValue === nextToEqualSignTokenValue;
    }

    // eventually if there is quotes for attribute value and last token is not a word,
    // the closing mark should be the same quote as opening one
    return lastAttrTokenValue === nextToEqualSignTokenValue;
};

/**
 * Checks whether the `tokenValue` is a whitespace character.
 *
 * @param tokenValue Token value.
 *
 * @returns True if `tokenValue` is a whitespace character.
 */
export const isWhiteSpaceChar = (tokenValue: string | undefined): boolean => {
    if (!tokenValue) {
        return false;
    }
    return WHITE_SPACE_CHARACTERS.includes(tokenValue);
};
