const OPEN_SQUARE = '[';
const CLOSE_SQUARE = ']';
const OPEN_PARENTHESES = '(';
const CLOSE_PARENTHESES = ')';
const OPEN_CURLY = '{';
const CLOSE_CURLY = '}';

// export const BRACKETS = [
//     OPEN_SQUARE,
//     CLOSE_SQUARE,
//     OPEN_PARENTHESES,
//     CLOSE_PARENTHESES,
//     OPEN_CURLY,
//     CLOSE_CURLY,
// ];

export const BRACKETS = {
    SQUARE: {
        OPEN: OPEN_SQUARE,
        CLOSE: CLOSE_SQUARE,
    },
    PARENTHESES: {
        OPEN: OPEN_PARENTHESES,
        CLOSE: CLOSE_PARENTHESES,
    },
    CURLY: {
        OPEN: OPEN_CURLY,
        CLOSE: CLOSE_CURLY,
    },
};


export const SPACE = ' ';
export const COMMA = ',';
const SEMICOLON = ';';
export const COLON = ':';

// for universal selector and attributes
export const ASTERISK = '*';
export const ID_MARKER = '#'
export const CLASS_MARKER = '.';

export const DESCENDANT_COMBINATOR = SPACE;
export const CHILD_COMBINATOR = '>';
export const NEXT_SIBLING_COMBINATOR = '+';
export const SUBSEQUENT_SIBLING_COMBINATOR = '~';

export const COMBINATORS = [
    DESCENDANT_COMBINATOR,
    CHILD_COMBINATOR,
    NEXT_SIBLING_COMBINATOR,
    SUBSEQUENT_SIBLING_COMBINATOR,
];


export const ACCEPTABLE_MARKS = [
    OPEN_SQUARE,
    CLOSE_SQUARE,
    OPEN_PARENTHESES,
    CLOSE_PARENTHESES,
    OPEN_CURLY,
    CLOSE_CURLY,
    ID_MARKER,
    CLASS_MARKER,
    ASTERISK,
    COMMA,
    SEMICOLON,
    COLON,
    DESCENDANT_COMBINATOR,
    CHILD_COMBINATOR,
    NEXT_SIBLING_COMBINATOR,
    SUBSEQUENT_SIBLING_COMBINATOR,
];

export const TOKEN_TYPES = {
    WORD: 'word',
    MARK: 'mark',
};

const HAS_PSEUDO_CLASS_MARKERS = [
    'has',
    'if',
    '-abp-has',
];
const CONTAINS_PSEUDO_CLASS_MARKERS = [
    'contains',
    'has-text',
    '-abp-contains',
];

export const SUPPORTED_PSEUDO_CLASSES = [
    ...HAS_PSEUDO_CLASS_MARKERS,
    ...CONTAINS_PSEUDO_CLASS_MARKERS,
];
