import { disconnectDocument, observeDocument } from './document-observer';
import { applyStyle, revertStyle } from './style-setter';
import { protectStyleAttribute } from './style-protector';
import { TimingStats, printTimingInfo } from './timing-stats';
import { AffectedElement, Context } from './types';

import { ExtCssRuleData } from '../../css-rule';
import { selectElementsByAst } from '../../selector';

import { getErrorMessage } from '../../common/utils/error';
import { logger } from '../../common/utils/logger';

/**
 * Finds affectedElement object for the specified DOM node.
 *
 * @param affElements Array of affected elements — context.affectedElements.
 * @param domNode DOM node.
 * @returns Found affectedElement or undefined.
 */
const findAffectedElement = (affElements: AffectedElement[], domNode: Element): AffectedElement | undefined => {
    return affElements.find((affEl) => affEl.node === domNode);
};

/**
 * Applies specified rule and returns list of elements affected.
 *
 * @param context ExtendedCss context.
 * @param ruleData Rule to apply.
 * @returns List of elements affected by the rule.
 */
const applyRule = (context: Context, ruleData: ExtCssRuleData): HTMLElement[] => {
    // debugging mode can be enabled in two ways:
    // 1. for separate rules - by `{ debug: true; }`
    // 2. for all rules simultaneously by:
    //   - `{ debug: global; }` in any rule
    //   - positive `debug` property in ExtCssConfiguration
    const isDebuggingMode = !!ruleData.debug || context.debug;
    let startTime: number | undefined;
    if (isDebuggingMode) {
        startTime = performance.now();
    }

    const { ast } = ruleData;
    const nodes: HTMLElement[] = [];
    // selector can be successfully parser into ast with no error
    // but its applying by native Document.querySelectorAll() still may throw an error
    // e.g. 'div[..banner]'
    try {
        nodes.push(...selectElementsByAst(ast));
    } catch (e: unknown) {
        // log the error only in debug mode
        if (context.debug) {
            logger.error(getErrorMessage(e));
        }
    }

    nodes.forEach((node) => {
        let affectedElement = findAffectedElement(context.affectedElements, node);

        if (affectedElement) {
            affectedElement.rules.push(ruleData);
            applyStyle(context, affectedElement);
        } else {
            // Applying style first time
            const originalStyle = node.style.cssText;
            affectedElement = {
                node,                       // affected DOM node
                rules: [ruleData],          // rule to be applied
                originalStyle,              // original node style
                protectionObserver: null,   // style attribute observer
            };
            applyStyle(context, affectedElement);
            context.affectedElements.push(affectedElement);
        }
    });

    if (isDebuggingMode && startTime) {
        const elapsedTimeMs = performance.now() - startTime;
        if (!ruleData.timingStats) {
            ruleData.timingStats = new TimingStats();
        }
        ruleData.timingStats.push(elapsedTimeMs);
    }

    return nodes;
};

/**
 * Applies filtering rules.
 *
 * @param context ExtendedCss context.
 */
export const applyRules = (context: Context): void => {
    const newSelectedElements: HTMLElement[] = [];
    // some rules could make call - selector.querySelectorAll() temporarily to change node id attribute
    // this caused MutationObserver to call recursively
    // https://github.com/AdguardTeam/ExtendedCss/issues/81
    disconnectDocument(context);
    context.parsedRules.forEach((ruleData) => {
        const nodes = applyRule(context, ruleData);
        Array.prototype.push.apply(newSelectedElements, nodes);
        // save matched elements to ruleData as linked to applied rule
        // only for debugging purposes
        if (ruleData.debug) {
            ruleData.matchedElements = nodes;
        }
    });
    // Now revert styles for elements which are no more affected
    let affLength = context.affectedElements.length;
    // do nothing if there is no elements to process
    while (affLength) {
        const affectedElement = context.affectedElements[affLength - 1];
        if (!affectedElement) {
            break;
        }
        if (!newSelectedElements.includes(affectedElement.node)) {
            // Time to revert style
            revertStyle(affectedElement);
            context.affectedElements.splice(affLength - 1, 1);
        } else if (!affectedElement.removed) {
            // Add style protection observer
            // Protect "style" attribute from changes
            if (!affectedElement.protectionObserver) {
                affectedElement.protectionObserver = protectStyleAttribute(
                    affectedElement.node,
                    affectedElement.rules,
                );
            }
        }
        affLength -= 1;
    }
    // After styles are applied we can start observe again
    observeDocument(context);

    printTimingInfo(context);
};
