import {
    AffectedElement,
    Context,
    IAffectedElement,
} from './types';
import { CssStyleMap } from '../../css-rule';

import { getElementSelectorPath } from '../../common/utils/nodes';
import { removeSuffix } from '../../common/utils/strings';
import { logger } from '../../common/utils/logger';
import { createActionArgMatcher } from '../../common/utils/action-arg';

import {
    MAX_STYLE_PROTECTION_COUNT,
    PSEUDO_PROPERTY_POSITIVE_VALUE,
    REMOVE_PSEUDO_MARKER,
    REMOVE_ATTR_PSEUDO_MARKER,
    REMOVE_CLASS_PSEUDO_MARKER,
    CONTENT_CSS_PROPERTY,
} from '../../common/constants';

// added by tsurlfilter's CssHitsCounter
const CONTENT_ATTR_PREFIX_REGEXP = /^("|')adguard.+?/;

/**
 * Removes attributes matching the `:remove-attr()` argument from the node.
 *
 * @param node DOM node.
 * @param arg Normalized `:remove-attr()` argument.
 */
const removeAttributes = (node: Node, arg: string): void => {
    if (!(node instanceof HTMLElement)) {
        return;
    }
    const isMatch = createActionArgMatcher(arg);
    // snapshot names as the live collection is mutated while removing
    [...node.getAttributeNames()].forEach((name) => {
        if (isMatch(name)) {
            node.removeAttribute(name);
        }
    });
};

/**
 * Removes classes matching the `:remove-class()` argument from the node.
 *
 * @param node DOM node.
 * @param arg Normalized `:remove-class()` argument.
 */
const removeClasses = (node: Node, arg: string): void => {
    if (!(node instanceof HTMLElement)) {
        return;
    }
    const isMatch = createActionArgMatcher(arg);
    // snapshot classes as the live collection is mutated while removing
    [...node.classList].forEach((name) => {
        if (isMatch(name)) {
            node.classList.remove(name);
        }
    });
};

/**
 * Removes affectedElement.node from DOM.
 *
 * @param context ExtendedCss context.
 * @param affectedElement Affected element.
 */
const removeElement = (context: Context, affectedElement: AffectedElement): void => {
    const { node } = affectedElement;

    affectedElement.removed = true;

    const elementSelector = getElementSelectorPath(node);

    // check if the element has been already removed earlier
    const elementRemovalsCounter = context.removalsStatistic[elementSelector] || 0;

    // if removals attempts happened more than specified we do not try to remove node again
    if (elementRemovalsCounter > MAX_STYLE_PROTECTION_COUNT) {
        logger.error(`ExtendedCss: infinite loop protection for selector: '${elementSelector}'`);
        return;
    }

    if (node.parentElement) {
        node.parentElement.removeChild(node);
        context.removalsStatistic[elementSelector] = elementRemovalsCounter + 1;
    }
};

/**
 * Sets style to the specified DOM node.
 *
 * @param node DOM element.
 * @param style Style to set.
 */
export const setStyleToElement = (node: Node, style: CssStyleMap): void => {
    if (!(node instanceof HTMLElement)) {
        return;
    }
    // Action style maps may contain the 'content' property which is needed
    // only for ExtCssConfiguration.beforeStyleApplied() and should never be applied.
    const isActionStyle = style[REMOVE_PSEUDO_MARKER] !== undefined
        || style[REMOVE_ATTR_PSEUDO_MARKER] !== undefined
        || style[REMOVE_CLASS_PSEUDO_MARKER] !== undefined;
    Object.keys(style).forEach((prop) => {
        // action pseudo-classes are handled by applyStyle() and are not CSS properties
        if (prop === REMOVE_ATTR_PSEUDO_MARKER || prop === REMOVE_CLASS_PSEUDO_MARKER) {
            return;
        }
        // do not apply 'content' of action rules (e.g. via the style protection observer)
        if (isActionStyle && prop === CONTENT_CSS_PROPERTY) {
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
 * Applies action pseudo-class styles to the node.
 *
 * @param node DOM node.
 * @param style Rule style map.
 *
 * @returns True if the style contains action pseudo-classes.
 */
const applyRuleAction = (node: Node, style: CssStyleMap): boolean => {
    const removeAttrArg = style[REMOVE_ATTR_PSEUDO_MARKER];
    if (removeAttrArg) {
        removeAttributes(node, removeAttrArg);
    }

    const removeClassArg = style[REMOVE_CLASS_PSEUDO_MARKER];
    if (removeClassArg) {
        removeClasses(node, removeClassArg);
    }

    return Boolean(removeAttrArg || removeClassArg);
};

/**
 * Applies action pseudo-class styles of all rules of the affected element.
 *
 * @param affectedElement Affected element.
 */
const applyActionStyles = (affectedElement: AffectedElement): void => {
    affectedElement.rules.forEach((rule) => {
        if (rule.style) {
            applyRuleAction(affectedElement.node, rule.style);
        }
    });
};

/**
 * Applies style to the specified DOM node.
 *
 * @param context ExtendedCss context.
 * @param rawAffectedElement Object containing DOM node and rule to be applied.
 *
 * @throws An error if affectedElement has no style to apply.
 */
export const applyStyle = (context: Context, rawAffectedElement: AffectedElement): void => {
    if (rawAffectedElement.protectionObserver) {
        // style is already applied and protected by the observer,
        // but action pseudo-classes should be re-applied on DOM mutations
        applyActionStyles(rawAffectedElement);
        return;
    }
    let affectedElement: AffectedElement | IAffectedElement;
    if (context.beforeStyleApplied) {
        if (!isIAffectedElement(rawAffectedElement)) {
            throw new Error("Returned IAffectedElement should have 'node' and 'rules' properties");
        }
        affectedElement = context.beforeStyleApplied(rawAffectedElement);
        if (!affectedElement) {
            throw new Error("Callback 'beforeStyleApplied' should return IAffectedElement");
        }
    } else {
        affectedElement = rawAffectedElement;
    }

    if (!isAffectedElement(affectedElement)) {
        throw new Error("Returned IAffectedElement should have 'node' and 'rules' properties");
    }

    const { node, rules } = affectedElement;
    for (let i = 0; i < rules.length; i += 1) {
        const rule = rules[i];
        const selector = rule?.selector;
        const style = rule?.style;
        const debug = rule?.debug;
        // rule may not have style to apply
        // e.g. 'div:has(> a) { debug: true }' -> means no style to apply, and enable debug mode
        if (style) {
            if (style[REMOVE_PSEUDO_MARKER] === PSEUDO_PROPERTY_POSITIVE_VALUE) {
                removeElement(context, affectedElement);
                return;
            }

            if (applyRuleAction(node, style)) {
                // Action rules do not apply other styles,
                // but they may contain the 'content' property for CssHitsCounter.
                continue;
            }

            setStyleToElement(node, style);
        } else if (!debug) {
            // but rule should not have both style and debug properties
            throw new Error(`No style declaration in rule for selector: '${selector}'`);
        }
    }
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
