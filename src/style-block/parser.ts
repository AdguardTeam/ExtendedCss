import { tokenizeStyleBlock } from './tokenizer';

import { Token, TOKEN_TYPE } from '../common/tokenizer';

import {
    COLON,
    SEMICOLON,
    SINGLE_QUOTE,
    DOUBLE_QUOTE,
    BACKSLASH,
    SPACE,
    TAB,
    CARRIAGE_RETURN,
    LINE_FEED,
    FORM_FEED,
    WHITE_SPACE_CHARACTERS,
    STYLE_ERROR_PREFIX,
} from '../common/constants';

/**
 * Describes possible style declaration parts.
 *
 * IMPORTANT: it is used as 'const' instead of 'enum' to avoid side effects
 * during ExtendedCss import into other libraries.
 */
const DECLARATION_PART = {
    PROPERTY: 'property',
    VALUE: 'value',
} as const;

type DeclarationPart = typeof DECLARATION_PART[keyof typeof DECLARATION_PART];

export type StyleDeclaration = {
    [key in DeclarationPart]: string;
};

type QuoteMark = '"' | "'";

/**
 * Interface for style declaration parser context.
 */
export type Context = {
    /**
     * Collection of parsed style declarations.
     */
    styles: StyleDeclaration[];

    /**
     * Current processing part of style declaration — 'property' or 'value'.
     */
    processing: DeclarationPart;

    /**
     * Needed for collecting style property.
     */
    bufferProperty: string,

    /**
     * Needed for collecting style value.
     */
    bufferValue: string,

    /**
     * Buffer for style value quote mark.
     * Needed for proper quoter balancing.
     */
    valueQuoteMark: QuoteMark | null;
};

/**
 * Checks whether the quotes has been opened for style value.
 *
 * @param context Style block parser context.
 *
 * @returns True if style value has already opened quotes.
 */
const isValueQuotesOpen = (context: Context) => {
    return context.bufferValue !== ''
        && context.valueQuoteMark !== null;
};

/**
 * Saves parsed property and value to collection of parsed styles.
 * Prunes context buffers for property and value.
 *
 * @param context Style block parser context.
 */
const collectStyle = (context: Context): void => {
    context.styles.push({
        property: context.bufferProperty.trim(),
        value: context.bufferValue.trim(),
    });
    // reset buffers
    context.bufferProperty = '';
    context.bufferValue = '';
};

/**
 * Handles token which is supposed to be a part of style **property**.
 *
 * @param context Style block parser context.
 * @param styleBlock Whole style block which is being parsed.
 * @param token Current token.
 *
 * @throws An error on invalid token.
 */
const processPropertyToken = (
    context: Context,
    styleBlock: string,
    token: Token,
): void => {
    const { value: tokenValue } = token;
    switch (token.type) {
        case TOKEN_TYPE.WORD:
            if (context.bufferProperty.length > 0) {
                // e.g. 'padding top: 0;' - current tokenValue is 'top' which is not valid
                throw new Error(`Invalid style property in style block: '${styleBlock}'`);
            }
            context.bufferProperty += tokenValue;
            break;
        case TOKEN_TYPE.MARK:
            // only colon and whitespaces are allowed while style property parsing
            if (tokenValue === COLON) {
                if (context.bufferProperty.trim().length === 0) {
                    // e.g. such style block: '{ : none; }'
                    throw new Error(`Missing style property before ':' in style block: '${styleBlock}'`);
                }
                // the property successfully collected
                context.bufferProperty = context.bufferProperty.trim();
                // prepare for value collecting
                context.processing = DECLARATION_PART.VALUE;
                // the property buffer shall be reset after the value is successfully collected
            } else if (WHITE_SPACE_CHARACTERS.includes(tokenValue)) {
                // do nothing and skip the token
            } else {
                // if after the property there is anything other than ':' except whitespace, this is a parse error
                // https://www.w3.org/TR/css-syntax-3/#consume-declaration
                throw new Error(`Invalid style declaration in style block: '${styleBlock}'`);
            }
            break;
        default:
            throw new Error(`Unsupported style property character: '${tokenValue}' in style block: '${styleBlock}'`);
    }
};

/**
 * Handles token which is supposed to be a part of style **value**.
 *
 * @param context Style block parser context.
 * @param styleBlock Whole style block which is being parsed.
 * @param token Current token.
 *
 * @throws An error on invalid token.
 */
const processValueToken = (
    context: Context,
    styleBlock: string,
    token: Token,
) => {
    const { value: tokenValue } = token;
    if (token.type === TOKEN_TYPE.WORD) {
        // simply collect to buffer
        context.bufferValue += tokenValue;
    } else {
        // otherwise check the mark
        switch (tokenValue) {
            case COLON:
                // the ':' character inside of the value should be inside of quotes
                // otherwise the value is not valid
                // e.g. 'content: display: none'
                // parser is here        ↑
                if (!isValueQuotesOpen(context)) {
                    // eslint-disable-next-line max-len
                    throw new Error(`Invalid style value for property '${context.bufferProperty}' in style block: '${styleBlock}'`);
                }
                // collect the colon inside quotes
                // e.g. 'content: "test:123"'
                // parser is here      ↑
                context.bufferValue += tokenValue;
                break;
            case SEMICOLON:
                if (isValueQuotesOpen(context)) {
                    // ';' inside quotes is part of style value
                    // e.g. 'content: "test;"'
                    context.bufferValue += tokenValue;
                } else {
                    // otherwise the value is successfully collected
                    // save parsed style
                    collectStyle(context);
                    // prepare for value collecting
                    context.processing = DECLARATION_PART.PROPERTY;
                }
                break;
            case SINGLE_QUOTE:
            case DOUBLE_QUOTE:
                // if quotes are not open
                if (context.valueQuoteMark === null) {
                    // save the opening quote mark for later comparison
                    context.valueQuoteMark = tokenValue;
                } else if (
                    !context.bufferValue.endsWith(BACKSLASH)
                    // otherwise a quote appeared in the value earlier,
                    // and non-escaped quote should be checked whether it is a closing quote
                    && context.valueQuoteMark === tokenValue
                ) {
                    context.valueQuoteMark = null;
                }
                // always save the quote to the buffer
                // but after the context.bufferValue is checked for BACKSLASH above
                // e.g. 'content: "test:123"'
                //      'content: "\""'
                context.bufferValue += tokenValue;
                break;
            case BACKSLASH:
                if (!isValueQuotesOpen(context)) {
                    // eslint-disable-next-line max-len
                    throw new Error(`Invalid style value for property '${context.bufferProperty}' in style block: '${styleBlock}'`);
                }
                // collect the backslash inside quotes
                // e.g. ' content: "\"" '
                // parser is here   ↑
                context.bufferValue += tokenValue;
                break;
            case SPACE:
            case TAB:
            case CARRIAGE_RETURN:
            case LINE_FEED:
            case FORM_FEED:
                // whitespace should be collected only if the value collecting started
                // which means inside of the value
                // e.g. 'width: 100% !important'
                // parser is here   ↑
                if (context.bufferValue.length > 0) {
                    context.bufferValue += tokenValue;
                }
                // otherwise it can be omitted
                // e.g. 'width:  100% !important'
                // here        ↑
                break;
            default:
                throw new Error(`Unknown style declaration token: '${tokenValue}'`);
        }
    }
};

/**
 * Parses css rule style block.
 *
 * @param rawStyleBlock Style block to parse.
 *
 * @returns Array of style declarations.
 * @throws An error on invalid style block.
 */
export const parseStyleBlock = (rawStyleBlock: string): StyleDeclaration[] => {
    const styleBlock = rawStyleBlock.trim();
    const tokens = tokenizeStyleBlock(styleBlock);

    const context: Context = {
        // style declaration parsing always starts with 'property'
        processing: DECLARATION_PART.PROPERTY,
        styles: [],
        bufferProperty: '',
        bufferValue: '',
        valueQuoteMark: null,
    };

    let i = 0;
    while (i < tokens.length) {
        const token = tokens[i];
        if (!token) {
            break;
        }
        if (context.processing === DECLARATION_PART.PROPERTY) {
            processPropertyToken(context, styleBlock, token);
        } else if (context.processing === DECLARATION_PART.VALUE) {
            processValueToken(context, styleBlock, token);
        } else {
            throw new Error('Style declaration parsing failed');
        }
        i += 1;
    }

    // unbalanced value quotes
    // e.g. 'content: "test} '
    if (isValueQuotesOpen(context)) {
        throw new Error(`Unbalanced style declaration quotes in style block: '${styleBlock}'`);
    }

    // collected property and value have not been saved to styles;
    // it is possible for style block with no semicolon at the end
    // e.g. such style block: '{ display: none }'
    if (context.bufferProperty.length > 0) {
        if (context.bufferValue.length === 0) {
            // e.g. such style blocks:
            //   '{ display:  }'
            //   '{ remove }'
            // eslint-disable-next-line max-len
            throw new Error(`Missing style value for property '${context.bufferProperty}' in style block '${styleBlock}'`);
        }
        collectStyle(context);
    }

    // rule with empty style block
    // e.g. 'div { }'
    if (context.styles.length === 0) {
        throw new Error(STYLE_ERROR_PREFIX.NO_STYLE);
    }

    return context.styles;
};
