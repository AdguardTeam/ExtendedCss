import { parse } from '../../src/selector/parser';

import { NodeType } from '../../src/selector/nodes';

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
} from '../helpers/parser';

describe('regular selectors', () => {
    it('simple', () => {
        const selector = 'div';
        const expectedAst = getAstWithSingleRegularSelector(selector);
        expect(parse(selector)).toEqual(expectedAst);
    });

    describe('compound', () => {
        const selectors = [
            'div.banner',
            'div.ad > a.redirect + a',
            'div[style]',
            'div#top[onclick*="redirect"]',
            'div[data-comma="0,1"]',
            'input[data-comma=\'0,1\']',
            'div[class*=" "]',
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
                    { isAbsolute: true, name, arg: 'text' },
                ],
            },
            {
                actual: 'span:contains("some text")',
                expected: [
                    { isRegular: true, value: 'span' },
                    { isAbsolute: true, name, arg: '"some text"' },
                ],
            },
            {
                actual: 'div[id] > .row > span:contains(/^Advertising$/)',
                expected: [
                    { isRegular: true, value: 'div[id] > .row > span' },
                    { isAbsolute: true, name, arg: '/^Advertising$/' },
                ],
            },
            {
                actual: 'div > :contains(test)',
                expected: [
                    { isRegular: true, value: 'div > *' },
                    { isAbsolute: true, name, arg: 'test' },
                ],
            },
            {
                actual: ':contains((test))',
                expected: [
                    { isRegular: true, value: '*' },
                    { isAbsolute: true, name, arg: '(test)' },
                ],
            },
            {
                actual: 'a[class*=blog]:contains(!)',
                expected: [
                    { isRegular: true, value: 'a[class*=blog]' },
                    { isAbsolute: true, name, arg: '!' },
                ],
            },
            {
                actual: ':contains(/[\\w]{9,}/)',
                expected: [
                    { isRegular: true, value: '*' },
                    { isAbsolute: true, name, arg: '/[\\w]{9,}/' },
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
                    { isAbsolute: true, name, arg: 'width:400px' },
                ],
            },
            {
                actual: 'div:matches-css(background-image: /^url\\("data:image\\/gif;base64.+/)',
                expected: [
                    { isRegular: true, value: 'div' },
                    { isAbsolute: true, name, arg: 'background-image: /^url\\("data:image\\/gif;base64.+/' },
                ],
            },
            {
                actual: 'div:matches-css(background-image: /^url\\([a-z]{4}:[a-z]{5}/)',
                expected: [
                    { isRegular: true, value: 'div' },
                    { isAbsolute: true, name, arg: 'background-image: /^url\\([a-z]{4}:[a-z]{5}/' },
                ],
            },
            {
                actual: ':matches-css(   background-image: /v\\.ping\\.pl\\/MjAxOTA/   )',
                expected: [
                    { isRegular: true, value: '*' },
                    { isAbsolute: true, name, arg: '   background-image: /v\\.ping\\.pl\\/MjAxOTA/   ' },
                ],
            },
            {
                actual: ':matches-css(    background-image: /^url\\((.)[a-z]{4}:[a-z]{2}\\1nk\\)$/    )',
                expected: [
                    { isRegular: true, value: '*' },
                    { isAbsolute: true, name, arg: '    background-image: /^url\\((.)[a-z]{4}:[a-z]{2}\\1nk\\)$/    ' },
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
                { isAbsolute: true, name: 'matches-attr', arg: '"/data-v-/"' },
            ],
        });
    });

    it('nth-ancestor pseudo-class', () => {
        const actual = 'a:nth-ancestor(2)';
        expectSingleSelectorAstWithAnyChildren({
            actual,
            expected: [
                { isRegular: true, value: 'a' },
                { isAbsolute: true, name: 'nth-ancestor', arg: '2' },
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
                    { isAbsolute: true, name, arg: '//h3[contains(text(),"Share it!")]/..' },
                ],
            },
            {
                actual: '*:xpath(//h3[contains(text(),"Share it!")]/..)',
                expected: [
                    { isRegular: true, value: '*' },
                    { isAbsolute: true, name, arg: '//h3[contains(text(),"Share it!")]/..' },
                ],
            },
            {
                actual: '[data-src^="https://example.org/"]:xpath(..)',
                expected: [
                    { isRegular: true, value: '[data-src^="https://example.org/"]' },
                    { isAbsolute: true, name, arg: '..' },
                ],
            },
            {
                actual: ':xpath(//div[@data-st-area=\'Advert\'][count(*)=2][not(header)])',
                expected: [
                    { isRegular: true, value: 'body' },
                    { isAbsolute: true, name, arg: '//div[@data-st-area=\'Advert\'][count(*)=2][not(header)]' },
                ],
            },
            {
                actual: ":xpath(//article//div[count(div[*[*[*]]])=2][count(div[*[*[*]]][1]//img[starts-with(@src,'data:image/png;base64,')])>2][div[*[*[*]]][2][count(div[@class]/div[last()][count(div)=3])>=2]])",
                expected: [
                    { isRegular: true, value: 'body' },
                    { isAbsolute: true, name, arg: "//article//div[count(div[*[*[*]]])=2][count(div[*[*[*]]][1]//img[starts-with(@src,'data:image/png;base64,')])>2][div[*[*[*]]][2][count(div[@class]/div[last()][count(div)=3])>=2]]" },
                ],
            },
            {
                actual: ':xpath(//article/h1/following-sibling::p[1]/following-sibling::div[1]//div[1][@class][@id][not(ancestor::div[@id]/ancestor::article)])',
                expected: [
                    { isRegular: true, value: 'body' },
                    { isAbsolute: true, name, arg: '//article/h1/following-sibling::p[1]/following-sibling::div[1]//div[1][@class][@id][not(ancestor::div[@id]/ancestor::article)]' },
                ],
            },
            {
                actual: ':xpath(//article/h1/following-sibling::div[1]/following-sibling::div//div[count(*)>1][not(ancestor::div[count(*)>1]/ancestor::article)]/div[1])',
                expected: [
                    { isRegular: true, value: 'body' },
                    { isAbsolute: true, name, arg: '//article/h1/following-sibling::div[1]/following-sibling::div//div[count(*)>1][not(ancestor::div[count(*)>1]/ancestor::article)]/div[1]' },
                ],
            },
            {
                actual: ":xpath(//article/h1/following-sibling::div[1]/following-sibling::div//div[count(*)>1]//div[count(*)>1][not(ancestor::div[count(*)>1]/ancestor::div[count(*)>1]/ancestor::article)]/div[.//ul/li|.//a[contains(@href,'/w/%EB%B6%84%EB%A5%98:')]]/following-sibling::div[.//div[contains(concat(' ',normalize-space(@class),' '),' example-toc-ad ')]|.//div[contains(concat(' ',normalize-space(@class),' '),' wiki-paragraph ')]]/following-sibling::div[count(.//*[count(img[starts-with(@src,'//w.example.la/s/')]|img[starts-with(@src,'//ww.example.la/s/')]|img[starts-with(@src,'data:image/png;base64,')])>1])>1])",
                expected: [
                    { isRegular: true, value: 'body' },
                    { isAbsolute: true, name, arg: "//article/h1/following-sibling::div[1]/following-sibling::div//div[count(*)>1]//div[count(*)>1][not(ancestor::div[count(*)>1]/ancestor::div[count(*)>1]/ancestor::article)]/div[.//ul/li|.//a[contains(@href,'/w/%EB%B6%84%EB%A5%98:')]]/following-sibling::div[.//div[contains(concat(' ',normalize-space(@class),' '),' example-toc-ad ')]|.//div[contains(concat(' ',normalize-space(@class),' '),' wiki-paragraph ')]]/following-sibling::div[count(.//*[count(img[starts-with(@src,'//w.example.la/s/')]|img[starts-with(@src,'//ww.example.la/s/')]|img[starts-with(@src,'data:image/png;base64,')])>1])>1]" },
                ],
            },
            {
                actual: ":xpath(//div[@class='ytp-button ytp-paid-content-overlay-text'])",
                expected: [
                    { isRegular: true, value: 'body' },
                    { isAbsolute: true, name, arg: "//div[@class='ytp-button ytp-paid-content-overlay-text']" },
                ],
            },
            {
                actual: ':xpath(//div[@class="user-content"]/div[@class="snippet-clear"]/following-sibling::text()[contains(.,"Advertisement")])',
                expected: [
                    { isRegular: true, value: 'body' },
                    { isAbsolute: true, name, arg: '//div[@class="user-content"]/div[@class="snippet-clear"]/following-sibling::text()[contains(.,"Advertisement")]' },
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
                    { isAbsolute: true, name, arg: '3' },
                ],
            },
            {
                actual: 'div.advert:upward(.info)',
                expected: [
                    { isRegular: true, value: 'div.advert' },
                    { isAbsolute: true, name, arg: '.info' },
                ],
            },
            {
                actual: 'img:upward(header ~ div[class])',
                expected: [
                    { isRegular: true, value: 'img' },
                    { isAbsolute: true, name, arg: 'header ~ div[class]' },
                ],
            },
            {
                actual: '.ad-title + .banner:upward([id][class])',
                expected: [
                    { isRegular: true, value: '.ad-title + .banner' },
                    { isAbsolute: true, name, arg: '[id][class]' },
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
        ];
        test.each(testsInputs)('%s', (input) => expectSingleSelectorAstWithAnyChildren(input));

        it('selector list as arg of has', () => {
            const actual = '.banner > :has(span, p)';
            const expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            getRegularSelector('.banner > *'),
                            {
                                type: NodeType.ExtendedSelector,
                                children: [
                                    {
                                        type: NodeType.RelativePseudoClass,
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

        /**
         * TODO: .banner > :has(span, p), a img.ad
         */
    });

    describe('if-not', () => {
        const name = 'if-not';
        const testsInputs = [
            {
                actual: 'div.banner:if-not(> span)',
                expected: [
                    { isRegular: true, value: 'div.banner' },
                    { isRelative: true, name, value: '> span' },
                ],
            },
            {
                // eslint-disable-next-line max-len
                actual: 'header[data-test-id="header"] ~ div[class]:last-child > div[class] > div[class]:if-not(a[data-test-id="logo-link"])',
                expected: [
                    {
                        isRegular: true,
                        value: 'header[data-test-id="header"] ~ div[class]:last-child > div[class] > div[class]',
                    },
                    { isRelative: true, name, value: 'a[data-test-id="logo-link"]' },
                ],
            },
        ];
        test.each(testsInputs)('%s', (input) => expectSingleSelectorAstWithAnyChildren(input));
    });

    it('is', () => {
        let actual;
        let expected;

        actual = ':is(.header, .footer)';
        expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        getRegularSelector('html *'),
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.RelativePseudoClass,
                                    name: 'is',
                                    children: [
                                        getSelectorListOfRegularSelectors(['.header', '.footer']),
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(actual)).toEqual(expected);

        actual = '#__next > :is(.header, .footer)';
        expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        getRegularSelector('#__next > *'),
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.RelativePseudoClass,
                                    name: 'is',
                                    children: [getSelectorListOfRegularSelectors(['.header', '.footer'])],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(actual)).toEqual(expected);

        actual = 'h3 > :is(a[href$="/netflix-premium/"], a[href$="/spotify-premium/"], a[title="Disney Premium"])';
        expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        getRegularSelector('h3 > *'),
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.RelativePseudoClass,
                                    name: 'is',
                                    children: [
                                        getSelectorListOfRegularSelectors([
                                            'a[href$="/netflix-premium/"]',
                                            'a[href$="/spotify-premium/"]',
                                            'a[title="Disney Premium"]',
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

    describe('not', () => {
        const name = 'not';
        const testsInputs = [
            {
                actual: '.banner:not(.header)',
                expected: [
                    { isRegular: true, value: '.banner' },
                    { isRelative: true, name, value: '.header' },
                ],
            },
            {
                actual: 'div.banner > div:not(> a[class^="ad"])',
                expected: [
                    { isRegular: true, value: 'div.banner > div' },
                    { isRelative: true, name, value: '> a[class^="ad"]' },
                ],
            },
        ];
        test.each(testsInputs)('%s', (input) => expectSingleSelectorAstWithAnyChildren(input));

        it('selector list as arg of not', () => {
            let actual;
            let expected;

            actual = '.banner > :not(span, p)';
            expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            getRegularSelector('.banner > *'),
                            {
                                type: NodeType.ExtendedSelector,
                                children: [
                                    {
                                        type: NodeType.RelativePseudoClass,
                                        name: 'not',
                                        children: [getSelectorListOfRegularSelectors(['span', 'p'])],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            };
            expect(parse(actual)).toEqual(expected);

            actual = '#child *:not(a, span)';
            expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            getRegularSelector('#child *'),
                            {
                                type: NodeType.ExtendedSelector,
                                children: [
                                    {
                                        type: NodeType.RelativePseudoClass,
                                        name: 'not',
                                        children: [getSelectorListOfRegularSelectors(['a', 'span'])],
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
                { isAbsolute: true, name: 'contains', arg: 'text' },
            ],
        },
        {
            actual: 'a[-ext-contains=""extra-quotes""]',
            expected: [
                { isRegular: true, value: 'a' },
                { isAbsolute: true, name: 'contains', arg: '"extra-quotes"' },
            ],
        },
        {
            actual: '#test-matches-css div[-ext-matches-css="background-image: url(data:*)"]',
            expected: [
                { isRegular: true, value: '#test-matches-css div' },
                { isAbsolute: true, name: 'matches-css', arg: 'background-image: url(data:*)' },
            ],
        },
        {
            actual: '#test-matches-css div[-ext-matches-css-before="content: *find me*"]',
            expected: [
                { isRegular: true, value: '#test-matches-css div' },
                { isAbsolute: true, name: 'matches-css-before', arg: 'content: *find me*' },
            ],
        },
        {
            actual: '[-ext-matches-css-before=\'content:  /^[A-Z][a-z]{2}\\s/  \']',
            expected: [
                { isRegular: true, value: '*' },
                { isAbsolute: true, name: 'matches-css-before', arg: 'content:  /^[A-Z][a-z]{2}\\s/  ' },
            ],
        },
        {
            actual:  'div[style="text-align: center"] > b[-ext-contains="Ads:"]+a[href^="http://example.com/test.html?id="]+br', // eslint-disable-line max-len
            expected: [
                { isRegular: true, value: 'div[style="text-align: center"] > b' },
                { isAbsolute: true, name: 'contains', arg: 'Ads:' },
                { isRegular: true, value: '+a[href^="http://example.com/test.html?id="]+br' },
            ],
        },
        {
            actual: 'div[-ext-contains="test"][-ext-has="div.test-class-two"]',
            expected: [
                { isRegular: true, value: 'div' },
                { isAbsolute: true, name: 'contains', arg: 'test' },
                { isRelative: true, name: 'has', value: 'div.test-class-two' },
            ],
        },
        {
            actual: 'div[i18n][-ext-contains="test"][-ext-has="div.test-class-two"]',
            expected: [
                { isRegular: true, value: 'div[i18n]' },
                { isAbsolute: true, name: 'contains', arg: 'test' },
                { isRelative: true, name: 'has', value: 'div.test-class-two' },
            ],
        },
        {
            actual: 'div[-ext-has="div.test-class-two"] > .test-class[-ext-contains="test"]',
            expected: [
                { isRegular: true, value: 'div' },
                { isRelative: true, name: 'has', value: 'div.test-class-two' },
                { isRegular: true, value: '> .test-class' },
                { isAbsolute: true, name: 'contains', arg: 'test' },
            ],
        },
        {
            actual: '*[-ext-contains=\'/\\s[a-t]{8}$/\'] + *:contains(/^[^\\"\\\'"]{30}quickly/)',
            expected: [
                { isRegular: true, value: '*' },
                { isAbsolute: true, name: 'contains', arg: '/\\s[a-t]{8}$/' },
                { isRegular: true, value: '+ *' },
                { isAbsolute: true, name: 'contains', arg: '/^[^\\"\\\'"]{30}quickly/' },
            ],
        },
    ];
    test.each(testsInputs)('%s', (input) => expectSingleSelectorAstWithAnyChildren(input));

    it('old syntax - has(> contains)', () => {
        let actual;
        let expected;

        actual = '.sidebar > h3[-ext-has="a:contains(Recommended)"]';
        expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        getRegularSelector('.sidebar > h3'),
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.RelativePseudoClass,
                                    name: 'has',
                                    children: [
                                        getSingleSelectorAstWithAnyChildren([
                                            { isRegular: true, value: 'a' },
                                            { isAbsolute: true, name: 'contains', arg: 'Recommended' },
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
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        getRegularSelector('#sidebar div[class^="text-"]'),
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.RelativePseudoClass,
                                    name: 'has',
                                    children: [
                                        getSingleSelectorAstWithAnyChildren([
                                            { isRegular: true, value: '>.box-inner>h2' },
                                            { isAbsolute: true, name: 'contains', arg: 'ads' },
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
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        getRegularSelector('*'),
                        getAbsoluteExtendedSelector('matches-css', '    background-image: /^url\\((.)[a-z]{4}:[a-z]{2}\\1nk\\)$/    '),
                        getRegularSelector('+ *'),
                        getAbsoluteExtendedSelector('matches-css-before', 'content:  /^[A-Z][a-z]{2}\\s/  '),
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.RelativePseudoClass,
                                    name: 'has',
                                    children: [
                                        getSingleSelectorAstWithAnyChildren([
                                            { isRegular: true, value: '+*' },
                                            { isAbsolute: true, name: 'matches-css-after', arg: ' content  :   /(\\d+\\s)*me/  ' },
                                            { isAbsolute: true, name: 'contains', arg: '/^(?![\\s\\S])/' },
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
            { isAbsolute: true, name: 'contains', arg: 'something' },
        ];
        expectSingleSelectorAstWithAnyChildren({ actual, expected });
    });

    it('has(> contains)', () => {
        const actual = 'div:has(> p:contains(test))';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        getRegularSelector('div'),
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.RelativePseudoClass,
                                    name: 'has',
                                    children: [
                                        getSingleSelectorAstWithAnyChildren([
                                            { isRegular: true, value: '> p' },
                                            { isAbsolute: true, name: 'contains', arg: 'test' },
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
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        getRegularSelector('div'),
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.RelativePseudoClass,
                                    name: 'has',
                                    children: [
                                        getSingleSelectorAstWithAnyChildren([
                                            { isRegular: true, value: '*' },
                                            { isAbsolute: true, name: 'contains', arg: 'text' },
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

    it('is(selector list) contains', () => {
        const actual = '#__next > :is(.header, .footer):contains(ads)';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        getRegularSelector('#__next > *'),
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.RelativePseudoClass,
                                    name: 'is',
                                    children: [getSelectorListOfRegularSelectors(['.header', '.footer'])],
                                },
                            ],
                        },
                        getAbsoluteExtendedSelector('contains', 'ads'),
                    ],
                },
            ],
        };
        expect(parse(actual)).toEqual(expected);
    });

    it('is(has, contains)', () => {
        const actual = '#__next > :is(.banner:has(> img), .block:contains(Share))';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        getRegularSelector('#__next > *'),
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.RelativePseudoClass,
                                    name: 'is',
                                    children: [
                                        {
                                            type: NodeType.SelectorList,
                                            children: [
                                                {
                                                    type: NodeType.Selector,
                                                    children: [
                                                        getRegularSelector('.banner'),
                                                        getRelativeExtendedWithSingleRegular('has', '> img'),
                                                    ],
                                                },
                                                {
                                                    type: NodeType.Selector,
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
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
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
        const actual = 'body.zen .zen-lib div.feed__item:has(> div > div > div[class*="__label"] > span:matches-css-before(content:*Яндекс.Директ))';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        getRegularSelector('body.zen .zen-lib div.feed__item'),
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.RelativePseudoClass,
                                    name: 'has',
                                    children: [
                                        getSingleSelectorAstWithAnyChildren([
                                            { isRegular: true, value: '> div > div > div[class*="__label"] > span' },
                                            { isAbsolute: true, name: 'matches-css-before', arg: 'content:*Яндекс.Директ' }, // eslint-disable-line max-len
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

    it('upward not', () => {
        const actual = 'div[style="width:640px;height:360px"][id="video-player"]:upward(div):not([class])';
        const expected = [
            { isRegular: true, value: 'div[style="width:640px;height:360px"][id="video-player"]' },
            { isAbsolute: true, name: 'upward', arg: 'div' },
            { isRelative: true, name: 'not', value: '[class]' },
        ];
        expectSingleSelectorAstWithAnyChildren({ actual, expected });
    });

    it('upward not not', () => {
        const actual = 'a[href^="https://example."]:upward(1):not(section):not(div[class^="article"])';
        const expected = [
            { isRegular: true, value: 'a[href^="https://example."]' },
            { isAbsolute: true, name: 'upward', arg: '1' },
            { isRelative: true, name: 'not', value: 'section' },
            { isRelative: true, name: 'not', value: 'div[class^="article"]' },
        ];
        expectSingleSelectorAstWithAnyChildren({ actual, expected });
    });

    it('contains upward', () => {
        const actual = 'div > p:contains(PR):upward(2)';
        const expected = [
            { isRegular: true, value: 'div > p' },
            { isAbsolute: true, name: 'contains', arg: 'PR' },
            { isAbsolute: true, name: 'upward', arg: '2' },
        ];
        expectSingleSelectorAstWithAnyChildren({ actual, expected });
    });

    it('upward matches-css', () => {
        const actual = '[data-ad-subtype]:upward(1):matches-css(min-height:/[0-9]+/)';
        const expected = [
            { isRegular: true, value: '[data-ad-subtype]' },
            { isAbsolute: true, name: 'upward', arg: '1' },
            { isAbsolute: true, name: 'matches-css', arg: 'min-height:/[0-9]+/' },
        ];
        expectSingleSelectorAstWithAnyChildren({ actual, expected });
    });

    it('has(not)', () => {
        const selector = 'div:has(:not(span))';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        getRegularSelector('div'),
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.RelativePseudoClass,
                                    name: 'has',
                                    children: [
                                        getSingleSelectorAstWithAnyChildren([
                                            { isRegular: true, value: '*' },
                                            { isRelative: true, name: 'not', value: 'span' },
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
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        getRegularSelector('p'),
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.RelativePseudoClass,
                                    name: 'not',
                                    children: [
                                        getSingleSelectorAstWithAnyChildren([
                                            { isRegular: true, value: '*' },
                                            { isAbsolute: true, name: 'contains', arg: 'text' },
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
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        getRegularSelector('div'),
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.RelativePseudoClass,
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

    it('two not with simple selector next to each other', () => {
        const actual = ':not(span):not(p)';
        const expected = [
            { isRegular: true, value: 'html *' },
            { isRelative: true, name: 'not', value: 'span' },
            { isRelative: true, name: 'not', value: 'p' },
        ];
        expectSingleSelectorAstWithAnyChildren({ actual, expected });
    });
});

describe('combined selectors', () => {
    describe('selectors with standard pseudos', () => {
        it(':not::selection', () => {
            const actual = '*:not(input)::selection';
            const expected = [
                { isRegular: true, value: 'html *' },
                { isRelative: true, name: 'not', value: 'input' },
                { isRegular: true, value: '::selection' },
            ];
            expectSingleSelectorAstWithAnyChildren({ actual, expected });

            /**
             * TODO: check this case is selector
             */
        });

        it(':not():not()::selection', () => {
            const actual = 'html > body *:not(input):not(textarea)::selection';
            const expected = [
                { isRegular: true, value: 'html > body *' },
                { isRelative: true, name: 'not', value: 'input' },
                { isRelative: true, name: 'not', value: 'textarea' },
                { isRegular: true, value: '::selection' },
            ];
            expectSingleSelectorAstWithAnyChildren({ actual, expected });
        });

        it(':not():has(:only-child)', () => {
            // eslint-disable-next-line max-len
            const actual = '#snippet-list-posts > .item:not([id]):has(> .box-responsive:only-child > div[id]:only-child)';
            const expected = [
                { isRegular: true, value: '#snippet-list-posts > .item' },
                { isRelative: true, name: 'not', value: '[id]' },
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

        it(':not(:nth-child())', () => {
            const actual = '.yellow:not(:nth-child(3))';
            const expected = [
                { isRegular: true, value: '.yellow' },
                { isRelative: true, name: 'not', value: '*:nth-child(3)' },
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

        it('two not with standard pseudo next to each other', () => {
            const actual = ':not(:empty):not(:hover)';
            const expected = [
                { isRegular: true, value: 'html *' },
                { isRelative: true, name: 'not', value: '*:empty' },
                { isRelative: true, name: 'not', value: '*:hover' },
            ];
            expectSingleSelectorAstWithAnyChildren({ actual, expected });
        });
    });

    it('selector list with regular "any" and extended :contains', () => {
        const actual = '.banner, :contains(#ad)';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                getSelectorAsRegular('.banner'),
                {
                    type: NodeType.Selector,
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
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        getRegularSelector('*'),
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.RelativePseudoClass,
                                    name: 'has',
                                    children: [
                                        getSingleSelectorAstWithAnyChildren([
                                            { isRegular: true, value: '+*' },
                                            { isAbsolute: true, name: 'matches-css-after', arg: ' content  :   /(\\d+\\s)*me/  ' }, // eslint-disable-line max-len
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
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        getRegularSelector('div'),
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.RelativePseudoClass,
                                    name: 'has',
                                    children: [
                                        {
                                            type: NodeType.SelectorList,
                                            children: [
                                                getSelectorAsRegular('.banner'),
                                                {
                                                    type: NodeType.Selector,
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
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        getRegularSelector('a[class]'),
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.RelativePseudoClass,
                                    name: 'not',
                                    children: [
                                        {
                                            type: NodeType.SelectorList,
                                            children: [
                                                {
                                                    type: NodeType.Selector,
                                                    children: [
                                                        getRegularSelector('*'),
                                                        {
                                                            type: NodeType.ExtendedSelector,
                                                            children: [
                                                                {
                                                                    type: NodeType.RelativePseudoClass,
                                                                    name: 'has',
                                                                    children: [
                                                                        {
                                                                            type: NodeType.SelectorList,
                                                                            children: [
                                                                                getSelectorAsRegular('*'),
                                                                                {
                                                                                    type: NodeType.Selector,
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
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        getRegularSelector('div'),
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.RelativePseudoClass,
                                    name: 'has',
                                    children: [
                                        {
                                            type: NodeType.SelectorList,
                                            children: [
                                                getSelectorAsRegular('.banner'),
                                                {
                                                    type: NodeType.Selector,
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
                    type: NodeType.Selector,
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
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        getRegularSelector('a[class*=blog]'),
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.RelativePseudoClass,
                                    name: 'not',
                                    children: [
                                        {
                                            type: NodeType.SelectorList,
                                            children: [
                                                {
                                                    type: NodeType.Selector,
                                                    children: [
                                                        getRegularSelector('*'),
                                                        {
                                                            type: NodeType.ExtendedSelector,
                                                            children: [
                                                                {
                                                                    type: NodeType.RelativePseudoClass,
                                                                    name: 'has',
                                                                    children: [
                                                                        {
                                                                            type: NodeType.SelectorList,
                                                                            children: [
                                                                                getSelectorAsRegular('*'),
                                                                                {
                                                                                    type: NodeType.Selector,
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
                                                    type: NodeType.Selector,
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
                    type: NodeType.Selector,
                    children: [
                        getRegularSelector('br'),
                        getAbsoluteExtendedSelector('contains', ']'),
                    ],
                },
                {
                    type: NodeType.Selector,
                    children: [
                        getRegularSelector('p'),
                        getAbsoluteExtendedSelector('contains', ']'),
                    ],
                },
                {
                    type: NodeType.Selector,
                    children: [
                        getRegularSelector('*'),
                        getRelativeExtendedWithSingleRegular('not', '*:empty'),
                        getRelativeExtendedWithSingleRegular('not', '*:parent'),
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);
    });

    describe('has pseudo-class limitation', () => {
        const toThrowInputs = [
            // no :has, :is, :where inside :has
            {
                selector: 'banner:has(> div:has(> img))',
                error: 'Usage of :has pseudo-class is not allowed inside upper :has',
            },
            {
                selector: 'banner:has(> div:is(> img))',
                error: 'Usage of :is pseudo-class is not allowed inside upper :has',
            },
            {
                selector: 'banner:has(> div:where(> img))',
                error: 'Usage of :where pseudo-class is not allowed inside upper :has',
            },
            // no :has inside regular pseudos
            {
                selector: '::slotted(:has(.a))',
                error: 'Usage of :has pseudo-class is not allowed inside regular pseudo',
            },
            // no :has after pseudo-elements
            {
                selector: '::part(foo):has(.a)',
                error: 'Usage of :has pseudo-class is not allowed after any regular pseudo-element',
            },
        ];
        test.each(toThrowInputs)('%s', (input) => expectToThrowInput(input));
    });

    describe('regular selector AFTER extended absolute selector', () => {
        const testsInputs = [
            {
                actual: '.test:upward(3) .banner',
                expected: [
                    { isRegular: true, value: '.test' },
                    { isAbsolute: true, name: 'upward', arg: '3' },
                    { isRegular: true, value: '.banner' },
                ],
            },
            {
                actual: '.test:nth-ancestor(1) > .banner',
                expected: [
                    { isRegular: true, value: '.test' },
                    { isAbsolute: true, name: 'nth-ancestor', arg: '1' },
                    { isRegular: true, value: '> .banner' },
                ],
            },
            {
                actual: '.test:upward(3) > .banner > *',
                expected: [
                    { isRegular: true, value: '.test' },
                    { isAbsolute: true, name: 'upward', arg: '3' },
                    { isRegular: true, value: '> .banner > *' },
                ],
            },
            {
                actual: '.test:upward(#top .block) .banner',
                expected: [
                    { isRegular: true, value: '.test' },
                    { isAbsolute: true, name: 'upward', arg: '#top .block' },
                    { isRegular: true, value: '.banner' },
                ],
            },
            {
                actual: '.test:upward(#top > .block) .banner',
                expected: [
                    { isRegular: true, value: '.test' },
                    { isAbsolute: true, name: 'upward', arg: '#top > .block' },
                    { isRegular: true, value: '.banner' },
                ],
            },
            {
                actual: '.test:nth-ancestor(1)> .banner',
                expected: [
                    { isRegular: true, value: '.test' },
                    { isAbsolute: true, name: 'nth-ancestor', arg: '1' },
                    { isRegular: true, value: '> .banner' },
                ],
            },
            {
                actual: '#main .target:nth-ancestor(2)+ .banner',
                expected: [
                    { isRegular: true, value: '#main .target' },
                    { isAbsolute: true, name: 'nth-ancestor', arg: '2' },
                    { isRegular: true, value: '+ .banner' },
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
                actual: ':not([class^="Navigation__subscribe"]) > div[data-cm-unit="show-failsafe"]',
                expected: [
                    { isRegular: true, value: 'html *' },
                    { isRelative: true, name: 'not', value: '[class^="Navigation__subscribe"]' },
                    { isRegular: true, value: '> div[data-cm-unit="show-failsafe"]' },
                ],
            },
            {
                actual: '.header > header + [id*="-"]:not([class]) > a[href*="adblock"]',
                expected: [
                    { isRegular: true, value: '.header > header + [id*="-"]' },
                    { isRelative: true, name: 'not', value: '[class]' },
                    { isRegular: true, value: '> a[href*="adblock"]' },
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
                actual: 'td[align="left"]:not([width]) > a > img',
                expected: [
                    { isRegular: true, value: 'td[align="left"]' },
                    { isRelative: true, name: 'not', value: '[width]' },
                    { isRegular: true, value: '> a > img' },
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
            {
                actual: 'td[align="left"]:not([width])+ a > img',
                expected: [
                    { isRegular: true, value: 'td[align="left"]' },
                    { isRelative: true, name: 'not', value: '[width]' },
                    { isRegular: true, value: '+ a > img' },
                ],
            },
        ];
        test.each(testsInputs)('%s', (input) => expectSingleSelectorAstWithAnyChildren(input));
    });

    describe('combined after combined with any combinator between', () => {
        const testsInputs = [
            {
                actual: 'div:contains(base) + .paragraph:contains(text)',
                expected: [
                    { isRegular: true, value: 'div' },
                    { isAbsolute: true, name: 'contains', arg: 'base' },
                    { isRegular: true, value: '+ .paragraph' },
                    { isAbsolute: true, name: 'contains', arg: 'text' },
                ],
            },
            {
                actual: '#root > div:not([class]) > div:contains(PRIVACY)',
                expected: [
                    { isRegular: true, value: '#root > div' },
                    { isRelative: true, name: 'not', value: '[class]' },
                    { isRegular: true, value: '> div' },
                    { isAbsolute: true, name: 'contains', arg: 'PRIVACY' },
                ],
            },
            {
                // eslint-disable-next-line max-len
                actual: '#app > div[class]:matches-attr("/data-v-/") > div > div:has(> a[href="https://example.com"])',
                expected: [
                    { isRegular: true, value: '#app > div[class]' },
                    { isAbsolute: true, name: 'matches-attr', arg: '"/data-v-/"' },
                    { isRegular: true, value: '> div > div' },
                    { isRelative: true, name: 'has', value: '> a[href="https://example.com"]' },
                ],
            },
            {
                // eslint-disable-next-line max-len
                actual: 'tr[data-id]:not([class]):not([id]) > td[class] > div[class*=" "]:has(> div[class*=" "] > iframe[src^="https://example.org/"])',
                expected: [
                    { isRegular: true, value: 'tr[data-id]' },
                    { isRelative: true, name: 'not', value: '[class]' },
                    { isRelative: true, name: 'not', value: '[id]' },
                    { isRegular: true, value: '> td[class] > div[class*=" "]' },
                    { isRelative: true, name: 'has', value: '> div[class*=" "] > iframe[src^="https://example.org/"]' },
                ],
            },
            {
                // eslint-disable-next-line max-len
                actual: 'div:not([style^="min-height:"]) > div[id][data-id^="toolkit-"]:not([data-bem]):not([data-m]):has(a[href^="https://example."]>img)',
                expected: [
                    { isRegular: true, value: 'div' },
                    { isRelative: true, name: 'not', value: '[style^="min-height:"]' },
                    { isRegular: true, value: '> div[id][data-id^="toolkit-"]' },
                    { isRelative: true, name: 'not', value: '[data-bem]' },
                    { isRelative: true, name: 'not', value: '[data-m]' },
                    { isRelative: true, name: 'has', value: 'a[href^="https://example."]>img' },
                ],
            },
            {
                // eslint-disable-next-line max-len
                actual: '#root > div:not([class])> div[class] > div[class] > span[class] + a[href="https://example.org/test"]:upward(2)',
                expected: [
                    { isRegular: true, value: '#root > div' },
                    { isRelative: true, name: 'not', value: '[class]' },
                    { isRegular: true, value: '> div[class] > div[class] > span[class] + a[href="https://example.org/test"]' }, // eslint-disable-line max-len
                    { isAbsolute: true, name: 'upward', arg: '2' },
                ],
            },
            {
                actual: 'body > div[id="root"] ~ script +div:not([class]):not([id]) > div[class*=" "]',
                expected: [
                    { isRegular: true, value: 'body > div[id="root"] ~ script +div' },
                    { isRelative: true, name: 'not', value: '[class]' },
                    { isRelative: true, name: 'not', value: '[id]' },
                    { isRegular: true, value: '> div[class*=" "]' },
                ],
            },
            {
                // eslint-disable-next-line max-len
                actual: '#peek > div:not([class]):not([id]) > div[data-root][style*="position: fixed; bottom: 0px; z-index: 1000; display: flex; min-width: 50%; margin: 8px;"]:not([class]):not([id])',
                expected: [
                    { isRegular: true, value: '#peek > div' },
                    { isRelative: true, name: 'not', value: '[class]' },
                    { isRelative: true, name: 'not', value: '[id]' },
                    // eslint-disable-next-line max-len
                    { isRegular: true, value: '> div[data-root][style*="position: fixed; bottom: 0px; z-index: 1000; display: flex; min-width: 50%; margin: 8px;"]' },
                    { isRelative: true, name: 'not', value: '[class]' },
                    { isRelative: true, name: 'not', value: '[id]' },
                ],
            },
            {
                // eslint-disable-next-line max-len
                actual: '#content-container > div[class] > div[class]:matches-css(z-index: 10) > div[class] > div[class] > h4:contains(cookies):upward(4)',
                expected: [
                    { isRegular: true, value: '#content-container > div[class] > div[class]' },
                    { isAbsolute: true, name: 'matches-css', arg: 'z-index: 10' },
                    { isRegular: true, value: '> div[class] > div[class] > h4' },
                    { isAbsolute: true, name: 'contains', arg: 'cookies' },
                    { isAbsolute: true, name: 'upward', arg: '4' },
                ],
            },
            {
                // eslint-disable-next-line max-len
                actual: '.content > .block.rel ~ div[class*=" "]:not(.clear) > a[href="javascript:void(0)"]:only-child:contains(/^Open app$/):upward(1)',
                expected: [
                    { isRegular: true, value: '.content > .block.rel ~ div[class*=" "]' },
                    { isRelative: true, name: 'not', value: '.clear' },
                    { isRegular: true, value: '> a[href="javascript:void(0)"]:only-child' },
                    { isAbsolute: true, name: 'contains', arg: '/^Open app$/' },
                    { isAbsolute: true, name: 'upward', arg: '1' },
                ],
            },
            {
                actual: 'article>div[id]:not([class])~div[class]:not([id])',
                expected: [
                    { isRegular: true, value: 'article>div[id]' },
                    { isRelative: true, name: 'not', value: '[class]' },
                    { isRegular: true, value: '~div[class]' },
                    { isRelative: true, name: 'not', value: '[id]' },
                ],
            },
            {
                // eslint-disable-next-line max-len
                actual: 'body > script + div:empty:not([class]):not([id]) ~ div:empty:not([class]):not([id]) + div:empty:not([class]):not([id]) + [id]:not([class])',
                expected: [
                    { isRegular: true, value: 'body > script + div:empty' },
                    { isRelative: true, name: 'not', value: '[class]' },
                    { isRelative: true, name: 'not', value: '[id]' },
                    { isRegular: true, value: '~ div:empty' },
                    { isRelative: true, name: 'not', value: '[class]' },
                    { isRelative: true, name: 'not', value: '[id]' },
                    { isRegular: true, value: '+ div:empty' },
                    { isRelative: true, name: 'not', value: '[class]' },
                    { isRelative: true, name: 'not', value: '[id]' },
                    { isRegular: true, value: '+ [id]' },
                    { isRelative: true, name: 'not', value: '[class]' },
                ],
            },
        ];
        test.each(testsInputs)('%s', (input) => expectSingleSelectorAstWithAnyChildren(input));

        it('not > has(not > regular)', () => {
            // eslint-disable-next-line max-len
            const actual = 'body > div:not([class]) > div[class]:has(> div:not([class]) > .branch-journeys-top a[target="_blank"][href^="/policy/"])';
            const expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            getRegularSelector('body > div'),
                            getRelativeExtendedWithSingleRegular('not', '[class]'),
                            getRegularSelector('> div[class]'),
                            {
                                type: NodeType.ExtendedSelector,
                                children: [
                                    {
                                        type: NodeType.RelativePseudoClass,
                                        name: 'has',
                                        children: [
                                            {
                                                type: NodeType.SelectorList,
                                                children: [
                                                    {
                                                        type: NodeType.Selector,
                                                        children: [
                                                            getRegularSelector('> div'),
                                                            getRelativeExtendedWithSingleRegular('not', '[class]'),
                                                            getRegularSelector('> .branch-journeys-top a[target="_blank"][href^="/policy/"]'), // eslint-disable-line max-len
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
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            getRegularSelector('.category-double-article-container'),
                            {
                                type: NodeType.ExtendedSelector,
                                children: [
                                    {
                                        type: NodeType.RelativePseudoClass,
                                        name: 'has',
                                        children: [
                                            {
                                                type: NodeType.SelectorList,
                                                children: [
                                                    {
                                                        type: NodeType.Selector,
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
                    { isAbsolute: true, name: 'upward', arg: '2' },
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
                { isAbsolute: true, name: 'upward', arg: '[level="0"]' },
            ],
        },
        {
            actual: 'div.base[LEVEL="3"]:UPWARD([level="0"])',
            expected: [
                { isRegular: true, value: 'div.base[LEVEL="3"]' },
                { isAbsolute: true, name: 'upward', arg: '[level="0"]' },
            ],
        },
        {
            actual: 'div.base[LEVEL="3"]:UPWARD([LEVEL="0"])',
            expected: [
                { isRegular: true, value: 'div.base[LEVEL="3"]' },
                { isAbsolute: true, name: 'upward', arg: '[LEVEL="0"]' },
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
                { isAbsolute: true, name: 'contains', arg: 'text' },
            ],
        },
        {
            actual: '#root p:CONTAINS(UPPER)',
            expected: [
                { isRegular: true, value: '#root p' },
                { isAbsolute: true, name: 'contains', arg: 'UPPER' },
            ],
        },
        {
            actual: '#parent *:NOT([class])',
            expected: [
                { isRegular: true, value: '#parent *' },
                { isRelative: true, name: 'not', value: '[class]' },
            ],
        },
        {
            actual: '#parent *:NOT([CLASS]):CONTAINS(text)',
            expected: [
                { isRegular: true, value: '#parent *' },
                { isRelative: true, name: 'not', value: '[CLASS]' },
                { isAbsolute: true, name: 'contains', arg: 'text' },
            ],
        },
    ];
    test.each(testsInputs)('%s', (input) => expectSingleSelectorAstWithAnyChildren(input));
});

describe('remove pseudo-class is invalid for selector parser', () => {
    const error = 'Selector parser error: invalid :remove() pseudo-class in selector:';
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
        ];
        test.each(invalidSelectors)('%s', (selector) => expectToThrowInput({ selector, error }));
    });
});

describe('fail on invalid selector', () => {
    describe('unbalanced brackets - extended pseudo-class', () => {
        const error = 'Unbalanced brackets for extended pseudo-class';
        const invalidSelectors = [
            // part of 'head > style:contains(body{background: #410e13)' before opening `{`
            'head > style:contains(body{',
        ];
        test.each(invalidSelectors)('%s', (selector) => expectToThrowInput({ selector, error }));
    });

    describe('unbalanced brackets - attributes is selector', () => {
        const error = 'Unbalanced brackets for attributes is selector';
        const invalidSelectors = [
            // part of 'a[href][data-item^=\'{"sources":[\'][data-item*=\'Video Ad\']'  before opening `{`
            'a[href][data-item^=\'{',
        ];
        test.each(invalidSelectors)('%s', (selector) => expectToThrowInput({ selector, error }));
    });

    describe('non-closed old syntax', () => {
        // if may happen while stylesheet parsing
        const error = 'Invalid extended-css old syntax selector';
        const invalidSelectors = [
            // part of '[-ext-matches-css-before=\'content:  /^[A-Z][a-z]{2}\\s/  \']' before opening `{`
            '[-ext-matches-css-before=\'content:  /^[A-Z][a-z]',
        ];
        test.each(invalidSelectors)('%s', (selector) => expectToThrowInput({ selector, error }));
    });
});
