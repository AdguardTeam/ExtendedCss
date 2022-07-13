import { convert } from './converter';

import { SUPPORTED_SELECTOR_MARKS } from '../constants';

export enum TokenType {
    Mark = 'mark',
    Word = 'word',
}

export interface Token {
    type: TokenType,
    value: string,
}

/**
 * Splits selector string into tokens
 * @param rawSelector raw css selector
 */
export const tokenize = (rawSelector: string): Token[] => {
    const selector = convert(rawSelector);

    // currently processed
    let symbol;
    // for words collecting while iterating
    let buffer = '';
    // result collection
    const tokens = [];

    // iterate selector chars and collect tokens
    for (let i = 0; i < selector.length; i += 1) {
        symbol = selector[i];
        if (SUPPORTED_SELECTOR_MARKS.indexOf(symbol) > -1) {
            tokens.push({ type: TokenType.Mark, value: symbol });
            continue;
        }
        buffer += symbol;
        const nextSymbol = selector[i + 1];
        // string end has been reached if nextSymbol is undefined
        if (!nextSymbol || SUPPORTED_SELECTOR_MARKS.indexOf(nextSymbol) > -1) {
            tokens.push({ type: TokenType.Word, value: buffer });
            buffer = '';
        }
    }

    return tokens;
};
