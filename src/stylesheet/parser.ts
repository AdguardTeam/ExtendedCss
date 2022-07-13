import { normalize } from './normalizer';

import { parse as parseSelector } from '../selector/parser';
import { AnySelectorNodeInterface } from '../selector/nodes';

import utils from '../utils';
import {
    BRACKETS,
    COLON,
    DEBUG_PSEUDO_PROPERTY_KEY,
    PSEUDO_PROPERTY_POSITIVE_VALUE,
    REGEXP_DECLARATION_DIVIDER,
    REGEXP_DECLARATION_END,
    REGEXP_NON_WHITESPACE,
    REMOVE_PSEUDO_CLASS_MARKER,
    REMOVE_PSEUDO_PROPERTY_KEY,
    STYLESHEET_ERROR_PREFIX,
} from '../constants';

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

interface CssStyleMap {
    [key: string]: string;
}

interface ExtendedCssRuleData {
    selector: string,
    ast: AnySelectorNodeInterface,
    style?: CssStyleMap,
    remove?: boolean,
    debug?: boolean,
}

interface SelectorPartData {
    success: boolean,
    selector: string,
    // might be not defined if selector is not valid
    ast?: AnySelectorNodeInterface,
    stylesOfSelector?: Style[],
}

interface Context {
    // flag for parsing rules parts
    isSelector: boolean,
    // parser position
    nextIndex: number,
    // stylesheet left to parse
    cssToParse: string,
    // buffer for selector text collecting
    selectorBuffer: string,
    // buffer for rule data collecting
    rawRuleData: RawCssRuleData,
}

const restoreRuleAcc = (context: Context): void => {
    context.rawRuleData = {
        selector: '',
    };
};

interface ParsedSelectorData {
    selector: string,
    stylesOfSelector: Style[],
}

/**
 * Checks the presence of :remove() pseudo-class and validates it while parsing the selector part of css rule
 * @param rawSelector
 * @return `{ selector, stylesOfSelector }`
 */
const parseRemoveSelector = (rawSelector: string): ParsedSelectorData => {
    /**
     * TODO: mention it in readme later
     *
     * no error will be thrown on invalid selector as it will be validated later
     * so it's better to explicitly specify 'any' selector for :remove() pseudo-class by '*'
     * e.g. '.banner > *:remove()' instead of '.banner > :remove()'
     */

    // ':remove()'
    const VALID_REMOVE_MARKER = `${COLON}${REMOVE_PSEUDO_CLASS_MARKER}${BRACKETS.PARENTHESES.LEFT}${BRACKETS.PARENTHESES.RIGHT}`; // eslint-disable-line max-len
    // ':remove(' - needed for validation rules like 'div:remove(2)'
    const INVALID_REMOVE_MARKER = `${COLON}${REMOVE_PSEUDO_CLASS_MARKER}${BRACKETS.PARENTHESES.LEFT}`;

    let selector;
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
        ? [{ property: REMOVE_PSEUDO_PROPERTY_KEY, value: String(shouldRemove) }]
        : [];

    return { selector, stylesOfSelector };
};

const parseSelectorPart = (context: Context): SelectorPartData => {
    let selector = context.selectorBuffer.trim();

    let removeSelectorData;
    try {
        removeSelectorData = parseRemoveSelector(selector);
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        utils.logError(e.message);
        throw new Error(`${STYLESHEET_ERROR_PREFIX.INVALID_REMOVE}: '${selector}'`);
    }

    if (context.nextIndex === -1) {
        if (selector === removeSelectorData.selector) {
            throw new Error(`${STYLESHEET_ERROR_PREFIX.NO_STYLE_OR_REMOVE}: '${context.cssToParse}'`); // eslint-disable-line max-len
        }
        // stop parsing as there is no style declaration and selector parsed fine
        context.cssToParse = '';
    }

    let stylesOfSelector: Style[] = [];
    let success = false;
    let ast;

    try {
        selector = removeSelectorData.selector;
        stylesOfSelector = removeSelectorData.stylesOfSelector;
        ast = parseSelector(selector);
        success = true;
        // if (context.nextIndex === -1) {
        //     // stop parsing as there is no style declaration and selector parsed fine
        //     context.cssToParse = '';
        // }
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        success = false;
    }

    if (context.nextIndex > 0) {
        // slice selector off and parse rest of stylesheet later
        context.cssToParse = context.cssToParse.slice(context.nextIndex);
    }

    return { success, selector, ast, stylesOfSelector };
};

/**
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
 * Checks whether the property positively set in styles
 * @param styles
 * @param pseudoProperty
 */
const isSetInStyles = (styles: Style[], pseudoProperty: string): boolean => {
    return styles.some((s) => {
        return s.property === pseudoProperty && s.value === PSEUDO_PROPERTY_POSITIVE_VALUE;
    });
};

/**
 * Prepares final RuleData
 * @param selector
 * @param rawStyles array of previously collected styles which may contain 'remove' and 'debug'
 */
export const prepareRuleData = (
    selector: string,
    ast: AnySelectorNodeInterface,
    rawStyles: Style[],
): ExtendedCssRuleData => {
    const ruleData: ExtendedCssRuleData = { selector, ast };

    const shouldDebug = isSetInStyles(rawStyles, DEBUG_PSEUDO_PROPERTY_KEY);
    const shouldRemove = isSetInStyles(rawStyles, REMOVE_PSEUDO_PROPERTY_KEY);

    let styles = rawStyles;
    if (shouldDebug) {
        // get rid of 'debug' from styles and set it to separate property
        styles = rawStyles.filter((s) => s.property !== DEBUG_PSEUDO_PROPERTY_KEY);
        ruleData[DEBUG_PSEUDO_PROPERTY_KEY] = shouldDebug;
    }
    if (shouldRemove) {
        // no style is needed to apply if 'remove' is set
        ruleData[REMOVE_PSEUDO_PROPERTY_KEY] = shouldRemove;
    } else {
        // otherwise all styles should be applied.
        // every style property will be unique because of their converting into object
        if (styles.length > 0) {
            const preparedStyleData = Object.fromEntries(styles.map((style) => {
                const { property, value } = style;
                return [property, value];
            }));
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
 * Parses stylesheet into rules data objects
 * @param stylesheet
 */
export const parse = (rawStylesheet: string): ExtendedCssRuleData[] => {
    const stylesheet = normalize(rawStylesheet);
    const context: Context = {
        // any stylesheet should start with selector
        isSelector: true,
        // init value of parser position
        nextIndex: 0,
        // init value of cssToParse
        cssToParse: stylesheet,
        selectorBuffer: '',
        rawRuleData: { selector: '' },
    };

    const rawResults: RawResults = new Map<string, RawResultValue>();

    let selectorData;

    // context.cssToParse is going to be cropped while its parsing
    while (context.cssToParse) {
        if (context.isSelector) {
            context.nextIndex = context.cssToParse.indexOf(BRACKETS.CURLY.LEFT);
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
                // selector successfully parser
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
                    // skip the opening curly bracket at the start
                    context.nextIndex = 1;
                    context.selectorBuffer = '';
                }
            } else {
                // continue selector parsing
                // but save the found bracket
                context.selectorBuffer += BRACKETS.CURLY.LEFT;
                // delete it from cssToParse
                context.cssToParse = context.cssToParse.slice(1);
            }
        } else {
            // style should be parsed
            const parsedStyles = parseNextStyle(context);

            // styles can be parsed from selector part if it has :remove() pseudo-class
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

    const results: ExtendedCssRuleData[] = [];
    rawResults.forEach((value, key) => {
        const selector = key;
        const { ast, styles: rawStyles } = value;
        results.push(prepareRuleData(selector, ast, rawStyles));
    });
    return results;
};
