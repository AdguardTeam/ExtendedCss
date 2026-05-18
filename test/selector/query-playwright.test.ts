/**
 * Vitest browser mode is required for:
 * - matches-css-before and matches-css-after selector tests (pseudo-elements not supported by jsdom).
 * - empty-trimmed browser integration tests (verifying real textContent behavior).
 *
 * @see {@link https://github.com/jsdom/jsdom/issues/1928}
 */

import { extCssDocument } from '../../src/selector';

// sometimes default 5 seconds are not enough
const TESTS_RUN_TIMEOUT_MS = 20 * 1000;

/**
 * Sets document.body.innerHTML with passed htmlContent.
 *
 * @param htmlContent Inner html content.
 */
const setBodyInnerHtml = async (htmlContent: string): Promise<void> => {
    document.body.innerHTML = htmlContent;
};

/**
 * Returns elements ids selected by extCss.querySelectorAll.
 *
 * @param extCssSelector Selector for extended css.
 * @returns Array of element ids matched by the extended selector.
 */
const getIdsByExtended = async (extCssSelector: string): Promise<string[]> => {
    return extCssDocument.querySelectorAll(extCssSelector).map((el: Element) => el.id);
};

/**
 * Returns elements ids selected by document.querySelectorAll().
 *
 * @param regularSelector Standard selector.
 * @returns Array of element ids matched by the regular selector.
 */
const getIdsByRegular = async (regularSelector: string): Promise<string[]> => {
    return Array.from(document.querySelectorAll(regularSelector)).map((el) => el.id);
};

/**
 * Checks whether there is no elements selected by extCssSelector.
 *
 * @param extCssSelector Extended css selector.
 */
const expectNoMatch = async (extCssSelector: string): Promise<void> => {
    const selectedIds = await getIdsByExtended(extCssSelector);
    expect(selectedIds.length).toEqual(0);
};

vi.setConfig({ testTimeout: TESTS_RUN_TIMEOUT_MS });

describe('playwright required tests', () => {
    describe('matches-css pseudos', () => {
        afterEach(() => {
            document.body.innerHTML = '';
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

        it('matches-css + before', async () => {
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

            // old syntax
            extCssSelector = 'div:matches-css-before(color: rgb(255, 255, 255))';
            expect(await getIdsByExtended(extCssSelector)).toEqual(await getIdsByRegular(targetSelector));

            // new syntax
            extCssSelector = 'div:matches-css(before, color: rgb(255, 255, 255))';
            expect(await getIdsByExtended(extCssSelector)).toEqual(await getIdsByRegular(targetSelector));

            extCssSelector = 'div:matches-css(before,content: /^Advertisement$/)';
            expect(await getIdsByExtended(extCssSelector)).toEqual(await getIdsByRegular(targetSelector));
        });

        it('matches-css + after', async () => {
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

            // old syntax
            extCssSelector = 'div:matches-css-after(color: rgb(255, 255, 255))';
            expect(await getIdsByExtended(extCssSelector)).toEqual(await getIdsByRegular(targetSelector));

            extCssSelector = 'div:matches-css(after, content: /^Advertisement$/)';
            expect(await getIdsByExtended(extCssSelector)).toEqual(await getIdsByRegular(targetSelector));

            extCssSelector = 'div:matches-css(after, content: advertisement)';
            expect(await getIdsByExtended(extCssSelector)).toEqual(await getIdsByRegular(targetSelector));

            extCssSelector = 'div:matches-css(after,content: advert*)';
            expect(await getIdsByExtended(extCssSelector)).toEqual(await getIdsByRegular(targetSelector));
        });

        it('matches-css + first-line', async () => {
            const bodyInnerHtml = `
                <style>
                    #target {
                        color: #000;
                        word-spacing: normal;
                    }

                    #target::first-line {
                        color: #fff;
                        word-spacing: 15px;
                    }
                </style>

                <p id="target"></p>
            `;
            await setBodyInnerHtml(bodyInnerHtml);

            const targetSelector = 'p#target';
            let extCssSelector;

            extCssSelector = 'p:matches-css(first-line, color: rgb(255, 255, 255))';
            expect(await getIdsByExtended(extCssSelector)).toEqual(await getIdsByRegular(targetSelector));

            extCssSelector = 'p:matches-css(first-line, word-spacing: *px)';
            expect(await getIdsByExtended(extCssSelector)).toEqual(await getIdsByRegular(targetSelector));
        });
    });

    describe('empty-trimmed pseudo-class', () => {
        afterEach(() => {
            document.body.innerHTML = '';
        });

        it('empty-trimmed - selects empty and whitespace-only elements', async () => {
            const bodyInnerHtml = `
                    <div id="root">
                        <p id="emptyParagraph"></p>
                        <p id="blankParagraph"> \n\t </p>
                        <p id="textParagraph"> text </p>
                        <div id="childOnly"><span></span></div>
                    </div>
                `;
            await setBodyInnerHtml(bodyInnerHtml);

            const extCssSelector = '#root > :empty-trimmed';
            const selectedIds = await getIdsByExtended(extCssSelector);
            expect(selectedIds).toEqual(
                expect.arrayContaining(['emptyParagraph', 'blankParagraph', 'childOnly']),
            );
            expect(selectedIds).not.toContain('textParagraph');
        });

        it('empty-trimmed - does not match element with text content', async () => {
            const bodyInnerHtml = `
                    <div id="root">
                        <p id="textParagraph"> text </p>
                    </div>
                `;
            await setBodyInnerHtml(bodyInnerHtml);

            await expectNoMatch('#root > #textParagraph:empty-trimmed');
        });

        it('empty-trimmed - combined with :not()', async () => {
            const bodyInnerHtml = `
                    <div id="root">
                        <p id="emptyParagraph"></p>
                        <p id="blankParagraph"> \n\t </p>
                        <p id="textParagraph"> text </p>
                        <div id="childOnly"><span></span></div>
                    </div>
                `;
            await setBodyInnerHtml(bodyInnerHtml);

            const extCssSelector = '#root > :not(:empty-trimmed)';
            const selectedIds = await getIdsByExtended(extCssSelector);
            expect(selectedIds).toEqual(['textParagraph']);
        });

        it('empty-trimmed - nbsp handling', async () => {
            const bodyInnerHtml = `
                    <div id="root">
                        <div id="nbs"><span>&nbsp;</span></div>
                        <div id="nbs-p"><p>&nbsp;</p></div>
                        <p id="emptyParagraph"></p>
                    </div>
                `;
            await setBodyInnerHtml(bodyInnerHtml);

            const extCssSelector = '#root > :empty-trimmed';
            const selectedIds = await getIdsByExtended(extCssSelector);
            expect(selectedIds).toEqual(['nbs', 'nbs-p', 'emptyParagraph']);
        });

        it('empty-trimmed - comment-only element matches', async () => {
            const bodyInnerHtml = `
                    <div id="root">
                        <div id="commentOnly"><!-- hidden --></div>
                        <div id="textDiv">content</div>
                    </div>
                `;
            await setBodyInnerHtml(bodyInnerHtml);

            const extCssSelector = '#root > :empty-trimmed';
            const selectedIds = await getIdsByExtended(extCssSelector);
            expect(selectedIds).toContain('commentOnly');
            expect(selectedIds).not.toContain('textDiv');
        });

        it('empty-trimmed - zero-width whitespace', async () => {
            const bodyInnerHtml = `
                    <div id="root">
                        <p id="zwsp">\u200B</p>
                        <p id="zwspWithSpaces"> \u200B </p>
                        <p id="zwspWithText">\u200Btext</p>
                        <p id="trulyEmpty"></p>
                    </div>
                `;
            await setBodyInnerHtml(bodyInnerHtml);

            const extCssSelector = '#root > :empty-trimmed';
            const selectedIds = await getIdsByExtended(extCssSelector);
            expect(selectedIds).toEqual(['trulyEmpty']);

            await expectNoMatch('#root > #zwsp:empty-trimmed');
            await expectNoMatch('#root > #zwspWithSpaces:empty-trimmed');
            await expectNoMatch('#root > #zwspWithText:empty-trimmed');
        });

        it('empty-trimmed - empty script/style matches', async () => {
            const bodyInnerHtml = `
                    <div id="root">
                        <div id="emptyScriptChild"><script></script></div>
                        <div id="emptyStyleChild"><style></style></div>
                        <div id="emptyDiv"></div>
                        <div id="scriptChild"><script>var a = 1;</script></div>
                        <div id="styleChild"><style>.a { color: red; }</style></div>
                    </div>
                `;
            await setBodyInnerHtml(bodyInnerHtml);

            const extCssSelector = '#root > :empty-trimmed';
            const selectedIds = await getIdsByExtended(extCssSelector);
            expect(selectedIds).toEqual(['emptyScriptChild', 'emptyStyleChild', 'emptyDiv']);
        });
    });
});
