import {
    ExtCssRuleData,
    ParsedSelectorData,
    RawCssRuleData,
    SelectorPartData,
    RawResults,
    RawResultValue,
    CssStyleMap,
} from './types';

import { AnySelectorNodeInterface, ExtCssDocument } from '../selector';
import { StyleDeclaration } from '../style-block';

import { getErrorMessage } from '../common/utils/error';
import { getObjectFromEntries } from '../common/utils/objects';
import { logger } from '../common/utils/logger';
import { normalizeActionArg } from '../common/utils/action-arg';

import {
    COLON,
    BRACKET,
    BACKSLASH,
    SLASH,
    SINGLE_QUOTE,
    DOUBLE_QUOTE,
    DOT,
    EQUAL_SIGN,
    WHITE_SPACE_CHARACTERS,
    REMOVE_PSEUDO_MARKER,
    REMOVE_ATTR_PSEUDO_MARKER,
    REMOVE_CLASS_PSEUDO_MARKER,
    ACTION_PSEUDO_MARKERS,
    ACTION_ERROR_PREFIXES,
    REMOVE_ERROR_PREFIX,
    CONTENT_CSS_PROPERTY,
    PSEUDO_PROPERTY_POSITIVE_VALUE,
    DEBUG_PSEUDO_PROPERTY_GLOBAL_VALUE,
    AT_RULE_MARKER,
    NO_AT_RULE_ERROR_PREFIX,
} from '../common/constants';


const DEBUG_PSEUDO_PROPERTY_KEY = 'debug';

/**
 * Regexp flag character, e.g. 'i', 'm' or 'u'.
 */
const REGEXP_FLAG_CHARACTER = /[a-z]/;

/**
 * Characters that may precede a regexp literal in a selector,
 * e.g. ':contains(/text/)' or ':matches-css(height:/20px/)'.
 */
const REGEXP_OPENING_CHARACTERS = [
    BRACKET.PARENTHESES.LEFT,
    EQUAL_SIGN,
    DOT,
    COLON,
];

/**
 * Info about an action pseudo-class found in a selector.
 */
type ActionSelectorData = {
    /**
     * Action pseudo-class marker, e.g. 'remove-attr'.
     */
    marker: string;

    /**
     * Index of the action pseudo-class colon in the raw selector.
     */
    startIndex: number;

    /**
     * Raw argument of the action pseudo-class.
     */
    arg: string;

    /**
     * Index after the closing parenthesis,
     * or -1 if the closing parenthesis is missing.
     */
    endIndex: number;
};

/**
 * Checks whether the character is a whitespace character.
 *
 * @param char Character to check.
 *
 * @returns True if the character is a whitespace character.
 */
const isWhiteSpace = (char: string | undefined): boolean => {
    return char !== undefined && WHITE_SPACE_CHARACTERS.includes(char);
};

/**
 * Checks whether a regexp literal can start after the given character.
 *
 * @param char Character preceding a slash.
 *
 * @returns True if a regexp literal can start after the character.
 */
const isRegexpOpeningCharacter = (char: string | undefined): boolean => {
    return isWhiteSpace(char) || (char !== undefined && REGEXP_OPENING_CHARACTERS.includes(char));
};

/**
 * Finds the end of a regexp literal at the beginning of an action argument.
 *
 * @param rawSelector Raw selector text.
 * @param startIndex Index of the first argument character.
 *
 * @returns Index of the closing slash of the regexp literal,
 * or -1 if the argument does not start with a regexp literal.
 */
const findRegexpArgEnd = (rawSelector: string, startIndex: number): number => {
    let i = startIndex;
    while (i < rawSelector.length && isWhiteSpace(rawSelector[i])) {
        i += 1;
    }
    if (rawSelector[i] !== SLASH) {
        return -1;
    }

    let inCharClass = false;
    for (i += 1; i < rawSelector.length; i += 1) {
        const char = rawSelector[i];

        if (char === BACKSLASH) {
            i += 1;
        } else if (char === BRACKET.SQUARE.LEFT) {
            inCharClass = true;
        } else if (char === BRACKET.SQUARE.RIGHT) {
            inCharClass = false;
        } else if (char === SLASH && !inCharClass) {
            return i;
        }
    }

    return -1;
};

/**
 * Finds the index of the closing parenthesis of an action argument.
 *
 * A well-formed regexp literal argument is skipped as a whole,
 * so parentheses, slashes and quotes inside it are not treated as delimiters.
 *
 * @param rawSelector Raw selector text.
 * @param startIndex Index of the first argument character.
 *
 * @returns Index of the closing parenthesis or -1 if it is not found.
 */
const findClosingParenthesis = (rawSelector: string, startIndex: number): number => {
    const regexpEndIndex = findRegexpArgEnd(rawSelector, startIndex);
    if (regexpEndIndex !== -1) {
        // after a regexp literal there can be only flags, whitespace and the closing parenthesis
        let i = regexpEndIndex + 1;
        while (i < rawSelector.length && REGEXP_FLAG_CHARACTER.test(rawSelector[i] as string)) {
            i += 1;
        }
        while (i < rawSelector.length && isWhiteSpace(rawSelector[i])) {
            i += 1;
        }
        if (rawSelector[i] === BRACKET.PARENTHESES.RIGHT) {
            return i;
        }
    }

    let depth = 1;
    let inSingleQuote = false;
    let inDoubleQuote = false;

    for (let i = startIndex; i < rawSelector.length; i += 1) {
        const char = rawSelector[i];

        if (char === BACKSLASH) {
            i += 1;
            continue;
        }
        if (char === SINGLE_QUOTE) {
            // a quote should change state only when the other quote type is not active,
            // e.g. an apostrophe inside a double-quoted attribute value
            if (!inDoubleQuote) {
                inSingleQuote = !inSingleQuote;
            }
            continue;
        }
        if (char === DOUBLE_QUOTE) {
            if (!inSingleQuote) {
                inDoubleQuote = !inDoubleQuote;
            }
            continue;
        }
        if (inSingleQuote || inDoubleQuote) {
            continue;
        }
        if (char === BRACKET.PARENTHESES.LEFT) {
            depth += 1;
        } else if (char === BRACKET.PARENTHESES.RIGHT) {
            depth -= 1;
            if (depth === 0) {
                return i;
            }
        }
    }

    return -1;
};

/**
 * Finds top-level action pseudo-classes in the raw selector.
 *
 * Action pseudo-classes nested in other pseudo-classes are ignored here
 * and rejected later by the selector parser.
 *
 * @param rawSelector Raw selector text.
 *
 * @returns Found action pseudo-classes in the order of appearance.
 */
const findActionSelectors = (rawSelector: string): ActionSelectorData[] => {
    const found: ActionSelectorData[] = [];
    let parenDepth = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inRegexp = false;
    let inRegexpCharClass = false;
    // character preceding the current one, needed to detect regexp literal opening
    let prevChar: string | undefined;

    for (let i = 0; i < rawSelector.length; i += 1) {
        const char = rawSelector[i];

        if (inRegexp) {
            // skip regexp literal contents as a whole:
            // parentheses inside it do not affect the selector nesting
            if (char === BACKSLASH) {
                i += 1;
            } else if (char === BRACKET.SQUARE.LEFT) {
                inRegexpCharClass = true;
            } else if (char === BRACKET.SQUARE.RIGHT) {
                inRegexpCharClass = false;
            } else if (char === SLASH && !inRegexpCharClass) {
                inRegexp = false;
            }
            prevChar = char;
            continue;
        }
        if (char === BACKSLASH) {
            i += 1;
            prevChar = char;
            continue;
        }
        if (char === SINGLE_QUOTE) {
            // a quote should change state only when the other quote type is not active,
            // e.g. an apostrophe inside a double-quoted attribute value
            if (!inDoubleQuote) {
                inSingleQuote = !inSingleQuote;
            }
            prevChar = char;
            continue;
        }
        if (char === DOUBLE_QUOTE) {
            if (!inSingleQuote) {
                inDoubleQuote = !inDoubleQuote;
            }
            prevChar = char;
            continue;
        }
        if (inSingleQuote || inDoubleQuote) {
            prevChar = char;
            continue;
        }
        if (char === SLASH && isRegexpOpeningCharacter(prevChar)) {
            inRegexp = true;
            prevChar = char;
            continue;
        }
        if (char === BRACKET.PARENTHESES.LEFT) {
            parenDepth += 1;
            prevChar = char;
            continue;
        }
        if (char === BRACKET.PARENTHESES.RIGHT) {
            parenDepth -= 1;
            prevChar = char;
            continue;
        }
        if (char !== COLON || parenDepth !== 0) {
            prevChar = char;
            continue;
        }

        const marker = ACTION_PSEUDO_MARKERS.find((name) => {
            const markerText = `${name}${BRACKET.PARENTHESES.LEFT}`;
            const candidate = rawSelector.substring(i + 1, i + 1 + markerText.length);
            return candidate.toLowerCase() === markerText;
        });
        if (!marker) {
            prevChar = char;
            continue;
        }

        const argStartIndex = i + marker.length + 2;
        const closingIndex = findClosingParenthesis(rawSelector, argStartIndex);

        found.push({
            marker,
            startIndex: i,
            arg: closingIndex === -1
                ? rawSelector.substring(argStartIndex)
                : rawSelector.substring(argStartIndex, closingIndex),
            endIndex: closingIndex === -1 ? -1 : closingIndex + 1,
        });

        if (closingIndex !== -1) {
            // skip the action argument, so parentheses inside a regexp literal
            // do not affect the depth tracking
            i = closingIndex;
        }
        prevChar = rawSelector[i];
    }

    return found;
};

/**
 * Checks the presence of action pseudo-classes and validates them
 * while parsing the selector part of a CSS rule.
 *
 * Action pseudo-classes are not about element selecting but about actions
 * with elements, so they are stripped from the selector and returned
 * as synthetic style declarations.
 *
 * @param rawSelector Selector which may contain an action pseudo-class.
 *
 * @returns Parsed selector data with selector and styles.
 * @throws An error on invalid action pseudo-class usage.
 */
export const parseActionSelector = (rawSelector: string): ParsedSelectorData => {
    const actions = findActionSelectors(rawSelector);

    if (actions.length === 0) {
        return { selector: rawSelector, stylesOfSelector: [] };
    }

    const action = actions[0] as ActionSelectorData;
    const errorPrefix = ACTION_ERROR_PREFIXES[action.marker] ?? REMOVE_ERROR_PREFIX;

    if (actions.length > 1) {
        throw new Error(`${errorPrefix.MULTIPLE_USAGE}: '${rawSelector}'`);
    }
    if (action.endIndex === -1) {
        throw new Error(`${errorPrefix.INVALID_ACTION}: '${rawSelector}'`);
    }
    if (action.startIndex === 0) {
        throw new Error(`${errorPrefix.NO_TARGET_SELECTOR}: '${rawSelector}'`);
    }
    if (action.endIndex < rawSelector.length) {
        throw new Error(`${errorPrefix.INVALID_POSITION}: '${rawSelector}'`);
    }

    const selector = rawSelector.substring(0, action.startIndex);

    if (action.marker === REMOVE_PSEUDO_MARKER) {
        if (action.arg !== '') {
            throw new Error(`${REMOVE_ERROR_PREFIX.INVALID_ARG}: '${rawSelector}'`);
        }
        return {
            selector,
            stylesOfSelector: [{ property: REMOVE_PSEUDO_MARKER, value: PSEUDO_PROPERTY_POSITIVE_VALUE }],
        };
    }

    const arg = normalizeActionArg(action.arg);
    if (!arg) {
        throw new Error(`${errorPrefix.INVALID_ARG}: '${rawSelector}'`);
    }

    return {
        selector,
        stylesOfSelector: [{ property: action.marker, value: arg }],
    };
};

/**
 * Parses cropped selector part found before `{`.
 *
 * @param selectorBuffer Buffered selector to parse.
 * @param extCssDoc Needed for caching of selector ast.
 *
 * @returns Parsed validation data for cropped part of stylesheet which may be a selector.
 * @throws An error on unsupported CSS features, e.g. at-rules.
 */
export const parseSelectorRulePart = (selectorBuffer: string, extCssDoc: ExtCssDocument): SelectorPartData => {
    let selector = selectorBuffer.trim();
    if (selector.startsWith(AT_RULE_MARKER)) {
        throw new Error(`${NO_AT_RULE_ERROR_PREFIX}: '${selector}'.`);
    }

    let removeSelectorData: ParsedSelectorData;
    try {
        removeSelectorData = parseActionSelector(selector);
    } catch (e: unknown) {
        logger.error(getErrorMessage(e));
        throw e;
    }

    let stylesOfSelector: StyleDeclaration[] = [];
    let success = false;
    let ast: AnySelectorNodeInterface | undefined;

    try {
        selector = removeSelectorData.selector;
        stylesOfSelector = removeSelectorData.stylesOfSelector;
        // validate found selector by parsing it to ast
        // so if it is invalid error will be thrown
        ast = extCssDoc.getSelectorAst(selector);
        success = true;
    } catch (e: unknown) {
        success = false;
    }

    return { success, selector, ast, stylesOfSelector };
};

/**
 * Creates a map for storing raw results of css rules parsing.
 * Used for merging styles for same selector.
 *
 * @returns Map where **key** is `selector`
 * and **value** is object with `ast` and `styles`.
 */
export const createRawResultsMap = (): RawResults => {
    return new Map<string, RawResultValue>();
};

/**
 * Saves rules data for unique selectors.
 *
 * @param rawResults Previously collected results of parsing.
 * @param rawRuleData Parsed rule data.
 *
 * @throws An error if there is no rawRuleData.styles or rawRuleData.ast.
 */
export const saveToRawResults = (rawResults: RawResults, rawRuleData: RawCssRuleData): void => {
    const { selector, ast, rawStyles } = rawRuleData;

    if (!rawStyles) {
        throw new Error(`No style declaration for selector: '${selector}'`);
    }
    if (!ast) {
        throw new Error(`No ast parsed for selector: '${selector}'`);
    }

    const storedRuleData = rawResults.get(selector);
    if (!storedRuleData) {
        rawResults.set(selector, { ast, styles: rawStyles });
    } else {
        storedRuleData.styles.push(...rawStyles);
    }
};

/**
 * Checks whether the 'remove' property positively set in styles
 * with only one positive value - 'true'.
 *
 * @param styles Array of styles.
 *
 * @returns True if there is 'remove' property with 'true' value in `styles`.
 */
const isRemoveSetInStyles = (styles: StyleDeclaration[]): boolean => {
    return styles.some((s) => {
        return s.property === REMOVE_PSEUDO_MARKER
            && s.value === PSEUDO_PROPERTY_POSITIVE_VALUE;
    });
};

/**
 * Action pseudo-class markers that are stored in rule styles.
 */
const ACTION_STYLE_MARKERS = [
    REMOVE_ATTR_PSEUDO_MARKER,
    REMOVE_CLASS_PSEUDO_MARKER,
];

/**
 * Returns action styles (e.g. 'remove-attr') from the given styles.
 *
 * @param styles Array of styles.
 *
 * @returns Styles of action pseudo-classes.
 */
const getActionStyles = (styles: StyleDeclaration[]): StyleDeclaration[] => {
    return styles.filter((s) => ACTION_STYLE_MARKERS.includes(s.property));
};

/**
 * Returns 'debug' property value which is set in styles.
 *
 * @param styles Array of styles.
 *
 * @returns Value of 'debug' property if it is set in `styles`,
 * or `undefined` if the property is not found.
 */
const getDebugStyleValue = (styles: StyleDeclaration[]): string | undefined => {
    const debugStyle = styles.find((s) => {
        return s.property === DEBUG_PSEUDO_PROPERTY_KEY;
    });
    return debugStyle?.value;
};

/**
 * Prepares final RuleData.
 * Handles `debug` and action pseudo-classes in raw rule data styles.
 *
 * @param rawRuleData Raw data of selector css rule parsing.
 *
 * @returns Parsed ExtendedCss rule data.
 * @throws An error if rawRuleData.ast or rawRuleData.rawStyles not defined.
 */
export const prepareRuleData = (rawRuleData: RawCssRuleData): ExtCssRuleData => {
    const { selector, ast, rawStyles } = rawRuleData;
    if (!ast) {
        throw new Error(`AST should be parsed for selector: '${selector}'`);
    }
    if (!rawStyles) {
        throw new Error(`Styles should be parsed for selector: '${selector}'`);
    }
    const ruleData: ExtCssRuleData = { selector, ast };

    const debugValue = getDebugStyleValue(rawStyles);

    const shouldRemove = isRemoveSetInStyles(rawStyles);

    let styles = rawStyles;
    if (debugValue) {
        // get rid of 'debug' from styles
        styles = rawStyles.filter((s) => s.property !== DEBUG_PSEUDO_PROPERTY_KEY);
        // and set it as separate property only if its value is valid
        // which is 'true' or 'global'
        if (debugValue === PSEUDO_PROPERTY_POSITIVE_VALUE
            || debugValue === DEBUG_PSEUDO_PROPERTY_GLOBAL_VALUE) {
            ruleData.debug = debugValue;
        }
    }
    const actionStyles = getActionStyles(rawStyles);

    if (shouldRemove || actionStyles.length > 0) {
        // no other styles are needed to apply if an action is set
        const actionStyleMap: CssStyleMap = {};

        if (shouldRemove) {
            actionStyleMap[REMOVE_PSEUDO_MARKER] = PSEUDO_PROPERTY_POSITIVE_VALUE;
        }
        actionStyles.forEach((actionStyle) => {
            actionStyleMap[actionStyle.property] = actionStyle.value;
        });

        // preserve all action arguments to apply each of them:
        // rules with the same target selector are merged by `style` property,
        // so a single value per property would keep only the last argument
        if (actionStyles.length > 0) {
            ruleData.actionStyles = actionStyles;
        }

        /**
         * 'content' property is needed for ExtCssConfiguration.beforeStyleApplied().
         *
         * Search `BeforeStyleAppliedCallback` for more details.
         */
        const contentStyle = styles.find((s) => s.property === CONTENT_CSS_PROPERTY);
        if (contentStyle) {
            actionStyleMap[CONTENT_CSS_PROPERTY] = contentStyle.value;
        }

        ruleData.style = actionStyleMap;
    } else {
        // otherwise all styles should be applied.
        // every style property will be unique because of their converting into object
        if (styles.length > 0) {
            const stylesAsEntries: Array<[string, string]> = styles.map((style) => {
                const { property, value } = style;
                return [property, value];
            });
            const preparedStyleData = getObjectFromEntries(stylesAsEntries);
            ruleData.style = preparedStyleData;
        }
    }

    return ruleData;
};

/**
 * Combines previously parsed css rules data objects
 * into rules which are ready to apply.
 *
 * @param rawResults Previously parsed css rules data objects.
 *
 * @returns Parsed ExtendedCss rule data.
 */
export const combineRulesData = (rawResults: RawResults): ExtCssRuleData[] => {
    const results: ExtCssRuleData[] = [];
    rawResults.forEach((value, key) => {
        const selector = key;
        const { ast, styles: rawStyles } = value;
        results.push(prepareRuleData({ selector, ast, rawStyles }));
    });
    return results;
};
