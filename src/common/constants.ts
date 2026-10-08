const EXTENDED_CSS_VERSION: string = '__EXTENDED_CSS_VERSION__';
export { EXTENDED_CSS_VERSION };

const LEFT_SQUARE_BRACKET = '[';
const RIGHT_SQUARE_BRACKET = ']';
const LEFT_PARENTHESIS = '(';
const RIGHT_PARENTHESIS = ')';
const LEFT_CURLY_BRACKET = '{';
const RIGHT_CURLY_BRACKET = '}';

export const BRACKET = {
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

// do not consider hyphen `-` as separated mark
// to avoid pseudo-class names splitting
// e.g. 'matches-css' or 'if-not'

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

export const SUPPORTED_SELECTOR_MARKS = [
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

/**
 * Limited list of available symbols before slash `/`
 * to check whether it is valid regexp pattern opening.
 */
export const POSSIBLE_MARKS_BEFORE_REGEXP = {
    COMMON: [
        // e.g. ':matches-attr(/data-/)'
        LEFT_PARENTHESIS,
        // e.g. `:matches-attr('/data-/')`
        SINGLE_QUOTE,
        // e.g. ':matches-attr("/data-/")'
        DOUBLE_QUOTE,
        // e.g. ':matches-attr(check=/data-v-/)'
        EQUAL_SIGN,
        // e.g. ':matches-property(inner./_test/=null)'
        DOT,
        // e.g. ':matches-css(height:/20px/)'
        COLON,
        // ':matches-css-after( content  :   /(\\d+\\s)*me/  )'
        SPACE,
    ],
    CONTAINS: [
        // e.g. ':contains(/text/)'
        LEFT_PARENTHESIS,
        // e.g. `:contains('/text/')`
        SINGLE_QUOTE,
        // e.g. ':contains("/text/")'
        DOUBLE_QUOTE,
    ],
};

export const SUPPORTED_STYLE_DECLARATION_MARKS = [
    // divider between property and value in declaration
    COLON,
    // divider between declarations
    SEMICOLON,
    // sometimes is needed for value wrapping
    // e.g. 'content: "-"'
    SINGLE_QUOTE,
    DOUBLE_QUOTE,
    // needed for quote escaping inside the same-type quotes
    BACKSLASH,
    // whitespaces
    SPACE,
    TAB,
    CARRIAGE_RETURN,
    LINE_FEED,
    FORM_FEED,
];

// absolute:
export const CONTAINS_PSEUDO = 'contains';
export const HAS_TEXT_PSEUDO = 'has-text';
export const ABP_CONTAINS_PSEUDO = '-abp-contains';
export const MATCHES_CSS_PSEUDO = 'matches-css';
export const MATCHES_CSS_BEFORE_PSEUDO = 'matches-css-before';
export const MATCHES_CSS_AFTER_PSEUDO = 'matches-css-after';
export const MATCHES_ATTR_PSEUDO_CLASS_MARKER = 'matches-attr';
export const MATCHES_PROPERTY_PSEUDO_CLASS_MARKER = 'matches-property';
export const XPATH_PSEUDO_CLASS_MARKER = 'xpath';
export const NTH_ANCESTOR_PSEUDO_CLASS_MARKER = 'nth-ancestor';

export const CONTAINS_PSEUDO_NAMES = [
    CONTAINS_PSEUDO,
    HAS_TEXT_PSEUDO,
    ABP_CONTAINS_PSEUDO,
];

/**
 * Pseudo-class :upward() can get number or selector arg
 * and if the arg is selector it should be standard, not extended
 * so :upward pseudo-class is always absolute.
 */
export const UPWARD_PSEUDO_CLASS_MARKER = 'upward';

/**
 * Pseudo-class `:remove()` and pseudo-property `remove`
 * are used for element actions, not for element selecting.
 *
 * Selector text should not contain the pseudo-class
 * so selector parser should consider it as invalid
 * and both are handled by stylesheet parser.
 */
export const REMOVE_PSEUDO_MARKER = 'remove';

/**
 * Pseudo-classes `:remove-attr()` and `:remove-class()` are action operators:
 * they remove matching attributes or classes instead of selecting elements.
 *
 * Selector text should not contain these pseudo-classes,
 * so the selector parser considers them invalid,
 * and they are handled by the stylesheet parser.
 */
export const REMOVE_ATTR_PSEUDO_MARKER = 'remove-attr';
export const REMOVE_CLASS_PSEUDO_MARKER = 'remove-class';

/**
 * Action pseudo-class markers which are handled by the stylesheet parser
 * and should never reach the selector parser.
 */
export const ACTION_PSEUDO_MARKERS = [
    REMOVE_PSEUDO_MARKER,
    REMOVE_ATTR_PSEUDO_MARKER,
    REMOVE_CLASS_PSEUDO_MARKER,
] as const;

export type ActionPseudoMarker = typeof ACTION_PSEUDO_MARKERS[number];

/**
 * Action pseudo-class markers which are stored in rule styles
 * and are not CSS properties.
 */
export const ACTION_STYLE_MARKERS = [
    REMOVE_ATTR_PSEUDO_MARKER,
    REMOVE_CLASS_PSEUDO_MARKER,
] as const satisfies readonly ActionPseudoMarker[];

export type ActionStyleMarker = typeof ACTION_STYLE_MARKERS[number];

// relative:
export const HAS_PSEUDO_CLASS_MARKER = 'has';
export const ABP_HAS_PSEUDO_CLASS_MARKER = '-abp-has';
export const HAS_PSEUDO_CLASS_MARKERS = [
    HAS_PSEUDO_CLASS_MARKER,
    ABP_HAS_PSEUDO_CLASS_MARKER,
];
export const IS_PSEUDO_CLASS_MARKER = 'is';
export const NOT_PSEUDO_CLASS_MARKER = 'not';

// standalone (no-argument pseudo-classes that test the element
// itself, not a selector-list of related elements):
export const EMPTY_TRIMMED_PSEUDO_CLASS_MARKER = 'empty-trimmed';

export const STANDALONE_PSEUDO_CLASSES = [
    EMPTY_TRIMMED_PSEUDO_CLASS_MARKER,
];

export const ABSOLUTE_PSEUDO_CLASSES = [
    CONTAINS_PSEUDO,
    HAS_TEXT_PSEUDO,
    ABP_CONTAINS_PSEUDO,
    MATCHES_CSS_PSEUDO,
    MATCHES_CSS_BEFORE_PSEUDO,
    MATCHES_CSS_AFTER_PSEUDO,
    MATCHES_ATTR_PSEUDO_CLASS_MARKER,
    MATCHES_PROPERTY_PSEUDO_CLASS_MARKER,
    XPATH_PSEUDO_CLASS_MARKER,
    NTH_ANCESTOR_PSEUDO_CLASS_MARKER,
    UPWARD_PSEUDO_CLASS_MARKER,
];

export const RELATIVE_PSEUDO_CLASSES = [
    ...HAS_PSEUDO_CLASS_MARKERS,
    IS_PSEUDO_CLASS_MARKER,
    NOT_PSEUDO_CLASS_MARKER,
];

export const SUPPORTED_PSEUDO_CLASSES = [
    ...ABSOLUTE_PSEUDO_CLASSES,
    ...RELATIVE_PSEUDO_CLASSES,
    ...STANDALONE_PSEUDO_CLASSES,
];

// these pseudo-classes should be part of RegularSelector value
// if its arg does not contain extended selectors.
// the ast will be checked after the selector is completely parsed
export const OPTIMIZATION_PSEUDO_CLASSES = [
    NOT_PSEUDO_CLASS_MARKER,
    IS_PSEUDO_CLASS_MARKER,
];

/**
 * ':scope' is used for extended pseudo-class :has(), if-not(), :is() and :not().
 */
export const SCOPE_CSS_PSEUDO_CLASS = ':scope';

/**
 * ':after' and ':before' are needed for :matches-css() pseudo-class
 * all other are needed for :has() limitation after regular pseudo-elements.
 *
 * @see {@link https://bugs.chromium.org/p/chromium/issues/detail?id=669058#c54} [case 3]
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

// ExtendedCss does not support at-rules
// https://developer.mozilla.org/en-US/docs/Web/CSS/At-rule
export const AT_RULE_MARKER = '@';

export const CONTENT_CSS_PROPERTY = 'content';

export const PSEUDO_PROPERTY_POSITIVE_VALUE = 'true';
export const DEBUG_PSEUDO_PROPERTY_GLOBAL_VALUE = 'global';

export const STANDALONE_ERROR_PREFIX = {
    NO_ARGUMENTS: 'Standalone pseudo-class does not accept arguments',
};

export const NO_SELECTOR_ERROR_PREFIX = 'Selector should be defined';

export const STYLE_ERROR_PREFIX = {
    NO_STYLE: 'No style declaration found',
    NO_SELECTOR: `${NO_SELECTOR_ERROR_PREFIX} before style declaration in stylesheet`,
    INVALID_STYLE: 'Invalid style declaration',
    UNCLOSED_STYLE: 'Unclosed style declaration',
    NO_PROPERTY: 'Missing style property in declaration',
    NO_VALUE: 'Missing style value in declaration',
    NO_STYLE_OR_ACTION: 'Style should be declared or action pseudo-class should be used',
    NO_COMMENT: 'Comments are not supported',
};

export const NO_AT_RULE_ERROR_PREFIX = 'At-rules are not supported';

/**
 * Error message shape shared by all action pseudo-classes.
 */
export type ActionErrorPrefix = {
    INVALID_ACTION: string;
    NO_TARGET_SELECTOR: string;
    MULTIPLE_USAGE: string;
    INVALID_POSITION: string;
    INVALID_ARG: string;
};

/**
 * Creates error messages for an action pseudo-class.
 *
 * @param marker Action pseudo-class marker, e.g. 'remove-attr'.
 *
 * @returns Error messages of the action pseudo-class.
 */
const createActionErrorPrefix = (marker: ActionPseudoMarker): ActionErrorPrefix => {
    return {
        INVALID_ACTION: `Invalid :${marker}() pseudo-class in selector`,
        NO_TARGET_SELECTOR: `${NO_SELECTOR_ERROR_PREFIX} before :${marker}() pseudo-class`,
        MULTIPLE_USAGE: `Pseudo-class :${marker}() appears more than once in selector`,
        INVALID_POSITION: `Pseudo-class :${marker}() should be at the end of selector`,
        INVALID_ARG: `Invalid argument of :${marker}() pseudo-class`,
    };
};

export const REMOVE_ERROR_PREFIX: ActionErrorPrefix = createActionErrorPrefix(REMOVE_PSEUDO_MARKER);

export const REMOVE_ATTR_ERROR_PREFIX: ActionErrorPrefix = createActionErrorPrefix(REMOVE_ATTR_PSEUDO_MARKER);

export const REMOVE_CLASS_ERROR_PREFIX: ActionErrorPrefix = createActionErrorPrefix(REMOVE_CLASS_PSEUDO_MARKER);

/**
 * Maps an action pseudo-class marker to its error messages.
 */
export const ACTION_ERROR_PREFIXES: Record<ActionPseudoMarker, ActionErrorPrefix> = {
    [REMOVE_PSEUDO_MARKER]: REMOVE_ERROR_PREFIX,
    [REMOVE_ATTR_PSEUDO_MARKER]: REMOVE_ATTR_ERROR_PREFIX,
    [REMOVE_CLASS_PSEUDO_MARKER]: REMOVE_CLASS_ERROR_PREFIX,
};

/**
 * Quote mark of a quoted string.
 */
export type QuoteMark = '"' | "'";

export const MATCHING_ELEMENT_ERROR_PREFIX = 'Error while matching element';

export const MAX_STYLE_PROTECTION_COUNT = 50;

export const ID_ATTRIBUTE = 'id';
export const CLASS_ATTRIBUTE = 'class';
export const STYLE_ATTRIBUTE = 'style';
