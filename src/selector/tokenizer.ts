import { convert } from './converter';

import { SUPPORTED_SELECTOR_MARKS, EQUAL_SIGN } from '../common/constants';

export enum TokenType {
    Mark = 'mark',
    Word = 'word',
}

export interface Token {
    type: TokenType;
    value: string;
}

/**
 * Splits `input` string into tokens.
 *
 * @param input Input string to tokenize.
 * @param supportedMarks Array of supported marks to considered as `TokenType.Mark`;
 * all other will be considered as `TokenType.Word`.
 */
const tokenize = (input: string, supportedMarks: string[]): Token[] => {
    // buffer is needed for words collecting while iterating
    let buffer = '';
    // result collection
    const tokens: Token[] = [];

    const selectorSymbols = input.split('');
    // iterate through selector chars and collect tokens
    selectorSymbols.forEach((symbol, i) => {
        if (supportedMarks.includes(symbol)) {
            tokens.push({ type: TokenType.Mark, value: symbol });
            return;
        }
        buffer += symbol;
        const nextSymbol = selectorSymbols[i + 1];
        // string end has been reached if nextSymbol is undefined
        if (!nextSymbol || supportedMarks.includes(nextSymbol)) {
            tokens.push({ type: TokenType.Word, value: buffer });
            buffer = '';
        }
    });

    return tokens;
};

/**
 * Prepares `rawSelector` and splits it into tokens.
 *
 * @param rawSelector Raw css selector.
 */
export const tokenizeSelector = (rawSelector: string): Token[] => {
    const selector = convert(rawSelector);
    return tokenize(selector, SUPPORTED_SELECTOR_MARKS);
};

/**
 * Splits `attribute` into tokens.
 *
 * @param attribute Input attribute.
 */
export const tokenizeAttribute = (attribute: string): Token[] => {
    // equal sigh `=` in attribute is considered as `TokenType.Mark`
    return tokenize(attribute, [...SUPPORTED_SELECTOR_MARKS, EQUAL_SIGN]);
};
