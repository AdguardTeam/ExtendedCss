import {
    BACKSLASH,
    BRACKET,
    COLON,
    CONTAINS_PSEUDO_NAMES,
    DOUBLE_QUOTE,
    EQUAL_SIGN,
    POSSIBLE_MARKS_BEFORE_REGEXP,
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
     * Parentheses nesting depth.
     */
    parenDepth: number;

    /**
     * Names of pseudo-classes whose arguments are currently open;
     * plain parentheses are stored as empty strings.
     */
    pseudoStack: string[];

    /**
     * Character of the currently open quoted string, if any.
     */
    quote: string | undefined;

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
};

/**
 * Creates initial state of the selector scanner.
 *
 * @returns Initial scanner state.
 */
const createSelectorScannerState = (): SelectorScannerState => {
    return {
        parenDepth: 0,
        pseudoStack: [],
        quote: undefined,
        inRegexp: false,
        inRegexpCharClass: false,
        prevChar: undefined,
        pendingPseudo: undefined,
    };
};

/**
 * Checks whether a quoted string can start after the given character.
 *
 * @param char Character preceding a quote.
 *
 * @returns True if a quoted string can start after the character.
 */
export const canOpenQuote = (char: string | undefined): boolean => {
    return char === BRACKET.PARENTHESES.LEFT
        || char === EQUAL_SIGN
        || isWhiteSpaceChar(char);
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
 * Some constructs (escaped characters, regexp literals, quoted strings)
 * are consumed as a whole, so the returned index can be greater than `index`.
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
            state.prevChar = char;
            return index + 1;
        }
        if (char === BRACKET.SQUARE.LEFT) {
            state.inRegexpCharClass = true;
        } else if (char === BRACKET.SQUARE.RIGHT) {
            state.inRegexpCharClass = false;
        } else if (char === SLASH && !state.inRegexpCharClass) {
            state.inRegexp = false;
        }
        state.prevChar = char;
        return index;
    }
    if (state.quote) {
        if (char === BACKSLASH) {
            state.prevChar = char;
            return index + 1;
        }
        if (char === state.quote) {
            state.quote = undefined;
        }
        state.prevChar = char;
        return index;
    }
    if (char === BACKSLASH) {
        state.prevChar = char;
        return index + 1;
    }
    if (char === SINGLE_QUOTE || char === DOUBLE_QUOTE) {
        if (canOpenQuote(state.prevChar)) {
            state.quote = char;
        }
        state.prevChar = char;
        return index;
    }
    if (char === SLASH && canOpenRegexp(state)) {
        state.inRegexp = true;
        state.prevChar = char;
        return index;
    }
    if (char === BRACKET.PARENTHESES.LEFT) {
        state.parenDepth += 1;
        state.pseudoStack.push(state.pendingPseudo ?? '');
        state.pendingPseudo = undefined;
        state.prevChar = char;
        return index;
    }
    if (char === BRACKET.PARENTHESES.RIGHT) {
        if (state.parenDepth > 0) {
            state.parenDepth -= 1;
        }
        state.pseudoStack.pop();
        state.prevChar = char;
        return index;
    }
    if (char === COLON) {
        const name = readPseudoClassName(input, index);
        if (name && input[index + 1 + name.length] === BRACKET.PARENTHESES.LEFT) {
            state.pendingPseudo = name.toLowerCase();
        }
        state.prevChar = char;
        return index;
    }
    state.prevChar = char;
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
        if (input[i] === COLON && state.parenDepth === 0 && handlers.onTopLevelColon) {
            const nextIndex = handlers.onTopLevelColon(i);
            if (typeof nextIndex === 'number') {
                // the handler skipped a part of the input, e.g. an action argument
                i = nextIndex;
                state.pendingPseudo = undefined;
                state.prevChar = input[i];
            }
        } else if (input[i] === BRACKET.CURLY.LEFT && handlers.onStyleBlockStart) {
            handlers.onStyleBlockStart(i);
        }
    }
};

/**
 * Finds the index of the closing parenthesis of an argument
 * without treating regexp literals specially.
 *
 * @param input Scanned string.
 * @param startIndex Index of the first argument character.
 *
 * @returns Index of the closing parenthesis or -1 if it is not found.
 */
const findClosingParenthesisPlain = (input: string, startIndex: number): number => {
    const state = createSelectorScannerState();
    state.parenDepth = 1;
    // empty pseudo name disables regexp detection
    state.pseudoStack = [''];
    state.prevChar = BRACKET.PARENTHESES.LEFT;

    for (let i = startIndex; i < input.length; i += 1) {
        i = updateSelectorScannerState(input, i, state);
        if (state.parenDepth === 0) {
            return i;
        }
    }

    return -1;
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
    state.parenDepth = 1;
    state.pseudoStack = [pseudoName];
    state.prevChar = BRACKET.PARENTHESES.LEFT;

    for (let i = startIndex; i < input.length; i += 1) {
        i = updateSelectorScannerState(input, i, state);
        if (state.parenDepth === 0) {
            return i;
        }
    }

    if (state.inRegexp) {
        // the regexp literal is not closed, so the argument is invalid;
        // fall back to plain parenthesis balancing to find its end
        // and let the argument validation reject it
        return findClosingParenthesisPlain(input, startIndex);
    }

    return -1;
};

/**
 * Finds indexes of `{` marks which may start a style block.
 *
 * Braces inside quoted strings and regexp literals are skipped.
 *
 * @param input Scanned string.
 *
 * @returns Array of left curly bracket indexes.
 */
export const findStyleBlockStarts = (input: string): number[] => {
    const indexes: number[] = [];

    scanSelector(input, {
        onStyleBlockStart: (index) => {
            indexes.push(index);
        },
    });

    return indexes;
};
