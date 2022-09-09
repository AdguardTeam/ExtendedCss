import { setStyleToElement } from './style-setter';
import { ExtMutationObserver } from './mutation-observer';
import { ProtectionCallback } from './types';

import { CssStyleMap, ExtCssRuleData } from '../../stylesheet';

import { natives } from '../../common/utils/natives';

const PROTECTION_OBSERVER_OPTIONS = {
    attributes: true,
    attributeOldValue: true,
    attributeFilter: ['style'],
};

/**
 * Creates MutationObserver protection callback
 * @param styles
 */
const createProtectionCallback = (styles: CssStyleMap[]): ProtectionCallback => {
    const protectionCallback = (mutations: MutationRecord[], extObserver: ExtMutationObserver): void => {
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
 * Sets up a MutationObserver which protects style attributes from changes
 * @param node DOM node
 * @param rules rule data objects
 * @returns Mutation observer used to protect attribute or null if there's nothing to protect
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
        if (!style) {
            throw new Error(`No affectedElement style to apply for selector: '${ruleData.selector}'`);
        }
        styles.push(style);
    });
    const protectionObserver = new ExtMutationObserver(createProtectionCallback(styles));
    protectionObserver.observe(node, PROTECTION_OBSERVER_OPTIONS);
    return protectionObserver;
};
