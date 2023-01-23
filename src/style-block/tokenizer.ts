import { Token, tokenize } from '../common/tokenizer';

import { SUPPORTED_STYLE_DECLARATION_MARKS } from '../common/constants';

/**
 * Trims `rawStyle` and splits it into tokens.
 *
 * @param rawStyle Style declaration block content inside curly bracket — `{` and `}` —
 * can be a single style declaration or a list of declarations.
 *
 * @returns Array of tokens supported for style declaration block.
 */
export const tokenizeStyleBlock = (rawStyle: string): Token[] => {
    const styleDeclaration = rawStyle.trim();
    return tokenize(styleDeclaration, SUPPORTED_STYLE_DECLARATION_MARKS);
};
