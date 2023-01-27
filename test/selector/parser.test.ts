/**
 * @jest-environment jsdom
 */

import { NODE } from '../../src/selector/nodes';
import { parse } from '../../src/selector/parser';

import {
    getRegularSelector,
    getAstWithSingleRegularSelector,
    getAbsoluteExtendedSelector,
    getRelativeExtendedWithSingleRegular,
    getSelectorAsRegular,
    getSelectorListOfRegularSelectors,
    getSingleSelectorAstWithAnyChildren,
    expectSelectorListOfRegularSelectors,
    expectSingleSelectorAstWithAnyChildren,
    expectToThrowInput,
} from '../helpers/selector-parser';

describe('regular selectors', () => {
    describe('simple', () => {
        const selectors = [
            'div',
            '.banner',
            '[foo]',
            '[foo="bar"]',
            '[foo~="bar"]',
            '[foo^="bar"]',
            '[foo$="bar"]',
            '[foo*="bar"]',
            '[foo|="en"]',
            '[style*="z-index: 100000000;"]',
            '[data-dfp-sizes="728x90,960x250,1260x110"]',
            '[style="background-color: #fff; padding: 6px; text-align: center"]',
            '[onclick^="window.open (\'https://example.com/share?url="]',
            '[data-bind="visible: showCookieWarning"]',
            '[href="javascript: bot.renew()"]',
            '[style^="background-color: rgb(24, 28, 31);"]',
            '[href^="https://www.example.com/swiety-ogien-rzymu-wespazjan-tom-8-fabbri-robert,p1242140709,ksiazka-p"]',
            '[href^="/watch?v="]',
            'div[style^=" margin-right: auto; margin-left: auto;	text-align: left;	padding-bottom: 10px;"]',
        ];
        test.each(selectors)('%s', (selector) => {
            const expectedAst = getAstWithSingleRegularSelector(selector);
            expect(parse(selector)).toEqual(expectedAst);
        });
    });

    describe('compound', () => {
        const selectors = [
            'div.banner',
            '.banner.text',
            'div.ad > a.redirect + a',
            'div[style]',
            'div#top[onclick*="redirect"]',
            'div[data-comma="0,1"]',
            'input[data-comma=\'0,1\']',
            'div[class*=" "]',
            'a[href="javascript:void(0)"]',
            '[style*="z-index: 100000000;"][data-bind="visible: showCookieWarning"]',
            // eslint-disable-next-line max-len
            '[style^="font-size: 13px; border: 1px solid #ccc; margin-bottom: 15px; padding: 0px 7px;"][style$="-moz-border-radius: 3px; -webkit-border-radius:3px; border-radius:3px;"]',
        ];
        test.each(selectors)('%s', (selector) => {
            const expectedAst = getAstWithSingleRegularSelector(selector);
            expect(parse(selector)).toEqual(expectedAst);
        });
    });

    describe('tricky attributes', () => {
        const selectors = [
            '#test\\.foo\\[5\\]bar',
            'a[onclick*="arguments[0]"]',
            'a[onclick*="arguments[0],"]',
            '[onclick*="window.event,\'"]',
            '[onclick*="arguments[0],\'"]',
            '[onclick*="onEvent(arguments[0]||window.event,\'"]',
            '[onclick^="return test.onEvent(arguments[0]||window.event,\'"]',
            'a[href^="/watch?v="][onclick^="return test.onEvent(arguments[0]||window.event,\'"]',
            // extra space
            'a[ title ]',
            'a[ title = "bookmark" ]',
            'a[href ^= "http://www"]',
            'a[href *= "para"]',
            // escaped colon at start of attribute name
            'div[\\:data-service-slot][data-ac]',
            '#main-container > div[\\:class^="$test.ad.RenderedDesktop"]',
            '[class\\"ads-article\\"]',
            "[class\\'ads-article\\']",
            'a[href][data-item^=\'{"sources":[\'][data-item*=\'Video Ad\']',
        ];
        test.each(selectors)('%s', (selector) => {
            const expectedAst = getAstWithSingleRegularSelector(selector);
            expect(parse(selector)).toEqual(expectedAst);
        });
    });

    describe('complex', () => {
        const selectors = [
            'div > span',
            '.banner + div[style="clear:both;"]',
            '[style="margin-bottom: 20px; "] > A',
        ];
        test.each(selectors)('%s', (selector) => {
            const expectedAst = getAstWithSingleRegularSelector(selector);
            expect(parse(selector)).toEqual(expectedAst);
        });
    });

    describe('selector list', () => {
        const testsInputs = [
            {
                actual: 'div, span',
                expected: ['div', 'span'],
            },
            {
                actual: 'div,span',
                expected: ['div', 'span'],
            },
            {
                actual: 'div , span',
                expected: ['div', 'span'],
            },
            {
                actual: 'div.banner, span[ad], div > a > img',
                expected: ['div.banner', 'span[ad]', 'div > a > img'],
            },
            {
                actual: 'p, :hover',
                expected: ['p', '*:hover'],
            },
            {
                actual: 'p,:hover',
                expected: ['p', '*:hover'],
            },
            {
                actual: '.banner, div[data-comma="0,1"]',
                expected: ['.banner', 'div[data-comma="0,1"]'],
            },
            {
                actual: '.banner, [style*="z-index: 100000000;"]',
                expected: ['.banner', '[style*="z-index: 100000000;"]'],
            },
            {
                actual: '[id^="test"],[style^="height: 90px;"],.ad_text,#div',
                expected: ['[id^="test"]', '[style^="height: 90px;"]', '.ad_text', '#div'],
            },
        ];
        test.each(testsInputs)('%s', ({ actual, expected }) => {
            expect(parse(actual)).toEqual(getSelectorListOfRegularSelectors(expected));
        });
    });

    describe('regular selector with pseudo-class', () => {
        const wildcardSelectors = [
            ':lang(en)',
            ':lang(ara\\b)',
            ':lang(ara\\\\b)',
            // should be parsed with no error as it is invalid for querySelectorAll
            ':lang(c++)',
        ];

        const testsInputs = [
            { actual: 'div:hover', expected: 'div:hover' },
            { actual: '.post-content > p:empty::before', expected: '.post-content > p:empty::before' },
            { actual: '.block:nth-child(2) .inner', expected: '.block:nth-child(2) .inner' },
            { actual: '.block:nth-child(2) > .inner', expected: '.block:nth-child(2) > .inner' },
            ...wildcardSelectors.map((actual) => ({ actual, expected: `*${actual}` })),
        ];
        test.each(testsInputs)('%s', ({ actual, expected }) => {
            const expectedAst = getAstWithSingleRegularSelector(expected);
            expect(parse(actual)).toEqual(expectedAst);
        });
    });

    describe('not a valid selector for querySelectorAll - should not fail while parsing', () => {
        const invalidSelectors = [
            'div >',
            'div:invalid-pseudo(1)',
        ];
        test.each(invalidSelectors)('%s', (selector) => {
            const expectedAst = getAstWithSingleRegularSelector(selector);
            expect(parse(selector)).toEqual(expectedAst);
        });
    });
});

describe('absolute extended selectors', () => {
    describe('contains pseudo-class', () => {
        const name = 'contains';
        const testsInputs = [
            {
                actual: 'span:contains(text)',
                expected: [
                    { isRegular: true, value: 'span' },
                    { isAbsolute: true, name, value: 'text' },
                ],
            },
            {
                actual: 'span:contains("some text")',
                expected: [
                    { isRegular: true, value: 'span' },
                    { isAbsolute: true, name, value: '"some text"' },
                ],
            },
            {
                actual: 'div[id] > .row > span:contains(/^Advertising$/)',
                expected: [
                    { isRegular: true, value: 'div[id] > .row > span' },
                    { isAbsolute: true, name, value: '/^Advertising$/' },
                ],
            },
            {
                actual: 'div > :contains(test)',
                expected: [
                    { isRegular: true, value: 'div > *' },
                    { isAbsolute: true, name, value: 'test' },
                ],
            },
            {
                actual: ':contains((test))',
                expected: [
                    { isRegular: true, value: '*' },
                    { isAbsolute: true, name, value: '(test)' },
                ],
            },
            {
                actual: 'a[class*=blog]:contains(!)',
                expected: [
                    { isRegular: true, value: 'a[class*=blog]' },
                    { isAbsolute: true, name, value: '!' },
                ],
            },
            {
                actual: ':contains(/[\\w]{9,}/)',
                expected: [
                    { isRegular: true, value: '*' },
                    { isAbsolute: true, name, value: '/[\\w]{9,}/' },
                ],
            },
            {
                actual: '#container > :contains(/"quote[\\w]"/)',
                expected: [
                    { isRegular: true, value: '#container > *' },
                    { isAbsolute: true, name, value: '/"quote[\\w]"/' },
                ],
            },
            {
                actual: 'p:-abp-contains(=== Ads / Sponsored ===)',
                expected: [
                    { isRegular: true, value: 'p' },
                    { isAbsolute: true, name: '-abp-contains', value: '=== Ads / Sponsored ===' },
                ],
            },
            {
                actual: '.obj-cont dt:-abp-contains( Advertisement/)',
                expected: [
                    { isRegular: true, value: '.obj-cont dt' },
                    { isAbsolute: true, name: '-abp-contains', value: ' Advertisement/' },
                ],
            },
            {
                actual: '#main .et_pb_blurb_content:-abp-contains(text1/text2)',
                expected: [
                    { isRegular: true, value: '#main .et_pb_blurb_content' },
                    { isAbsolute: true, name: '-abp-contains', value: 'text1/text2' },
                ],
            },
            {
                actual: '.article:has-text(src="https://example.org/test.png")',
                expected: [
                    { isRegular: true, value: '.article' },
                    { isAbsolute: true, name: 'has-text', value: 'src="https://example.org/test.png"' },
                ],
            },
        ];
        test.each(testsInputs)('%s', (input) => expectSingleSelectorAstWithAnyChildren(input));
    });

    describe('matches-css pseudo-class', () => {
        const name = 'matches-css';
        const testsInputs = [
            {
                actual: '*:matches-css(width:400px)',
                expected: [
                    { isRegular: true, value: '*' },
                    { isAbsolute: true, name, value: 'width:400px' },
                ],
            },
            {
                actual: 'div:matches-css(background-image: /^url\\("data:image\\/gif;base64.+/)',
                expected: [
                    { isRegular: true, value: 'div' },
                    { isAbsolute: true, name, value: 'background-image: /^url\\("data:image\\/gif;base64.+/' },
                ],
            },
            {
                actual: 'div:matches-css(background-image: /^url\\([a-z]{4}:[a-z]{5}/)',
                expected: [
                    { isRegular: true, value: 'div' },
                    { isAbsolute: true, name, value: 'background-image: /^url\\([a-z]{4}:[a-z]{5}/' },
                ],
            },
            {
                actual: ':matches-css(   background-image: /v\\.ping\\.pl\\/MjAxOTA/   )',
                expected: [
                    { isRegular: true, value: '*' },
                    { isAbsolute: true, name, value: '   background-image: /v\\.ping\\.pl\\/MjAxOTA/   ' },
                ],
            },
            {
                actual: ':matches-css(    background-image: /^url\\((.)[a-z]{4}:[a-z]{2}\\1nk\\)$/    )',
                expected: [
                    { isRegular: true, value: '*' },
                    // eslint-disable-next-line max-len
                    { isAbsolute: true, name, value: '    background-image: /^url\\((.)[a-z]{4}:[a-z]{2}\\1nk\\)$/    ' },
                ],
            },
            {
                actual: 'div:matches-css(background-image: /^url\\(data:image/png;base64,iVBOR/)',
                expected: [
                    { isRegular: true, value: 'div' },
                    { isAbsolute: true, name, value: 'background-image: /^url\\(data:image/png;base64,iVBOR/' },
                ],
            },
            {
                actual: 'div[class*=" "]:matches-css(background-image: /^url\\(https:\\/\\/example\\.org\\//)',
                expected: [
                    { isRegular: true, value: 'div[class*=" "]' },
                    { isAbsolute: true, name, value: 'background-image: /^url\\(https:\\/\\/example\\.org\\//' },
                ],
            },
        ];
        test.each(testsInputs)('%s', (input) => expectSingleSelectorAstWithAnyChildren(input));
    });

    it('matches-attr pseudo-class', () => {
        const actual = 'div:matches-attr("/data-v-/")';
        expectSingleSelectorAstWithAnyChildren({
            actual,
            expected: [
                { isRegular: true, value: 'div' },
                { isAbsolute: true, name: 'matches-attr', value: '"/data-v-/"' },
            ],
        });
    });

    it('nth-ancestor pseudo-class', () => {
        const actual = 'a:nth-ancestor(2)';
        expectSingleSelectorAstWithAnyChildren({
            actual,
            expected: [
                { isRegular: true, value: 'a' },
                { isAbsolute: true, name: 'nth-ancestor', value: '2' },
            ],
        });
    });

    describe('xpath pseudo-class', () => {
        const name = 'xpath';
        /* eslint-disable max-len */
        const testsInputs = [
            {
                actual: 'div:xpath(//h3[contains(text(),"Share it!")]/..)',
                expected: [
                    { isRegular: true, value: 'div' },
                    { isAbsolute: true, name, value: '//h3[contains(text(),"Share it!")]/..' },
                ],
            },
            {
                actual: '*:xpath(//h3[contains(text(),"Share it!")]/..)',
                expected: [
                    { isRegular: true, value: '*' },
                    { isAbsolute: true, name, value: '//h3[contains(text(),"Share it!")]/..' },
                ],
            },
            {
                actual: '[data-src^="https://example.org/"]:xpath(..)',
                expected: [
                    { isRegular: true, value: '[data-src^="https://example.org/"]' },
                    { isAbsolute: true, name, value: '..' },
                ],
            },
            {
                actual: ':xpath(//div[@data-st-area=\'Advert\'][count(*)=2][not(header)])',
                expected: [
                    { isRegular: true, value: 'body' },
                    { isAbsolute: true, name, value: '//div[@data-st-area=\'Advert\'][count(*)=2][not(header)]' },
                ],
            },
            {
                actual: ":xpath(//article//div[count(div[*[*[*]]])=2][count(div[*[*[*]]][1]//img[starts-with(@src,'data:image/png;base64,')])>2][div[*[*[*]]][2][count(div[@class]/div[last()][count(div)=3])>=2]])",
                expected: [
                    { isRegular: true, value: 'body' },
                    { isAbsolute: true, name, value: "//article//div[count(div[*[*[*]]])=2][count(div[*[*[*]]][1]//img[starts-with(@src,'data:image/png;base64,')])>2][div[*[*[*]]][2][count(div[@class]/div[last()][count(div)=3])>=2]]" },
                ],
            },
            {
                actual: ':xpath(//article/h1/following-sibling::p[1]/following-sibling::div[1]//div[1][@class][@id][not(ancestor::div[@id]/ancestor::article)])',
                expected: [
                    { isRegular: true, value: 'body' },
                    { isAbsolute: true, name, value: '//article/h1/following-sibling::p[1]/following-sibling::div[1]//div[1][@class][@id][not(ancestor::div[@id]/ancestor::article)]' },
                ],
            },
            {
                actual: ':xpath(//article/h1/following-sibling::div[1]/following-sibling::div//div[count(*)>1][not(ancestor::div[count(*)>1]/ancestor::article)]/div[1])',
                expected: [
                    { isRegular: true, value: 'body' },
                    { isAbsolute: true, name, value: '//article/h1/following-sibling::div[1]/following-sibling::div//div[count(*)>1][not(ancestor::div[count(*)>1]/ancestor::article)]/div[1]' },
                ],
            },
            {
                actual: ":xpath(//article/h1/following-sibling::div[1]/following-sibling::div//div[count(*)>1]//div[count(*)>1][not(ancestor::div[count(*)>1]/ancestor::div[count(*)>1]/ancestor::article)]/div[.//ul/li|.//a[contains(@href,'/w/%EB%B6%84%EB%A5%98:')]]/following-sibling::div[.//div[contains(concat(' ',normalize-space(@class),' '),' example-toc-ad ')]|.//div[contains(concat(' ',normalize-space(@class),' '),' wiki-paragraph ')]]/following-sibling::div[count(.//*[count(img[starts-with(@src,'//w.example.la/s/')]|img[starts-with(@src,'//ww.example.la/s/')]|img[starts-with(@src,'data:image/png;base64,')])>1])>1])",
                expected: [
                    { isRegular: true, value: 'body' },
                    { isAbsolute: true, name, value: "//article/h1/following-sibling::div[1]/following-sibling::div//div[count(*)>1]//div[count(*)>1][not(ancestor::div[count(*)>1]/ancestor::div[count(*)>1]/ancestor::article)]/div[.//ul/li|.//a[contains(@href,'/w/%EB%B6%84%EB%A5%98:')]]/following-sibling::div[.//div[contains(concat(' ',normalize-space(@class),' '),' example-toc-ad ')]|.//div[contains(concat(' ',normalize-space(@class),' '),' wiki-paragraph ')]]/following-sibling::div[count(.//*[count(img[starts-with(@src,'//w.example.la/s/')]|img[starts-with(@src,'//ww.example.la/s/')]|img[starts-with(@src,'data:image/png;base64,')])>1])>1]" },
                ],
            },
            {
                actual: ":xpath(//div[@class='ytp-button ytp-paid-content-overlay-text'])",
                expected: [
                    { isRegular: true, value: 'body' },
                    { isAbsolute: true, name, value: "//div[@class='ytp-button ytp-paid-content-overlay-text']" },
                ],
            },
            {
                actual: ':xpath(//div[@class="user-content"]/div[@class="snippet-clear"]/following-sibling::text()[contains(.,"Advertisement")])',
                expected: [
                    { isRegular: true, value: 'body' },
                    { isAbsolute: true, name, value: '//div[@class="user-content"]/div[@class="snippet-clear"]/following-sibling::text()[contains(.,"Advertisement")]' },
                ],
            },
        ];
        /* eslint-enable max-len */
        test.each(testsInputs)('%s', (input) => expectSingleSelectorAstWithAnyChildren(input));
    });

    describe('upward extended pseudo-class', () => {
        const name = 'upward';
        const testsInputs = [
            {
                actual: 'a[class][redirect]:upward(3)',
                expected: [
                    { isRegular: true, value: 'a[class][redirect]' },
                    { isAbsolute: true, name, value: '3' },
                ],
            },
            {
                actual: 'div.advert:upward(.info)',
                expected: [
                    { isRegular: true, value: 'div.advert' },
                    { isAbsolute: true, name, value: '.info' },
                ],
            },
            {
                actual: 'img:upward(header ~ div[class])',
                expected: [
                    { isRegular: true, value: 'img' },
                    { isAbsolute: true, name, value: 'header ~ div[class]' },
                ],
            },
            {
                actual: '.ad-title + .banner:upward([id][class])',
                expected: [
                    { isRegular: true, value: '.ad-title + .banner' },
                    { isAbsolute: true, name, value: '[id][class]' },
                ],
            },
        ];
        test.each(testsInputs)('%s', (input) => expectSingleSelectorAstWithAnyChildren(input));
    });
});

describe('relative extended selectors', () => {
    describe('has', () => {
        const name = 'has';
        const testsInputs = [
            {
                actual: 'div:has(span)',
                expected: [
                    { isRegular: true, value: 'div' },
                    { isRelative: true, name, value: 'span' },
                ],
            },
            {
                actual: 'div.banner > div:has(> a[class^="ad"])',
                expected: [
                    { isRegular: true, value: 'div.banner > div' },
                    { isRelative: true, name, value: '> a[class^="ad"]' },
                ],
            },
            {
                actual: '.banner:has(:scope > a[class^="ad"])',
                // :scope inside :has should be handled by converter before tokenization
                expected: [
                    { isRegular: true, value: '.banner' },
                    { isRelative: true, name, value: '> a[class^="ad"]' },
                ],
            },
            {
                actual: '[style="min-height: 260px;"]:has([id^="banner-top"])',
                expected: [
                    { isRegular: true, value: '[style="min-height: 260px;"]' },
                    { isRelative: true, name, value: '[id^="banner-top"]' },
                ],
            },
            {
                actual: '[style*="border-radius: 3px; margin-bottom: 20px; width: 160px;"]:-abp-has([target="_blank"])',
                expected: [
                    { isRegular: true, value: '[style*="border-radius: 3px; margin-bottom: 20px; width: 160px;"]' },
                    { isRelative: true, name: '-abp-has', value: '[target="_blank"]' },
                ],
            },
        ];
        test.each(testsInputs)('%s', (input) => expectSingleSelectorAstWithAnyChildren(input));

        it('selector list as arg of has', () => {
            const actual = '.banner > :has(span, p)';
            const expected = {
                type: NODE.SELECTOR_LIST,
                children: [
                    {
                        type: NODE.SELECTOR,
                        children: [
                            getRegularSelector('.banner > *'),
                            {
                                type: NODE.EXTENDED_SELECTOR,
                                children: [
                                    {
                                        type: NODE.RELATIVE_PSEUDO_CLASS,
                                        name: 'has',
                                        children: [
                                            getSelectorListOfRegularSelectors(['span', 'p']),
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            };
            expect(parse(actual)).toEqual(expected);
        });

        it('has selector list arg — more complicated case', () => {
            const actual = '.banner:has(~ .right_bx, ~ div[class^="aside"])';
            const expected = {
                type: NODE.SELECTOR_LIST,
                children: [
                    {
                        type: NODE.SELECTOR,
                        children: [
                            getRegularSelector('.banner'),
                            {
                                type: NODE.EXTENDED_SELECTOR,
                                children: [
                                    {
                                        type: NODE.RELATIVE_PSEUDO_CLASS,
                                        name: 'has',
                                        children: [
                                            getSelectorListOfRegularSelectors(['~ .right_bx', '~ div[class^="aside"]']),
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            };
            expect(parse(actual)).toEqual(expected);
        });

        it('selector list: has with selector list as arg + regular selector', () => {
            const actual = '.banner > :has(span, p), a img.ad';
            const expected = {
                type: NODE.SELECTOR_LIST,
                children: [
                    {
                        type: NODE.SELECTOR,
                        children: [
                            getRegularSelector('.banner > *'),
                            {
                                type: NODE.EXTENDED_SELECTOR,
                                children: [
                                    {
                                        type: NODE.RELATIVE_PSEUDO_CLASS,
                                        name: 'has',
                                        children: [
                                            getSelectorListOfRegularSelectors(['span', 'p']),
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: NODE.SELECTOR,
                        children: [
                            getRegularSelector('a img.ad'),
                        ],
                    },
                ],
            };
            expect(parse(actual)).toEqual(expected);
        });
    });

    describe('is', () => {
        // for standard selector arg :is() pseudo-class is parsed as part standard selector
        const testsInputs = [
            {
                actual: '#__next > :is(.header, .footer)',
                expected: [
                    { isRegular: true, value: '#__next > *:is(.header, .footer)' },
                ],
            },
            {
                actual: 'h3 > :is(a[href$="/netflix-"], a[href$="/spotify-"], a[title="Disney Premium"])',
                expected: [
                    // eslint-disable-next-line max-len
                    { isRegular: true, value: 'h3 > *:is(a[href$="/netflix-"], a[href$="/spotify-"], a[title="Disney Premium"])' },
                ],
            },
            {
                actual: ':is(.header, .footer)',
                expected: [
                    { isRegular: true, value: '*:is(.header, .footer)' },
                ],
            },
            {
                actual: ':is(.header, .footer) > .banner',
                expected: [
                    { isRegular: true, value: '*:is(.header, .footer) > .banner' },
                ],
            },
            {
                actual: 'html:is(.modal-active)',
                expected: [
                    { isRegular: true, value: 'html:is(.modal-active)' },
                ],
            },
        ];
        test.each(testsInputs)('$actual', (input) => expectSingleSelectorAstWithAnyChildren(input));
    });

    describe('not', () => {
        describe('not - single standard selector in arg', () => {
            // for standard selector arg :not() pseudo-class is parsed as part standard selector
            const testsInputs = [
                {
                    actual: '.banner:not(.header)',
                    expected: [
                        { isRegular: true, value: '.banner:not(.header)' },
                    ],
                },
                {
                    actual: 'div.banner > div:not(> a[class^="ad"])',
                    expected: [
                        { isRegular: true, value: 'div.banner > div:not(> a[class^="ad"])' },
                    ],
                },
                {
                    actual: '.detail-share-item > a:not([href*="window.print()"])',
                    expected: [
                        { isRegular: true, value: '.detail-share-item > a:not([href*="window.print()"])' },
                    ],
                },
                {
                    actual: '.yellow:not(:nth-child(3))',
                    expected: [
                        { isRegular: true, value: '.yellow:not(*:nth-child(3))' },
                    ],
                },
                {
                    actual: 'html:not(.modal-active)',
                    expected: [
                        { isRegular: true, value: 'html:not(.modal-active)' },
                    ],
                },
            ];
            test.each(testsInputs)('$actual', (input) => expectSingleSelectorAstWithAnyChildren(input));
        });

        describe('not - selector list of standard selectors as arg', () => {
            // for standard selector arg :not() pseudo-class is parsed as part standard selector
            const testsInputs = [
                {
                    actual: '.banner > :not(span, p)',
                    expected: [
                        { isRegular: true, value: '.banner > *:not(span, p)' },
                    ],
                },
                {
                    actual: '#child *:not(a, span)',
                    expected: [
                        { isRegular: true, value: '#child *:not(a, span)' },
                    ],
                },
                {
                    actual: ':not(.header, .footer)',
                    expected: [
                        { isRegular: true, value: '*:not(.header, .footer)' },
                    ],
                },
                {
                    actual: 'div:not(.header, .footer) > .banner',
                    expected: [
                        { isRegular: true, value: 'div:not(.header, .footer) > .banner' },
                    ],
                },
            ];
            test.each(testsInputs)('$actual', (input) => expectSingleSelectorAstWithAnyChildren(input));
        });

        describe('not - multiple', () => {
            // for standard selector arg :not() pseudo-class is parsed as part standard selector
            const testsInputs = [
                {
                    actual: '.banner > :not(span):not(p)',
                    expected: [
                        { isRegular: true, value: '.banner > *:not(span):not(p)' },
                    ],
                },
                {
                    actual: '#child *:not(a):not(span):not(article)',
                    expected: [
                        { isRegular: true, value: '#child *:not(a):not(span):not(article)' },
                    ],
                },
                {
                    actual: '.banner > :not(span):not(p) > .banner',
                    expected: [
                        { isRegular: true, value: '.banner > *:not(span):not(p) > .banner' },
                    ],
                },
                {
                    actual: 'body > div[style^="z-index:"]:not([class]):not([id])',
                    expected: [
                        { isRegular: true, value: 'body > div[style^="z-index:"]:not([class]):not([id])' },
                    ],
                },
                {
                    actual: ':not(:empty):not(:hover)',
                    expected: [
                        { isRegular: true, value: '*:not(*:empty):not(*:hover)' },
                    ],
                },
                {
                    actual: 'div:not([style]) > div[id]:not([data-bem])',
                    expected: [
                        { isRegular: true, value: 'div:not([style]) > div[id]:not([data-bem])' },
                    ],
                },
            ];
            test.each(testsInputs)('$actual', (input) => expectSingleSelectorAstWithAnyChildren(input));
        });

        describe('not - selector list', () => {
            // for standard selector arg :not() pseudo-class is parsed as part standard selector
            const testsInputs = [
                {
                    actual: '.banner > :not(span), .ad > :not(p)',
                    expected: ['.banner > *:not(span)', '.ad > *:not(p)'],
                },
                {
                    actual: '.banner > :not(span), .ad > :not(p) > .banner',
                    expected: ['.banner > *:not(span)', '.ad > *:not(p) > .banner'],
                },
            ];
            test.each(testsInputs)('$actual', ({ actual, expected }) => {
                expect(parse(actual)).toEqual(getSelectorListOfRegularSelectors(expected));
            });
        });
    });
});

describe('old syntax', () => {
    const testsInputs = [
        {
            actual: 'div[-ext-has=".banner"]',
            expected: [
                { isRegular: true, value: 'div' },
                { isRelative: true, name: 'has', value: '.banner' },
            ],
        },
        {
            actual: '[-ext-has="div.advert"]',
            expected: [
                { isRegular: true, value: '*' },
                { isRelative: true, name: 'has', value: 'div.advert' },
            ],
        },
        {
            actual:  '.block[-ext-has=\'a[href^="https://example.net/"]\']',
            expected: [
                { isRegular: true, value: '.block' },
                { isRelative: true, name: 'has', value: 'a[href^="https://example.net/"]' },
            ],
        },
        {
            actual: 'div[style*="z-index:"][-ext-has=\'>div[id$="_content"]>iframe#overlay_iframe\']',
            expected: [
                { isRegular: true, value: 'div[style*="z-index:"]' },
                { isRelative: true, name: 'has', value: '>div[id$="_content"]>iframe#overlay_iframe' },
            ],
        },
        {
            actual: 'div a[-ext-contains="text"]',
            expected: [
                { isRegular: true, value: 'div a' },
                { isAbsolute: true, name: 'contains', value: 'text' },
            ],
        },
        {
            actual: 'a[-ext-contains=""extra-quotes""]',
            expected: [
                { isRegular: true, value: 'a' },
                { isAbsolute: true, name: 'contains', value: '"extra-quotes"' },
            ],
        },
        {
            actual: '#test-matches-css div[-ext-matches-css="background-image: url(data:*)"]',
            expected: [
                { isRegular: true, value: '#test-matches-css div' },
                { isAbsolute: true, name: 'matches-css', value: 'background-image: url(data:*)' },
            ],
        },
        {
            actual: '#test-matches-css div[-ext-matches-css-before="content: *find me*"]',
            expected: [
                { isRegular: true, value: '#test-matches-css div' },
                { isAbsolute: true, name: 'matches-css', value: 'before,content: *find me*' },
            ],
        },
        {
            actual: '[-ext-matches-css-before=\'content:  /^[A-Z][a-z]{2}\\s/  \']',
            expected: [
                { isRegular: true, value: '*' },
                { isAbsolute: true, name: 'matches-css', value: 'before,content:  /^[A-Z][a-z]{2}\\s/  ' },
            ],
        },
        {
            // eslint-disable-next-line max-len
            actual:  'div[style="text-align: center"] > b[-ext-contains="Ads:"]+a[href^="http://example.com/test.html?id="]+br',
            expected: [
                { isRegular: true, value: 'div[style="text-align: center"] > b' },
                { isAbsolute: true, name: 'contains', value: 'Ads:' },
                { isRegular: true, value: '+a[href^="http://example.com/test.html?id="]+br' },
            ],
        },
        {
            actual: 'div[-ext-contains="test"][-ext-has="div.test-class-two"]',
            expected: [
                { isRegular: true, value: 'div' },
                { isAbsolute: true, name: 'contains', value: 'test' },
                { isRelative: true, name: 'has', value: 'div.test-class-two' },
            ],
        },
        {
            actual: 'div[i18n][-ext-contains="test"][-ext-has="div.test-class-two"]',
            expected: [
                { isRegular: true, value: 'div[i18n]' },
                { isAbsolute: true, name: 'contains', value: 'test' },
                { isRelative: true, name: 'has', value: 'div.test-class-two' },
            ],
        },
        {
            actual: 'div[-ext-has="div.test-class-two"] > .test-class[-ext-contains="test"]',
            expected: [
                { isRegular: true, value: 'div' },
                { isRelative: true, name: 'has', value: 'div.test-class-two' },
                { isRegular: true, value: '> .test-class' },
                { isAbsolute: true, name: 'contains', value: 'test' },
            ],
        },
        {
            actual: '*[-ext-contains=\'/\\s[a-t]{8}$/\'] + *:contains(/^[^\\"\\\'"]{30}quickly/)',
            expected: [
                { isRegular: true, value: '*' },
                { isAbsolute: true, name: 'contains', value: '/\\s[a-t]{8}$/' },
                { isRegular: true, value: '+ *' },
                { isAbsolute: true, name: 'contains', value: '/^[^\\"\\\'"]{30}quickly/' },
            ],
        },
    ];
    test.each(testsInputs)('%s', (input) => expectSingleSelectorAstWithAnyChildren(input));

    it('old syntax - has(> contains)', () => {
        let actual;
        let expected;

        actual = '.sidebar > h3[-ext-has="a:contains(Recommended)"]';
        expected = {
            type: NODE.SELECTOR_LIST,
            children: [
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('.sidebar > h3'),
                        {
                            type: NODE.EXTENDED_SELECTOR,
                            children: [
                                {
                                    type: NODE.RELATIVE_PSEUDO_CLASS,
                                    name: 'has',
                                    children: [
                                        getSingleSelectorAstWithAnyChildren([
                                            { isRegular: true, value: 'a' },
                                            { isAbsolute: true, name: 'contains', value: 'Recommended' },
                                        ]),
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(actual)).toEqual(expected);

        actual = '#sidebar div[class^="text-"][-ext-has=">.box-inner>h2:contains(ads)"]';
        expected = {
            type: NODE.SELECTOR_LIST,
            children: [
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('#sidebar div[class^="text-"]'),
                        {
                            type: NODE.EXTENDED_SELECTOR,
                            children: [
                                {
                                    type: NODE.RELATIVE_PSEUDO_CLASS,
                                    name: 'has',
                                    children: [
                                        getSingleSelectorAstWithAnyChildren([
                                            { isRegular: true, value: '>.box-inner>h2' },
                                            { isAbsolute: true, name: 'contains', value: 'ads' },
                                        ]),
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(actual)).toEqual(expected);
    });

    /* eslint-disable max-len */
    it('old syntax - matches-css + matches-css-before has(matches-css-after contains)', () => {
        const actual = ':matches-css(    background-image: /^url\\((.)[a-z]{4}:[a-z]{2}\\1nk\\)$/    ) + [-ext-matches-css-before=\'content:  /^[A-Z][a-z]{2}\\s/  \'][-ext-has=\'+:matches-css-after( content  :   /(\\d+\\s)*me/  ):contains(/^(?![\\s\\S])/)\']';
        const expected = {
            type: NODE.SELECTOR_LIST,
            children: [
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('*'),
                        getAbsoluteExtendedSelector('matches-css', '    background-image: /^url\\((.)[a-z]{4}:[a-z]{2}\\1nk\\)$/    '),
                        getRegularSelector('+ *'),
                        getAbsoluteExtendedSelector('matches-css', 'before,content:  /^[A-Z][a-z]{2}\\s/  '),
                        {
                            type: NODE.EXTENDED_SELECTOR,
                            children: [
                                {
                                    type: NODE.RELATIVE_PSEUDO_CLASS,
                                    name: 'has',
                                    children: [
                                        getSingleSelectorAstWithAnyChildren([
                                            { isRegular: true, value: '+*' },
                                            { isAbsolute: true, name: 'matches-css', value: 'after, content  :   /(\\d+\\s)*me/  ' },
                                            { isAbsolute: true, name: 'contains', value: '/^(?![\\s\\S])/' },
                                        ]),
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(actual)).toEqual(expected);
    });
    /* eslint-enable max-len */
});

describe('combined extended selectors', () => {
    it('has contains', () => {
        const actual = 'div:has(span):contains(something)';
        const expected = [
            { isRegular: true, value: 'div' },
            { isRelative: true, name: 'has', value: 'span' },
            { isAbsolute: true, name: 'contains', value: 'something' },
        ];
        expectSingleSelectorAstWithAnyChildren({ actual, expected });
    });

    it('has(> contains)', () => {
        const actual = 'div:has(> p:contains(test))';
        const expected = {
            type: NODE.SELECTOR_LIST,
            children: [
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('div'),
                        {
                            type: NODE.EXTENDED_SELECTOR,
                            children: [
                                {
                                    type: NODE.RELATIVE_PSEUDO_CLASS,
                                    name: 'has',
                                    children: [
                                        getSingleSelectorAstWithAnyChildren([
                                            { isRegular: true, value: '> p' },
                                            { isAbsolute: true, name: 'contains', value: 'test' },
                                        ]),
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(actual)).toEqual(expected);
    });

    it('has(contains)', () => {
        const actual = 'div:has(:contains(text))';
        const expected = {
            type: NODE.SELECTOR_LIST,
            children: [
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('div'),
                        {
                            type: NODE.EXTENDED_SELECTOR,
                            children: [
                                {
                                    type: NODE.RELATIVE_PSEUDO_CLASS,
                                    name: 'has',
                                    children: [
                                        getSingleSelectorAstWithAnyChildren([
                                            { isRegular: true, value: '*' },
                                            { isAbsolute: true, name: 'contains', value: 'text' },
                                        ]),
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(actual)).toEqual(expected);
    });

    it('has(has)', () => {
        const actual = 'div:has(.banner:has(> a > img))';
        const expected = {
            type: NODE.SELECTOR_LIST,
            children: [
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('div'),
                        {
                            type: NODE.EXTENDED_SELECTOR,
                            children: [
                                {
                                    type: NODE.RELATIVE_PSEUDO_CLASS,
                                    name: 'has',
                                    children: [
                                        {
                                            type: NODE.SELECTOR_LIST,
                                            children: [
                                                {
                                                    type: NODE.SELECTOR,
                                                    children: [
                                                        getRegularSelector('.banner'),
                                                        getRelativeExtendedWithSingleRegular('has', '> a > img'),
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(actual)).toEqual(expected);
    });

    it('has(has(contains))', () => {
        const actual = 'div:has(.banner:has(> span:contains(inner text)))';
        const expected = {
            type: NODE.SELECTOR_LIST,
            children: [
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('div'),
                        {
                            type: NODE.EXTENDED_SELECTOR,
                            children: [
                                {
                                    type: NODE.RELATIVE_PSEUDO_CLASS,
                                    name: 'has',
                                    children: [
                                        {
                                            type: NODE.SELECTOR_LIST,
                                            children: [
                                                {
                                                    type: NODE.SELECTOR,
                                                    children: [
                                                        getRegularSelector('.banner'),
                                                        {
                                                            type: NODE.EXTENDED_SELECTOR,
                                                            children: [
                                                                {
                                                                    type: NODE.RELATIVE_PSEUDO_CLASS,
                                                                    name: 'has',
                                                                    children: [
                                                                        getSingleSelectorAstWithAnyChildren([
                                                                            { isRegular: true, value: '> span' },
                                                                            // eslint-disable-next-line max-len
                                                                            { isAbsolute: true, name: 'contains', value: 'inner text' },
                                                                        ]),
                                                                    ],
                                                                },
                                                            ],
                                                        },
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(actual)).toEqual(expected);
    });

    // for non-extended arg :is() pseudo-class is parsed as standard
    it('is(selector list) contains', () => {
        const actual = '#__next > :is(.header, .footer):contains(ads)';
        const expected = {
            type: NODE.SELECTOR_LIST,
            children: [
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('#__next > *:is(.header, .footer)'),
                        getAbsoluteExtendedSelector('contains', 'ads'),
                    ],
                },
            ],
        };
        expect(parse(actual)).toEqual(expected);
    });

    // for non-extended arg :is() pseudo-class is parsed as standard
    it('is(not)', () => {
        const actual = '#main > :is(div:not([class]))';
        const expected = {
            type: NODE.SELECTOR_LIST,
            children: [
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('#main > *:is(div:not([class]))'),
                    ],
                },
            ],
        };
        expect(parse(actual)).toEqual(expected);
    });

    it('is(has)', () => {
        const actual = '#__next > :is(.banner:has(> img))';
        const expected = {
            type: NODE.SELECTOR_LIST,
            children: [
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('#__next > *'),
                        {
                            type: NODE.EXTENDED_SELECTOR,
                            children: [
                                {
                                    type: NODE.RELATIVE_PSEUDO_CLASS,
                                    name: 'is',
                                    children: [
                                        {
                                            type: NODE.SELECTOR_LIST,
                                            children: [
                                                {
                                                    type: NODE.SELECTOR,
                                                    children: [
                                                        getRegularSelector('.banner'),
                                                        getRelativeExtendedWithSingleRegular('has', '> img'),
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(actual)).toEqual(expected);
    });

    it('is(has, has)', () => {
        const actual = '#__next > li:is(:has(> img), :has(> span > img))';
        const expected = {
            type: NODE.SELECTOR_LIST,
            children: [
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('#__next > li'),
                        {
                            type: NODE.EXTENDED_SELECTOR,
                            children: [
                                {
                                    type: NODE.RELATIVE_PSEUDO_CLASS,
                                    name: 'is',
                                    children: [
                                        {
                                            type: NODE.SELECTOR_LIST,
                                            children: [
                                                {
                                                    type: NODE.SELECTOR,
                                                    children: [
                                                        getRegularSelector('*'),
                                                        getRelativeExtendedWithSingleRegular('has', '> img'),
                                                    ],
                                                },
                                                {
                                                    type: NODE.SELECTOR,
                                                    children: [
                                                        getRegularSelector('*'),
                                                        getRelativeExtendedWithSingleRegular('has', '> span > img'),
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(actual)).toEqual(expected);
    });

    it('is(has, contains)', () => {
        const actual = '#__next > :is(.banner:has(> img), .block:contains(Share))';
        const expected = {
            type: NODE.SELECTOR_LIST,
            children: [
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('#__next > *'),
                        {
                            type: NODE.EXTENDED_SELECTOR,
                            children: [
                                {
                                    type: NODE.RELATIVE_PSEUDO_CLASS,
                                    name: 'is',
                                    children: [
                                        {
                                            type: NODE.SELECTOR_LIST,
                                            children: [
                                                {
                                                    type: NODE.SELECTOR,
                                                    children: [
                                                        getRegularSelector('.banner'),
                                                        getRelativeExtendedWithSingleRegular('has', '> img'),
                                                    ],
                                                },
                                                {
                                                    type: NODE.SELECTOR,
                                                    children: [
                                                        getRegularSelector('.block'),
                                                        getAbsoluteExtendedSelector('contains', 'Share'),
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(actual)).toEqual(expected);
    });

    it('selector list with extra space - has , regular selector', () => {
        const actual = '.block:has(> img) , .banner)';
        const expected = {
            type: NODE.SELECTOR_LIST,
            children: [
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('.block'),
                        getRelativeExtendedWithSingleRegular('has', '> img'),
                    ],
                },
                getSelectorAsRegular('.banner'),
            ],
        };
        expect(parse(actual)).toEqual(expected);
    });

    it('has(matches-css-before)', () => {
        // eslint-disable-next-line max-len
        const actual = 'body.zen .zen-lib div.feed__item:has(> div > div > div[class*="__label"] > span:matches-css-before(content:*ADS))';
        const expected = {
            type: NODE.SELECTOR_LIST,
            children: [
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('body.zen .zen-lib div.feed__item'),
                        {
                            type: NODE.EXTENDED_SELECTOR,
                            children: [
                                {
                                    type: NODE.RELATIVE_PSEUDO_CLASS,
                                    name: 'has',
                                    children: [
                                        getSingleSelectorAstWithAnyChildren([
                                            { isRegular: true, value: '> div > div > div[class*="__label"] > span' },
                                            // eslint-disable-next-line max-len
                                            { isAbsolute: true, name: 'matches-css', value: 'before,content:*ADS' },
                                        ],
                                        )],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(actual)).toEqual(expected);
    });

    it('extended upward and single not as standard', () => {
        const actual = 'div[style="width:640px;height:360px"][id="video-player"]:upward(div):not([class])';
        const expected = [
            { isRegular: true, value: 'div[style="width:640px;height:360px"][id="video-player"]:not([class])' },
            { isAbsolute: true, name: 'upward', value: 'div' },
        ];
        expectSingleSelectorAstWithAnyChildren({ actual, expected });
    });

    it('not upward', () => {
        const actual = 'a[href^="mailto:"]:not(:upward(footer))';
        const expected = {
            type: NODE.SELECTOR_LIST,
            children: [
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('a[href^="mailto:"]'),
                        {
                            type: NODE.EXTENDED_SELECTOR,
                            children: [
                                {
                                    type: NODE.RELATIVE_PSEUDO_CLASS,
                                    name: 'not',
                                    children: [
                                        getSingleSelectorAstWithAnyChildren([
                                            { isRegular: true, value: '*' },
                                            { isAbsolute: true, name: 'upward', value: 'footer' },
                                        ]),
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(actual)).toEqual(expected);
    });

    it('not(not) - as standard', () => {
        const actual = '#main > *:not(:not(div))';
        const expected = {
            type: NODE.SELECTOR_LIST,
            children: [
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('#main > *:not(*:not(div))'),
                    ],
                },
            ],
        };
        expect(parse(actual)).toEqual(expected);
    });

    it('extended upward + and few standard not', () => {
        const actual = 'a[href^="https://example."]:upward(1):not(section):not(div[class^="article"])';
        const expected = [
            { isRegular: true, value: 'a[href^="https://example."]:not(section):not(div[class^="article"])' },
            { isAbsolute: true, name: 'upward', value: '1' },
        ];
        expectSingleSelectorAstWithAnyChildren({ actual, expected });
    });

    it('upward(not)', () => {
        const actual = '.SocialMediaShareButton:upward(div:not([class]))';
        const expected = [
            { isRegular: true, value: '.SocialMediaShareButton' },
            { isAbsolute: true, name: 'upward', value: 'div:not([class])' },
        ];
        expectSingleSelectorAstWithAnyChildren({ actual, expected });
    });

    it('contains upward', () => {
        const actual = 'div > p:contains(PR):upward(2)';
        const expected = [
            { isRegular: true, value: 'div > p' },
            { isAbsolute: true, name: 'contains', value: 'PR' },
            { isAbsolute: true, name: 'upward', value: '2' },
        ];
        expectSingleSelectorAstWithAnyChildren({ actual, expected });
    });

    it('upward matches-css', () => {
        const actual = '[data-ad-subtype]:upward(1):matches-css(min-height:/[0-9]+/)';
        const expected = [
            { isRegular: true, value: '[data-ad-subtype]' },
            { isAbsolute: true, name: 'upward', value: '1' },
            { isAbsolute: true, name: 'matches-css', value: 'min-height:/[0-9]+/' },
        ];
        expectSingleSelectorAstWithAnyChildren({ actual, expected });
    });

    it('has(not)', () => {
        const selector = 'div:has(:not(span))';
        const expected = {
            type: NODE.SELECTOR_LIST,
            children: [
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('div'),
                        {
                            type: NODE.EXTENDED_SELECTOR,
                            children: [
                                {
                                    type: NODE.RELATIVE_PSEUDO_CLASS,
                                    name: 'has',
                                    children: [
                                        getSingleSelectorAstWithAnyChildren([
                                            { isRegular: true, value: '*:not(span)' },
                                        ]),
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);
    });

    it('not(contains)', () => {
        const selector = 'p:not(:contains(text))';
        const expected = {
            type: NODE.SELECTOR_LIST,
            children: [
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('p'),
                        {
                            type: NODE.EXTENDED_SELECTOR,
                            children: [
                                {
                                    type: NODE.RELATIVE_PSEUDO_CLASS,
                                    name: 'not',
                                    children: [
                                        getSingleSelectorAstWithAnyChildren([
                                            { isRegular: true, value: '*' },
                                            { isAbsolute: true, name: 'contains', value: 'text' },
                                        ]),
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);
    });

    it('not(has)', () => {
        const selector = 'div:not(:has(span))';
        const expected = {
            type: NODE.SELECTOR_LIST,
            children: [
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('div'),
                        {
                            type: NODE.EXTENDED_SELECTOR,
                            children: [
                                {
                                    type: NODE.RELATIVE_PSEUDO_CLASS,
                                    name: 'not',
                                    children: [
                                        getSingleSelectorAstWithAnyChildren([
                                            { isRegular: true, value: '*' },
                                            { isRelative: true, name: 'has', value: 'span' },
                                        ]),
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);
    });

    it('not(has(not))', () => {
        // first :not is extended pseudo-class
        // but :not() inside :has() should be parsed as standard
        const actual = 'div:not(:has(:not(img)))';
        const expected = {
            type: NODE.SELECTOR_LIST,
            children: [
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('div'),
                        {
                            type: NODE.EXTENDED_SELECTOR,
                            children: [
                                {
                                    type: NODE.RELATIVE_PSEUDO_CLASS,
                                    name: 'not',
                                    children: [
                                        {
                                            type: NODE.SELECTOR_LIST,
                                            children: [
                                                {
                                                    type: NODE.SELECTOR,
                                                    children: [
                                                        getRegularSelector('*'),
                                                        {
                                                            type: NODE.EXTENDED_SELECTOR,
                                                            children: [
                                                                {
                                                                    type: NODE.RELATIVE_PSEUDO_CLASS,
                                                                    name: 'has',
                                                                    children: [
                                                                        getSingleSelectorAstWithAnyChildren([
                                                                            { isRegular: true, value: '*:not(img)' },
                                                                        ]),
                                                                    ],
                                                                },
                                                            ],
                                                        },
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(actual)).toEqual(expected);
    });
});

describe('combined selectors', () => {
    describe('complex selector with extended pseudo-class inside', () => {
        const testsInputs = [
            {
                actual: 'div:upward(3).banner',
                expected: [
                    { isRegular: true, value: 'div.banner' },
                    { isAbsolute: true, name: 'upward', value: '3' },
                ],
            },
            {
                actual: '.test:upward(3).banner',
                expected: [
                    { isRegular: true, value: '.test.banner' },
                    { isAbsolute: true, name: 'upward', value: '3' },
                ],
            },
            {
                actual: '.test:upward(3)#id',
                expected: [
                    { isRegular: true, value: '.test#id' },
                    { isAbsolute: true, name: 'upward', value: '3' },
                ],
            },
            {
                actual: '.test:upward(3)[attr]',
                expected: [
                    { isRegular: true, value: '.test[attr]' },
                    { isAbsolute: true, name: 'upward', value: '3' },
                ],
            },
            {
                actual: 'div:upward(3).class#id[attr]',
                expected: [
                    { isRegular: true, value: 'div.class#id[attr]' },
                    { isAbsolute: true, name: 'upward', value: '3' },
                ],
            },
            {
                actual: '.banner:has(img).inner',
                expected: [
                    { isRegular: true, value: '.banner.inner' },
                    { isRelative: true, name: 'has', value: 'img' },
                ],
            },
            {
                actual: 'div:has(.test).class#id[attr]',
                expected: [
                    { isRegular: true, value: 'div.class#id[attr]' },
                    { isRelative: true, name: 'has', value: '.test' },
                ],
            },
            {
                actual: 'div[attr].class:has(.inner)#id',
                expected: [
                    { isRegular: true, value: 'div[attr].class#id' },
                    { isRelative: true, name: 'has', value: '.inner' },
                ],
            },
            {
                actual: '.test:upward(3).banner:matches-css(z-index: 10)',
                expected: [
                    { isRegular: true, value: '.test.banner' },
                    { isAbsolute: true, name: 'upward', value: '3' },
                    { isAbsolute: true, name: 'matches-css', value: 'z-index: 10' },
                ],
            },
            {
                actual: '.test:upward(3).banner:matches-css(z-index: 10)[attr=true]',
                expected: [
                    { isRegular: true, value: '.test.banner[attr=true]' },
                    { isAbsolute: true, name: 'upward', value: '3' },
                    { isAbsolute: true, name: 'matches-css', value: 'z-index: 10' },
                ],
            },
            {
                actual: '.test:upward(#top > .block)[attr]',
                expected: [
                    { isRegular: true, value: '.test[attr]' },
                    { isAbsolute: true, name: 'upward', value: '#top > .block' },
                ],
            },
            {
                actual: 'div:contains(/а/):nth-child(100n + 2)',
                expected: [
                    { isRegular: true, value: 'div:nth-child(100n + 2)' },
                    { isAbsolute: true, name: 'contains', value: '/а/' },
                ],
            },
            {
                actual: 'body > div:not([id])[style="position: absolute; z-index: 10000;"]',
                expected: [
                    // :not() without extended selector in arg is considered as standard.
                    // the order of compound selector parts differ from input selector due to ast optimization
                    { isRegular: true, value: 'body > div[style="position: absolute; z-index: 10000;"]:not([id])' },
                ],
            },
        ];
        test.each(testsInputs)('$actual', (input) => expectSingleSelectorAstWithAnyChildren(input));
    });

    describe('selectors with standard pseudos', () => {
        // :not() is parsed as standard pseudo-class if there is no extended selector in arg
        it(':not::selection', () => {
            const actual = '*:not(input)::selection';
            const expected = [
                { isRegular: true, value: '*::selection:not(input)' },
            ];
            expectSingleSelectorAstWithAnyChildren({ actual, expected });
        });

        it(':not():not()::selection', () => {
            const actual = 'html > body *:not(input):not(textarea)::selection';
            const expected = [
                { isRegular: true, value: 'html > body *::selection:not(input):not(textarea)' },
            ];
            expectSingleSelectorAstWithAnyChildren({ actual, expected });
        });

        it(':matches-css():checked', () => {
            const actual = 'input:matches-css(padding: 10):checked';
            const expected = [
                { isRegular: true, value: 'input:checked' },
                { isAbsolute: true, name: 'matches-css', value: 'padding: 10' },
            ];
            expectSingleSelectorAstWithAnyChildren({ actual, expected });
        });

        it(':not():has(:only-child)', () => {
            // eslint-disable-next-line max-len
            const actual = '#snippet-list-posts > .item:not([id]):has(> .box-responsive:only-child > div[id]:only-child)';
            const expected = [
                { isRegular: true, value: '#snippet-list-posts > .item:not([id])' },
                { isRelative: true, name: 'has', value: '> .box-responsive:only-child > div[id]:only-child' },
            ];
            expectSingleSelectorAstWithAnyChildren({ actual, expected });
        });

        it(':last-child:has()', () => {
            const actual = '#__next > div:last-child:has(button.privacy-policy__btn)';
            const expected = [
                { isRegular: true, value: '#__next > div:last-child' },
                { isRelative: true, name: 'has', value: 'button.privacy-policy__btn' },
            ];
            expectSingleSelectorAstWithAnyChildren({ actual, expected });
        });

        it(':nth-child():has()', () => {
            const actual = '.entry_text:nth-child(2):has(> #ninja-blog-inactive)';
            const expected = [
                { isRegular: true, value: '.entry_text:nth-child(2)' },
                { isRelative: true, name: 'has', value: '> #ninja-blog-inactive' },
            ];
            expectSingleSelectorAstWithAnyChildren({ actual, expected });
        });
    });

    it('selector list with regular "any" and extended :contains', () => {
        const actual = '.banner, :contains(#ad)';
        const expected = {
            type: NODE.SELECTOR_LIST,
            children: [
                getSelectorAsRegular('.banner'),
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('*'),
                        getAbsoluteExtendedSelector('contains', '#ad'),
                    ],
                },
            ],
        };
        expect(parse(actual)).toEqual(expected);
    });

    it('has(+*:matches-css-after)', () => {
        const actual = ':has(+:matches-css-after( content  :   /(\\d+\\s)*me/  ))';
        const expected = {
            type: NODE.SELECTOR_LIST,
            children: [
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('*'),
                        {
                            type: NODE.EXTENDED_SELECTOR,
                            children: [
                                {
                                    type: NODE.RELATIVE_PSEUDO_CLASS,
                                    name: 'has',
                                    children: [
                                        getSingleSelectorAstWithAnyChildren([
                                            { isRegular: true, value: '+*' },
                                            // eslint-disable-next-line max-len
                                            { isAbsolute: true, name: 'matches-css', value: 'after, content  :   /(\\d+\\s)*me/  ' },
                                        ]),
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(actual)).toEqual(expected);
    });

    it('has with selector list - regular and extended', () => {
        const actual = 'div:has(.banner, :contains(!))';
        const expected = {
            type: NODE.SELECTOR_LIST,
            children: [
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('div'),
                        {
                            type: NODE.EXTENDED_SELECTOR,
                            children: [
                                {
                                    type: NODE.RELATIVE_PSEUDO_CLASS,
                                    name: 'has',
                                    children: [
                                        {
                                            type: NODE.SELECTOR_LIST,
                                            children: [
                                                getSelectorAsRegular('.banner'),
                                                {
                                                    type: NODE.SELECTOR,
                                                    children: [
                                                        getRegularSelector('*'),
                                                        getAbsoluteExtendedSelector('contains', '!'),
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(actual)).toEqual(expected);
    });

    it('not has with selector list - regular and extended', () => {
        const actual = 'a[class]:not(:has(*, :contains(*)))';
        const expected = {
            type: NODE.SELECTOR_LIST,
            children: [
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('a[class]'),
                        {
                            type: NODE.EXTENDED_SELECTOR,
                            children: [
                                {
                                    type: NODE.RELATIVE_PSEUDO_CLASS,
                                    name: 'not',
                                    children: [
                                        {
                                            type: NODE.SELECTOR_LIST,
                                            children: [
                                                {
                                                    type: NODE.SELECTOR,
                                                    children: [
                                                        getRegularSelector('*'),
                                                        {
                                                            type: NODE.EXTENDED_SELECTOR,
                                                            children: [
                                                                {
                                                                    type: NODE.RELATIVE_PSEUDO_CLASS,
                                                                    name: 'has',
                                                                    children: [
                                                                        {
                                                                            type: NODE.SELECTOR_LIST,
                                                                            children: [
                                                                                getSelectorAsRegular('*'),
                                                                                {
                                                                                    type: NODE.SELECTOR,
                                                                                    children: [
                                                                                        getRegularSelector('*'),
                                                                                        getAbsoluteExtendedSelector('contains', '*'), // eslint-disable-line max-len
                                                                                    ],
                                                                                },
                                                                            ],
                                                                        },
                                                                    ],
                                                                },
                                                            ],
                                                        },
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(actual)).toEqual(expected);
    });

    it('selector list with combined-extended and simple-extended selectors', () => {
        const selector = 'div:has(.banner, :contains(!)), p:contains(text)';
        const expected = {
            type: NODE.SELECTOR_LIST,
            children: [
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('div'),
                        {
                            type: NODE.EXTENDED_SELECTOR,
                            children: [
                                {
                                    type: NODE.RELATIVE_PSEUDO_CLASS,
                                    name: 'has',
                                    children: [
                                        {
                                            type: NODE.SELECTOR_LIST,
                                            children: [
                                                getSelectorAsRegular('.banner'),
                                                {
                                                    type: NODE.SELECTOR,
                                                    children: [
                                                        getRegularSelector('*'),
                                                        getAbsoluteExtendedSelector('contains', '!'),
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('p'),
                        getAbsoluteExtendedSelector('contains', 'text'),
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);
    });

    it('super stressor', () => {
        // eslint-disable-next-line max-len
        const selector = 'a[class*=blog]:not(:has(*, :contains(!)), :contains(!)), br:contains(]), p:contains(]), :not(:empty):not(:parent)';
        const expected = {
            type: NODE.SELECTOR_LIST,
            children: [
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('a[class*=blog]'),
                        {
                            type: NODE.EXTENDED_SELECTOR,
                            children: [
                                {
                                    type: NODE.RELATIVE_PSEUDO_CLASS,
                                    name: 'not',
                                    children: [
                                        {
                                            type: NODE.SELECTOR_LIST,
                                            children: [
                                                {
                                                    type: NODE.SELECTOR,
                                                    children: [
                                                        getRegularSelector('*'),
                                                        {
                                                            type: NODE.EXTENDED_SELECTOR,
                                                            children: [
                                                                {
                                                                    type: NODE.RELATIVE_PSEUDO_CLASS,
                                                                    name: 'has',
                                                                    children: [
                                                                        {
                                                                            type: NODE.SELECTOR_LIST,
                                                                            children: [
                                                                                getSelectorAsRegular('*'),
                                                                                {
                                                                                    type: NODE.SELECTOR,
                                                                                    children: [
                                                                                        getRegularSelector('*'),
                                                                                        getAbsoluteExtendedSelector('contains', '!'), // eslint-disable-line max-len
                                                                                    ],
                                                                                },
                                                                            ],
                                                                        },
                                                                    ],
                                                                },
                                                            ],
                                                        },
                                                    ],
                                                },
                                                {
                                                    type: NODE.SELECTOR,
                                                    children: [
                                                        getRegularSelector('*'),
                                                        getAbsoluteExtendedSelector('contains', '!'),
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('br'),
                        getAbsoluteExtendedSelector('contains', ']'),
                    ],
                },
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('p'),
                        getAbsoluteExtendedSelector('contains', ']'),
                    ],
                },
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('*:not(*:empty):not(*:parent)'),
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);
    });

    describe('has pseudo-class limitation', () => {
        const toThrowInputs = [
            // no :has inside regular pseudos
            {
                selector: '::slotted(:has(.a))',
                error: 'Usage of :has() pseudo-class is not allowed inside regular pseudo',
            },
            // no :has after pseudo-elements
            {
                selector: '::part(foo):has(.a)',
                error: 'Usage of :has() pseudo-class is not allowed after any regular pseudo-element',
            },
        ];
        test.each(toThrowInputs)('%s', (input) => expectToThrowInput(input));
    });

    describe('not and is pseudo-classes limitation', () => {
        // :not() as extended for any selector should be limited to children of the root dom element
        // except the root element
        it('* not(has)', () => {
            const selector = '*:not(:has(span))';
            const expected = {
                type: NODE.SELECTOR_LIST,
                children: [
                    {
                        type: NODE.SELECTOR,
                        children: [
                            getRegularSelector('html *'),
                            {
                                type: NODE.EXTENDED_SELECTOR,
                                children: [
                                    {
                                        type: NODE.RELATIVE_PSEUDO_CLASS,
                                        name: 'not',
                                        children: [
                                            getSingleSelectorAstWithAnyChildren([
                                                { isRegular: true, value: '*' },
                                                { isRelative: true, name: 'has', value: 'span' },
                                            ]),
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            };
            expect(parse(selector)).toEqual(expected);
        });

        it('* is(has, contains)', () => {
            const selector = '*:is(:has(span), :contains(text))';
            const expected = {
                type: NODE.SELECTOR_LIST,
                children: [
                    {
                        type: NODE.SELECTOR,
                        children: [
                            getRegularSelector('html *'),
                            {
                                type: NODE.EXTENDED_SELECTOR,
                                children: [
                                    {
                                        type: NODE.RELATIVE_PSEUDO_CLASS,
                                        name: 'is',
                                        children: [
                                            {
                                                type: NODE.SELECTOR_LIST,
                                                children: [
                                                    {
                                                        type: NODE.SELECTOR,
                                                        children: [
                                                            getRegularSelector('*'),
                                                            getRelativeExtendedWithSingleRegular('has', 'span'),
                                                        ],
                                                    },
                                                    {
                                                        type: NODE.SELECTOR,
                                                        children: [
                                                            getRegularSelector('*'),
                                                            getAbsoluteExtendedSelector('contains', 'text'),
                                                        ],
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            };
            expect(parse(selector)).toEqual(expected);
        });

        // `*` should not be changed to `html *` for pseudo-classes other than :not() and :is()
        it('* has(has)', () => {
            const selector = '*:has(:has(span))';
            const expected = {
                type: NODE.SELECTOR_LIST,
                children: [
                    {
                        type: NODE.SELECTOR,
                        children: [
                            getRegularSelector('*'),
                            {
                                type: NODE.EXTENDED_SELECTOR,
                                children: [
                                    {
                                        type: NODE.RELATIVE_PSEUDO_CLASS,
                                        name: 'has',
                                        children: [
                                            getSingleSelectorAstWithAnyChildren([
                                                { isRegular: true, value: '*' },
                                                { isRelative: true, name: 'has', value: 'span' },
                                            ]),
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            };
            expect(parse(selector)).toEqual(expected);
        });
    });

    describe('regular selector AFTER extended absolute selector', () => {
        const testsInputs = [
            {
                actual: '.test:upward(3) .banner',
                expected: [
                    { isRegular: true, value: '.test' },
                    { isAbsolute: true, name: 'upward', value: '3' },
                    { isRegular: true, value: '.banner' },
                ],
            },
            {
                actual: '.test:nth-ancestor(1) > .banner',
                expected: [
                    { isRegular: true, value: '.test' },
                    { isAbsolute: true, name: 'nth-ancestor', value: '1' },
                    { isRegular: true, value: '> .banner' },
                ],
            },
            {
                actual: '.test:upward(3) > .banner > *',
                expected: [
                    { isRegular: true, value: '.test' },
                    { isAbsolute: true, name: 'upward', value: '3' },
                    { isRegular: true, value: '> .banner > *' },
                ],
            },
            {
                actual: '.test:upward(#top .block) .banner',
                expected: [
                    { isRegular: true, value: '.test' },
                    { isAbsolute: true, name: 'upward', value: '#top .block' },
                    { isRegular: true, value: '.banner' },
                ],
            },
            {
                actual: '.test:upward(#top > .block) .banner',
                expected: [
                    { isRegular: true, value: '.test' },
                    { isAbsolute: true, name: 'upward', value: '#top > .block' },
                    { isRegular: true, value: '.banner' },
                ],
            },
            {
                actual: '.test:nth-ancestor(1)> .banner',
                expected: [
                    { isRegular: true, value: '.test' },
                    { isAbsolute: true, name: 'nth-ancestor', value: '1' },
                    { isRegular: true, value: '> .banner' },
                ],
            },
            {
                actual: '#main .target:nth-ancestor(2)+ .banner',
                expected: [
                    { isRegular: true, value: '#main .target' },
                    { isAbsolute: true, name: 'nth-ancestor', value: '2' },
                    { isRegular: true, value: '+ .banner' },
                ],
            },
            {
                actual: 'p:-abp-contains(=== Ads / Sponsored ===) + p',
                expected: [
                    { isRegular: true, value: 'p' },
                    { isAbsolute: true, name: '-abp-contains', value: '=== Ads / Sponsored ===' },
                    { isRegular: true, value: '+ p' },
                ],
            },
            {
                actual: 'p:-abp-contains(=== Ads / Sponsored ===) + p + p',
                expected: [
                    { isRegular: true, value: 'p' },
                    { isAbsolute: true, name: '-abp-contains', value: '=== Ads / Sponsored ===' },
                    { isRegular: true, value: '+ p + p' },
                ],
            },
        ];
        test.each(testsInputs)('%s', (input) => expectSingleSelectorAstWithAnyChildren(input));
    });

    describe('regular selector AFTER extended relative selector', () => {
        const testsInputs = [
            {
                actual: '.banner:has(img) .inner',
                expected: [
                    { isRegular: true, value: '.banner' },
                    { isRelative: true, name: 'has', value: 'img' },
                    { isRegular: true, value: '.inner' },
                ],
            },
            {
                actual: 'html:has(> body) > body.no_scroll',
                expected: [
                    { isRegular: true, value: 'html' },
                    { isRelative: true, name: 'has', value: '> body' },
                    { isRegular: true, value: '> body.no_scroll' },
                ],
            },
            {
                actual: 'div:has(> #banner)> .inner',
                expected: [
                    { isRegular: true, value: 'div' },
                    { isRelative: true, name: 'has', value: '> #banner' },
                    { isRegular: true, value: '> .inner' },
                ],
            },
            // :not() is parsed as standard pseudo-class if there is no extended selector in arg
            {
                actual: '.header > header + [id*="-"]:not([class]) > a[href*="adblock"]',
                expected: [
                    { isRegular: true, value: '.header > header + [id*="-"]:not([class]) > a[href*="adblock"]' },
                ],
            },
            {
                actual: ':not([class^="Navigation__subscribe"]) > div[data-cm-unit="show-failsafe"]',
                expected: [
                    // eslint-disable-next-line max-len
                    { isRegular: true, value: '*:not([class^="Navigation__subscribe"]) > div[data-cm-unit="show-failsafe"]' },
                ],
            },
            {
                actual: 'td[align="left"]:not([width]) > a > img',
                expected: [
                    { isRegular: true, value: 'td[align="left"]:not([width]) > a > img' },
                ],
            },
            {
                actual: 'td[align="left"]:not([width])+ a > img',
                expected: [
                    { isRegular: true, value: 'td[align="left"]:not([width]) + a > img' },
                ],
            },
            {
                actual: 'div:not(.clear) > a[href="javascript:void(0)"]',
                expected: [
                    { isRegular: true, value: 'div:not(.clear) > a[href="javascript:void(0)"]' },
                ],
            },
        ];
        test.each(testsInputs)('$actual', (input) => expectSingleSelectorAstWithAnyChildren(input));
    });

    describe('combined after combined with any combinator between', () => {
        const testsInputs = [
            // :not() can be parsed as standard selector
            /* eslint-disable max-len */
            {
                actual: 'body > script + div:empty:not([class]):not([id]) ~ div:empty:not([class]):not([id]) + div:empty:not([class]):not([id]) + [id]:not([class])',
                expected: [
                    { isRegular: true, value: 'body > script + div:empty:not([class]):not([id]) ~ div:empty:not([class]):not([id]) + div:empty:not([class]):not([id]) + [id]:not([class])' },
                ],
            },
            {
                actual: 'article>div[id]:not([class])~div[class]:not([id])',
                expected: [
                    { isRegular: true, value: 'article>div[id]:not([class]) ~div[class]:not([id])' },
                ],
            },
            {
                actual: 'body > div[id="root"] ~ script +div:not([class]):not([id]) > div[class*=" "]',
                expected: [
                    { isRegular: true, value: 'body > div[id="root"] ~ script +div:not([class]):not([id]) > div[class*=" "]' },
                ],
            },
            {
                actual: '#peek > div:not([class]):not([id]) > div[data-root][style*="position: fixed; bottom: 0px; z-index: 1000; display: flex; min-width: 50%; margin: 8px;"]:not([class]):not([id])',
                expected: [
                    { isRegular: true, value: '#peek > div:not([class]):not([id]) > div[data-root][style*="position: fixed; bottom: 0px; z-index: 1000; display: flex; min-width: 50%; margin: 8px;"]:not([class]):not([id])' },
                ],
            },
            {
                actual: 'div:contains(base) + .paragraph:contains(text)',
                expected: [
                    { isRegular: true, value: 'div' },
                    { isAbsolute: true, name: 'contains', value: 'base' },
                    { isRegular: true, value: '+ .paragraph' },
                    { isAbsolute: true, name: 'contains', value: 'text' },
                ],
            },
            {
                actual: '#root > div:not([class]) > div:contains(PRIVACY)',
                expected: [
                    { isRegular: true, value: '#root > div:not([class]) > div' },
                    { isAbsolute: true, name: 'contains', value: 'PRIVACY' },
                ],
            },
            {
                actual: '#app > div[class]:matches-attr("/data-v-/") > div > div:has(> a[href="https://example.com"])',
                expected: [
                    { isRegular: true, value: '#app > div[class]' },
                    { isAbsolute: true, name: 'matches-attr', value: '"/data-v-/"' },
                    { isRegular: true, value: '> div > div' },
                    { isRelative: true, name: 'has', value: '> a[href="https://example.com"]' },
                ],
            },
            {
                actual: 'tr[data-id]:not([class]):not([id]) > td[class] > div[class*=" "]:has(> div[class*=" "] > iframe[src^="https://example.org/"])',
                expected: [
                    { isRegular: true, value: 'tr[data-id]:not([class]):not([id]) > td[class] > div[class*=" "]' },
                    { isRelative: true, name: 'has', value: '> div[class*=" "] > iframe[src^="https://example.org/"]' },
                ],
            },
            {
                actual: 'div:not([style^="min-height:"]) > div[id][data-id^="toolkit-"]:not([data-bem]):not([data-m]):has(a[href^="https://example."]>img)',
                expected: [
                    { isRegular: true, value: 'div:not([style^="min-height:"]) > div[id][data-id^="toolkit-"]:not([data-bem]):not([data-m])' },
                    { isRelative: true, name: 'has', value: 'a[href^="https://example."]>img' },
                ],
            },
            {
                actual: '#root > div:not([class])> div[class] > div[class] > span[class] + a[href="https://example.org/test"]:upward(2)',
                expected: [
                    { isRegular: true, value: '#root > div:not([class]) > div[class] > div[class] > span[class] + a[href="https://example.org/test"]' },
                    { isAbsolute: true, name: 'upward', value: '2' },
                ],
            },
            {
                actual: '#content-container > div[class] > div[class]:matches-css(z-index: 10) > div[class] > div[class] > h4:contains(cookies):upward(4)',
                expected: [
                    { isRegular: true, value: '#content-container > div[class] > div[class]' },
                    { isAbsolute: true, name: 'matches-css', value: 'z-index: 10' },
                    { isRegular: true, value: '> div[class] > div[class] > h4' },
                    { isAbsolute: true, name: 'contains', value: 'cookies' },
                    { isAbsolute: true, name: 'upward', value: '4' },
                ],
            },
            {
                actual: '.content > .block.rel ~ div[class*=" "]:not(.clear) > a[href="javascript:void(0)"]:only-child:contains(/^Open app$/):upward(1)',
                expected: [
                    { isRegular: true, value: '.content > .block.rel ~ div[class*=" "]:not(.clear) > a[href="javascript:void(0)"]:only-child' },
                    { isAbsolute: true, name: 'contains', value: '/^Open app$/' },
                    { isAbsolute: true, name: 'upward', value: '1' },
                ],
            },
            /* eslint-enable max-len */
            // complex selectors with extended pseudo-class inside as part before combinator
            {
                actual: 'div:upward(3).banner .inner',
                expected: [
                    { isRegular: true, value: 'div.banner' },
                    { isAbsolute: true, name: 'upward', value: '3' },
                    { isRegular: true, value: '.inner' },
                ],
            },
            {
                actual: 'div:has(img).banner > .text-ad',
                expected: [
                    { isRegular: true, value: 'div.banner' },
                    { isRelative: true, name: 'has', value: 'img' },
                    { isRegular: true, value: '> .text-ad' },
                ],
            },
            {
                actual: 'div:has(> img).banner > .text-ad',
                expected: [
                    { isRegular: true, value: 'div.banner' },
                    { isRelative: true, name: 'has', value: '> img' },
                    { isRegular: true, value: '> .text-ad' },
                ],
            },
            {
                actual: '.test:has(> img).banner[attr=true] > .text-ad',
                expected: [
                    { isRegular: true, value: '.test.banner[attr=true]' },
                    { isRelative: true, name: 'has', value: '> img' },
                    { isRegular: true, value: '> .text-ad' },
                ],
            },
            {
                actual: '.test:has(> img).banner[attr=true] ~ .text-ad:matches-css(z-index: 10)',
                expected: [
                    { isRegular: true, value: '.test.banner[attr=true]' },
                    { isRelative: true, name: 'has', value: '> img' },
                    { isRegular: true, value: '~ .text-ad' },
                    { isAbsolute: true, name: 'matches-css', value: 'z-index: 10' },
                ],
            },
            {
                actual: '.test:upward(#top > .block)[attr] .banner',
                expected: [
                    { isRegular: true, value: '.test[attr]' },
                    { isAbsolute: true, name: 'upward', value: '#top > .block' },
                    { isRegular: true, value: '.banner' },
                ],
            },
            {
                actual: '.test:upward(#top > .block)[attr] > div:upward(2).banner',
                expected: [
                    { isRegular: true, value: '.test[attr]' },
                    { isAbsolute: true, name: 'upward', value: '#top > .block' },
                    { isRegular: true, value: '> div.banner' },
                    { isAbsolute: true, name: 'upward', value: '2' },
                ],
            },
        ];
        test.each(testsInputs)('$actual', (input) => expectSingleSelectorAstWithAnyChildren(input));

        it('has(has) + has', () => {
            const actual = 'div:has(> .banner:has(> a > img)) + .ad:has(> img)';
            const expected = {
                type: NODE.SELECTOR_LIST,
                children: [
                    {
                        type: NODE.SELECTOR,
                        children: [
                            getRegularSelector('div'),
                            {
                                type: NODE.EXTENDED_SELECTOR,
                                children: [
                                    {
                                        type: NODE.RELATIVE_PSEUDO_CLASS,
                                        name: 'has',
                                        children: [
                                            {
                                                type: NODE.SELECTOR_LIST,
                                                children: [
                                                    {
                                                        type: NODE.SELECTOR,
                                                        children: [
                                                            getRegularSelector('> .banner'),
                                                            getRelativeExtendedWithSingleRegular('has', '> a > img'),
                                                        ],
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                            getRegularSelector('+ .ad'),
                            getRelativeExtendedWithSingleRegular('has', '> img'),
                        ],
                    },
                ],
            };
            expect(parse(actual)).toEqual(expected);
        });

        it('not > has(not > regular)', () => {
            // eslint-disable-next-line max-len
            const actual = 'body > div:not([class]) > div[class]:has(> div:not([class]) > .branch-journeys-top a[target="_blank"][href^="/policy/"])';
            const expected = {
                type: NODE.SELECTOR_LIST,
                children: [
                    {
                        type: NODE.SELECTOR,
                        children: [
                            getRegularSelector('body > div:not([class]) > div[class]'),
                            {
                                type: NODE.EXTENDED_SELECTOR,
                                children: [
                                    {
                                        type: NODE.RELATIVE_PSEUDO_CLASS,
                                        name: 'has',
                                        children: [
                                            {
                                                type: NODE.SELECTOR_LIST,
                                                children: [
                                                    {
                                                        type: NODE.SELECTOR,
                                                        children: [
                                                            // eslint-disable-next-line max-len
                                                            getRegularSelector('> div:not([class]) > .branch-journeys-top a[target="_blank"][href^="/policy/"]'),
                                                        ],
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            };
            expect(parse(actual)).toEqual(expected);
        });

        it('has(matches-css+ matches-css)', () => {
            // eslint-disable-next-line max-len
            const actual = '.category-double-article-container:has(.half-article:matches-css(display:none)+ .half-article:matches-css(display:none))';
            const expected = {
                type: NODE.SELECTOR_LIST,
                children: [
                    {
                        type: NODE.SELECTOR,
                        children: [
                            getRegularSelector('.category-double-article-container'),
                            {
                                type: NODE.EXTENDED_SELECTOR,
                                children: [
                                    {
                                        type: NODE.RELATIVE_PSEUDO_CLASS,
                                        name: 'has',
                                        children: [
                                            {
                                                type: NODE.SELECTOR_LIST,
                                                children: [
                                                    {
                                                        type: NODE.SELECTOR,
                                                        children: [
                                                            getRegularSelector('.half-article'),
                                                            getAbsoluteExtendedSelector('matches-css', 'display:none'),
                                                            getRegularSelector('+ .half-article'),
                                                            getAbsoluteExtendedSelector('matches-css', 'display:none'),
                                                        ],
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            };
            expect(parse(actual)).toEqual(expected);
        });
    });

    it('un-tokenizable complex selector testcase', () => {
        let actual;
        const expected = {
            type: NODE.SELECTOR_LIST,
            children: [
                {
                    type: NODE.SELECTOR,
                    children: [
                        getRegularSelector('*'),
                        getAbsoluteExtendedSelector('contains', '/absolute[\\s\\S]*-\\d{4}/'),
                        getRegularSelector('+ * > .banner'),
                        getAbsoluteExtendedSelector('contains', '/а/'),
                        getRegularSelector('~ #case17.banner'),
                        {
                            type: NODE.EXTENDED_SELECTOR,
                            children: [
                                {
                                    type: NODE.RELATIVE_PSEUDO_CLASS,
                                    name: 'has',
                                    children: [
                                        {
                                            type: NODE.SELECTOR_LIST,
                                            children: [
                                                {
                                                    type: NODE.SELECTOR,
                                                    children: [
                                                        getRegularSelector('> div:nth-child(100n + 2)'),
                                                        getAbsoluteExtendedSelector('contains', '/а/'),
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        };

        // eslint-disable-next-line max-len
        actual = '*:contains(/absolute[\\s\\S]*-\\d{4}/) + * > .banner:contains(/а/) ~ #case17.banner:has(> div:nth-child(100n + 2):contains(/а/))';
        expect(parse(actual)).toEqual(expected);

        // eslint-disable-next-line max-len
        actual = '*:contains(/absolute[\\s\\S]*-\\d{4}/) + * > .banner:contains(/а/) ~ #case17.banner:has(> div:contains(/а/):nth-child(100n + 2))';
        expect(parse(actual)).toEqual(expected);
    });
});

describe('raw valid selectors', () => {
    describe('should be trimmed', () => {
        const rawSelectors = [
            ' #test p',
            '   #test p',
            '\t#test p',
            '\r#test p',
            '\n#test p',
            '\f#test p',
            '#test p ',
            '#test p   ',
            '#test p\t',
            '#test p\r',
            '#test p\n',
            '#test p\f',
        ];
        // should be RegularSelector with value: '#test p'
        const expected = '#test p';
        test.each(rawSelectors)('%s', (selector) => {
            const expectedAst = getAstWithSingleRegularSelector(expected);
            expect(parse(selector)).toEqual(expectedAst);
        });
    });
});

describe('check case-insensitive attributes parsing', () => {
    // https://github.com/AdguardTeam/ExtendedCss/issues/104
    describe('regular selectors', () => {
        const validSelectors = [
            'body div[class="case" i]',
            'div[class="case" i]',
            'div[class=case i]',
            'div[class=cAsE I]',
            'div[class="cAsE" i]',
            '.case[tracking*="ad-"][event*="-sticky" i]',
            'div[data-st-area*="backTo" i]',
            'img[alt^="slot online ad" i]',
            'div[id*="TAR" i]',
            '.plus-banner[external-event-tracking*="Banner-"][external-event-tracking*="-sticky" i]',
            'div[id*="left" i] a[href][target="_blank"]:where([href*="1001track.com"]) > img',
            'div[id*=smart-banner i]',
            'a[class=facebook i][title="Share this"]',
            'a[class^=socialButton i][onclick*="window.open"]',
            'div[class^=share i]',
            'a[data-share$=Facebook i]',
            'a[title="Share on" i]',
            'a[class=share i][title=Sharing]',
        ];
        test.each(validSelectors)('%s', (selector) => {
            const expectedAst = getAstWithSingleRegularSelector(selector);
            expect(parse(selector)).toEqual(expectedAst);
        });
    });

    it('selector list', () => {
        const actual = 'a[data-st-area*="backTo" i], a[data-st-area*="goToSG" i]';
        const expected = ['a[data-st-area*="backTo" i]', 'a[data-st-area*="goToSG" i]'];
        expectSelectorListOfRegularSelectors({ actual, expected });
    });

    describe('extended selectors', () => {
        const testsInputs = [
            {
                actual: 'body:has(div[class="page" i])',
                expected: [
                    { isRegular: true, value: 'body' },
                    { isRelative: true, name: 'has', value: 'div[class="page" i]' },
                ],
            },
            {
                actual: 'div > .fb-page[data-href$="/link/" i]:upward(2)',
                expected: [
                    { isRegular: true, value: 'div > .fb-page[data-href$="/link/" i]' },
                    { isAbsolute: true, name: 'upward', value: '2' },
                ],
            },
        ];
        test.each(testsInputs)('%s', (input) => expectSingleSelectorAstWithAnyChildren(input));
    });
});

describe('check pseudo-class names case-insensitivity', () => {
    const testsInputs = [
        {
            actual: 'div.base[level="3"]:UPWARD([level="0"])',
            expected: [
                { isRegular: true, value: 'div.base[level="3"]' },
                { isAbsolute: true, name: 'upward', value: '[level="0"]' },
            ],
        },
        {
            actual: 'div.base[LEVEL="3"]:UPWARD([level="0"])',
            expected: [
                { isRegular: true, value: 'div.base[LEVEL="3"]' },
                { isAbsolute: true, name: 'upward', value: '[level="0"]' },
            ],
        },
        {
            actual: 'div.base[LEVEL="3"]:UPWARD([LEVEL="0"])',
            expected: [
                { isRegular: true, value: 'div.base[LEVEL="3"]' },
                { isAbsolute: true, name: 'upward', value: '[LEVEL="0"]' },
            ],
        },
        {
            actual: 'div:HAS(> #paragraph)',
            expected: [
                { isRegular: true, value: 'div' },
                { isRelative: true, name: 'has', value: '> #paragraph' },
            ],
        },
        {
            actual: '#root p:CONTAINS(text)',
            expected: [
                { isRegular: true, value: '#root p' },
                { isAbsolute: true, name: 'contains', value: 'text' },
            ],
        },
        {
            actual: '#root p:CONTAINS(UPPER)',
            expected: [
                { isRegular: true, value: '#root p' },
                { isAbsolute: true, name: 'contains', value: 'UPPER' },
            ],
        },
        {
            actual: '#parent *:NOT([class])',
            expected: [
                { isRegular: true, value: '#parent *:not([class])' },
            ],
        },
        {
            actual: '#parent *:NOT([CLASS]):CONTAINS(text)',
            expected: [
                { isRegular: true, value: '#parent *:not([CLASS])' },
                { isAbsolute: true, name: 'contains', value: 'text' },
            ],
        },
    ];
    test.each(testsInputs)('$actual', (input) => expectSingleSelectorAstWithAnyChildren(input));
});

describe('remove pseudo-class is invalid for selector parser', () => {
    const error = 'Invalid :remove() pseudo-class in selector:';
    const toThrowInputs = [
        {
            selector: 'div[id][class][style]:remove()',
            error,
        },
        {
            selector: '.banner > *:remove()',
            error,
        },
        {
            selector: 'div:upward(.ads):remove()',
            error,
        },
        {
            selector: 'body > div:not([id]):not([class]):not([style]):empty:remove()',
            error,
        },
    ];
    test.each(toThrowInputs)('%s', (input) => expectToThrowInput(input));
});

describe('fail on white space which is before or after extended pseudo-class name', () => {
    describe('supported extended pseudo-classes', () => {
        // No white space is allowed between the colon and the name of the pseudo-class,
        // nor, as usual for CSS syntax, between name of extended pseudo-class and its opening parenthesis
        // https://www.w3.org/TR/selectors-4/#pseudo-classes
        const error = 'No white space is allowed before or after extended pseudo-class name in selector:';
        const invalidSelectors = [
            // white space before pseudo-class name
            'span: contains(text)',
            'span:\tcontains(text)',
            'div:\nmatches-attr(data=ad)',
            // after
            '.banner:has (> div > img)',
            '.banner > *:not\r(.content)',
            '.banner > :is\f(img, p)',
            // before and after
            'span: not (.text)',
        ];
        test.each(invalidSelectors)('%s', (selector) => expectToThrowInput({ selector, error }));
    });

    describe('standard or invalid pseudos', () => {
        const error = 'is not a valid selector';
        const invalidSelectors = [
            // the same for standard pseudo
            // and invalid pseudo as well as it will be validated later.
            // white space before the pseudo
            'body > script + div: empty',
            '.block: nth-child(2) .inner',
            'div:has(> .box:\fonly-child)',
            'div: invalid-pseudo(1)',
            'div:\finvalid-pseudo(1)',
            // after the pseudo
            'div:invalid-pseudo (1)',
            '.block:nth-child (2) .inner',
            '.block:nth-child\t(2) .inner',
            // may be validated by FilterCompiler
            '+js(overlay-buster)',
            '+js(set-constant, Object.prototype.getHoneypot, null)',
        ];
        test.each(invalidSelectors)('%s', (selector) => expectToThrowInput({ selector, error }));
    });
});

describe('fail on invalid selector', () => {
    describe('standard', () => {
        const toThrowInputs = [
            {
                selector: 'div]',
                error: 'is not a valid selector',
            },
            {
                selector: 'div { content: "',
                error: 'is not a valid selector',
            },
            {
                selector: 'div[="margin"]',
                error: 'is not a valid attribute',
            },
            {
                selector: 'div[style=]',
                error: 'is not a valid attribute',
            },
            {
                selector: 'input[name=]',
                error: 'is not a valid attribute',
            },
            {
                selector: 'div[style][="margin"]',
                error: 'is not a valid attribute',
            },
            {
                selector: 'div[style*="color"][="margin"]',
                error: 'is not a valid attribute',
            },
            {
                selector: 'table[style*=border: 0px"]',
                error: 'is not a valid attribute',
            },
        ];
        test.each(toThrowInputs)('%s', (input) => expectToThrowInput(input));
    });

    describe('extended', () => {
        const toThrowInputs = [
            {
                // part of 'head > style:contains(body{background: #410e13)' before opening `{`
                selector: 'head > style:contains(body{',
                error: 'Unbalanced brackets for extended pseudo-class',
            },
            {
                // part of 'a[href][data-item^=\'{"sources":[\'][data-item*=\'Video Ad\']'  before opening `{`
                selector: 'a[href][data-item^=\'{',
                error: 'Unbalanced attribute brackets in selector',
            },
            {
                // non-closed old syntax
                // part of '[-ext-matches-css-before=\'content:  /^[A-Z][a-z]{2}\\s/  \']' before opening `{`
                selector: '[-ext-matches-css-before=\'content:  /^[A-Z][a-z]',
                error: 'Invalid extended-css old syntax selector',
            },
            {
                selector: ':upward(1)',
                error: 'Selector should be defined before :upward() pseudo-class',
            },
            {
                selector: ':upward(p[class])',
                error: 'Selector should be defined before :upward() pseudo-class',
            },
            {
                selector: ':nth-ancestor(1)',
                error: 'Selector should be defined before :nth-ancestor() pseudo-class',
            },
            {
                selector: ':nth-ancestor(p[class])',
                error: 'Selector should be defined before :nth-ancestor() pseudo-class',
            },
            {
                selector: 'div:contains(text):',
                error: "Invalid colon ':' at the end of selector",
            },
            {
                selector: 'div:has(:',
                error: 'Invalid pseudo-class arg at the end of selector',
            },
        ];
        test.each(toThrowInputs)('$selector', (input) => expectToThrowInput(input));
    });
});
