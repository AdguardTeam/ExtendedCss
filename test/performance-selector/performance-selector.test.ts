import { ExtendedCss } from '../../src';
import extCssV1Url from '../test-files/extCssV1.js?url';
import performanceHtml from '../test-files/performance.html?raw';

import { PerformanceResult, checkPerformance } from '../helpers/performance-checker';

/**
 * Extracts the body innerHTML from a full HTML string.
 *
 * @param html Full HTML document string.
 * @returns Body innerHTML content.
 */
const getBodyContent = (html: string): string => {
    const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return match ? match[1]! : '';
};

/**
 * Loads an external script into the browser.
 *
 * @param src URL of the script to load.
 * @returns Promise that resolves when the script is loaded.
 */
const loadScript = async (src: string): Promise<void> => {
    await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Unable to load script: ${src}`));
        document.head.append(script);
    });
};

/**
 * Returns PerformanceResult for extCss v1.
 *
 * @param selectorStr Css selector - standard or extended.
 * @returns PerformanceResult for extCss v1.
 */
const getV1PerformanceResult = async (selectorStr: string): Promise<PerformanceResult> => {
    return checkPerformance.v1(selectorStr);
};

/**
 * Returns PerformanceResult for extCss v2.
 *
 * @param selectorStr Css selector - standard or extended.
 * @returns PerformanceResult for extCss v2.
 */
const getV2PerformanceResult = async (selectorStr: string): Promise<PerformanceResult> => {
    return checkPerformance.v2(selectorStr);
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
 * Logs comparison results to console.
 *
 * @param resultsStr Performance tests results.
 */
const logResults = (resultsStr: string): void => {
    // eslint-disable-next-line no-console
    console.log(resultsStr);
};

vi.setConfig({ testTimeout: 10 * 1000 });

describe('performance selector tests', () => {
    describe('one pre rule', () => {
        beforeAll(async () => {
            await loadScript(extCssV1Url);
            window.extCssV2 = { ExtendedCss };
        });

        afterAll(() => {
            logResults(resultsToSave);
        });

        beforeEach(() => {
            document.body.innerHTML = getBodyContent(performanceHtml);
        });

        afterEach(() => {
            document.body.innerHTML = '';
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
