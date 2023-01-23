import { setStyleToElement } from './style-setter';
import { ExtMutationObserver } from './mutation-observer';
import { ProtectionCallback } from './types';

import { CssStyleMap, ExtCssRuleData } from '../../css-rule';

import { natives } from '../../common/utils/natives';

const PROTECTION_OBSERVER_OPTIONS = {
    attributes: true,
    attributeOldValue: true,
    attributeFilter: ['style'],
};

/**
 * Creates MutationObserver protection callback.
 *
 * @param styles Styles data object.
 *
 * @returns Callback for styles protection.
 */
const createProtectionCallback = (styles: CssStyleMap[]): ProtectionCallback => {
    const protectionCallback = (mutations: MutationRecord[], extObserver: ExtMutationObserver): void => {
        if (!mutations[0]) {
            return;
        }
        const { target } = mutations[0];
        extObserver.disconnect();
        styles.forEach((style) => {
            setStyleToElement(target, style);
        });
        extObserver.observe(target, PROTECTION_OBSERVER_OPTIONS);
    };
    return protectionCallback;
};

/**
 * Sets up a MutationObserver which protects style attributes from changes.
 *
 * @param node DOM node.
 * @param rules Rule data objects.
 * @returns Mutation observer used to protect attribute or null if there's nothing to protect.
 */
export const protectStyleAttribute = (
    node: HTMLElement,
    rules: ExtCssRuleData[],
): ExtMutationObserver | null => {
    if (!natives.MutationObserver) {
        return null;
    }
    const styles: CssStyleMap[] = [];
    rules.forEach((ruleData) => {
        const { style } = ruleData;
        // some rules might have only debug property in style declaration
        // e.g. 'div:has(> a) { debug: true }' -> parsed to boolean `ruleData.debug`
        // so no style is fine, and here we should collect only valid styles to protect
        if (style) {
            styles.push(style);
        }
    });
    const protectionObserver = new ExtMutationObserver(createProtectionCallback(styles));
    protectionObserver.observe(node, PROTECTION_OBSERVER_OPTIONS);
    return protectionObserver;
};
