import path from 'path';
import fs from 'fs';
import {
    chromium,
    Browser,
    Page,
} from 'playwright';

import server from '../helpers/server';
import { PerformanceResult } from '../helpers/performance-checker';

let browser: Browser;
let page: Page;

declare global {
    const extCssPerformance: {
        checkPerformance: {
            v1(selector: string): PerformanceResult;
            v2(selector: string): PerformanceResult;
        }
    };
}

/**
 * Returns PerformanceResult for extCss v1.
 *
 * @param selectorStr Css selector - standard or extended.
 */
const getV1PerformanceResult = async (selectorStr: string): Promise<PerformanceResult> => {
    return page.evaluate((selector): PerformanceResult => {
        return extCssPerformance.checkPerformance.v1(selector);
    }, selectorStr);
};

/**
 * Returns PerformanceResult for extCss v2.
 *
 * @param selectorStr Css selector - standard or extended.
 */
const getV2PerformanceResult = async (selectorStr: string): Promise<PerformanceResult> => {
    return page.evaluate((selector: string): PerformanceResult => {
        return extCssPerformance.checkPerformance.v2(selector);
    }, selectorStr);
};

const compareV2toV1 = (averageV1: number, averageV2: number): string => {
    const ratioV2toV1 = Math.round((averageV2 / averageV1) * 100);
    return ratioV2toV1 <= 100
        ? `✅ ~${100 - ratioV2toV1}% faster`
        : `❗️ ~${ratioV2toV1 - 100}% slower`;
};

const getPerformanceComparingLog = (
    selector: string,
    v1Data: PerformanceResult,
    v2Data: PerformanceResult,
): string => {
    let log = '';
    log += '------------------------------------------------------------------------\n';
    log += `selector:  ${selector}\n`;
    log += '------------------------------------------------------------------------\n';
    log += 'ExtendedCss:  v1            v2\n';
    log += '------------------------------------------------------------------------\n';
    log += `elapsed:    ${v1Data.elapsed} ms        ${v2Data.elapsed} ms\n`;
    log += `count:      ${v1Data.count}         ${v2Data.count}\n`;
    log += `average:    ${v1Data.average} ms     ${v2Data.average} ms\n`;
    log += `result:                   ${compareV2toV1(v1Data.average, v2Data.average)}\n`;
    log += '------------------------------------------------------------------------\n\n';
    return log;
};

let resultsToSave = '';

/**
 * Saves comparison results to file in test/test-files.
 *
 * @param resultsStr Performance tests results.
 */
const saveResultsToFile = (resultsStr: string): void => {
    const RESULTS_FILENAME = 'performance-selector-results.txt';
    const TEST_FILES_DIR_PATH = '../test-files';
    const resultsPath = path.resolve(__dirname, TEST_FILES_DIR_PATH, RESULTS_FILENAME);
    fs.writeFileSync(resultsPath, resultsStr);
};

const SELECTOR_PERFORMANCE_PORT = 8586;

jest.setTimeout(10 * 1000);

describe('performance selector tests', () => {
    describe('one pre rule', () => {
        beforeAll(async () => {
            await server.start(SELECTOR_PERFORMANCE_PORT);
            browser = await chromium.launch();
        });
        afterAll(async () => {
            await browser.close();
            await server.stop();
            // save results to file
            saveResultsToFile(resultsToSave);
        });

        beforeEach(async () => {
            page = await browser.newPage();
            await page.goto(`http://localhost:${SELECTOR_PERFORMANCE_PORT}/performance-selector.html`);
        });
        afterEach(async () => {
            await page.close();
        });

        it('simple regular selector', async () => {
            const selector = '.container #case1 div div';

            const v1Data = await getV1PerformanceResult(selector);
            expect(v1Data.status).toBe(true);

            const v2Data = await getV2PerformanceResult(selector);
            expect(v2Data.status).toBe(true);

            resultsToSave += getPerformanceComparingLog(selector, v1Data, v2Data);
        });

        it('extended 1 - :has', async () => {
            const selector = '.container #case1 div div:has(.banner)';

            const v1Data = await getV1PerformanceResult(selector);
            expect(v1Data.status).toBe(true);

            const v2Data = await getV2PerformanceResult(selector);
            expect(v2Data.status).toBe(true);

            resultsToSave += getPerformanceComparingLog(selector, v1Data, v2Data);
        });

        it('extended 2 - :contains', async () => {
            const selector = '.container #case2 div div:contains(Block this)';

            const v1Data = await getV1PerformanceResult(selector);
            expect(v1Data.status).toBe(true);

            const v2Data = await getV2PerformanceResult(selector);
            expect(v2Data.status).toBe(true);

            resultsToSave += getPerformanceComparingLog(selector, v1Data, v2Data);
        });

        it('extended 3 - :matches-css', async () => {
            const selector = '.container #case3 div div:matches-css(background-image: data:*)';

            const v1Data = await getV1PerformanceResult(selector);
            expect(v1Data.status).toBe(true);

            const v2Data = await getV2PerformanceResult(selector);
            expect(v2Data.status).toBe(true);

            resultsToSave += getPerformanceComparingLog(selector, v1Data, v2Data);
        });

        it('extended 4 - :has + :contains', async () => {
            const selector = '.container #case4 div div:has(.banner:contains(Block this))';

            const v1Data = await getV1PerformanceResult(selector);
            expect(v1Data.status).toBe(true);

            const v2Data = await getV2PerformanceResult(selector);
            expect(v2Data.status).toBe(true);

            resultsToSave += getPerformanceComparingLog(selector, v1Data, v2Data);
        });

        it('extended 5.1 - complicated selector', async () => {
            // eslint-disable-next-line max-len
            const selector = '#case5 > div:not([style^="min-height:"]) > div[id][data-id^="toolkit-"]:not([data-bem]):not([data-m]):has(a[href^="https://example."]>img)';

            const v1Data = await getV1PerformanceResult(selector);
            expect(v1Data.status).toBe(true);

            const v2Data = await getV2PerformanceResult(selector);
            expect(v2Data.status).toBe(true);

            resultsToSave += getPerformanceComparingLog(selector, v1Data, v2Data);
        });

        it('extended 5.2 - split selectors with a lot of children', async () => {
            const selector = '#case5 div > div:has(.target-banner)';

            const v1Data = await getV1PerformanceResult(selector);
            expect(v1Data.status).toBe(true);

            const v2Data = await getV2PerformanceResult(selector);
            expect(v2Data.status).toBe(true);

            resultsToSave += getPerformanceComparingLog(selector, v1Data, v2Data);
        });

        it('extended 5.3 - split selectors with a lot of children and matches-css', async () => {
            const selector = '#case5 div > div:matches-css(background-image: data:*)';

            const v1Data = await getV1PerformanceResult(selector);
            expect(v1Data.status).toBe(true);

            const v2Data = await getV2PerformanceResult(selector);
            expect(v2Data.status).toBe(true);

            resultsToSave += getPerformanceComparingLog(selector, v1Data, v2Data);
        });

        it('extended 6 - :xpath ', async () => {
            const selector = ':xpath(//div[@class=\'target-banner\'])';

            const v1Data = await getV1PerformanceResult(selector);
            expect(v1Data.status).toBe(true);

            const v2Data = await getV2PerformanceResult(selector);
            expect(v2Data.status).toBe(true);

            resultsToSave += getPerformanceComparingLog(selector, v1Data, v2Data);
        });
    });
});
