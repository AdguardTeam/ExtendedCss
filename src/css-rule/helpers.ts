import {
    ExtCssRuleData,
    ParsedSelectorData,
    RawCssRuleData,
    SelectorPartData,
    RawResults,
    RawResultValue,
} from './types';

import { AnySelectorNodeInterface, ExtCssDocument } from '../selector';
import { StyleDeclaration } from '../style-block';

import { getErrorMessage } from '../common/utils/error';
import { getObjectFromEntries } from '../common/utils/objects';
import { logger } from '../common/utils/logger';

import {
    COLON,
    BRACKET,
    REMOVE_PSEUDO_MARKER,
    REMOVE_ERROR_PREFIX,
    CONTENT_CSS_PROPERTY,
    PSEUDO_PROPERTY_POSITIVE_VALUE,
    DEBUG_PSEUDO_PROPERTY_GLOBAL_VALUE,
    AT_RULE_MARKER,
    NO_AT_RULE_ERROR_PREFIX,
} from '../common/constants';


const DEBUG_PSEUDO_PROPERTY_KEY = 'debug';

/**
 * Checks the presence of :remove() pseudo-class and validates it while parsing the selector part of css rule.
 *
 * @param rawSelector Selector which may contain :remove() pseudo-class.
 *
 * @returns Parsed selector data with selector and styles.
 * @throws An error on invalid :remove() position.
 */
export const parseRemoveSelector = (rawSelector: string): ParsedSelectorData => {
    /**
     * No error will be thrown on invalid selector as it will be validated later
     * so it's better to explicitly specify 'any' selector for :remove() pseudo-class by '*',
     * e.g. '.banner > *:remove()' instead of '.banner > :remove()'.
     */

    // ':remove()'
    // eslint-disable-next-line max-len
    const VALID_REMOVE_MARKER = `${COLON}${REMOVE_PSEUDO_MARKER}${BRACKET.PARENTHESES.LEFT}${BRACKET.PARENTHESES.RIGHT}`;
    // ':remove(' - needed for validation rules like 'div:remove(2)'
    const INVALID_REMOVE_MARKER = `${COLON}${REMOVE_PSEUDO_MARKER}${BRACKET.PARENTHESES.LEFT}`;

    let selector: string;
    let shouldRemove = false;
    const firstIndex = rawSelector.indexOf(VALID_REMOVE_MARKER);
    if (firstIndex === 0) {
        // e.g. ':remove()'
        throw new Error(`${REMOVE_ERROR_PREFIX.NO_TARGET_SELECTOR}: '${rawSelector}'`);
    } else if (firstIndex > 0) {
        if (firstIndex !== rawSelector.lastIndexOf(VALID_REMOVE_MARKER)) {
            // rule with more than one :remove() pseudo-class is invalid
            // e.g. '.block:remove() > .banner:remove()'
            throw new Error(`${REMOVE_ERROR_PREFIX.MULTIPLE_USAGE}: '${rawSelector}'`);
        } else if (firstIndex + VALID_REMOVE_MARKER.length < rawSelector.length) {
            // remove pseudo-class should be last in the rule
            // e.g. '.block:remove():upward(2)'
            throw new Error(`${REMOVE_ERROR_PREFIX.INVALID_POSITION}: '${rawSelector}'`);
        } else {
            // valid :remove() pseudo-class position
            selector = rawSelector.substring(0, firstIndex);
            shouldRemove = true;
        }
    } else if (rawSelector.includes(INVALID_REMOVE_MARKER)) {
        // it is not valid if ':remove()' is absent in rule but just ':remove(' is present
        // e.g. 'div:remove(0)'
        throw new Error(`${REMOVE_ERROR_PREFIX.INVALID_REMOVE}: '${rawSelector}'`);
    } else {
        // there is no :remove() pseudo-class in rule
        selector = rawSelector;
    }

    const stylesOfSelector = shouldRemove
        ? [{ property: REMOVE_PSEUDO_MARKER, value: PSEUDO_PROPERTY_POSITIVE_VALUE }]
        : [];

    return { selector, stylesOfSelector };
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
        removeSelectorData = parseRemoveSelector(selector);
    } catch (e: unknown) {
        logger.error(getErrorMessage(e));
        throw new Error(`${REMOVE_ERROR_PREFIX.INVALID_REMOVE}: '${selector}'`);
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
 * Handles `debug` and `remove` in raw rule data styles.
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
    if (shouldRemove) {
        // no other styles are needed to apply if 'remove' is set
        ruleData.style = {
            [REMOVE_PSEUDO_MARKER]: PSEUDO_PROPERTY_POSITIVE_VALUE,
        };

        /**
         * 'content' property is needed for ExtCssConfiguration.beforeStyleApplied().
         *
         * @see {@link BeforeStyleAppliedCallback}
         */
        const contentStyle = styles.find((s) => s.property === CONTENT_CSS_PROPERTY);
        if (contentStyle) {
            ruleData.style[CONTENT_CSS_PROPERTY] = contentStyle.value;
        }
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
