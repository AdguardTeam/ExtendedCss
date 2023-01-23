import { AnySelectorNodeInterface, ExtCssDocument } from '../selector';

import { StyleDeclaration } from '../style-block';

import {
    parseRemoveSelector,
    createRawResultsMap,
    saveToRawResults,
    combineRulesData,
    ExtCssRuleData,
    ParsedSelectorData,
    RawCssRuleData,
    SelectorPartData,
} from '../css-rule';

import { getErrorMessage } from '../common/utils/error';
import { logger } from '../common/utils/logger';

import {
    BRACKET,
    COLON,
    SLASH,
    ASTERISK,
    AT_RULE_MARKER,
    STYLE_ERROR_PREFIX,
    REMOVE_ERROR_PREFIX,
    NO_AT_RULE_ERROR_PREFIX,
} from '../common/constants';

const REGEXP_DECLARATION_END = /[;}]/g;
const REGEXP_DECLARATION_DIVIDER = /[;:}]/g;
const REGEXP_NON_WHITESPACE = /\S/g;

/**
 * Interface for stylesheet parser context.
 */
type Context = {
    /**
     * Flag for parsing rules parts.
     */
    isSelector: boolean;

    /**
     * Parser position.
     */
    nextIndex: number;

    /**
     * Stylesheet left to parse.
     */
    cssToParse: string;

    /**
     * Buffer for selector text collecting.
     */
    selectorBuffer: string;

    /**
     * Buffer for rule data collecting.
     */
    rawRuleData: RawCssRuleData;
};

/**
 * Resets rule data buffer to init value after rule successfully collected.
 *
 * @param context Stylesheet parser context.
 */
const restoreRuleAcc = (context: Context): void => {
    context.rawRuleData = {
        selector: '',
    };
};

/**
 * Parses cropped selector part found before `{` previously.
 *
 * @param context Stylesheet parser context.
 * @param extCssDoc Needed for caching of selector ast.
 *
 * @returns Parsed validation data for cropped part of stylesheet which may be a selector.
 * @throws An error on unsupported CSS features, e.g. at-rules.
 */
const parseSelectorPart = (context: Context, extCssDoc: ExtCssDocument): SelectorPartData => {
    let selector = context.selectorBuffer.trim();
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

    if (context.nextIndex === -1) {
        if (selector === removeSelectorData.selector) {
            // rule should have style or pseudo-class :remove()
            throw new Error(`${STYLE_ERROR_PREFIX.NO_STYLE_OR_REMOVE}: '${context.cssToParse}'`);
        }
        // stop parsing as there is no style declaration and selector parsed fine
        context.cssToParse = '';
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

    if (context.nextIndex > 0) {
        // slice found valid selector part off
        // and parse rest of stylesheet later
        context.cssToParse = context.cssToParse.slice(context.nextIndex);
    }

    return { success, selector, ast, stylesOfSelector };
};

/**
 * Recursively parses style declaration string into `Style`s.
 *
 * @param context Stylesheet parser context.
 * @param styles Array of styles.
 *
 * @throws An error on invalid style declaration.
 * @returns A number index of the next `}` in `this.cssToParse`.
 */
const parseUntilClosingBracket = (context: Context, styles: StyleDeclaration[]): number => {
    // Expects ":", ";", and "}".
    REGEXP_DECLARATION_DIVIDER.lastIndex = context.nextIndex;
    let match = REGEXP_DECLARATION_DIVIDER.exec(context.cssToParse);
    if (match === null) {
        throw new Error(`${STYLE_ERROR_PREFIX.INVALID_STYLE}: '${context.cssToParse}'`);
    }
    let matchPos = match.index;
    let matched = match[0];

    if (matched === BRACKET.CURLY.RIGHT) {
        const declarationChunk = context.cssToParse.slice(context.nextIndex, matchPos);
        if (declarationChunk.trim().length === 0) {
            // empty style declaration
            // e.g. 'div { }'
            if (styles.length === 0) {
                throw new Error(`${STYLE_ERROR_PREFIX.NO_STYLE}: '${context.cssToParse}'`);
            }
            // else valid style parsed before it
            // e.g. '{ display: none; }' -- position is after ';'
        } else {
            // closing curly bracket '}' is matched before colon ':'
            // trimmed declarationChunk is not a space, between ';' and '}',
            // e.g. 'visible }' in style '{ display: none; visible }' after part before ';' is parsed
            throw new Error(`${STYLE_ERROR_PREFIX.INVALID_STYLE}: '${context.cssToParse}'`);
        }
        return matchPos;
    }

    if (matched === COLON) {
        const colonIndex = matchPos;
        // Expects ";" and "}".
        REGEXP_DECLARATION_END.lastIndex = colonIndex;
        match = REGEXP_DECLARATION_END.exec(context.cssToParse);
        if (match === null) {
            throw new Error(`${STYLE_ERROR_PREFIX.UNCLOSED_STYLE}: '${context.cssToParse}'`);
        }
        matchPos = match.index;
        matched = match[0];
        // Populates the `styleMap` key-value map.
        const property = context.cssToParse.slice(context.nextIndex, colonIndex).trim();
        if (property.length === 0) {
            throw new Error(`${STYLE_ERROR_PREFIX.NO_PROPERTY}: '${context.cssToParse}'`);
        }
        const value = context.cssToParse.slice(colonIndex + 1, matchPos).trim();
        if (value.length === 0) {
            throw new Error(`${STYLE_ERROR_PREFIX.NO_VALUE}: '${context.cssToParse}'`);
        }
        styles.push({ property, value });
        // finish style parsing if '}' is found
        // e.g. '{ display: none }' -- no ';' at the end of declaration
        if (matched === BRACKET.CURLY.RIGHT) {
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
 * Parses next style declaration part in stylesheet.
 *
 * @param context Stylesheet parser context.
 *
 * @returns Array of style data objects.
 */
const parseNextStyle = (context: Context): StyleDeclaration[] => {
    const styles: StyleDeclaration[] = [];

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
 * Parses stylesheet of rules into rules data objects (non-recursively):
 * 1. Iterates through stylesheet string.
 * 2. Finds first `{` which can be style declaration start or part of selector.
 * 3. Validates found string part via selector parser; and if:
 *  - it throws error — saves string part to buffer as part of selector,
 *    slice next stylesheet part to `{` [2] and validates again [3];
 *  - no error — saves found string part as selector and starts to parse styles (recursively).
 *
 * @param rawStylesheet Raw stylesheet as string.
 * @param extCssDoc ExtCssDocument which uses cache while selectors parsing.
 * @throws An error on unsupported CSS features, e.g. comments or invalid stylesheet syntax.
 * @returns Array of rules data which contains:
 * - selector as string;
 * - ast to query elements by;
 * - map of styles to apply.
 */
export const parseStylesheet = (rawStylesheet: string, extCssDoc: ExtCssDocument): ExtCssRuleData[] => {
    const stylesheet = rawStylesheet.trim();
    if (stylesheet.includes(`${SLASH}${ASTERISK}`) && stylesheet.includes(`${ASTERISK}${SLASH}`)) {
        throw new Error(`${STYLE_ERROR_PREFIX.NO_COMMENT} in stylesheet: '${stylesheet}'`);
    }

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
        rawRuleData: { selector: '' },
    };

    const rawResults = createRawResultsMap();

    let selectorData: SelectorPartData;

    // context.cssToParse is going to be cropped while its parsing
    while (context.cssToParse) {
        if (context.isSelector) {
            // find index of first opening curly bracket
            // which may mean start of style part and end of selector one
            context.nextIndex = context.cssToParse.indexOf(BRACKET.CURLY.LEFT);
            // rule should not start with style, selector is required
            // e.g. '{ display: none; }'
            if (context.selectorBuffer.length === 0 && context.nextIndex === 0) {
                throw new Error(`${STYLE_ERROR_PREFIX.NO_SELECTOR}: '${context.cssToParse}'`);
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

            selectorData = parseSelectorPart(context, extCssDoc);
            if (selectorData.success) {
                // selector successfully parsed
                context.rawRuleData.selector = selectorData.selector.trim();
                context.rawRuleData.ast = selectorData.ast;
                context.rawRuleData.rawStyles = selectorData.stylesOfSelector;
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
                context.selectorBuffer += BRACKET.CURLY.LEFT;
                // delete `{` from cssToParse
                context.cssToParse = context.cssToParse.slice(1);
            }
        } else {
            // style declaration should be parsed
            const parsedStyles = parseNextStyle(context);

            // styles can be parsed from selector part if it has :remove() pseudo-class
            // e.g. '.banner:remove() { debug: true; }'
            context.rawRuleData.rawStyles?.push(...parsedStyles);

            // save rule data to results
            saveToRawResults(rawResults, context.rawRuleData);

            context.nextIndex = 0;

            // clean up ruleContext
            restoreRuleAcc(context);

            // parse next rule selector after style successfully parsed
            context.isSelector = true;
        }
    }

    return combineRulesData(rawResults);
};
