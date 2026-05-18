import { checkXpathEvaluation } from './helpers/xpath-evaluate-counter';

import performanceHtml from './test-files/performance.html?raw';

// default 5 seconds may be not enough sometime
const TESTS_RUN_TIMEOUT_MS = 15 * 1000;
vi.setConfig({ testTimeout: TESTS_RUN_TIMEOUT_MS });

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

describe('xpath evaluation test', () => {
    beforeEach(() => {
        document.body.innerHTML = getBodyContent(performanceHtml);
    });
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('extended :xpath - document.evaluate calls count ', async () => {
        const selector = ':xpath(//div[@class=\'banner\'])';
        const result = checkXpathEvaluation(selector, document);
        expect(result.counter).toBe(1);
        expect(result.elements.length).toBe(12);
    });
});
