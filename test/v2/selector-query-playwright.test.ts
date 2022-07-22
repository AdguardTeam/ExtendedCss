/**
 * jsdom does not support pseudo-elements
 * https://github.com/jsdom/jsdom/issues/1928
 * so playwright is required for matches-css-before and matches-css-after selector tests
 */

import { chromium, Browser, Page } from 'playwright';

import server from '../server';

let browser: Browser;
let page: Page;

/**
 * Sets document.body.innerHTML with passed htmlContent
 * @param htmlContent
 */
const setBodyInnerHtml = async (htmlContent: string): Promise<void> => {
    await page.evaluate((bodyInnerHtml) => {
        document.body.innerHTML = bodyInnerHtml;
    }, htmlContent);
};

declare global {
    const extCSS: {
        querySelectorAll(selector: string, document: Document): HTMLElement[];
    };
}

/**
 * Returns elements ids selected by extCss.querySelectorAll
 * @param extCssSelector selector for extended css
 */
const getIdsByExtended = async (extCssSelector: string): Promise<string[]> => {
    return page.evaluate((selector: string): string[] => {
        return extCSS.querySelectorAll(selector, document).map((el: Element) => el.id);
    }, extCssSelector);
};

/**
 * Returns elements ids selected by document.querySelectorAll
 * @param regularSelector standard selector
 */
const getIdsByRegular = async (regularSelector: string): Promise<string[]> => {
    return page.evaluate((selector) => {
        return Array.from(document.querySelectorAll(selector)).map((el) => el.id);
    }, regularSelector);
};

/**
 * Checks whether there is no elements selected by extCssSelector
 * @param extCssSelector
 */
const expectNoMatch = async (extCssSelector: string): Promise<void> => {
    const selectedIds = await getIdsByExtended(extCssSelector);
    expect(selectedIds.length).toEqual(0);
};

describe('playwright required tests', () => {
    describe('matches-css pseudos', () => {
        beforeAll(async () => {
            await server.start();
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
            await page.goto('http://localhost:8585/empty.html');
        });
        afterEach(async () => {
            await page.close();
        });

        it('matches-css - simple', async () => {
            const bodyInnerHtml = `
                    <style type="text/css">
                        div {
                            height: 15px;
                        }
                        #target {
                            width: 20px;
                        }
                        .find {
                            content: "Try to find me";
                            min-height: 10px;
                        }
                    </style>

                    <div id="target" class="find"></div>
                `;
            await setBodyInnerHtml(bodyInnerHtml);

            const targetSelector = 'div#target';
            let extCssSelector;

            extCssSelector = ':matches-css(width:20px)';
            expect(await getIdsByExtended(extCssSelector)).toEqual(await getIdsByRegular(targetSelector));

            extCssSelector = ':matches-css(content: *find me*)';
            expect(await getIdsByExtended(extCssSelector)).toEqual(await getIdsByRegular(targetSelector));

            extCssSelector = 'div:matches-css(min-height:/10/):matches-css(height:/10|15|20/)';
            expect(await getIdsByExtended(extCssSelector)).toEqual(await getIdsByRegular(targetSelector));

            // should NOT match because height is 15px
            extCssSelector = 'div:matches-css(min-height:/10/):matches-css(height:/10|20/)';
            await expectNoMatch(extCssSelector);
        });

        it('matches-css-before', async () => {
            const bodyInnerHtml = `
                <div id="target">
                    <style>
                        #target::before {
                            content: "Advertisement";
                            color: rgb(255, 255, 255);
                        }

                        #target {
                            width: 20px;
                        }
                    </style>
                </div>
            `;
            await setBodyInnerHtml(bodyInnerHtml);

            const targetSelector = 'div#target';
            let extCssSelector;

            extCssSelector = 'div:matches-css-before(color: rgb(255, 255, 255))';
            expect(await getIdsByExtended(extCssSelector)).toEqual(await getIdsByRegular(targetSelector));

            extCssSelector = 'div:matches-css-before(content: /^Advertisement$/)';
            expect(await getIdsByExtended(extCssSelector)).toEqual(await getIdsByRegular(targetSelector));
        });

        it('matches-css-after', async () => {
            const bodyInnerHtml = `
                <style>
                    #target {
                        content: "empty";
                        color: #000;
                    }

                    #target::after {
                        content: "Advertisement";
                        color: #fff;
                    }
                </style>

                <div id="target"></div>
            `;
            await setBodyInnerHtml(bodyInnerHtml);

            const targetSelector = 'div#target';
            let extCssSelector;

            extCssSelector = 'div:matches-css-after(color: rgb(255, 255, 255))';
            expect(await getIdsByExtended(extCssSelector)).toEqual(await getIdsByRegular(targetSelector));

            extCssSelector = 'div:matches-css-after(content: /^Advertisement$/)';
            expect(await getIdsByExtended(extCssSelector)).toEqual(await getIdsByRegular(targetSelector));
        });
    });
});
