export declare enum TokenType {
    Mark = "mark",
    Word = "word"
}
export interface Token {
    type: TokenType;
    value: string;
}
/**
 * Splits selector string into tokens
 * @param rawSelector raw css selector
 */
export declare const tokenize: (rawSelector: string) => Token[];
