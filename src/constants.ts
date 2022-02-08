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
export const SEMICOLON = ';';
export const COLON = ':';

export const SINGLE_QUOTE = '\'';
export const DOUBLE_QUOTE = '"';

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

// absolute:
const CONTAINS_PSEUDO_CLASS_MARKERS = [
    'contains',
    'has-text',
    '-abp-contains',
];
const MATCHES_CSS_PSEUDO_CLASS_MARKERS = [
    'matches-css',
    'matches-css-before',
    'matches-css-after',
];
const MATCHES_ATTR_PSEUDO_CLASS_MARKER = 'matches-attr';
const MATCHES_PROP_PSEUDO_CLASS_MARKER = 'matches-property';
const XPATH_PSEUDO_CLASS_MARKER = 'xpath';
const NTH_ANCESTOR_PSEUDO_CLASS_MARKER = 'nth-ancestor';
const REMOVE_PSEUDO_CLASS_MARKER = 'remove';

// relative:
const HAS_PSEUDO_CLASS_MARKERS = [
    'has',
    'if',
    '-abp-has',
];
const IF_NOT_PSEUDO_CLASS_MARKER = 'if-not';
const IS_PSEUDO_CLASS_MARKER = 'is';

// :upward() can be both absolute or relative depending on arg
// so we handle it separately
export const UPWARD_PSEUDO_CLASS_MARKER = 'upward';

export const ABSOLUTE_PSEUDO_CLASSES = [
    ...CONTAINS_PSEUDO_CLASS_MARKERS,
    ...MATCHES_CSS_PSEUDO_CLASS_MARKERS,
    MATCHES_ATTR_PSEUDO_CLASS_MARKER,
    MATCHES_PROP_PSEUDO_CLASS_MARKER,
    XPATH_PSEUDO_CLASS_MARKER,
    NTH_ANCESTOR_PSEUDO_CLASS_MARKER,
    REMOVE_PSEUDO_CLASS_MARKER,
];

export const RELATIVE_PSEUDO_CLASSES = [
    ...HAS_PSEUDO_CLASS_MARKERS,
    IF_NOT_PSEUDO_CLASS_MARKER,
    IS_PSEUDO_CLASS_MARKER,
];

export const SUPPORTED_PSEUDO_CLASSES = [
    ...ABSOLUTE_PSEUDO_CLASSES,
    ...RELATIVE_PSEUDO_CLASSES,
    UPWARD_PSEUDO_CLASS_MARKER,
];
