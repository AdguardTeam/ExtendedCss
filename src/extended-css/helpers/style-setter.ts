import { addRulesToMutationObservation } from './document-observer';
import {
    AffectedElement,
    Context,
    IAffectedElement,
} from './types';
import { CssStyleMap, ExtCssRuleData } from '../../css-rule';

import { getElementSelectorPath } from '../../common/utils/nodes';
import { removeSuffix } from '../../common/utils/strings';
import { logger } from '../../common/utils/logger';
import {
    createActionArgMatcher,
    isActionPseudoMarker,
    isActionStyleMarker,
} from '../../common/utils/action-arg';

import {
    MAX_STYLE_PROTECTION_COUNT,
    MAX_ACTION_REMOVALS_COUNT,
    PSEUDO_PROPERTY_POSITIVE_VALUE,
    REMOVE_PSEUDO_MARKER,
    REMOVE_ATTR_PSEUDO_MARKER,
    REMOVE_CLASS_PSEUDO_MARKER,
    CONTENT_CSS_PROPERTY,
    STYLE_ATTRIBUTE,
} from '../../common/constants';

// added by tsurlfilter's CssHitsCounter
const CONTENT_ATTR_PREFIX_REGEXP = /^("|')adguard.+?/;

/**
 * Checks whether the rule contains regular styles to apply:
 * action pseudo-classes and the internal 'content' of action rules
 * are needed for internal usage and should not be counted as regular styles.
 *
 * @param rule Rule data.
 *
 * @returns True if the rule contains regular styles.
 */
export const hasRegularStyles = (rule: ExtCssRuleData): boolean => {
    const { style } = rule;
    if (!style) {
        return false;
    }
    return Object.keys(style).some((prop) => {
        // `remove` is an action marker and is not a CSS property
        if (isActionPseudoMarker(prop)) {
            return false;
        }
        // 'content' of action rules is kept only for `beforeStyleApplied`
        if (prop === CONTENT_CSS_PROPERTY && rule.hasInternalContent) {
            return false;
        }
        return true;
    });
};

/**
 * Removes attributes matching the `:remove-attr()` argument from the node.
 *
 * @param node DOM node.
 * @param arg Normalized `:remove-attr()` argument.
 * @param skipStyleAttribute True if the `style` attribute should not be removed.
 *
 * @returns Number of removed attributes.
 */
const removeAttributes = (node: Node, arg: string, skipStyleAttribute = false): number => {
    if (!(node instanceof Element)) {
        return 0;
    }
    let removedCount = 0;
    const isMatch = createActionArgMatcher(arg);
    node.getAttributeNames().forEach((name) => {
        if (skipStyleAttribute && name === STYLE_ATTRIBUTE) {
            return;
        }
        if (isMatch(name)) {
            node.removeAttribute(name);
            removedCount += 1;
        }
    });
    return removedCount;
};

/**
 * Removes classes matching the `:remove-class()` argument from the node.
 *
 * @param node DOM node.
 * @param arg Normalized `:remove-class()` argument.
 *
 * @returns Number of removed classes.
 */
const removeClasses = (node: Node, arg: string): number => {
    if (!(node instanceof Element)) {
        return 0;
    }
    let removedCount = 0;
    const isMatch = createActionArgMatcher(arg);
    // snapshot classes as the live collection is mutated while removing
    [...node.classList].forEach((name) => {
        if (isMatch(name)) {
            node.classList.remove(name);
            removedCount += 1;
        }
    });
    return removedCount;
};

/**
 * Removes the specified DOM node.
 *
 * @param context ExtendedCss context.
 * @param affectedElement Affected element.
 * @param node Node to remove: the matched node or the one selected by the callback.
 *
 * @returns True if the node was removed from DOM.
 */
const removeElement = (context: Context, affectedElement: AffectedElement, node: HTMLElement): boolean => {
    affectedElement.removed = true;

    const elementSelector = getElementSelectorPath(node);

    // check if the element has been already removed earlier
    const elementRemovalsCounter = context.removalsStatistic[elementSelector] || 0;

    // if removals attempts happened more than specified we do not try to remove node again
    if (elementRemovalsCounter > MAX_STYLE_PROTECTION_COUNT) {
        logger.error(`ExtendedCss: infinite loop protection for selector: '${elementSelector}'`);
        return false;
    }

    if (node.parentElement) {
        node.parentElement.removeChild(node);
        context.removalsStatistic[elementSelector] = elementRemovalsCounter + 1;
        return true;
    }

    return false;
};

/**
 * Sets style to the specified DOM node.
 *
 * @param node DOM element.
 * @param style Style to set.
 * @param skipContent True if the `content` property should not be applied:
 * such `content` is kept only for `beforeStyleApplied` (e.g. CssHitsCounter).
 */
export const setStyleToElement = (node: Node, style: CssStyleMap, skipContent = false): void => {
    if (!(node instanceof HTMLElement)) {
        return;
    }
    Object.keys(style).forEach((prop) => {
        // action pseudo-classes are handled by applyStyle() and are not CSS properties
        if (isActionStyleMarker(prop)) {
            return;
        }
        // do not apply internal 'content' of action rules
        // (e.g. via the style protection observer)
        if (skipContent && prop === CONTENT_CSS_PROPERTY) {
            return;
        }
        // Apply this style only to existing properties
        // We cannot use hasOwnProperty here (does not work in FF)
        if (typeof node.style.getPropertyValue(prop.toString()) !== 'undefined') {
            let value = style[prop];
            if (!value) {
                return;
            }
            // do not apply 'content' style given by tsurlfilter
            // which is needed only for BeforeStyleAppliedCallback
            if (prop === CONTENT_CSS_PROPERTY && value.match(CONTENT_ATTR_PREFIX_REGEXP)) {
                return;
            }
            // First we should remove !important attribute (or it won't be applied')
            value = removeSuffix(value.trim(), '!important').trim();
            node.style.setProperty(prop, value, 'important');
        }
    });
};

/**
 * Checks the required properties of `affectedElement`
 * **before** `beforeStyleApplied()` execution.
 *
 * @param affectedElement Affected element.
 *
 * @returns False if there is no `node` or `rules`
 * or `rules` is not an array.
 */
const isIAffectedElement = (
    affectedElement: AffectedElement | IAffectedElement,
): affectedElement is IAffectedElement => {
    return 'node' in affectedElement
        && 'rules' in affectedElement
        && affectedElement.rules instanceof Array;
};

/**
 * Checks the required properties of `affectedElement`
 * **after** `beforeStyleApplied()` execution.
 * These properties are needed for proper internal usage.
 *
 * @param affectedElement Affected element.
 *
 * @returns False if there is no `node` or `rules`
 * or `rules` is not an array.
 */
const isAffectedElement = (
    affectedElement: AffectedElement | IAffectedElement,
): affectedElement is AffectedElement => {
    return 'node' in affectedElement
        && 'originalStyle' in affectedElement
        && 'rules' in affectedElement
        && affectedElement.rules instanceof Array;
};

/**
 * Applies action pseudo-class styles of the rule to the specified DOM node.
 *
 * @param context ExtendedCss context.
 * @param node DOM node.
 * @param rule Rule data.
 * @param skipStyleAttribute True if the `style` attribute should not be removed.
 *
 * @returns True if an attribute or a class was removed from DOM.
 */
const applyRuleAction = (
    context: Context,
    node: HTMLElement,
    rule: ExtCssRuleData,
    skipStyleAttribute: boolean,
): boolean => {
    let hasRemovals = false;

    rule.actionStyles?.forEach((actionStyle) => {
        const statisticKey = `${actionStyle.property}:${actionStyle.value}`;
        // the statistic is stored in the context keyed by the node,
        // so it survives affected element re-creation
        // for self-unmatching rules like '.ad:remove-class(ad)'
        let removalsStatistic = context.actionRemovalsStatistic.get(node);
        if (!removalsStatistic) {
            removalsStatistic = {};
            context.actionRemovalsStatistic.set(node, removalsStatistic);
        }
        const removalsCount = removalsStatistic[statisticKey] ?? 0;
        // limit removals to avoid an endless loop
        // if the page keeps re-adding the attribute or class
        if (removalsCount >= MAX_ACTION_REMOVALS_COUNT) {
            return;
        }

        let removedCount = 0;
        if (actionStyle.property === REMOVE_ATTR_PSEUDO_MARKER) {
            removedCount = removeAttributes(node, actionStyle.value, skipStyleAttribute);
        } else if (actionStyle.property === REMOVE_CLASS_PSEUDO_MARKER) {
            removedCount = removeClasses(node, actionStyle.value);
        }

        if (removedCount > 0) {
            hasRemovals = true;
            removalsStatistic[statisticKey] = removalsCount + 1;
            if (removalsCount + 1 === MAX_ACTION_REMOVALS_COUNT) {
                logger.error(
                    `ExtendedCss: infinite loop protection for action '${statisticKey}' of rule '${rule.selector}'`,
                );
            }
        }
    });

    return hasRemovals;
};

/**
 * Applies regular styles of the affected element's rules.
 *
 * Called for each matched rule while rules are being collected,
 * so selectors which depend on styles applied by other rules
 * can match during the same pass.
 *
 * @param context ExtendedCss context.
 * @param affectedElement Affected element.
 * @throws An error if affectedElement has no style to apply.
 */
export const applyRuleStyles = (context: Context, affectedElement: AffectedElement): void => {
    const appliedRules = affectedElement.appliedRules ?? new WeakSet<ExtCssRuleData>();
    affectedElement.appliedRules = appliedRules;

    const hasUnappliedStyles = affectedElement.rules.some((rule) => {
        return hasRegularStyles(rule) && !appliedRules.has(rule);
    });
    // actions are re-applied on DOM mutations,
    // so the callback is called again to let it edit or cancel them
    const hasActions = !!affectedElement.hasActionStyles
        || affectedElement.rules.some((rule) => !!rule.actionStyles?.length);
    // `:remove()` rules should also reach the callback,
    // so it can filter or cancel the removal
    const hasRemovals = affectedElement.rules.some((rule) => {
        return rule.style?.[REMOVE_PSEUDO_MARKER] === PSEUDO_PROPERTY_POSITIVE_VALUE;
    });
    // nothing to do for elements with applied regular styles,
    // without actions, removals and new regular styles
    if (affectedElement.isStyleApplied && !hasActions && !hasRemovals && !hasUnappliedStyles) {
        return;
    }

    const { beforeStyleApplied } = context;
    let element: AffectedElement | IAffectedElement = affectedElement;
    if (beforeStyleApplied) {
        if (!isIAffectedElement(affectedElement)) {
            throw new Error("Returned IAffectedElement should have 'node' and 'rules' properties");
        }
        const callbackResult = beforeStyleApplied(affectedElement);
        if (!callbackResult) {
            throw new Error("Callback 'beforeStyleApplied' should return IAffectedElement");
        }
        element = callbackResult;
    }

    if (!isAffectedElement(element)) {
        throw new Error("Returned IAffectedElement should have 'node' and 'rules' properties");
    }

    if (beforeStyleApplied) {
        // keep the mutation observer in sync with action arguments
        // which can be edited by the callback
        addRulesToMutationObservation(context, element.rules);
    }

    if (element !== affectedElement) {
        // use rules returned by the callback for the current pass:
        // they are needed for applying actions and for style protection
        affectedElement.rules = element.rules;
    }
    // keep the node selected by the callback:
    // actions and removals are applied to it instead of the matched node
    affectedElement.callbackNode = element.node;

    const { node, rules } = element;
    for (const rule of rules) {
        const { selector, style, debug } = rule;
        // rule may not have style to apply
        // e.g. 'div:has(> a) { debug: true }' -> means no style to apply, and enable debug mode
        if (!style) {
            if (!debug) {
                // but rule should not have both style and debug properties
                throw new Error(`No style declaration in rule for selector: '${selector}'`);
            }
            continue;
        }
        // `:remove()` and action pseudo-classes are applied
        // after all rules are queried (see `applyStyle`)
        if (style[REMOVE_PSEUDO_MARKER] === PSEUDO_PROPERTY_POSITIVE_VALUE) {
            continue;
        }
        if (hasRegularStyles(rule) && !appliedRules.has(rule)) {
            // action markers and internal 'content' are skipped by setStyleToElement,
            // so regular styles of other rules with the same selector are applied
            setStyleToElement(node, style, !!rule.hasInternalContent);
            appliedRules.add(rule);
        }
    }

    // flags are set from the rules which are actually applied,
    // including rules returned by the callback:
    // regular styles should be protected and reverted,
    // and actions require the callback to be called before re-application
    const hasAppliedRegularStyles = rules.some((rule) => hasRegularStyles(rule));
    affectedElement.hasRegularStyles = !!affectedElement.hasRegularStyles || hasAppliedRegularStyles;
    affectedElement.hasActionStyles = !!affectedElement.hasActionStyles
        || rules.some((rule) => !!rule.actionStyles?.length);
    affectedElement.isStyleApplied = !!affectedElement.isStyleApplied || hasAppliedRegularStyles;
};

/**
 * Applies `:remove()` pseudo-class and actions of the affected element's rules.
 *
 * Regular styles are applied earlier, while rules are being collected
 * (see `applyRuleStyles`), so selectors which depend on applied styles
 * can match during the same pass.
 *
 * @param context ExtendedCss context.
 * @param rawAffectedElement Object containing DOM node and rules to be applied.
 *
 * @returns True if the DOM was changed by a removal.
 */
export const applyStyle = (context: Context, rawAffectedElement: AffectedElement): boolean => {
    const { rules } = rawAffectedElement;
    // actions and removals are applied to the node selected by the callback
    // (it is the matched node if the callback did not replace it)
    const node = rawAffectedElement.callbackNode ?? rawAffectedElement.node;
    // only actions and `:remove()` rules require processing
    // after regular styles are applied
    const hasActions = rules.some((rule) => {
        return !!rule.actionStyles?.length
            || rule.style?.[REMOVE_PSEUDO_MARKER] === PSEUDO_PROPERTY_POSITIVE_VALUE;
    });
    if (!hasActions) {
        return false;
    }

    // the `style` attribute should not be removed from elements
    // with protected regular styles, including the first pass;
    // the flag is set by `applyRuleStyles()` for every affected element
    // before actions are applied, and there is at most one affected element per node
    const skipStyleAttribute = !!rawAffectedElement.hasRegularStyles;
    let hasRemovals = false;

    for (const rule of rules) {
        const { style } = rule;
        if (!style) {
            continue;
        }
        if (style[REMOVE_PSEUDO_MARKER] === PSEUDO_PROPERTY_POSITIVE_VALUE) {
            return removeElement(context, rawAffectedElement, node);
        }
        hasRemovals = applyRuleAction(context, node, rule, skipStyleAttribute) || hasRemovals;
    }

    return hasRemovals;
};

/**
 * Reverts style for the affected object.
 *
 * @param affectedElement Affected element.
 */
export const revertStyle = (affectedElement: AffectedElement): void => {
    if (affectedElement.protectionObserver) {
        affectedElement.protectionObserver.disconnect();
    }
    affectedElement.node.style.cssText = affectedElement.originalStyle;
};
