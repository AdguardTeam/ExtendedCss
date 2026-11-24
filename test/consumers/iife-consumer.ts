import path from 'node:path';

import { chromium, type Page } from 'playwright';

import { assertDistReady, DIST_PATH } from './utils';

/**
 * Result of the in-page IIFE smoke test.
 */
interface IIFESmokeResult {
    /**
     * Whether the script created a global `ExtendedCss` function.
     */
    hasGlobal: boolean;

    /**
     * Number of elements that `ExtendedCss.query()` returned.
     */
    queryCount: number;

    /**
     * Applied `display` value of the matched element.
     */
    displayValue: string;

    /**
     * Priority of the applied `display` value.
     */
    displayPriority: string;
}

/**
 * HTML document used by the IIFE smoke test.
 */
const TEST_PAGE_HTML = `<!doctype html>
<html>
    <head></head>
    <body>
        <div id="banner">ads</div>
        <div id="content">normal content</div>
    </body>
</html>`;

/**
 * Loads one IIFE file through a script tag and runs the smoke test in the page.
 *
 * @param page Playwright page.
 * @param scriptPath Absolute path to the IIFE file.
 *
 * @returns The smoke test result.
 */
const runIifePageCheck = async (
    page: Page,
    scriptPath: string,
): Promise<IIFESmokeResult> => {
    await page.setContent(TEST_PAGE_HTML);
    await page.addScriptTag({ path: scriptPath });

    return page.evaluate((): IIFESmokeResult => {
        const globalWindow = window as unknown as {
            ExtendedCss?: {
                new (configuration: { styleSheet: string }): {
                    apply: () => void;
                    dispose: () => void;
                };
                query: (selector: string) => Element[];
            };
        };

        const globalExtendedCss = globalWindow.ExtendedCss;
        if (!globalExtendedCss) {
            return {
                hasGlobal: false,
                queryCount: 0,
                displayValue: '',
                displayPriority: '',
            };
        }

        const queryCount = globalExtendedCss.query('#banner:contains(ads)').length;
        const instance = new globalExtendedCss({
            styleSheet: '#banner:contains(ads) { display: none !important; }',
        });
        instance.apply();

        const banner = document.getElementById('banner');
        const displayValue = banner instanceof HTMLElement
            ? banner.style.getPropertyValue('display')
            : '';
        const displayPriority = banner instanceof HTMLElement
            ? banner.style.getPropertyPriority('display')
            : '';

        instance.dispose();

        return {
            hasGlobal: true,
            queryCount,
            displayValue,
            displayPriority,
        };
    });
};

/**
 * Runs the IIFE consumer fixture in Playwright.
 *
 * The fixture loads `extended-css.js` and `extended-css.min.js` with an HTML
 * script tag. It checks the global `ExtendedCss`, `ExtendedCss.query()`, and
 * the style that an extended selector applies.
 */
export const runIifeConsumer = async (): Promise<void> => {
    assertDistReady();

    const browser = await chromium.launch({ headless: true });

    try {
        for (const fileName of ['extended-css.js', 'extended-css.min.js']) {
            const page = await browser.newPage();

            try {
                const result = await runIifePageCheck(page, path.join(DIST_PATH, fileName));

                if (!result.hasGlobal) {
                    throw new Error(`The IIFE file "${fileName}" did not create a global ExtendedCss.`);
                }
                if (result.queryCount !== 1) {
                    throw new Error(`ExtendedCss.query() returned ${result.queryCount} elements for "${fileName}".`);
                }
                if (result.displayValue !== 'none' || result.displayPriority !== 'important') {
                    throw new Error(
                        `The extended selector was not applied by "${fileName}": `
                        + `display=${result.displayValue}, priority=${result.displayPriority}.`,
                    );
                }
            } finally {
                await page.close();
            }
        }

        console.log('[consumers] IIFE files created the global and applied an extended selector.');
    } finally {
        await browser.close();
    }
};
