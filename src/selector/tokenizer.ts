import { convert } from './converter';

import { SUPPORTED_SELECTOR_MARKS } from '../common/constants';

export enum TokenType {
    Mark = 'mark',
    Word = 'word',
}

export interface Token {
    type: TokenType;
    value: string;
}

/**
 * Splits selector string into tokens.
 *
 * @param rawSelector Raw css selector.
 */
export const tokenize = (rawSelector: string): Token[] => {
    const selector = convert(rawSelector);

    // buffer is needed for words collecting while iterating
    let buffer = '';
    // result collection
    const tokens: Token[] = [];

    const selectorSymbols = selector.split('');
    // iterate through selector chars and collect tokens
    selectorSymbols.forEach((symbol, i) => {
        if (SUPPORTED_SELECTOR_MARKS.includes(symbol)) {
            tokens.push({ type: TokenType.Mark, value: symbol });
            return;
        }
        buffer += symbol;
        const nextSymbol = selectorSymbols[i + 1];
        // string end has been reached if nextSymbol is undefined
        if (!nextSymbol || SUPPORTED_SELECTOR_MARKS.includes(nextSymbol)) {
            tokens.push({ type: TokenType.Word, value: buffer });
            buffer = '';
        }
    });

    return tokens;
};
