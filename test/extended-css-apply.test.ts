/**
 * @vitest-environment jsdom
 */

import type { ExtendedCss } from '../src';
import applyExtendedCss from '../src/index.apply';

describe('applyExtendedCss entry point', () => {
    let instance: ExtendedCss | undefined;

    afterEach(() => {
        instance?.dispose();
        instance = undefined;
        document.body.innerHTML = '';
    });

    it('applies a :has() rule and hides matching elements', () => {
        document.body.innerHTML = '<div class="ad"><span class="child">ad</span></div>';

        instance = applyExtendedCss(['.ad:has(.child) { display: none !important; }']);

        const ad = document.querySelector('.ad') as HTMLElement;
        expect(ad.style.getPropertyValue('display')).toBe('none');
        expect(ad.style.getPropertyPriority('display')).toBe('important');
    });

    it('returns an ExtendedCss instance with apply and dispose methods', () => {
        document.body.innerHTML = '<div class="ad"><span class="child">ad</span></div>';

        instance = applyExtendedCss(['.ad:has(.child) { display: none !important; }']);

        expect(instance).toBeDefined();
        expect(typeof instance?.apply).toBe('function');
        expect(typeof instance?.dispose).toBe('function');
    });

    it('does not hide elements that do not match the rule', () => {
        document.body.innerHTML = '<div class="ad"><span class="not-child">ad</span></div>';

        instance = applyExtendedCss(['.ad:has(.child) { display: none !important; }']);

        const ad = document.querySelector('.ad') as HTMLElement;
        expect(ad.style.getPropertyValue('display')).toBe('');
    });
});
