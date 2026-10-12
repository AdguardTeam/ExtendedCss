import {
    ACTION_PSEUDO_MARKERS,
    BACKSLASH,
    BRACKET,
    COLON,
    CONTAINS_PSEUDO_NAMES,
    DOUBLE_QUOTE,
    EQUAL_SIGN,
    POSSIBLE_MARKS_BEFORE_REGEXP,
    QuoteMark,
    SINGLE_QUOTE,
    SLASH,
    XPATH_PSEUDO_CLASS_MARKER,
} from '../constants';

import { isWhiteSpaceChar } from './strings';

/**
 * State of the selector scanner.
 */
type SelectorScannerState = {
    /**
     * Names of pseudo-classes whose arguments are currently open;
     * plain parentheses are stored as empty strings.
     */
    pseudoStack: string[];

    /**
     * Character of the currently open quoted string, if any.
     */
    quote: QuoteMark | undefined;

    /**
     * Flag for a regexp literal being scanned.
     */
    inRegexp: boolean;

    /**
     * Flag for a character class inside a regexp literal.
     */
    inRegexpCharClass: boolean;

    /**
     * Character preceding the current one.
     */
    prevChar: string | undefined;

    /**
     * Last non-whitespace character preceding the current one.
     */
    prevNonWhitespaceChar: string | undefined;

    /**
     * Pseudo-class name waiting for its opening parenthesis.
     */
    pendingPseudo: string | undefined;
};

/**
 * Handlers for structural marks found by the selector scanner.
 */
export type SelectorScanHandlers = {
    /**
     * Called for a top-level colon (outside pseudo-class arguments).
     * Return the index to continue scanning from, or nothing to continue normally.
     */
    onTopLevelColon?: (index: number) => number | void;

    /**
     * Called for `{` marks outside quoted strings and regexp literals.
     */
    onStyleBlockStart?: (index: number) => void;

    /**
     * Flag for stopping the scan after the first `{` mark.
     */
    stopAfterFirstStyleBlockStart?: boolean;
};

/**
 * Creates initial state of the selector scanner.
 *
 * @returns Initial scanner state.
 */
const createSelectorScannerState = (): SelectorScannerState => {
    return {
        pseudoStack: [],
        quote: undefined,
        inRegexp: false,
        inRegexpCharClass: false,
        prevChar: undefined,
        prevNonWhitespaceChar: undefined,
        pendingPseudo: undefined,
    };
};

/**
 * Saves a processed character as the previous one.
 *
 * @param state Scanner state.
 * @param char Processed character.
 */
const setPrevChar = (state: SelectorScannerState, char: string | undefined): void => {
    state.prevChar = char;
    if (char && !isWhiteSpaceChar(char)) {
        state.prevNonWhitespaceChar = char;
    }
};

/**
 * Checks whether the scanner is inside an `:xpath()` argument.
 *
 * @param state Scanner state.
 *
 * @returns True if the scanner is inside an `:xpath()` argument.
 */
const isInsideXPathArg = (state: SelectorScannerState): boolean => {
    return state.pseudoStack.includes(XPATH_PSEUDO_CLASS_MARKER);
};

/**
 * Checks whether the scanner is inside a `:contains()`-like argument.
 *
 * @param state Scanner state.
 *
 * @returns True if the scanner is inside a `:contains()`-like argument.
 */
const isInsideContainsArg = (state: SelectorScannerState): boolean => {
    return state.pseudoStack.some((name) => CONTAINS_PSEUDO_NAMES.includes(name));
};

/**
 * Checks whether a quoted string can start at the current scanner position.
 *
 * A quoted string can start only where a string is allowed:
 * - at the beginning of a pseudo-class argument, e.g. `:remove-attr("title")`;
 * - after `=` or `:`, e.g. `[data-x="1"]` or `:matches-css(content: "a)b")`;
 * - after `=` or `:` (possibly followed by whitespace),
 *   e.g. `[data-x = "1"]` or `:upward(div[title = ":remove-attr(x)"])`.
 *
 * Plain text arguments of `:contains()`-like pseudo-classes
 * (e.g. `:contains(the '90s)`) cannot contain quoted strings.
 *
 * @param prevChar Character preceding a quote.
 * @param prevNonWhitespaceChar Last non-whitespace character preceding a quote.
 * @param inContainsArg True if scanning is inside a `:contains()`-like argument.
 *
 * @returns True if a quoted string can start at the current position.
 */
export const canOpenQuote = (
    prevChar: string | undefined,
    prevNonWhitespaceChar: string | undefined,
    inContainsArg = false,
): boolean => {
    if (inContainsArg) {
        return false;
    }
    if (prevChar === BRACKET.PARENTHESES.LEFT
        || prevChar === EQUAL_SIGN
        || prevChar === COLON) {
        return true;
    }
    return isWhiteSpaceChar(prevChar)
        && (prevNonWhitespaceChar === EQUAL_SIGN || prevNonWhitespaceChar === COLON);
};

/**
 * Checks whether a regexp literal can start in the current scanner state.
 *
 * A regexp can start only inside an argument of a pseudo-class which accepts it:
 * at the argument beginning for `:contains()`-like pseudo-classes,
 * after certain marks for other pseudo-classes,
 * and never inside `:xpath()`.
 *
 * @param state Scanner state.
 *
 * @returns True if a regexp literal can start.
 */
const canOpenRegexp = (state: SelectorScannerState): boolean => {
    const pseudoName = state.pseudoStack[state.pseudoStack.length - 1];
    if (!pseudoName) {
        return false;
    }
    if (pseudoName === XPATH_PSEUDO_CLASS_MARKER) {
        return false;
    }
    if (CONTAINS_PSEUDO_NAMES.includes(pseudoName)) {
        return state.prevChar === BRACKET.PARENTHESES.LEFT;
    }
    return POSSIBLE_MARKS_BEFORE_REGEXP.COMMON.includes(state.prevChar as string)
        || isWhiteSpaceChar(state.prevChar);
};

/**
 * Reads a pseudo-class name after a colon.
 *
 * @param input Scanned string.
 * @param colonIndex Index of the colon.
 *
 * @returns Pseudo-class name or an empty string.
 */
const readPseudoClassName = (input: string, colonIndex: number): string => {
    let name = '';
    for (let i = colonIndex + 1; i < input.length; i += 1) {
        const char = input[i] as string;
        if (/[a-zA-Z0-9-]/.test(char)) {
            name += char;
        } else {
            break;
        }
    }
    return name;
};

/**
 * Processes the character at `index` and updates the scanner state.
 *
 * Escaped characters are consumed as a whole (together with the next character),
 * so the returned index can be greater than `index`.
 * Regexp literals and quoted strings are tracked character by character.
 *
 * @param input Scanned string.
 * @param index Index of the character to process.
 * @param state Scanner state.
 *
 * @returns Index of the last consumed character.
 */
const updateSelectorScannerState = (
    input: string,
    index: number,
    state: SelectorScannerState,
): number => {
    const char = input[index];

    if (state.inRegexp) {
        if (char === BACKSLASH) {
            setPrevChar(state, char);
            return index + 1;
        }
        if (char === BRACKET.SQUARE.LEFT) {
            state.inRegexpCharClass = true;
        } else if (char === BRACKET.SQUARE.RIGHT) {
            state.inRegexpCharClass = false;
        } else if (char === SLASH && !state.inRegexpCharClass) {
            state.inRegexp = false;
        }
        setPrevChar(state, char);
        return index;
    }
    if (state.quote) {
        if (char === BACKSLASH) {
            setPrevChar(state, char);
            return index + 1;
        }
        if (char === state.quote) {
            state.quote = undefined;
        }
        setPrevChar(state, char);
        return index;
    }
    if (char === BACKSLASH) {
        setPrevChar(state, char);
        return index + 1;
    }
    if (char === SINGLE_QUOTE || char === DOUBLE_QUOTE) {
        // quoted strings can start only where a string is allowed;
        // inside `:xpath()` arguments strings can start anywhere
        if (isInsideXPathArg(state)
            || canOpenQuote(
                state.prevChar,
                state.prevNonWhitespaceChar,
                isInsideContainsArg(state),
            )) {
            state.quote = char;
        }
        setPrevChar(state, char);
        return index;
    }
    if (char === SLASH && canOpenRegexp(state)) {
        state.inRegexp = true;
        setPrevChar(state, char);
        return index;
    }
    if (char === BRACKET.PARENTHESES.LEFT) {
        state.pseudoStack.push(state.pendingPseudo ?? '');
        state.pendingPseudo = undefined;
        setPrevChar(state, char);
        return index;
    }
    if (char === BRACKET.PARENTHESES.RIGHT) {
        state.pseudoStack.pop();
        setPrevChar(state, char);
        return index;
    }
    if (char === COLON) {
        const name = readPseudoClassName(input, index);
        if (name && input[index + 1 + name.length] === BRACKET.PARENTHESES.LEFT) {
            state.pendingPseudo = name.toLowerCase();
        }
        setPrevChar(state, char);
        return index;
    }
    setPrevChar(state, char);
    return index;
};

/**
 * Scans a selector-like string and calls handlers for its structural marks.
 *
 * @param input Scanned string.
 * @param handlers Handlers for found marks.
 */
export const scanSelector = (input: string, handlers: SelectorScanHandlers): void => {
    const state = createSelectorScannerState();

    for (let i = 0; i < input.length; i += 1) {
        i = updateSelectorScannerState(input, i, state);
        if (state.quote !== undefined || state.inRegexp) {
            // the character is a part of a quoted string or regexp literal
            continue;
        }
        if (input[i] === COLON && state.pseudoStack.length === 0 && handlers.onTopLevelColon) {
            const nextIndex = handlers.onTopLevelColon(i);
            if (typeof nextIndex === 'number') {
                // the handler skipped a part of the input, e.g. an action argument
                i = nextIndex;
                state.pendingPseudo = undefined;
                setPrevChar(state, input[i] ?? '');
            }
        } else if (input[i] === BRACKET.CURLY.LEFT && handlers.onStyleBlockStart) {
            handlers.onStyleBlockStart(i);
            if (handlers.stopAfterFirstStyleBlockStart) {
                break;
            }
        }
    }
};

/**
 * Finds the index of the closing parenthesis of an action argument.
 *
 * @param input Scanned string.
 * @param startIndex Index of the first argument character.
 * @param pseudoName Action pseudo-class name.
 *
 * @returns Index of the closing parenthesis or -1 if it is not found.
 */
export const findClosingParenthesis = (
    input: string,
    startIndex: number,
    pseudoName: string,
): number => {
    const state = createSelectorScannerState();
    state.pseudoStack = [pseudoName];
    state.prevChar = BRACKET.PARENTHESES.LEFT;

    for (let i = startIndex; i < input.length; i += 1) {
        i = updateSelectorScannerState(input, i, state);
        if (state.pseudoStack.length === 0) {
            return i;
        }
    }

    // the argument is not closed, e.g. an unclosed regexp literal;
    // `parseActionSelector()` rejects such arguments
    return -1;
};

/**
 * Finds the end of an action pseudo-class argument at the given colon.
 *
 * @param input Scanned string.
 * @param colonIndex Index of the action pseudo-class colon.
 *
 * @returns Index of the closing parenthesis or undefined
 * if there is no complete action pseudo-class at the colon.
 */
const findActionArgumentEnd = (input: string, colonIndex: number): number | undefined => {
    for (const marker of ACTION_PSEUDO_MARKERS) {
        const markerText = `${marker}${BRACKET.PARENTHESES.LEFT}`;
        const candidate = input.substring(colonIndex + 1, colonIndex + 1 + markerText.length);
        if (candidate.toLowerCase() !== markerText) {
            continue;
        }
        const argStartIndex = colonIndex + 1 + markerText.length;
        const closingIndex = findClosingParenthesis(input, argStartIndex, marker);
        return closingIndex === -1 ? undefined : closingIndex;
    }
    return undefined;
};

/**
 * Regexp matching characters which can start a quoted string,
 * a regexp literal or an escape sequence.
 */
const REGEXP_SPECIAL_CHARS = /['"\\/]/;

/**
 * Checks whether a prefix cannot contain an open quoted string,
 * regexp literal or action pseudo-class argument:
 * without quotes, slashes and backslashes no string or regexp literal can start,
 * and action pseudo-classes are detected by their markers case-insensitively.
 *
 * @param input Scanned string.
 * @param endIndex Index before which the input should be checked.
 *
 * @returns True if the prefix contains no special characters.
 */
const isSimplePrefix = (input: string, endIndex: number): boolean => {
    const prefix = input.slice(0, endIndex);
    if (REGEXP_SPECIAL_CHARS.test(prefix)) {
        return false;
    }
    const lowerCasedPrefix = prefix.toLowerCase();
    return !ACTION_PSEUDO_MARKERS.some((marker) => lowerCasedPrefix.includes(marker));
};

/**
 * Finds indexes of `{` marks which may start a style block.
 *
 * Braces inside quoted strings, regexp literals and action pseudo-class
 * arguments are skipped.
 *
 * @param input Scanned string.
 *
 * @returns Array of left curly bracket indexes.
 */
export const findStyleBlockStarts = (input: string): number[] => {
    const indexes: number[] = [];

    if (!input.includes(BRACKET.CURLY.LEFT)) {
        return indexes;
    }

    if (isSimplePrefix(input, input.length)) {
        let index = input.indexOf(BRACKET.CURLY.LEFT);
        while (index !== -1) {
            indexes.push(index);
            index = input.indexOf(BRACKET.CURLY.LEFT, index + 1);
        }
        return indexes;
    }

    scanSelector(input, {
        onTopLevelColon: (index) => {
            return findActionArgumentEnd(input, index);
        },
        onStyleBlockStart: (index) => {
            indexes.push(index);
        },
    });

    return indexes;
};

/**
 * Finds the index of the first `{` mark which may start a style block.
 *
 * Unlike `findStyleBlockStarts()`, the scan stops at the first `{` mark,
 * so the call is linear for the scanned prefix.
 *
 * @param input Scanned string.
 *
 * @returns Index of the first left curly bracket or -1 if it is not found.
 */
export const findStyleBlockStart = (input: string): number => {
    const braceIndex = input.indexOf(BRACKET.CURLY.LEFT);
    // a `{` is required to start a style block
    if (braceIndex === -1) {
        return -1;
    }
    // if no quoted string, regexp literal or action argument can be open
    // before the first `{`, it starts a style block;
    // the check is limited by the first `{` to keep parsing linear
    if (isSimplePrefix(input, braceIndex)) {
        return braceIndex;
    }

    let foundIndex = -1;
    scanSelector(input, {
        onTopLevelColon: (index) => {
            return findActionArgumentEnd(input, index);
        },
        onStyleBlockStart: (index) => {
            foundIndex = index;
        },
        stopAfterFirstStyleBlockStart: true,
    });

    return foundIndex;
};
