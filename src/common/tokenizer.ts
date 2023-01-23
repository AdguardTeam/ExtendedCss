export enum TokenType {
    Mark = 'mark',
    Word = 'word',
}

export type Token = {
    type: TokenType;
    value: string;
};

/**
 * Splits `input` string into tokens.
 *
 * @param input Input string to tokenize.
 * @param supportedMarks Array of supported marks to considered as `TokenType.Mark`;
 * all other will be considered as `TokenType.Word`.
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
                tokens.push({ type: TokenType.Word, value: wordBuffer });
                // reset the buffer
                wordBuffer = '';
            }
            // save current symbol as "mark"
            tokens.push({ type: TokenType.Mark, value: symbol });
            return;
        }
        // otherwise collect symbol to the buffer
        wordBuffer += symbol;
    });

    // save the last collected word
    if (wordBuffer.length > 0) {
        tokens.push({ type: TokenType.Word, value: wordBuffer });
    }

    return tokens;
};
