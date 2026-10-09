import {
    ExtCssRuleData,
    ParsedSelectorData,
    RawCssRuleData,
    RawStyleGroup,
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
import {
    isActionPseudoMarker,
    isActionStyleMarker,
    normalizeActionArg,
    throwActionError,
} from '../common/utils/action-arg';

import {
    BRACKET,
    SLASH,
    REMOVE_PSEUDO_MARKER,
    ACTION_PSEUDO_MARKERS,
    ActionPseudoMarker,
    CONTENT_CSS_PROPERTY,
    PSEUDO_PROPERTY_POSITIVE_VALUE,
    DEBUG_PSEUDO_PROPERTY_GLOBAL_VALUE,
    AT_RULE_MARKER,
    NO_AT_RULE_ERROR_PREFIX,
} from '../common/constants';

import { findClosingParenthesis, scanSelector } from '../common/utils/selector-scanner';


const DEBUG_PSEUDO_PROPERTY_KEY = 'debug';

/**
 * Info about an action pseudo-class found in a selector.
 */
type ActionSelectorData = {
    /**
     * Action pseudo-class marker, e.g. 'remove-attr'.
     */
    marker: ActionPseudoMarker;

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

    scanSelector(rawSelector, {
        onTopLevelColon: (index) => {
            const marker = ACTION_PSEUDO_MARKERS.find((name) => {
                const markerText = `${name}${BRACKET.PARENTHESES.LEFT}`;
                const candidate = rawSelector.substring(index + 1, index + 1 + markerText.length);
                return candidate.toLowerCase() === markerText;
            });
            if (!marker) {
                return;
            }

            const argStartIndex = index + marker.length + 2;
            const closingIndex = findClosingParenthesis(rawSelector, argStartIndex, marker);

            found.push({
                marker,
                startIndex: index,
                arg: closingIndex === -1
                    ? rawSelector.substring(argStartIndex)
                    : rawSelector.substring(argStartIndex, closingIndex),
                endIndex: closingIndex === -1 ? -1 : closingIndex + 1,
            });

            if (closingIndex !== -1) {
                return closingIndex;
            }
        },
    });

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

    if (actions.length > 1) {
        throwActionError(action.marker, 'MULTIPLE_USAGE', rawSelector);
    }
    if (action.endIndex === -1) {
        // an unclosed regexp literal is an argument error,
        // while any other unclosed argument is an action error
        const messageKey = action.arg.trim().startsWith(SLASH) ? 'INVALID_ARG' : 'INVALID_ACTION';
        throwActionError(action.marker, messageKey, rawSelector);
    }
    if (action.startIndex === 0) {
        throwActionError(action.marker, 'NO_TARGET_SELECTOR', rawSelector);
    }
    if (action.endIndex < rawSelector.length) {
        throwActionError(action.marker, 'INVALID_POSITION', rawSelector);
    }

    const selector = rawSelector.substring(0, action.startIndex);

    if (action.marker === REMOVE_PSEUDO_MARKER) {
        if (action.arg !== '') {
            throwActionError(action.marker, 'INVALID_ARG', rawSelector);
        }
        return {
            selector,
            stylesOfSelector: [{ property: REMOVE_PSEUDO_MARKER, value: PSEUDO_PROPERTY_POSITIVE_VALUE }],
        };
    }

    const arg = normalizeActionArg(action.arg);
    if (!arg) {
        throwActionError(action.marker, 'INVALID_ARG', rawSelector);
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

    let actionSelectorData: ParsedSelectorData;
    try {
        actionSelectorData = parseActionSelector(selector);
    } catch (e: unknown) {
        logger.error(getErrorMessage(e));
        throw e;
    }

    let stylesOfSelector: StyleDeclaration[] = [];
    let success = false;
    let ast: AnySelectorNodeInterface | undefined;

    try {
        selector = actionSelectorData.selector;
        stylesOfSelector = actionSelectorData.stylesOfSelector;
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
    const { selector, ast, rawStyles, hasActionPseudoClass } = rawRuleData;

    if (!rawStyles) {
        throw new Error(`No style declaration for selector: '${selector}'`);
    }
    if (!ast) {
        throw new Error(`No ast parsed for selector: '${selector}'`);
    }

    const styleGroup: RawStyleGroup = {
        styles: rawStyles,
        hasActionPseudoClass: !!hasActionPseudoClass,
    };

    const storedRuleData = rawResults.get(selector);
    if (!storedRuleData) {
        rawResults.set(selector, { ast, styleGroups: [styleGroup] });
    } else {
        storedRuleData.styleGroups.push(styleGroup);
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
 * Checks whether styles contain action pseudo-class declarations.
 *
 * @param styles Array of styles.
 *
 * @returns True if styles contain action pseudo-class declarations.
 */
export const hasActionPseudoStyles = (styles: StyleDeclaration[]): boolean => {
    return styles.some((s) => isActionPseudoMarker(s.property));
};

/**
 * Filters styles declared together with an action pseudo-class:
 * such styles are ignored except `content` and `debug` needed for internal usage.
 *
 * @param styles Array of styles.
 *
 * @returns Styles which should be kept.
 */
export const filterActionRuleStyles = (styles: StyleDeclaration[]): StyleDeclaration[] => {
    return styles.filter((s) => {
        return s.property === CONTENT_CSS_PROPERTY || s.property === DEBUG_PSEUDO_PROPERTY_KEY;
    });
};

/**
 * Removes action pseudo-class declarations from style block styles:
 * `remove-attr` and `remove-class` are supported only as pseudo-classes.
 *
 * @param styles Array of styles.
 *
 * @returns Styles without action pseudo-class declarations.
 */
export const filterStyleBlockActionDeclarations = (styles: StyleDeclaration[]): StyleDeclaration[] => {
    return styles.filter((s) => !isActionStyleMarker(s.property));
};

/**
 * Filters style-block declarations of a rule according to its selector:
 * if the selector contains an action pseudo-class, styles declared in the block
 * are ignored except `content` and `debug`;
 * otherwise action declarations (`remove-attr` and `remove-class`)
 * are removed as they are supported only as pseudo-classes.
 *
 * @param styles Parsed style-block declarations.
 * @param hasActionStyles True if the selector contains an action pseudo-class.
 *
 * @returns Styles which should be kept for the rule.
 */
export const filterStyleBlockDeclarations = (
    styles: StyleDeclaration[],
    hasActionStyles: boolean,
): StyleDeclaration[] => {
    return hasActionStyles
        ? filterActionRuleStyles(styles)
        : filterStyleBlockActionDeclarations(styles);
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
 * Data of rules with the same selector needed to prepare the final rule data.
 */
type RawMergedRuleData = {
    /**
     * String selector.
     */
    selector: string;

    /**
     * Parsed selector ast.
     */
    ast?: AnySelectorNodeInterface;

    /**
     * Raw styles of each parsed rule with the same selector.
     */
    styleGroups?: RawStyleGroup[];
};

/**
 * Prepares final RuleData.
 * Handles `debug` and action pseudo-classes in raw rule data styles:
 * action declarations are moved to `actionStyles`,
 * regular styles of rules with the same selector are kept in `style`,
 * and `content` of action rules is kept in `style` only for `beforeStyleApplied`.
 *
 * @param rawRuleData Raw data of selector css rule parsing.
 *
 * @returns Parsed ExtendedCss rule data.
 * @throws An error if rawRuleData.ast or rawRuleData.styleGroups not defined.
 */
export const prepareRuleData = (rawRuleData: RawMergedRuleData): ExtCssRuleData => {
    const { selector, ast, styleGroups } = rawRuleData;
    if (!ast) {
        throw new Error(`AST should be parsed for selector: '${selector}'`);
    }
    if (!styleGroups) {
        throw new Error(`Styles should be parsed for selector: '${selector}'`);
    }
    const ruleData: ExtCssRuleData = { selector, ast };

    // split styles by their source:
    // action pseudo-class declarations, styles of rules without action pseudo-classes,
    // and internal styles of action rules (`content` and `debug` only)
    const actionStyles: StyleDeclaration[] = [];
    const regularStyles: StyleDeclaration[] = [];
    const actionRuleStyles: StyleDeclaration[] = [];
    const allRawStyles: StyleDeclaration[] = [];

    styleGroups.forEach((group) => {
        allRawStyles.push(...group.styles);
        group.styles.forEach((style) => {
            if (style.property === DEBUG_PSEUDO_PROPERTY_KEY) {
                // `debug` is handled as a separate property
                return;
            }
            if (group.hasActionPseudoClass) {
                if (isActionStyleMarker(style.property)) {
                    actionStyles.push(style);
                } else if (!isActionPseudoMarker(style.property)) {
                    actionRuleStyles.push(style);
                }
                // the 'remove' pseudo-class declaration is handled via `shouldRemove`
            } else {
                regularStyles.push(style);
            }
        });
    });

    const debugValue = getDebugStyleValue(allRawStyles);
    // set `debug` as separate property only if its value is valid
    // which is 'true' or 'global'
    if (debugValue === PSEUDO_PROPERTY_POSITIVE_VALUE
        || debugValue === DEBUG_PSEUDO_PROPERTY_GLOBAL_VALUE) {
        ruleData.debug = debugValue;
    }

    const shouldRemove = isRemoveSetInStyles(allRawStyles);

    if (shouldRemove || actionStyles.length > 0) {
        const actionStyleMap: CssStyleMap = {};

        if (shouldRemove) {
            // the element is removed, so only 'content' is needed for internal usage
            const contentStyle = [...regularStyles, ...actionRuleStyles]
                .find((s) => s.property === CONTENT_CSS_PROPERTY);
            if (contentStyle) {
                actionStyleMap[CONTENT_CSS_PROPERTY] = contentStyle.value;
                ruleData.hasInternalContent = true;
            }
            actionStyleMap[REMOVE_PSEUDO_MARKER] = PSEUDO_PROPERTY_POSITIVE_VALUE;
        } else {
            // keep styles of other rules with the same target selector
            regularStyles.forEach((style) => {
                actionStyleMap[style.property] = style.value;
            });
            // keep 'content' of action rules only for `beforeStyleApplied` (e.g. CssHitsCounter);
            // regular 'content' has priority and should be applied to the element
            if (!(CONTENT_CSS_PROPERTY in actionStyleMap)) {
                const contentStyle = actionRuleStyles.find((s) => s.property === CONTENT_CSS_PROPERTY);
                if (contentStyle) {
                    actionStyleMap[CONTENT_CSS_PROPERTY] = contentStyle.value;
                    ruleData.hasInternalContent = true;
                }
            }
        }

        // action pseudo-classes are not stored in `style`:
        // `actionStyles` is the only source of action arguments
        if (actionStyles.length > 0) {
            ruleData.actionStyles = actionStyles;
        }

        ruleData.style = actionStyleMap;
    } else {
        // otherwise all styles should be applied.
        // every style property will be unique because of their converting into object
        if (regularStyles.length > 0) {
            const stylesAsEntries: Array<[string, string]> = regularStyles.map((style) => {
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
        const { ast, styleGroups } = value;
        results.push(prepareRuleData({ selector, ast, styleGroups }));
    });
    return results;
};
