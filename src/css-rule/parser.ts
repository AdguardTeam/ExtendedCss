import {
    ExtCssRuleData,
    RawCssRuleData,
    SelectorPartData,
} from './types';
import {
    parseSelectorRulePart,
    saveToRawResults,
    combineRulesData,
    createRawResultsMap,
} from './helpers';

import { ExtCssDocument } from '../selector';
import { parseStyleBlock } from '../style-block';

import { getFirst } from '../common/utils/arrays';
import { getErrorMessage } from '../common/utils/error';
import { logger } from '../common/utils/logger';

import {
    BRACKET,
    SLASH,
    ASTERISK,
    STYLE_ERROR_PREFIX,
    NO_SELECTOR_ERROR_PREFIX,
} from '../common/constants';

/**
 * Returns array of positions of `{` in `cssRule`.
 *
 * @param cssRule CSS rule.
 *
 * @returns Array of left curly bracket indexes.
 */
const getLeftCurlyBracketIndexes = (cssRule: string): number[] => {
    const indexes: number[] = [];
    for (let i = 0; i < cssRule.length; i += 1) {
        if (cssRule[i] === BRACKET.CURLY.LEFT) {
            indexes.push(i);
        }
    }
    return indexes;
};

// TODO: use `extCssDoc` for caching of style block parser results
/**
 * Parses CSS rule into rules data object:
 * 1. Find the last `{` mark in the rule
 *    which supposed to be a divider between selector and style block.
 * 2. Validates found string part before the `{` via selector parser; and if:
 *  - parsing failed – get the previous `{` in the rule,
 *    and validates a new rule part again [2];
 *  - parsing successful — saves a found rule part as selector and parses the style block.
 *
 * @param rawCssRule Single CSS rule to parse.
 * @param extCssDoc ExtCssDocument which is used for selector ast caching.
 *
 * @returns Array of rules data which contains:
 *   - selector as string;
 *   - ast to query elements by;
 *   - map of styles to apply.
 * @throws An error on invalid css rule syntax:
 *   - unsupported CSS features – comments and at-rules
 *   - invalid selector or style block.
 */
export const parseRule = (rawCssRule: string, extCssDoc: ExtCssDocument): RawCssRuleData => {
    const cssRule = rawCssRule.trim();
    if (cssRule.includes(`${SLASH}${ASTERISK}`) && cssRule.includes(`${ASTERISK}${SLASH}`)) {
        throw new Error(STYLE_ERROR_PREFIX.NO_COMMENT);
    }

    const leftCurlyBracketIndexes = getLeftCurlyBracketIndexes(cssRule);

    // rule with style block but no selector
    // e.g. '{ display: none; }'
    if (getFirst(leftCurlyBracketIndexes) === 0) {
        throw new Error(NO_SELECTOR_ERROR_PREFIX);
    }

    let selectorData: SelectorPartData;

    // if rule has `{` but there is no `}`
    if (
        leftCurlyBracketIndexes.length > 0
        && !cssRule.includes(BRACKET.CURLY.RIGHT)
    ) {
        throw new Error(`${STYLE_ERROR_PREFIX.NO_STYLE} OR ${STYLE_ERROR_PREFIX.UNCLOSED_STYLE}`);
    }

    if (
        // if rule has no `{`
        leftCurlyBracketIndexes.length === 0
        // or `}`
        || !cssRule.includes(BRACKET.CURLY.RIGHT)
    ) {
        try {
            // the whole css rule considered as "selector part"
            // which may contain :remove() pseudo-class
            selectorData = parseSelectorRulePart(cssRule, extCssDoc);
            if (selectorData.success) {
                // rule with no style block has valid :remove() pseudo-class
                // which is parsed into "styles"
                // e.g. 'div:remove()'
                // but also it can be just selector with no styles
                // e.g. 'div'
                // which should not be considered as valid css rule
                if (selectorData.stylesOfSelector?.length === 0) {
                    throw new Error(STYLE_ERROR_PREFIX.NO_STYLE_OR_REMOVE);
                }
                return {
                    selector: selectorData.selector.trim(),
                    ast: selectorData.ast,
                    rawStyles: selectorData.stylesOfSelector,
                };
            } else {
                // not valid selector
                throw new Error('Invalid selector');
            }
        } catch (e: unknown) {
            throw new Error(getErrorMessage(e));
        }
    }

    let selectorBuffer;
    let styleBlockBuffer;

    const rawRuleData: RawCssRuleData = {
        selector: '',
    };

    // css rule should be parsed from its end
    for (let i = leftCurlyBracketIndexes.length - 1; i > -1; i -= 1) {
        const index = leftCurlyBracketIndexes[i];
        if (!index) {
            throw new Error(`Impossible to continue, no '{' to process for rule: '${cssRule}'`);
        }
        // selector is before `{`, style block is after it
        selectorBuffer = cssRule.slice(0, index);
        // skip curly brackets
        styleBlockBuffer = cssRule.slice(index + 1, cssRule.length - 1);

        selectorData = parseSelectorRulePart(selectorBuffer, extCssDoc);
        if (selectorData.success) {
            // selector successfully parsed
            rawRuleData.selector = selectorData.selector.trim();
            rawRuleData.ast = selectorData.ast;
            rawRuleData.rawStyles = selectorData.stylesOfSelector;
            // style block should be parsed
            // TODO: add cache for style block parsing
            const parsedStyles = parseStyleBlock(styleBlockBuffer);
            rawRuleData.rawStyles?.push(...parsedStyles);
            // stop rule parsing
            break;
        } else {
            // if selector was not parsed successfully
            // continue with next index of `{`
            continue;
        }
    }

    if (rawRuleData.selector?.length === 0) {
        // skip the rule as selector
        throw new Error('Selector in not valid');
    }

    return rawRuleData;
};

/**
 * Parses array of CSS rules into array of rules data objects.
 * Invalid rules are skipped and not applied,
 * and the errors are logged.
 *
 * @param rawCssRules Array of rules to parse.
 * @param extCssDoc Needed for selector ast caching.
 *
 * @returns Array of parsed valid rules data.
 */
export const parseRules = (rawCssRules: string[], extCssDoc: ExtCssDocument): ExtCssRuleData[] => {
    const rawResults = createRawResultsMap();
    const warnings: string[] = [];
    // trim all rules and find unique ones
    const uniqueRules = [...new Set(rawCssRules.map((r) => r.trim()))];
    uniqueRules.forEach((rule) => {
        try {
            saveToRawResults(rawResults, parseRule(rule, extCssDoc));
        } catch (e: unknown) {
            // skip the invalid rule
            const errorMessage = getErrorMessage(e);
            warnings.push(`'${rule}' - error: '${errorMessage}'`);
        }
    });

    // log info about skipped invalid rules
    if (warnings.length > 0) {
        logger.info(`Invalid rules:\n  ${warnings.join('\n  ')}`);
    }

    return combineRulesData(rawResults);
};
