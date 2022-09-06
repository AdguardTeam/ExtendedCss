import { parse as parseSelector } from '../selector/parser';
import { AnySelectorNodeInterface } from '../selector/nodes';

import { TimingStats } from '../helpers/timing-stats';

import { logger } from '../common/utils/logger';
import { getObjectFromEntries } from '../common/utils/objects';

import {
    BRACKETS,
    COLON,
    REMOVE_PSEUDO_MARKER,
    PSEUDO_PROPERTY_POSITIVE_VALUE,
    DEBUG_PSEUDO_PROPERTY_GLOBAL_VALUE,
    STYLESHEET_ERROR_PREFIX,
} from '../common/constants';

const DEBUG_PSEUDO_PROPERTY_KEY = 'debug';

const REGEXP_DECLARATION_END = /[;}]/g;
const REGEXP_DECLARATION_DIVIDER = /[;:}]/g;
const REGEXP_NON_WHITESPACE = /\S/g;

interface Style {
    property: string,
    value: string,
}

interface RawCssRuleData {
    selector: string,
    ast?: AnySelectorNodeInterface,
    styles?: Style[],
}

interface RawResultValue {
    ast: AnySelectorNodeInterface,
    styles: Style[];
}
type RawResults = Map<string, RawResultValue>;

export interface CssStyleMap {
    [key: string]: string;
}

export interface ExtCssRuleData {
    selector: string,
    ast: AnySelectorNodeInterface,
    style?: CssStyleMap,
    debug?: string,
    timingStats?: TimingStats,
}

interface SelectorPartData {
    success: boolean,
    selector: string,
    // might be not defined if selector is not valid
    ast?: AnySelectorNodeInterface,
    stylesOfSelector?: Style[],
}

interface Context {
    /**
     * Flag for parsing rules parts
     */
    isSelector: boolean,

    /**
     * Parser position
     */
    nextIndex: number,

    /**
     * Stylesheet left to parse
     */
    cssToParse: string,

    /**
     * Buffer for selector text collecting
     */
    selectorBuffer: string,

    /**
     * Buffer for rule data collecting
     */
    rawRuleData: RawCssRuleData,
}

/**
 * Init value for rawRuleData
 */
const initRawRuleData = { selector: '' };

/**
 * Resets rule data buffer to init value after rule successfully collected
 * @param context
 */
const restoreRuleAcc = (context: Context): void => {
    context.rawRuleData = initRawRuleData;
};

interface ParsedSelectorData {
    selector: string,
    stylesOfSelector: Style[],
}

/**
 * Checks the presence of :remove() pseudo-class and validates it while parsing the selector part of css rule
 * @param rawSelector
 */
const parseRemoveSelector = (rawSelector: string): ParsedSelectorData => {
    /**
     * no error will be thrown on invalid selector as it will be validated later
     * so it's better to explicitly specify 'any' selector for :remove() pseudo-class by '*'
     * e.g. '.banner > *:remove()' instead of '.banner > :remove()'
     */

    // ':remove()'
    const VALID_REMOVE_MARKER = `${COLON}${REMOVE_PSEUDO_MARKER}${BRACKETS.PARENTHESES.LEFT}${BRACKETS.PARENTHESES.RIGHT}`; // eslint-disable-line max-len
    // ':remove(' - needed for validation rules like 'div:remove(2)'
    const INVALID_REMOVE_MARKER = `${COLON}${REMOVE_PSEUDO_MARKER}${BRACKETS.PARENTHESES.LEFT}`;

    let selector: string;
    let shouldRemove = false;
    const firstIndex = rawSelector.indexOf(VALID_REMOVE_MARKER);
    if (firstIndex === 0) {
        // e.g. ':remove()'
        throw new Error(`Selector should be specified before :remove() pseudo-class: '${rawSelector}'`);
    } else if (firstIndex > 0) {
        if (firstIndex !== rawSelector.lastIndexOf(VALID_REMOVE_MARKER)) {
            // rule with more than one :remove() pseudo-class is invalid
            // e.g. '.block:remove() > .banner:remove()'
            throw new Error(`Pseudo-class :remove() appears more than once in selector: '${rawSelector}'`);
        } else if (firstIndex + VALID_REMOVE_MARKER.length < rawSelector.length) {
            // remove pseudo-class should be last in the rule
            // e.g. '.block:remove():upward(2)'
            throw new Error(`Pseudo-class :remove() should be at the end of selector: '${rawSelector}'`);
        } else {
            // valid :remove() pseudo-class position
            selector = rawSelector.substring(0, firstIndex);
            shouldRemove = true;
        }
    } else if (rawSelector.includes(INVALID_REMOVE_MARKER)) {
        // it is not valid if ':remove()' is absent in rule but just ':remove(' is present
        // e.g. 'div:remove(0)'
        throw new Error(`${STYLESHEET_ERROR_PREFIX.INVALID_REMOVE}: '${rawSelector}'`);
    } else {
        // there is no :remove() pseudo-class is rule
        selector = rawSelector;
    }

    const stylesOfSelector = shouldRemove
        ? [{ property: REMOVE_PSEUDO_MARKER, value: String(shouldRemove) }]
        : [];

    return { selector, stylesOfSelector };
};

/**
 * Parses cropped selector part found before `{` previously
 * @param context
 */
const parseSelectorPart = (context: Context): SelectorPartData => {
    let selector = context.selectorBuffer.trim();

    let removeSelectorData: ParsedSelectorData;
    try {
        removeSelectorData = parseRemoveSelector(selector);
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        logger.error(e.message);
        throw new Error(`${STYLESHEET_ERROR_PREFIX.INVALID_REMOVE}: '${selector}'`);
    }

    if (context.nextIndex === -1) {
        if (selector === removeSelectorData.selector) {
            // rule should have style or pseudo-class :remove()
            throw new Error(`${STYLESHEET_ERROR_PREFIX.NO_STYLE_OR_REMOVE}: '${context.cssToParse}'`); // eslint-disable-line max-len
        }
        // stop parsing as there is no style declaration and selector parsed fine
        context.cssToParse = '';
    }

    let stylesOfSelector: Style[] = [];
    let success = false;
    let ast: AnySelectorNodeInterface | undefined;

    try {
        selector = removeSelectorData.selector;
        stylesOfSelector = removeSelectorData.stylesOfSelector;
        // validate found selector by parsing it to ast
        // so if it is invalid error will be thrown
        ast = parseSelector(selector);
        success = true;
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        success = false;
    }

    if (context.nextIndex > 0) {
        // slice found valid selector part off
        // and parse rest of stylesheet later
        context.cssToParse = context.cssToParse.slice(context.nextIndex);
    }

    return { success, selector, ast, stylesOfSelector };
};

/**
 * Recursively parses style declaration string into `Style`s
 * @return a number index of the next `}` in `this.cssToParse`.
 */
const parseUntilClosingBracket = (context: Context, styles: Style[]): number => {
    // Expects ":", ";", and "}".
    REGEXP_DECLARATION_DIVIDER.lastIndex = context.nextIndex;
    let match = REGEXP_DECLARATION_DIVIDER.exec(context.cssToParse);
    if (match === null) {
        throw new Error(`${STYLESHEET_ERROR_PREFIX.INVALID_STYLE}: '${context.cssToParse}'`);
    }
    let matchPos = match.index;
    let matched = match[0];

    if (matched === BRACKETS.CURLY.RIGHT) {
        const declarationChunk = context.cssToParse.slice(context.nextIndex, matchPos);
        if (declarationChunk.trim().length === 0) {
            // empty style declaration
            // e.g. 'div { }'
            if (styles.length === 0) {
                throw new Error(`${STYLESHEET_ERROR_PREFIX.NO_STYLE}: '${context.cssToParse}'`);
            }
            // else valid style parsed before it
            // e.g. '{ display: none; }' -- position is after ';'
        } else {
            // closing curly bracket '}' is matched before colon ':'
            // trimmed declarationChunk is not a space, between ';' and '}',
            // e.g. 'visible }' in style '{ display: none; visible }' after part before ';' is parsed
            throw new Error(`${STYLESHEET_ERROR_PREFIX.INVALID_STYLE}: '${context.cssToParse}'`);
        }
        return matchPos;
    }

    if (matched === COLON) {
        const colonIndex = matchPos;
        // Expects ";" and "}".
        REGEXP_DECLARATION_END.lastIndex = colonIndex;
        match = REGEXP_DECLARATION_END.exec(context.cssToParse);
        if (match === null) {
            throw new Error(`${STYLESHEET_ERROR_PREFIX.UNCLOSED_STYLE}: '${context.cssToParse}'`);
        }
        matchPos = match.index;
        matched = match[0];
        // Populates the `styleMap` key-value map.
        const property = context.cssToParse.slice(context.nextIndex, colonIndex).trim();
        if (property.length === 0) {
            throw new Error(`${STYLESHEET_ERROR_PREFIX.NO_PROPERTY}: '${context.cssToParse}'`);
        }
        const value = context.cssToParse.slice(colonIndex + 1, matchPos).trim();
        if (value.length === 0) {
            throw new Error(`${STYLESHEET_ERROR_PREFIX.NO_VALUE}: '${context.cssToParse}'`);
        }
        styles.push({ property, value });
        // finish style parsing if '}' is found
        // e.g. '{ display: none }' -- no ';' at the end of declaration
        if (matched === BRACKETS.CURLY.RIGHT) {
            return matchPos;
        }
    }
    // matchPos is the position of the next ';'
    // crop 'cssToParse' and re-run the loop
    context.cssToParse = context.cssToParse.slice(matchPos + 1);
    context.nextIndex = 0;
    return parseUntilClosingBracket(context, styles); // Should be a subject of tail-call optimization.
};

/**
 * Parses next style declaration part in stylesheet
 * @param context
 */
const parseNextStyle = (context: Context): Style[] => {
    const styles: Style[] = [];

    const styleEndPos = parseUntilClosingBracket(context, styles);

    // find next rule after the style declaration
    REGEXP_NON_WHITESPACE.lastIndex = styleEndPos + 1;
    const match = REGEXP_NON_WHITESPACE.exec(context.cssToParse);
    if (match === null) {
        context.cssToParse = '';
        return styles;
    }
    const matchPos = match.index;

    // cut out matched style declaration for previous selector
    context.cssToParse = context.cssToParse.slice(matchPos);
    return styles;
};

/**
 * Checks whether the 'remove' property positively set in styles
 * with only one positive value - 'true'
 * @param styles
 */
const isRemoveSetInStyles = (styles: Style[]): boolean => {
    return styles.some((s) => {
        return s.property === REMOVE_PSEUDO_MARKER
            && s.value === PSEUDO_PROPERTY_POSITIVE_VALUE;
    });
};

/**
 * Gets valid 'debug' property value set in styles
 * where possible values are 'true' and 'global'
 * @param styles
 */
const getDebugStyleValue = (styles: Style[]): string | undefined => {
    const debugStyle = styles.find((s) => {
        return s.property === DEBUG_PSEUDO_PROPERTY_KEY;
    });
    return debugStyle?.value;
};

/**
 * Prepares final RuleData
 * @param selector
 * @param ast
 * @param rawStyles array of previously collected styles which may contain 'remove' and 'debug'
 */
export const prepareRuleData = (
    selector: string,
    ast: AnySelectorNodeInterface,
    rawStyles: Style[],
): ExtCssRuleData => {
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
    } else {
        // otherwise all styles should be applied.
        // every style property will be unique because of their converting into object
        if (styles.length > 0) {
            const stylesAsEntries = styles.map((style) => {
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
 * Saves rules data for unique selectors
 * @param rawResults
 * @param rawRuleData
 */
const saveToRawResults = (rawResults: RawResults, rawRuleData: RawCssRuleData): void => {
    const { selector, ast, styles } = rawRuleData;

    if (!styles) {
        throw new Error(`No style declaration for selector: '${selector}'`);
    }
    if (!ast) {
        throw new Error(`No ast parsed for selector: '${selector}'`);
    }

    const storedRuleData = rawResults.get(selector);
    if (!storedRuleData) {
        rawResults.set(selector, { ast, styles });
    } else {
        storedRuleData.styles.push(...styles);
    }
};

/**
 * Parses stylesheet of rules into rules data objects (non-recursively):
 * 1. Iterates through stylesheet string
 * 2. Finds first `{` which can be style declaration start or part of selector
 * 3. Validates found string part via selector parser; and if
 *  - it throws error — saves string part to buffer as part of selector,
 *    slice next stylesheet part to `{` [2] and validates again [3]
 *  - no error — saves found string part as selector and starts to parse styles (recursively)
 * @param rawStylesheet as string
 * @returns array of rules data which contains:
 * - selector as string
 * - ast to query elements by
 * - map of styles to apply
 *
 */
export const parse = (rawStylesheet: string): ExtCssRuleData[] => {
    const stylesheet = rawStylesheet.trim();
    const context: Context = {
        // any stylesheet should start with selector
        isSelector: true,
        // init value of parser position
        nextIndex: 0,
        // init value of cssToParse
        cssToParse: stylesheet,
        // buffer for collecting selector part
        selectorBuffer: '',
        // accumulator for rules
        rawRuleData: initRawRuleData,
    };

    const rawResults: RawResults = new Map<string, RawResultValue>();

    let selectorData: SelectorPartData;

    // context.cssToParse is going to be cropped while its parsing
    while (context.cssToParse) {
        if (context.isSelector) {
            // find index of first opening curly bracket
            // which may mean start of style part and end of selector one
            context.nextIndex = context.cssToParse.indexOf(BRACKETS.CURLY.LEFT);
            // rule should not start with style, selector required
            if (context.selectorBuffer.length === 0 && context.nextIndex === 0) {
                throw new Error(`Selector should be defined before style declaration in stylesheet: '${context.cssToParse}'`); // eslint-disable-line max-len
            }
            if (context.nextIndex === -1) {
                // no style declaration in rule
                // but rule still may contain :remove() pseudo-class
                context.selectorBuffer = context.cssToParse;
            } else {
                // collect string parts before opening curly bracket
                // until valid selector collected
                context.selectorBuffer += context.cssToParse.slice(0, context.nextIndex);
            }

            selectorData = parseSelectorPart(context);
            if (selectorData.success) {
                // selector successfully parsed
                context.rawRuleData.selector = selectorData.selector.trim();
                context.rawRuleData.ast = selectorData.ast;
                context.rawRuleData.styles = selectorData.stylesOfSelector;
                context.isSelector = false;
                // save rule data if there is no style declaration
                if (context.nextIndex === -1) {
                    saveToRawResults(rawResults, context.rawRuleData);
                    // clean up ruleContext
                    restoreRuleAcc(context);
                } else {
                    // skip the opening curly bracket at the start of style declaration part
                    context.nextIndex = 1;
                    context.selectorBuffer = '';
                }
            } else {
                // if selector was not successfully parsed parseSelectorPart(), continue stylesheet parsing:
                // save the found bracket to buffer and proceed to next loop iteration
                context.selectorBuffer += BRACKETS.CURLY.LEFT;
                // delete `{` from cssToParse
                context.cssToParse = context.cssToParse.slice(1);
            }
        } else {
            // style declaration should be parsed
            const parsedStyles = parseNextStyle(context);

            // styles can be parsed from selector part if it has :remove() pseudo-class
            // e.g. '.banner:remove() { debug: true; }'
            context.rawRuleData.styles?.push(...parsedStyles);

            // save rule data to results
            saveToRawResults(rawResults, context.rawRuleData);

            context.nextIndex = 0;

            // clean up ruleContext
            restoreRuleAcc(context);

            // parse next rule selector after style successfully parsed
            context.isSelector = true;
        }
    }

    const results: ExtCssRuleData[] = [];
    rawResults.forEach((value, key) => {
        const selector = key;
        const { ast, styles: rawStyles } = value;
        results.push(prepareRuleData(selector, ast, rawStyles));
    });
    return results;
};
