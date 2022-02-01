import {
    ACCEPTABLE_MARKS,
    TOKEN_TYPES,
} from './constants';

/**
 * @typedef {Array} Token
 * @property {string} 0 - type
 * @property {string} 1 - value
 */

/**
 * Splits selector string into tokens
 * @param {string} selector css selector
 * @returns {Token[]} array of tokens
 */
export const tokenize = (selector) => {
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
            // start and end is equal because length is 1
            // tokens.push([TOKEN_TYPES.MARK, symbol, i, i]);
            tokens.push([TOKEN_TYPES.MARK, symbol]);
            continue;
        }
        buffer = `${buffer}${symbol}`;
        const nextSymbol = selector[i + 1];
        // string end has been reached if nextSymbol is undefined
        if (!nextSymbol || ACCEPTABLE_MARKS.indexOf(nextSymbol) > -1) {
            // const tokenPosition = i - buffer.length + 1;
            // tokens.push([TOKEN_TYPES.WORD, buffer, tokenPosition, i]);
            tokens.push([TOKEN_TYPES.WORD, buffer]);
            buffer = '';
        }
    }

    return tokens;
};
