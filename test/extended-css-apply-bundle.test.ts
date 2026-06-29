/**
 * @vitest-environment jsdom
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const APPLY_BUNDLE_PATH = resolve(__dirname, '..', 'dist', 'extended-css.apply.min.js');

type ApplyFn = (
    cssRules: string[],
    beforeStyleApplied?: (el: unknown) => unknown,
) => unknown;

const HIDE_RULE = '.ad:has(.child) { display: none !important; }';

const setupDom = (): void => {
    document.body.innerHTML = '<div class="container"><div class="ad"><span class="child">ad</span></div></div>';
};

describe('ExtendedCSS apply bundle (smoke test)', () => {
    let bundleCode: string;

    beforeAll(() => {
        bundleCode = readFileSync(APPLY_BUNDLE_PATH, 'utf8');
    });

    afterEach(() => {
        document.body.innerHTML = '';
        delete (globalThis as { applyExtendedCss?: unknown }).applyExtendedCss;
    });

    it('exposes applyExtendedCss and hides a :has() target when loaded as a file', () => {
        setupDom();

        // files-style: evaluate the bundle so it defines the global, mirroring
        // chrome.scripting.executeScript({ files: [...] }).
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        new Function('globalThis', `${bundleCode}; globalThis.applyExtendedCss = applyExtendedCss;`)(globalThis);

        const apply = (globalThis as { applyExtendedCss?: ApplyFn }).applyExtendedCss;
        expect(typeof apply).toBe('function');
        apply?.([HIDE_RULE]);

        const ad = document.querySelector('.ad') as HTMLElement;
        expect(ad.style.getPropertyValue('display')).toBe('none');
        expect(ad.style.getPropertyPriority('display')).toBe('important');
    });

    it('is self-contained and callable as a func source', () => {
        setupDom();

        // func-style: wrap the whole bundle in a function with args, mirroring
        // chrome.scripting.executeScript({ func, args }). The bundle's IIFE
        // defines applyExtendedCss in the function scope.
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const fn = new Function(
            'cssRules',
            'beforeStyleApplied',
            `${bundleCode}; return applyExtendedCss(cssRules, beforeStyleApplied);`,
        ) as ApplyFn;

        fn([HIDE_RULE]);

        const ad = document.querySelector('.ad') as HTMLElement;
        expect(ad.style.getPropertyValue('display')).toBe('none');
    });

    it('contains no runtime external imports', () => {
        expect(bundleCode).not.toMatch(/\bimport\b/);
        expect(bundleCode).not.toMatch(/\brequire\(/);
    });

    it('is within the MV3 bundle-size limit', () => {
        const sizeBytes = Buffer.byteLength(bundleCode, 'utf8');

        // MV3 extension limit is 30 MB; the apply bundle must be far below it.
        expect(sizeBytes).toBeLessThan(30 * 1024 * 1024);

        // Mirrors the stricter build-time guard in tools/build.ts.
        expect(sizeBytes).toBeLessThan(500 * 1024);
    });
});
