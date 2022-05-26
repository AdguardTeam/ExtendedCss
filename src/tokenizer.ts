import { beautify } from './beautifier';

import { ACCEPTABLE_MARKS } from './constants';

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
    const selector = beautify(rawSelector);

    // currently processed
    let symbol;
    // for words collecting while iterating
    let buffer = '';
    // result collection
    const tokens = [];

    // iterate selector chars and collect tokens
    for (let i = 0; i < selector.length; i += 1) {
        symbol = selector[i];
        if (ACCEPTABLE_MARKS.indexOf(symbol) > -1) {
            tokens.push({ type: TokenType.Mark, value: symbol });
            continue;
        }
        buffer = `${buffer}${symbol}`;
        const nextSymbol = selector[i + 1];
        // string end has been reached if nextSymbol is undefined
        if (!nextSymbol || ACCEPTABLE_MARKS.indexOf(nextSymbol) > -1) {
            tokens.push({ type: TokenType.Word, value: buffer });
            buffer = '';
        }
    }

    return tokens;
};
