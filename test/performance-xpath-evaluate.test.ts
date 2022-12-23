import {
    chromium,
    Browser,
    Page,
} from 'playwright';

import server from './helpers/server';

import { XpathEvaluationResult } from './helpers/xpath-evaluate-counter';

let browser: Browser;
let page: Page;

declare global {
    const v2ExtCssPerformanceXpath: {
        checkXpathEvaluation(selector: string, document: Document): XpathEvaluationResult;
    };
}

/**
 * Returns elements ids selected by extCss.querySelectorAll.
 *
 * @param extSelector Selector for extended css.
 */
const getXpathEvaluationResult = async (extSelector: string): Promise<[number, number]> => {
    return page.evaluate((selector: string): [number, number] => {
        const res = v2ExtCssPerformanceXpath.checkXpathEvaluation(selector, document);
        return [res.counter, res.elements.length];
    }, extSelector);
};

const XPATH_PERFORMANCE_PORT = 8587;

// default 5 seconds may be not enough sometime
const TESTS_RUN_TIMEOUT_MS = 15 * 1000;
jest.setTimeout(TESTS_RUN_TIMEOUT_MS);

describe('xpath evaluation test', () => {
    beforeAll(async () => {
        await server.start(XPATH_PERFORMANCE_PORT);
        browser = await chromium.launch();
        // can be useful for debugging
        // browser = await chromium.launch({ headless: false });
    });
    afterAll(async () => {
        await browser.close();
        await server.stop();
    });

    beforeEach(async () => {
        page = await browser.newPage();
        await page.goto(`http://localhost:${XPATH_PERFORMANCE_PORT}/performance-xpath-evaluate.html`);
    });
    afterEach(async () => {
        await page.close();
    });

    it('extended :xpath - document.evaluate calls count ', async () => {
        const selector = ':xpath(//div[@class=\'banner\'])';
        const [evaluationCount, elementsLength] = await getXpathEvaluationResult(selector);
        expect(evaluationCount).toBe(1);
        expect(elementsLength).toBe(12);

    });
});
