export declare const BRACKETS: {
    SQUARE: {
        LEFT: string;
        RIGHT: string;
    };
    PARENTHESES: {
        LEFT: string;
        RIGHT: string;
    };
    CURLY: {
        LEFT: string;
        RIGHT: string;
    };
};
export declare const SLASH = "/";
export declare const BACKSLASH = "\\";
export declare const SPACE = " ";
export declare const COMMA = ",";
export declare const DOT = ".";
export declare const SEMICOLON = ";";
export declare const COLON = ":";
export declare const SINGLE_QUOTE = "'";
export declare const DOUBLE_QUOTE = "\"";
export declare const CARET = "^";
export declare const DOLLAR_SIGN = "$";
export declare const EQUAL_SIGN = "=";
export declare const TAB = "\t";
export declare const CARRIAGE_RETURN = "\r";
export declare const LINE_FEED = "\n";
export declare const FORM_FEED = "\f";
export declare const WHITE_SPACE_CHARACTERS: string[];
export declare const ASTERISK = "*";
export declare const ID_MARKER = "#";
export declare const CLASS_MARKER = ".";
export declare const DESCENDANT_COMBINATOR = " ";
export declare const CHILD_COMBINATOR = ">";
export declare const NEXT_SIBLING_COMBINATOR = "+";
export declare const SUBSEQUENT_SIBLING_COMBINATOR = "~";
export declare const COMBINATORS: string[];
export declare const SUPPORTED_SELECTOR_MARKS: string[];
export declare const CONTAINS_PSEUDO = "contains";
export declare const HAS_TEXT_PSEUDO = "has-text";
export declare const ABP_CONTAINS_PSEUDO = "-abp-contains";
export declare const MATCHES_CSS_PSEUDO = "matches-css";
export declare const MATCHES_CSS_BEFORE_PSEUDO = "matches-css-before";
export declare const MATCHES_CSS_AFTER_PSEUDO = "matches-css-after";
export declare const MATCHES_ATTR_PSEUDO_CLASS_MARKER = "matches-attr";
export declare const MATCHES_PROPERTY_PSEUDO_CLASS_MARKER = "matches-property";
export declare const XPATH_PSEUDO_CLASS_MARKER = "xpath";
export declare const NTH_ANCESTOR_PSEUDO_CLASS_MARKER = "nth-ancestor";
/**
 * :upward() can get number or selector arg
 * and if the arg is selector it should be standard, not extended
 * so :upward pseudo-class is always absolute
 */
export declare const UPWARD_PSEUDO_CLASS_MARKER = "upward";
/**
 * :remove() pseudo-class is used for element actions, not for element selecting
 * and 'clear' selector should not contain it
 * so selector parser should consider it as invalid
 */
export declare const REMOVE_PSEUDO_CLASS_MARKER = "remove";
export declare const HAS_PSEUDO_CLASS_MARKER = "has";
export declare const IF_PSEUDO_CLASS_MARKER = "if";
export declare const ABP_HAS_PSEUDO_CLASS_MARKER = "-abp-has";
export declare const HAS_PSEUDO_CLASS_MARKERS: string[];
export declare const IF_NOT_PSEUDO_CLASS_MARKER = "if-not";
export declare const IS_PSEUDO_CLASS_MARKER = "is";
export declare const NOT_PSEUDO_CLASS_MARKER = "not";
export declare const ABSOLUTE_PSEUDO_CLASSES: string[];
export declare const RELATIVE_PSEUDO_CLASSES: string[];
export declare const SUPPORTED_PSEUDO_CLASSES: string[];
export declare const REGEXP_WITH_FLAGS_REGEXP: RegExp;
export declare const REGEXP_ANY_SYMBOL = ".*";
/**
 * ':scope' is used for extended pseudo-class :has(), if-not(), :is() and :not()
 *
 * ':where' is needed for limitation it's using inside :has() arg
 * https://bugs.chromium.org/p/chromium/issues/detail?id=669058#c54 [1]
 */
export declare const REGULAR_PSEUDO_CLASSES: {
    SCOPE: string;
    WHERE: string;
};
/**
 * ':after' and ':before' are needed for :matches-css() pseudo-class
 * all other are needed for :has() limitation after regular pseudo-elements
 * https://bugs.chromium.org/p/chromium/issues/detail?id=669058#c54 [3]
 */
export declare const REGULAR_PSEUDO_ELEMENTS: {
    AFTER: string;
    BACKDROP: string;
    BEFORE: string;
    CUE: string;
    CUE_REGION: string;
    FIRST_LETTER: string;
    FIRST_LINE: string;
    FILE_SELECTION_BUTTON: string;
    GRAMMAR_ERROR: string;
    MARKER: string;
    PART: string;
    PLACEHOLDER: string;
    SELECTION: string;
    SLOTTED: string;
    SPELLING_ERROR: string;
    TARGET_TEXT: string;
};
export declare const CSS_PROPERTIES: {
    BACKGROUND: string;
    BACKGROUND_IMAGE: string;
    CONTENT: string;
    OPACITY: string;
};
export declare const IS_OR_NOT_PSEUDO_SELECTING_ROOT: string;
export declare const XPATH_PSEUDO_SELECTING_ROOT = "body";
export declare const REGEXP_VALID_OLD_SYNTAX: RegExp;
export declare const INVALID_OLD_SYNTAX_MARKER = "[-ext-";
export declare const DEBUG_PSEUDO_PROPERTY_KEY = "debug";
export declare const REMOVE_PSEUDO_PROPERTY_KEY = "remove";
export declare const PSEUDO_PROPERTY_POSITIVE_VALUE = "true";
export declare const DEBUG_PSEUDO_PROPERTY_GLOBAL_VALUE = "global";
export declare const REGEXP_LINES_DIVIDER: RegExp;
export declare const STYLESHEET_BLOCK_MARKS: string[];
export declare const REGEXP_DECLARATION_END: RegExp;
export declare const REGEXP_DECLARATION_DIVIDER: RegExp;
export declare const REGEXP_NON_WHITESPACE: RegExp;
export declare const STYLESHEET_ERROR_PREFIX: {
    NO_STYLE: string;
    INVALID_STYLE: string;
    UNCLOSED_STYLE: string;
    NO_PROPERTY: string;
    NO_VALUE: string;
    INVALID_REMOVE: string;
    NO_STYLE_OR_REMOVE: string;
};
export declare enum BrowserName {
    Chrome = "Chrome",
    Firefox = "Firefox",
    Edge = "Edg",
    Opera = "Opera",
    Safari = "Safari"
}
export declare const CHROMIUM_BRAND_NAME = "Chromium";
export declare const GOOGLE_CHROME_BRAND_NAME = "Google Chrome";
