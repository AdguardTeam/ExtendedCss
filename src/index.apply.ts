import { ExtendedCss } from './extended-css';
import type { ExtCssConfiguration, IAffectedElement } from './extended-css';

/**
 * Applies ExtendedCSS rules to the current document and starts observing the
 * DOM for dynamically added matching elements.
 *
 * This entry point is intended to be bundled into a self-contained minified
 * IIFE (see `tools/build.ts`, `applyProdConfig`) so it can be injected into a
 * web page via `chrome.scripting.executeScript()`. It mirrors the
 * `index.default.ts` IIFE-entry pattern and therefore uses a default export.
 *
 * Internally calls `init()` before `apply()` so that the native
 * `Node.prototype.textContent` getter is snapshotted before the page
 * can mock it, which is required for the `:contains()` pseudo-class to
 * work correctly in injected scripts.
 *
 * @param cssRules Array of ExtendedCSS rule strings to apply.
 * @param beforeStyleApplied Optional callback invoked for each affected
 * element before its style is set; used for CSS hits statistics.
 *
 * @returns The applied ExtendedCss instance.
 */
const applyExtendedCss = (
    cssRules: string[],
    beforeStyleApplied?: (el: IAffectedElement) => IAffectedElement,
): ExtendedCss => {
    const configuration: ExtCssConfiguration = {
        cssRules,
        beforeStyleApplied,
    };

    const extendedCss = new ExtendedCss(configuration);
    extendedCss.init();
    extendedCss.apply();

    return extendedCss;
};

export default applyExtendedCss;
