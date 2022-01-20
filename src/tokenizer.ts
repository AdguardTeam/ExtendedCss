/**
 * Splits selector string into tokens
 * @param {string} selector css selector
 * @returns {Array<[string, number, number]>} array of tokens
 */
export const tokenizer = (selector) => {
    const OPEN_SQUARE = '[';
    const CLOSE_SQUARE = ']';
    const OPEN_PARENTHESES = '(';
    const CLOSE_PARENTHESES = ')';
    const OPEN_CURLY = '{';
    const CLOSE_CURLY = '}';

    const ID_MARKER = '#'
    const CLASS_MARKER = '.';
    const UNIVERSAL_SELECTOR = '*';
    const SELECTOR_LIST_SEPARATOR = ',';
    const SEMICOLON = ';';
    const COLON = ':';

    const DESCENDANT_COMBINATOR = ' ';
    const CHILD_COMBINATOR = '>';
    const NEXT_SIBLING_COMBINATOR = '+';
    const SUBSEQUENT_SIBLING_COMBINATOR = '~';

    const ACCEPTABLE_MARKS = [
        OPEN_SQUARE,
        CLOSE_SQUARE,
        OPEN_PARENTHESES,
        CLOSE_PARENTHESES,
        OPEN_CURLY,
        CLOSE_CURLY,
        ID_MARKER,
        CLASS_MARKER,
        UNIVERSAL_SELECTOR,
        SELECTOR_LIST_SEPARATOR,
        SEMICOLON,
        COLON,
        DESCENDANT_COMBINATOR,
        CHILD_COMBINATOR,
        NEXT_SIBLING_COMBINATOR,
        SUBSEQUENT_SIBLING_COMBINATOR,
    ];

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
            // 1 for token length
            tokens.push([symbol, i, 1]);
            continue;
        }
        buffer = `${buffer}${symbol}`;
        const nextSymbol = selector[i + 1];
        // string end has been reached if nextSymbol is undefined
        if (!nextSymbol || ACCEPTABLE_MARKS.indexOf(nextSymbol) > -1) {
            const tokenPosition = i - buffer.length + 1;
            tokens.push([buffer, tokenPosition, buffer.length]);
            buffer = '';
        }
    }

    return tokens;
};
