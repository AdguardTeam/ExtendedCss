/**
 * Possible token types.
 *
 * IMPORTANT: it is used as 'const' instead of 'enum' to avoid side effects
 * during ExtendedCss import into other libraries.
 */
export const TOKEN_TYPE = {
    MARK: 'mark',
    WORD: 'word',
} as const;

type TokenType = typeof TOKEN_TYPE[keyof typeof TOKEN_TYPE];

export type Token = {
    type: TokenType;
    value: string;
};

/**
 * Splits `input` string into tokens.
 *
 * @param input Input string to tokenize.
 * @param supportedMarks Array of supported marks to considered as `TOKEN_TYPE.MARK`;
 * all other will be considered as `TOKEN_TYPE.WORD`.
 *
 * @returns Array of tokens.
 */
export const tokenize = (input: string, supportedMarks: string[]): Token[] => {
    // buffer is needed for words collecting while iterating
    let wordBuffer = '';
    // result collection
    const tokens: Token[] = [];

    const selectorSymbols = input.split('');
    // iterate through selector chars and collect tokens
    selectorSymbols.forEach((symbol) => {
        if (supportedMarks.includes(symbol)) {
            // if anything was collected to the buffer before
            if (wordBuffer.length > 0) {
                // now it is time to stop buffer collecting and save is as "word"
                tokens.push({ type: TOKEN_TYPE.WORD, value: wordBuffer });
                // reset the buffer
                wordBuffer = '';
            }
            // save current symbol as "mark"
            tokens.push({ type: TOKEN_TYPE.MARK, value: symbol });
            return;
        }
        // otherwise collect symbol to the buffer
        wordBuffer += symbol;
    });

    // save the last collected word
    if (wordBuffer.length > 0) {
        tokens.push({ type: TOKEN_TYPE.WORD, value: wordBuffer });
    }

    return tokens;
};
