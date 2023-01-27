import { convert } from './converter';

import { Token, tokenize } from '../common/tokenizer';

import { SUPPORTED_SELECTOR_MARKS, EQUAL_SIGN } from '../common/constants';

/**
 * Prepares `rawSelector` and splits it into tokens.
 *
 * @param rawSelector Raw css selector.
 *
 * @returns Array of tokens supported for selector.
 */
export const tokenizeSelector = (rawSelector: string): Token[] => {
    const selector = convert(rawSelector);
    return tokenize(selector, SUPPORTED_SELECTOR_MARKS);
};

/**
 * Splits `attribute` into tokens.
 *
 * @param attribute Input attribute.
 *
 * @returns Array of tokens supported for attribute.
 */
export const tokenizeAttribute = (attribute: string): Token[] => {
    // equal sigh `=` in attribute is considered as `TOKEN_TYPE.MARK`
    return tokenize(attribute, [...SUPPORTED_SELECTOR_MARKS, EQUAL_SIGN]);
};
