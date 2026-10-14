import { disconnectDocument, observeDocument } from './document-observer';
import {
    applyRuleStyles,
    applyStyle,
    revertStyle,
} from './style-setter';
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
        } else {
            // element is affected first time
            affectedElement = {
                node,                       // affected DOM node
                rules: [ruleData],          // rule to be applied
                originalStyle: node.style.cssText, // original node style
                protectionObserver: null,   // style attribute observer
                appliedStyleSelectors: new Set(),
            };
            context.affectedElements.push(affectedElement);
        }

        // apply regular styles of the rule right away,
        // so selectors which depend on applied styles can match in the same pass;
        // actions are applied after all rules are queried
        applyRuleStyles(context, affectedElement);
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
 * Applies filtering rules once.
 *
 * @param context ExtendedCss context.
 *
 * @returns True if the pass changed the DOM with removals.
 */
const applyRulesPass = (context: Context): boolean => {
    let hasDomMutations = false;
    const newSelectedElements = new Set<HTMLElement>();
    // reset rules collected during the previous pass:
    // only rules matching elements in the current pass should be applied,
    // otherwise actions could be replayed for elements which no longer match;
    // the callback-selected node is also reset and set again
    // if the callback is called during this pass
    context.affectedElements.forEach((affectedElement) => {
        affectedElement.rules = [];
        affectedElement.callbackNode = undefined;
    });
    // some rules could make call - selector.querySelectorAll() temporarily to change node id attribute
    // this caused MutationObserver to call recursively
    // https://github.com/AdguardTeam/ExtendedCss/issues/81
    disconnectDocument(context);
    context.parsedRules.forEach((ruleData) => {
        const nodes = applyRule(context, ruleData);
        nodes.forEach((node) => newSelectedElements.add(node));
        // save matched elements to ruleData as linked to applied rule
        // only for debugging purposes
        if (ruleData.debug) {
            ruleData.matchedElements = nodes;
        }
    });
    // apply collected actions to each affected element once per pass:
    // regular styles and the sticky regular-styles flag
    // are handled by `applyRuleStyles()` while rules are collected
    context.affectedElements.forEach((affectedElement) => {
        if (!newSelectedElements.has(affectedElement.node)) {
            return;
        }
        hasDomMutations = applyStyle(context, affectedElement) || hasDomMutations;
        // add style protection observer only for elements with regular styles
        if (!affectedElement.removed
            && affectedElement.hasRegularStyles
            && !affectedElement.protectionObserver) {
            affectedElement.protectionObserver = protectStyleAttribute(
                affectedElement.node,
                affectedElement.rules,
            );
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
        if (!newSelectedElements.has(affectedElement.node)) {
            // revert styles only if the element had regular styles applied
            if (affectedElement.hasRegularStyles) {
                revertStyle(affectedElement);
            }
            context.affectedElements.splice(affLength - 1, 1);
        }
        affLength -= 1;
    }

    return hasDomMutations;
};

/**
 * Applies filtering rules.
 *
 * A pass can change the DOM: removed elements or attributes can make
 * other elements match, e.g. `#child:remove()` makes its parent match `:empty`.
 * The document observer is disconnected during the pass,
 * so such changes should be handled by re-running the pass.
 *
 * @param context ExtendedCss context.
 */
export const applyRules = (context: Context): void => {
    while (applyRulesPass(context)) {
        // repeat while the pass changes the DOM
    }
    // After styles are applied we can start observe again
    observeDocument(context);

    printTimingInfo(context);
};
