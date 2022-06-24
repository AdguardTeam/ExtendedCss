const LEFT_SQUARE_BRACKET = '[';
const RIGHT_SQUARE_BRACKET = ']';
const LEFT_PARENTHESIS = '(';
const RIGHT_PARENTHESIS = ')';
const LEFT_CURLY_BRACKET = '{';
const RIGHT_CURLY_BRACKET = '}';

export const BRACKETS = {
    SQUARE: {
        LEFT: LEFT_SQUARE_BRACKET,
        RIGHT: RIGHT_SQUARE_BRACKET,
    },
    PARENTHESES: {
        LEFT: LEFT_PARENTHESIS,
        RIGHT: RIGHT_PARENTHESIS,
    },
    CURLY: {
        LEFT: LEFT_CURLY_BRACKET,
        RIGHT: RIGHT_CURLY_BRACKET,
    },
};

export const SLASH = '/';
export const BACKSLASH = '\\';

export const SPACE = ' ';
export const COMMA = ',';
export const DOT = '.';
export const SEMICOLON = ';';
export const COLON = ':';

export const SINGLE_QUOTE = '\'';
export const DOUBLE_QUOTE = '"';

// do not consider hyphen as separated mark
// to avoid pseudo-class names splitting
// e.g. matches-css or if-not
// const HYPHEN = '-';

export const CARET = '^';
export const DOLLAR_SIGN = '$';

export const EQUAL_SIGN = '=';

export const TAB = '\t';
export const CARRIAGE_RETURN = '\r';
export const LINE_FEED = '\n';
export const FORM_FEED = '\f';

export const WHITE_SPACE_CHARACTERS = [
    SPACE,
    TAB,
    CARRIAGE_RETURN,
    LINE_FEED,
    FORM_FEED,
];

// for universal selector and attributes
export const ASTERISK = '*';
export const ID_MARKER = '#';
export const CLASS_MARKER = DOT;

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
    LEFT_SQUARE_BRACKET,
    RIGHT_SQUARE_BRACKET,
    LEFT_PARENTHESIS,
    RIGHT_PARENTHESIS,
    LEFT_CURLY_BRACKET,
    RIGHT_CURLY_BRACKET,
    SLASH,
    BACKSLASH,
    SEMICOLON,
    COLON,
    COMMA,
    SINGLE_QUOTE,
    DOUBLE_QUOTE,
    CARET,
    DOLLAR_SIGN,
    ASTERISK,
    ID_MARKER,
    CLASS_MARKER,
    DESCENDANT_COMBINATOR,
    CHILD_COMBINATOR,
    NEXT_SIBLING_COMBINATOR,
    SUBSEQUENT_SIBLING_COMBINATOR,
    TAB,
    CARRIAGE_RETURN,
    LINE_FEED,
    FORM_FEED,
];

// absolute:
export const CONTAINS_PSEUDO_CLASS_MARKERS = [
    'contains',
    'has-text',
    '-abp-contains',
];
const MATCHES_CSS_PSEUDO = 'matches-css';
export const MATCHES_CSS_BEFORE_PSEUDO = 'matches-css-before';
export const MATCHES_CSS_AFTER_PSEUDO = 'matches-css-after';
export const MATCHES_CSS_PSEUDO_CLASS_MARKERS = [
    MATCHES_CSS_PSEUDO,
    MATCHES_CSS_BEFORE_PSEUDO,
    MATCHES_CSS_AFTER_PSEUDO,
];
export const MATCHES_ATTR_PSEUDO_CLASS_MARKER = 'matches-attr';
export const MATCHES_PROPERTY_PSEUDO_CLASS_MARKER = 'matches-property';
export const XPATH_PSEUDO_CLASS_MARKER = 'xpath';
export const NTH_ANCESTOR_PSEUDO_CLASS_MARKER = 'nth-ancestor';

/**
 * :upward() can get number or selector arg
 * and if the arg is selector it should be standard, not extended
 * so :upward pseudo-class is always absolute
 */
export const UPWARD_PSEUDO_CLASS_MARKER = 'upward';

/**
 * :remove() pseudo-class is used for element actions, not for element selecting
 * and 'clear' selector should not contain it
 * so selector parser should consider it as invalid
 */
export const REMOVE_PSEUDO_CLASS_MARKER = 'remove';

// relative:
export const HAS_PSEUDO_CLASS_MARKERS = [
    'has',
    'if',
    '-abp-has',
];
export const IF_NOT_PSEUDO_CLASS_MARKER = 'if-not';
export const IS_PSEUDO_CLASS_MARKER = 'is';
export const NOT_PSEUDO_CLASS_MARKER = 'not';

export const ABSOLUTE_PSEUDO_CLASSES = [
    ...CONTAINS_PSEUDO_CLASS_MARKERS,
    ...MATCHES_CSS_PSEUDO_CLASS_MARKERS,
    MATCHES_ATTR_PSEUDO_CLASS_MARKER,
    MATCHES_PROPERTY_PSEUDO_CLASS_MARKER,
    XPATH_PSEUDO_CLASS_MARKER,
    NTH_ANCESTOR_PSEUDO_CLASS_MARKER,
    UPWARD_PSEUDO_CLASS_MARKER,
];

export const RELATIVE_PSEUDO_CLASSES = [
    ...HAS_PSEUDO_CLASS_MARKERS,
    IF_NOT_PSEUDO_CLASS_MARKER,
    IS_PSEUDO_CLASS_MARKER,
    NOT_PSEUDO_CLASS_MARKER,
];

export const SUPPORTED_PSEUDO_CLASSES = [
    ...ABSOLUTE_PSEUDO_CLASSES,
    ...RELATIVE_PSEUDO_CLASSES,
];

export const REGEXP_WITH_FLAGS_REGEXP = /^\s*\/.*\/[gmisuy]*\s*$/;

export const REGEXP_ANY_SYMBOL = '.*';

/**
 * ':scope' is used for extended pseudo-class :has(), if-not(), :is() and :not()
 *
 * ':where' is needed for limitation it's using inside :has() arg
 * https://bugs.chromium.org/p/chromium/issues/detail?id=669058#c54 [1]
 */
export const REGULAR_PSEUDO_CLASSES = {
    SCOPE: 'scope',
    WHERE: 'where',
};

/**
 * ':after' and ':before' are needed for :matches-css() pseudo-class
 * all other are needed for :has() limitation after regular pseudo-elements
 * https://bugs.chromium.org/p/chromium/issues/detail?id=669058#c54 [3]
 */
export const REGULAR_PSEUDO_ELEMENTS = {
    AFTER: 'after',
    BACKDROP: 'backdrop',
    BEFORE: 'before',
    CUE: 'cue',
    CUE_REGION: 'cue-region',
    FIRST_LETTER: 'first-letter',
    FIRST_LINE: 'first-line',
    FILE_SELECTION_BUTTON: 'file-selector-button',
    GRAMMAR_ERROR: 'grammar-error',
    MARKER: 'marker',
    PART: 'part',
    PLACEHOLDER: 'placeholder',
    SELECTION: 'selection',
    SLOTTED: 'slotted',
    SPELLING_ERROR: 'spelling-error',
    TARGET_TEXT: 'target-text',
};

// limit applying of wildcard :is and :not pseudo-class only to html children
// e.g. ':is(.page, .main) > .banner' or '*:not(span):not(p)'
export const IS_OR_NOT_PSEUDO_SELECTING_ROOT = `html ${ASTERISK}`;
