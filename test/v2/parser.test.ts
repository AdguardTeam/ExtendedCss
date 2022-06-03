import { parse } from '../../src/parser';

import { NodeType } from '../../src/nodes';

/**
 * Checks whether the 'rawSelector' is parsed into RegularSelector with 'expectRegularSelectorValue' as value
 * @param rawSelector
 * @param expectRegularSelectorValue
 */
const expectRegularSelector = (rawSelector: string, expectRegularSelectorValue?: string): void => {
    const regularSelectorValue = expectRegularSelectorValue
        ? expectRegularSelectorValue
        : rawSelector;

    const expected = {
        type: NodeType.SelectorList,
        children: [
            {
                type: NodeType.Selector,
                children: [
                    {
                        type: NodeType.RegularSelector,
                        value: regularSelectorValue,
                        children: [],
                    },
                ],
            },
        ],
    };
    expect(parse(rawSelector)).toEqual(expected);
};

/**
 * Checks whether the 'rawSelector' is parsed into AbsolutePseudoClass
 * with 'expectRegularValue' as value for it's RegularSelector
 * and 'expectedContainsArg' as arg for :contains pseudo-class
 * @param rawSelector
 * @param expectRegularValue
 * @param expectedAbsoluteArg
 */
const expectAbsolutePseudoClassSelector = (
    rawSelector: string,
    expectRegularValue: string,
    expectedAbsoluteName: string,
    expectedAbsoluteArg: string,
): void => {
    const expected = {
        type: NodeType.SelectorList,
        children: [
            {
                type: NodeType.Selector,
                children: [
                    {
                        type: NodeType.RegularSelector,
                        value: expectRegularValue,
                        children: [],
                    },
                    {
                        type: NodeType.ExtendedSelector,
                        children: [
                            {
                                type: NodeType.AbsolutePseudoClass,
                                name: expectedAbsoluteName,
                                arg: expectedAbsoluteArg,
                                children: [],
                            },
                        ],
                    },
                ],
            },
        ],
    };
    expect(parse(rawSelector)).toEqual(expected);
};

describe('regular selectors', () => {
    it('simple', () => {
        const selector = 'div';
        expectRegularSelector(selector);
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

        test.each(
            selectors.map((selector) => ({ selector })),
        )('%s', ({ selector }) => {
            expectRegularSelector(selector);
        });
    });

    describe('complex', () => {
        const selectors = [
            'div > span',
            '.banner + div[style="clear:both;"]',
        ];

        test.each(
            selectors.map((selector) => ({ selector })),
        )('%s', ({ selector }) => {
            expectRegularSelector(selector);
        });
    });

    it('selector list', () => {
        let selector = 'div, span';
        let expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'div',
                            children: [],
                        },
                    ],
                },
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'span',
                            children: [],
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);

        selector = 'div,span';
        expect(parse(selector)).toEqual(expected);

        selector = 'div , span';
        expect(parse(selector)).toEqual(expected);

        selector = 'div.banner, span[ad], div > a > img';
        expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'div.banner',
                            children: [],
                        },
                    ],
                },
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'span[ad]',
                            children: [],
                        },
                    ],
                },
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'div > a > img',
                            children: [],
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);

        selector = 'p, :hover';
        expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'p',
                            children: [],
                        },
                    ],
                },
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: '*:hover',
                            children: [],
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);

        selector = 'p,:hover';
        expect(parse(selector)).toEqual(expected);

        selector = '.banner, div[data-comma="0,1"]';
        expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: '.banner',
                            children: [],
                        },
                    ],
                },
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'div[data-comma="0,1"]',
                            children: [],
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);
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
            { selector: 'div:hover', expected: 'div:hover' },
            { selector: '.post-content > p:empty::before', expected: '.post-content > p:empty::before' },
            { selector: '.block:nth-child(2) .inner', expected: '.block:nth-child(2) .inner' },
            { selector: '.block:nth-child(2) > .inner', expected: '.block:nth-child(2) > .inner' },
            ...wildcardSelectors.map((selector) => ({ selector, expected: `*${selector}` })),
        ];

        test.each(testsInputs)('%s', ({ selector, expected }) => {
            expectRegularSelector(selector, expected);
        });
    });

    it('invalid selector - should not fail while parsing', () => {
        let selector;

        selector = 'div >';
        expectRegularSelector(selector);

        selector = 'div:invalid-pseudo(1)';
        expectRegularSelector(selector);
    });
});

describe('absolute extended selectors', () => {
    describe('contains pseudo-class', () => {
        const pseudoName = 'contains';
        const testsInputs = [
            {
                selector: 'span:contains(text)',
                expectedRegular: 'span',
                expectedContainsArg: 'text',
            },
            {
                selector: 'div[id] > .row > span:contains(/^Advertising$/)',
                expectedRegular: 'div[id] > .row > span',
                expectedContainsArg: '/^Advertising$/',
            },
            {
                selector: 'div > :contains(test)',
                expectedRegular: 'div > *',
                expectedContainsArg: 'test',
            },
            {
                selector: ':contains((test))',
                expectedRegular: '*',
                expectedContainsArg: '(test)',
            },
            {
                selector: 'a[class*=blog]:contains(!)',
                expectedRegular: 'a[class*=blog]',
                expectedContainsArg: '!',
            },
            {
                selector: ':contains(/[\\w]{9,}/)',
                expectedRegular: '*',
                expectedContainsArg: '/[\\w]{9,}/',
            },
        ];
        test.each(testsInputs)('%s', ({ selector, expectedRegular, expectedContainsArg }) => {
            expectAbsolutePseudoClassSelector(selector, expectedRegular, pseudoName, expectedContainsArg);
        });
    });

    describe('matches-css pseudo-class', () => {
        const pseudoName = 'matches-css';
        const testsInputs = [
            {
                selector: '*:matches-css(width:400px)',
                expectedRegular: '*',
                expectedContainsArg: 'width:400px',
            },
            {
                selector: 'div:matches-css(background-image: /^url\\("data:image\\/gif;base64.+/)',
                expectedRegular: 'div',
                expectedContainsArg: 'background-image: /^url\\("data:image\\/gif;base64.+/',
            },
            {
                selector: 'div:matches-css(background-image: /^url\\([a-z]{4}:[a-z]{5}/)',
                expectedRegular: 'div',
                expectedContainsArg: 'background-image: /^url\\([a-z]{4}:[a-z]{5}/',
            },
            {
                selector: ':matches-css(   background-image: /v\\.ping\\.pl\\/MjAxOTA/   )',
                expectedRegular: '*',
                expectedContainsArg: '   background-image: /v\\.ping\\.pl\\/MjAxOTA/   ',
            },
        ];
        test.each(testsInputs)('%s', ({ selector, expectedRegular, expectedContainsArg }) => {
            expectAbsolutePseudoClassSelector(selector, expectedRegular, pseudoName, expectedContainsArg);
        });
    });

    it('matches-attr pseudo-class', () => {
        const selector = 'div:matches-attr("/data-v-/")';
        expectAbsolutePseudoClassSelector(selector, 'div', 'matches-attr', '"/data-v-/"');
    });

    it('nth-ancestor pseudo-class', () => {
        const selector = 'a:nth-ancestor(2)';
        expectAbsolutePseudoClassSelector(selector, 'a', 'nth-ancestor', '2');
    });

    describe('xpath pseudo-class', () => {
        const pseudoName = 'xpath';
        /* eslint-disable max-len */
        const testsInputs = [
            {
                selector: 'div:xpath(//h3[contains(text(),"Share it!")]/..)',
                expectedRegular: 'div',
                expectedContainsArg: '//h3[contains(text(),"Share it!")]/..',
            },
            {
                selector: '[data-src^="https://example.org/"]:xpath(..)',
                expectedRegular: '[data-src^="https://example.org/"]',
                expectedContainsArg: '..',
            },
            {
                selector: ':xpath(//div[@data-st-area=\'Advert\'][count(*)=2][not(header)])',
                expectedRegular: 'body',
                expectedContainsArg: '//div[@data-st-area=\'Advert\'][count(*)=2][not(header)]',
            },
            {
                selector: ":xpath(//article//div[count(div[*[*[*]]])=2][count(div[*[*[*]]][1]//img[starts-with(@src,'data:image/png;base64,')])>2][div[*[*[*]]][2][count(div[@class]/div[last()][count(div)=3])>=2]])",
                expectedRegular: 'body',
                expectedContainsArg: "//article//div[count(div[*[*[*]]])=2][count(div[*[*[*]]][1]//img[starts-with(@src,'data:image/png;base64,')])>2][div[*[*[*]]][2][count(div[@class]/div[last()][count(div)=3])>=2]]",
            },
            {
                selector: ':xpath(//article/h1/following-sibling::p[1]/following-sibling::div[1]//div[1][@class][@id][not(ancestor::div[@id]/ancestor::article)])',
                expectedRegular: 'body',
                expectedContainsArg: '//article/h1/following-sibling::p[1]/following-sibling::div[1]//div[1][@class][@id][not(ancestor::div[@id]/ancestor::article)]',
            },
            {
                selector: ':xpath(//article/h1/following-sibling::div[1]/following-sibling::div//div[count(*)>1][not(ancestor::div[count(*)>1]/ancestor::article)]/div[1])',
                expectedRegular: 'body',
                expectedContainsArg: '//article/h1/following-sibling::div[1]/following-sibling::div//div[count(*)>1][not(ancestor::div[count(*)>1]/ancestor::article)]/div[1]',
            },
            {
                selector: ":xpath(//article/h1/following-sibling::div[1]/following-sibling::div//div[count(*)>1]//div[count(*)>1][not(ancestor::div[count(*)>1]/ancestor::div[count(*)>1]/ancestor::article)]/div[.//ul/li|.//a[contains(@href,'/w/%EB%B6%84%EB%A5%98:')]]/following-sibling::div[.//div[contains(concat(' ',normalize-space(@class),' '),' example-toc-ad ')]|.//div[contains(concat(' ',normalize-space(@class),' '),' wiki-paragraph ')]]/following-sibling::div[count(.//*[count(img[starts-with(@src,'//w.example.la/s/')]|img[starts-with(@src,'//ww.example.la/s/')]|img[starts-with(@src,'data:image/png;base64,')])>1])>1])",
                expectedRegular: 'body',
                expectedContainsArg: "//article/h1/following-sibling::div[1]/following-sibling::div//div[count(*)>1]//div[count(*)>1][not(ancestor::div[count(*)>1]/ancestor::div[count(*)>1]/ancestor::article)]/div[.//ul/li|.//a[contains(@href,'/w/%EB%B6%84%EB%A5%98:')]]/following-sibling::div[.//div[contains(concat(' ',normalize-space(@class),' '),' example-toc-ad ')]|.//div[contains(concat(' ',normalize-space(@class),' '),' wiki-paragraph ')]]/following-sibling::div[count(.//*[count(img[starts-with(@src,'//w.example.la/s/')]|img[starts-with(@src,'//ww.example.la/s/')]|img[starts-with(@src,'data:image/png;base64,')])>1])>1]",
            },
            {
                selector: ":xpath(//div[@class='ytp-button ytp-paid-content-overlay-text'])",
                expectedRegular: 'body',
                expectedContainsArg: "//div[@class='ytp-button ytp-paid-content-overlay-text']",
            },
            {
                selector: ':xpath(//div[@class="user-content"]/div[@class="snippet-clear"]/following-sibling::text()[contains(.,"Advertisement")])',
                expectedRegular: 'body',
                expectedContainsArg: '//div[@class="user-content"]/div[@class="snippet-clear"]/following-sibling::text()[contains(.,"Advertisement")]',
            },
        ];
        /* eslint-enable max-len */
        test.each(testsInputs)('%s', ({ selector, expectedRegular, expectedContainsArg }) => {
            expectAbsolutePseudoClassSelector(selector, expectedRegular, pseudoName, expectedContainsArg);
        });
    });

    describe('upward extended pseudo-class', () => {
        it('upward with number arg', () => {
            const selector = 'a[class][redirect]:upward(3)';
            expectAbsolutePseudoClassSelector(selector, 'a[class][redirect]', 'upward', '3');
        });
        describe('upward with selector arg', () => {
            const pseudoName = 'upward';
            const testsInputs = [
                {
                    selector: 'div.advert:upward(.info)',
                    expectedRegular: 'div.advert',
                    expectedContainsArg: '.info',
                },
                {
                    selector: 'img:upward(header ~ div[class])',
                    expectedRegular: 'img',
                    expectedContainsArg: 'header ~ div[class]',
                },
                {
                    selector: '.ad-title + .banner:upward([id][class])',
                    expectedRegular: '.ad-title + .banner',
                    expectedContainsArg: '[id][class]',
                },
            ];
            test.each(testsInputs)('%s', ({ selector, expectedRegular, expectedContainsArg }) => {
                expectAbsolutePseudoClassSelector(selector, expectedRegular, pseudoName, expectedContainsArg);
            });
        });
    });

    /**
     * TODO: ditch while AG-12806
     */
    it('remove', () => {
        const selector = 'div[id][class][style]:remove()';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'div[id][class][style]',
                            children: [],
                        },
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.AbsolutePseudoClass,
                                    name: 'remove',
                                    arg: '',
                                    children: [],
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

describe('relative extended selectors', () => {
    it('has', () => {
        let selector = 'div:has(span)';
        let expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'div',
                            children: [],
                        },
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.RelativePseudoClass,
                                    name: 'has',
                                    children: [
                                        {
                                            // it might be :has(div, a, img)
                                            // so it should be SelectorList
                                            // https://drafts.csswg.org/selectors/#relational
                                            type: NodeType.SelectorList,
                                            children: [
                                                {
                                                    type: NodeType.Selector,
                                                    children: [
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: 'span',
                                                            children: [],
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
        expect(parse(selector)).toEqual(expected);

        selector = 'div.banner > div:has(> a[class^="ad"])';
        expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'div.banner > div',
                            children: [],
                        },
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.RelativePseudoClass,
                                    name: 'has',
                                    children: [
                                        {
                                            // it might be :has(div, a, img)
                                            // so it should be SelectorList
                                            // https://drafts.csswg.org/selectors/#relational
                                            type: NodeType.SelectorList,
                                            children: [
                                                {
                                                    type: NodeType.Selector,
                                                    children: [
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '> a[class^="ad"]',
                                                            children: [],
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
        expect(parse(selector)).toEqual(expected);

        selector = '.banner > :has(span, p)';
        expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: '.banner > *',
                            children: [],
                        },
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.RelativePseudoClass,
                                    name: 'has',
                                    children: [
                                        {
                                            // https://drafts.csswg.org/selectors/#relational
                                            type: NodeType.SelectorList,
                                            children: [
                                                {
                                                    type: NodeType.Selector,
                                                    children: [
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: 'span',
                                                            children: [],
                                                        },
                                                    ],
                                                },
                                                {
                                                    type: NodeType.Selector,
                                                    children: [
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: 'p',
                                                            children: [],
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
        expect(parse(selector)).toEqual(expected);

        /**
         * TODO: .banner > :has(span, p), a img.ad
         */
    });

    it('if-not', () => {
        let selector = 'div.banner:if-not(> span)';
        let expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'div.banner',
                            children: [],
                        },
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.RelativePseudoClass,
                                    name: 'if-not',
                                    children: [
                                        {
                                            type: NodeType.SelectorList,
                                            children: [
                                                {
                                                    type: NodeType.Selector,
                                                    children: [
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '> span',
                                                            children: [],
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
        expect(parse(selector)).toEqual(expected);

        // eslint-disable-next-line max-len
        selector = 'header[data-test-id="header"] ~ div[class]:last-child > div[class] > div[class]:if-not(a[data-test-id="logo-link"])';
        expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'header[data-test-id="header"] ~ div[class]:last-child > div[class] > div[class]',
                            children: [],
                        },
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.RelativePseudoClass,
                                    name: 'if-not',
                                    children: [
                                        {
                                            type: NodeType.SelectorList,
                                            children: [
                                                {
                                                    type: NodeType.Selector,
                                                    children: [
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: 'a[data-test-id="logo-link"]',
                                                            children: [],
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
        expect(parse(selector)).toEqual(expected);
    });

    it('is', () => {
        let selector;
        let expected;

        selector = ':is(.header, .footer)';
        expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'html *',
                            children: [],
                        },
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
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '.header',
                                                            children: [],
                                                        },
                                                    ],
                                                },
                                                {
                                                    type: NodeType.Selector,
                                                    children: [
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '.footer',
                                                            children: [],
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
        expect(parse(selector)).toEqual(expected);

        selector = '#__next > :is(.header, .footer)';
        expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: '#__next > *',
                            children: [],
                        },
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
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '.header',
                                                            children: [],
                                                        },
                                                    ],
                                                },
                                                {
                                                    type: NodeType.Selector,
                                                    children: [
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '.footer',
                                                            children: [],
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
        expect(parse(selector)).toEqual(expected);

        selector = 'h3 > :is(a[href$="/netflix-premium/"], a[href$="/spotify-premium/"], a[title="Disney Premium"])';
        expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'h3 > *',
                            children: [],
                        },
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
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: 'a[href$="/netflix-premium/"]',
                                                            children: [],
                                                        },
                                                    ],
                                                },
                                                {
                                                    type: NodeType.Selector,
                                                    children: [
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: 'a[href$="/spotify-premium/"]',
                                                            children: [],
                                                        },
                                                    ],
                                                },
                                                {
                                                    type: NodeType.Selector,
                                                    children: [
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: 'a[title="Disney Premium"]',
                                                            children: [],
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
        expect(parse(selector)).toEqual(expected);
    });

    it('not', () => {
        let selector = '.banner:not(.header)';
        let expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: '.banner',
                            children: [],
                        },
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
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '.header',
                                                            children: [],
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
        expect(parse(selector)).toEqual(expected);

        selector = 'div.banner > div:not(> a[class^="ad"])';
        expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'div.banner > div',
                            children: [],
                        },
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
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '> a[class^="ad"]',
                                                            children: [],
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
        expect(parse(selector)).toEqual(expected);

        selector = '.banner > :not(span, p)';
        expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: '.banner > *',
                            children: [],
                        },
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
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: 'span',
                                                            children: [],
                                                        },
                                                    ],
                                                },
                                                {
                                                    type: NodeType.Selector,
                                                    children: [
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: 'p',
                                                            children: [],
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
        expect(parse(selector)).toEqual(expected);

        selector = '#child *:not(a, span)';
        expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: '#child *',
                            children: [],
                        },
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
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: 'a',
                                                            children: [],
                                                        },
                                                    ],
                                                },
                                                {
                                                    type: NodeType.Selector,
                                                    children: [
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: 'span',
                                                            children: [],
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
        expect(parse(selector)).toEqual(expected);
    });
});

/**
 * TODO:
 */
// describe('old extended pseudo-class syntax', () => {
//     describe('old contains', () => {
//         it('simple', () => {
//             // a[target="_blank"][-ext-contains="Advertisement"]
//         });
// eslint-disable-next-line max-len
// '[-ext-matches-css-before=\'content:  /^[A-Z][a-z]{2}\\s/  \'][-ext-has=\'+:matches-css-after( content  :   /(\\d+\\s)*me/  ):contains(/^(?![\\s\\S])/)\']'
//         it('contains + contains', () => {
//             // const selector = '*[-ext-contains=\'/\\s[a-t]{8}$/\'] + *:contains(/checking/)';
//         });
//     });
// });

describe('combined extended selectors', () => {
    it(':has():contains()', () => {
        const selector = 'div:has(span):contains(something)';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'div',
                            children: [],
                        },
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
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: 'span',
                                                            children: [],
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
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.AbsolutePseudoClass,
                                    name: 'contains',
                                    arg: 'something',
                                    children: [],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);
    });

    it(':has(> p:contains())', () => {
        const selector = 'div:has(> p:contains(test))';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'div',
                            children: [],
                        },
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
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '> p',
                                                            children: [],
                                                        },
                                                        {
                                                            type: NodeType.ExtendedSelector,
                                                            children: [
                                                                {
                                                                    type: NodeType.AbsolutePseudoClass,
                                                                    name: 'contains',
                                                                    arg: 'test',
                                                                    children: [],
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
        expect(parse(selector)).toEqual(expected);
    });

    it(':has(:contains())', () => {
        const selector = 'div:has(:contains(text))';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'div',
                            children: [],
                        },
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
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '*',
                                                            children: [],
                                                        },
                                                        {
                                                            type: NodeType.ExtendedSelector,
                                                            children: [
                                                                {
                                                                    type: NodeType.AbsolutePseudoClass,
                                                                    name: 'contains',
                                                                    arg: 'text',
                                                                    children: [],
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
        expect(parse(selector)).toEqual(expected);
    });

    it(':is():contains()', () => {
        const selector = '#__next > :is(.header, .footer):contains(ads)';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: '#__next > *',
                            children: [],
                        },
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
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '.header',
                                                            children: [],
                                                        },
                                                    ],
                                                },
                                                {
                                                    type: NodeType.Selector,
                                                    children: [
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '.footer',
                                                            children: [],
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
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.AbsolutePseudoClass,
                                    name: 'contains',
                                    arg: 'ads',
                                    children: [],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);
    });

    it(':is(:has(), :contains())', () => {
        const selector = '#__next > :is(.banner:has(> img), .block:contains(Share))';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: '#__next > *',
                            children: [],
                        },
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
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '.banner',
                                                            children: [],
                                                        },
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
                                                                                        {
                                                                                            type: NodeType.RegularSelector, // eslint-disable-line max-len
                                                                                            value: '> img',
                                                                                            children: [],
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
                                                {
                                                    type: NodeType.Selector,
                                                    children: [
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '.block',
                                                            children: [],
                                                        },
                                                        {
                                                            type: NodeType.ExtendedSelector,
                                                            children: [
                                                                {
                                                                    type: NodeType.AbsolutePseudoClass,
                                                                    name: 'contains',
                                                                    arg: 'Share',
                                                                    children: [],
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
        expect(parse(selector)).toEqual(expected);
    });

    it('selector list with extra space - has , regular selector', () => {
        const selector = '.block:has(> img) , .banner)';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: '.block',
                            children: [],
                        },
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
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '> img',
                                                            children: [],
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
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: '.banner',
                            children: [],
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);
    });

    it(':has(:matches-css-before())', () => {
        // eslint-disable-next-line max-len
        const selector = 'body.zen .zen-lib div.feed__item:has(> div > div > div[class*="__label"] > span:matches-css-before(content:*Яндекс.Директ))';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'body.zen .zen-lib div.feed__item',
                            children: [],
                        },
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
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '> div > div > div[class*="__label"] > span',
                                                            children: [],
                                                        },
                                                        {
                                                            type: NodeType.ExtendedSelector,
                                                            children: [
                                                                {
                                                                    type: NodeType.AbsolutePseudoClass,
                                                                    name: 'matches-css-before',
                                                                    arg: 'content:*Яндекс.Директ',
                                                                    children: [],
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
        expect(parse(selector)).toEqual(expected);
    });

    it(':upward():remove()', () => {
        const selector = 'div:upward(.ads):remove()';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'div',
                            children: [],
                        },
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.AbsolutePseudoClass,
                                    name: 'upward',
                                    arg: '.ads',
                                    children: [],
                                },
                            ],
                        },
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.AbsolutePseudoClass,
                                    name: 'remove',
                                    arg: '',
                                    children: [],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);
    });

    it('upward not', () => {
        const selector = 'div[style="width:640px;height:360px"][id="video-player"]:upward(div):not([class])';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'div[style="width:640px;height:360px"][id="video-player"]',
                            children: [],
                        },
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.AbsolutePseudoClass,
                                    name: 'upward',
                                    arg: 'div',
                                    children: [],
                                },
                            ],
                        },
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
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '[class]',
                                                            children: [],
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
        expect(parse(selector)).toEqual(expected);
    });

    it(':contains():upward()', () => {
        const selector = 'div > p:contains(PR):upward(2)';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'div > p',
                            children: [],
                        },
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.AbsolutePseudoClass,
                                    name: 'contains',
                                    arg: 'PR',
                                    children: [],
                                },
                            ],
                        },
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.AbsolutePseudoClass,
                                    name: 'upward',
                                    arg: '2',
                                    children: [],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);
    });

    it(':upward():matches-css()', () => {
        const selector = '[data-ad-subtype]:upward(1):matches-css(min-height:/[0-9]+/)';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: '[data-ad-subtype]',
                            children: [],
                        },
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.AbsolutePseudoClass,
                                    name: 'upward',
                                    arg: '1',
                                    children: [],
                                },
                            ],
                        },
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.AbsolutePseudoClass,
                                    name: 'matches-css',
                                    arg: 'min-height:/[0-9]+/',
                                    children: [],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);
    });

    it(':has(:not())', () => {
        const selector = 'div:has(:not(span))';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'div',
                            children: [],
                        },
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
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '*',
                                                            children: [],
                                                        },
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
                                                                                        {
                                                                                            type: NodeType.RegularSelector, // eslint-disable-line max-len
                                                                                            value: 'span',
                                                                                            children: [],
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
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);
    });

    it(':not(:contains())', () => {
        const selector = 'p:not(:contains(text))';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'p',
                            children: [],
                        },
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
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '*',
                                                            children: [],
                                                        },
                                                        {
                                                            type: NodeType.ExtendedSelector,
                                                            children: [
                                                                {
                                                                    type: NodeType.AbsolutePseudoClass,
                                                                    name: 'contains',
                                                                    arg: 'text',
                                                                    children: [],
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
        expect(parse(selector)).toEqual(expected);
    });

    it(':not(:has())', () => {
        const selector = 'div:not(:has(span))';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'div',
                            children: [],
                        },
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
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '*',
                                                            children: [],
                                                        },
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
                                                                                        {
                                                                                            type: NodeType.RegularSelector, // eslint-disable-line max-len
                                                                                            value: 'span',
                                                                                            children: [],
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
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);
    });

    it('two not with simple selector next to each other', () => {
        const selector = ':not(span):not(p)';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'html *',
                            children: [],
                        },
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
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: 'span',
                                                            children: [],
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
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: 'p',
                                                            children: [],
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
        expect(parse(selector)).toEqual(expected);
    });
});

describe('combined selectors', () => {
    describe('selectors with standard pseudos', () => {
        it(':not::selection', () => {
            const selector = '*:not(input)::selection';
            const expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: 'html *',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: 'input',
                                                                children: [],
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
                                type: NodeType.RegularSelector,
                                value: '::selection',
                                children: [],
                            },
                        ],
                    },
                ],
            };
            expect(parse(selector)).toEqual(expected);
        });

        it(':not():not()::selection', () => {
            const selector = 'html > body *:not(input):not(textarea)::selection';
            const expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: 'html > body *',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: 'input',
                                                                children: [],
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: 'textarea',
                                                                children: [],
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
                                type: NodeType.RegularSelector,
                                value: '::selection',
                                children: [],
                            },
                        ],
                    },
                ],
            };
            expect(parse(selector)).toEqual(expected);
        });

        it(':not():has(:only-child)', () => {
            // eslint-disable-next-line max-len
            const selector = '#snippet-list-posts > .item:not([id]):has(> .box-responsive:only-child > div[id]:only-child)';
            const expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: '#snippet-list-posts > .item',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '[id]',
                                                                children: [],
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                // eslint-disable-next-line max-len
                                                                value: '> .box-responsive:only-child > div[id]:only-child',
                                                                children: [],
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
            expect(parse(selector)).toEqual(expected);
        });

        it(':last-child:has()', () => {
            const selector = '#__next > div:last-child:has(button.privacy-policy__btn)';
            const expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: '#__next > div:last-child',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: 'button.privacy-policy__btn',
                                                                children: [],
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
            expect(parse(selector)).toEqual(expected);
        });

        it(':not(:nth-child())', () => {
            const selector = '.yellow:not(:nth-child(3))';
            const expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: '.yellow',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '*:nth-child(3)',
                                                                children: [],
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
            expect(parse(selector)).toEqual(expected);
        });

        it(':nth-child():has()', () => {
            const selector = '.entry_text:nth-child(2):has(> #ninja-blog-inactive)';
            const expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: '.entry_text:nth-child(2)',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '> #ninja-blog-inactive',
                                                                children: [],
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
            expect(parse(selector)).toEqual(expected);
        });

        it('two not with standard pseudo next to each other', () => {
            const selector = ':not(:empty):not(:hover)';
            const expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: 'html *',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '*:empty',
                                                                children: [],
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '*:hover',
                                                                children: [],
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
            expect(parse(selector)).toEqual(expected);
        });
    });

    it('selector list with regular "any" and extended :contains', () => {
        const selector = '.banner, :contains(#ad)';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: '.banner',
                            children: [],
                        },
                    ],
                },
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: '*',
                            children: [],
                        },
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.AbsolutePseudoClass,
                                    name: 'contains',
                                    arg: '#ad',
                                    children: [],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);
    });

    it('has with selector list - regular and extended', () => {
        const selector = 'div:has(.banner, :contains(!))';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'div',
                            children: [],
                        },
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
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '.banner',
                                                            children: [],
                                                        },
                                                    ],
                                                },
                                                {
                                                    type: NodeType.Selector,
                                                    children: [
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '*',
                                                            children: [],
                                                        },
                                                        {
                                                            type: NodeType.ExtendedSelector,
                                                            children: [
                                                                {
                                                                    type: NodeType.AbsolutePseudoClass,
                                                                    name: 'contains',
                                                                    arg: '!',
                                                                    children: [],
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
        expect(parse(selector)).toEqual(expected);
    });

    it('not has with selector list - regular and extended', () => {
        const selector = 'a[class]:not(:has(*, :contains(*)))';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'a[class]',
                            children: [],
                        },
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
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '*',
                                                            children: [],
                                                        },
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
                                                                                        {
                                                                                            type: NodeType.RegularSelector, // eslint-disable-line max-len
                                                                                            value: '*',
                                                                                            children: [],
                                                                                        },
                                                                                    ],
                                                                                },
                                                                                {
                                                                                    type: NodeType.Selector,
                                                                                    children: [
                                                                                        {
                                                                                            type: NodeType.RegularSelector, // eslint-disable-line max-len
                                                                                            value: '*',
                                                                                            children: [],
                                                                                        },
                                                                                        {
                                                                                            type: NodeType.ExtendedSelector, // eslint-disable-line max-len
                                                                                            children: [
                                                                                                {
                                                                                                    type: NodeType.AbsolutePseudoClass, // eslint-disable-line max-len
                                                                                                    name: 'contains',
                                                                                                    arg: '*',
                                                                                                    children: [],
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
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);
    });

    it('selector list with combined-extended and simple-extended selectors', () => {
        const selector = 'div:has(.banner, :contains(!)), p:contains(text)';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'div',
                            children: [],
                        },
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
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '.banner',
                                                            children: [],
                                                        },
                                                    ],
                                                },
                                                {
                                                    type: NodeType.Selector,
                                                    children: [
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '*',
                                                            children: [],
                                                        },
                                                        {
                                                            type: NodeType.ExtendedSelector,
                                                            children: [
                                                                {
                                                                    type: NodeType.AbsolutePseudoClass,
                                                                    name: 'contains',
                                                                    arg: '!',
                                                                    children: [],
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
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'p',
                            children: [],
                        },
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.AbsolutePseudoClass,
                                    name: 'contains',
                                    arg: 'text',
                                    children: [],
                                },
                            ],
                        },
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
                        {
                            type: NodeType.RegularSelector,
                            value: 'a[class*=blog]',
                            children: [],
                        },
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
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '*',
                                                            children: [],
                                                        },
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
                                                                                        {
                                                                                            type: NodeType.RegularSelector, // eslint-disable-line max-len
                                                                                            value: '*',
                                                                                            children: [],
                                                                                        },
                                                                                    ],
                                                                                },
                                                                                {
                                                                                    type: NodeType.Selector,
                                                                                    children: [
                                                                                        {
                                                                                            type: NodeType.RegularSelector, // eslint-disable-line max-len
                                                                                            value: '*',
                                                                                            children: [],
                                                                                        },
                                                                                        {
                                                                                            type: NodeType.ExtendedSelector, // eslint-disable-line max-len
                                                                                            children: [
                                                                                                {
                                                                                                    type: NodeType.AbsolutePseudoClass, // eslint-disable-line max-len
                                                                                                    name: 'contains',
                                                                                                    arg: '!',
                                                                                                    children: [],
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
                                                {
                                                    type: NodeType.Selector,
                                                    children: [
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '*',
                                                            children: [],
                                                        },
                                                        {
                                                            type: NodeType.ExtendedSelector,
                                                            children: [
                                                                {
                                                                    type: NodeType.AbsolutePseudoClass,
                                                                    name: 'contains',
                                                                    arg: '!',
                                                                    children: [],
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
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'br',
                            children: [],
                        },
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.AbsolutePseudoClass,
                                    name: 'contains',
                                    arg: ']',
                                    children: [],
                                },
                            ],
                        },
                    ],
                },
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'p',
                            children: [],
                        },
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.AbsolutePseudoClass,
                                    name: 'contains',
                                    arg: ']',
                                    children: [],
                                },
                            ],
                        },
                    ],
                },
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: '*',
                            children: [],
                        },
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
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '*:empty',
                                                            children: [],
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
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '*:parent',
                                                            children: [],
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
        expect(parse(selector)).toEqual(expected);
    });

    describe('has pseudo-class limitation', () => {
        it('no inner :has, :is, :where for :has', () => {
            let selector: string;

            selector = 'banner:has(> div:has(> img))';
            expect(() => {
                parse(selector);
            }).toThrow('Usage of :has pseudo-class is not allowed inside upper :has');

            selector = 'banner:has(> div:is(> img))';
            expect(() => {
                parse(selector);
            }).toThrow('Usage of :is pseudo-class is not allowed inside upper :has');

            selector = 'banner:has(> div:where(> img))';
            expect(() => {
                parse(selector);
            }).toThrow('Usage of :where pseudo-class is not allowed inside upper :has');
        });

        it('no :has inside regular pseudos', () => {
            const selector = '::slotted(:has(.a))';
            expect(() => {
                parse(selector);
            }).toThrow('Usage of :has pseudo-class is not allowed inside regular pseudo');
        });

        it('no :has after pseudo-elements', () => {
            const selector = '::part(foo):has(.a)';
            expect(() => {
                parse(selector);
            }).toThrow('Usage of :has pseudo-class is not allowed after any regular pseudo-element');
        });
    });

    describe('regular selector AFTER extended absolute selector', () => {
        it('absolute pseudo-class + space after it', () => {
            let selector;
            let expected;

            selector = '.test:upward(3) .banner';
            expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: '.test',
                                children: [],
                            },
                            {
                                type: NodeType.ExtendedSelector,
                                children: [
                                    {
                                        type: NodeType.AbsolutePseudoClass,
                                        name: 'upward',
                                        arg: '3',
                                        children: [],
                                    },
                                ],
                            },
                            {
                                type: NodeType.RegularSelector,
                                value: '.banner',
                                children: [],
                            },
                        ],
                    },
                ],
            };
            expect(parse(selector)).toEqual(expected);

            selector = '.test:nth-ancestor(1) > .banner';
            expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: '.test',
                                children: [],
                            },
                            {
                                type: NodeType.ExtendedSelector,
                                children: [
                                    {
                                        type: NodeType.AbsolutePseudoClass,
                                        name: 'nth-ancestor',
                                        arg: '1',
                                        children: [],
                                    },
                                ],
                            },
                            {
                                type: NodeType.RegularSelector,
                                value: '> .banner',
                                children: [],
                            },
                        ],
                    },
                ],
            };
            expect(parse(selector)).toEqual(expected);

            selector = '.test:upward(3) > .banner > *';
            expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: '.test',
                                children: [],
                            },
                            {
                                type: NodeType.ExtendedSelector,
                                children: [
                                    {
                                        type: NodeType.AbsolutePseudoClass,
                                        name: 'upward',
                                        arg: '3',
                                        children: [],
                                    },
                                ],
                            },
                            {
                                type: NodeType.RegularSelector,
                                value: '> .banner > *',
                                children: [],
                            },
                        ],
                    },
                ],
            };
            expect(parse(selector)).toEqual(expected);

            selector = '.test:upward(#top .block) .banner';
            expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: '.test',
                                children: [],
                            },
                            {
                                type: NodeType.ExtendedSelector,
                                children: [
                                    {
                                        type: NodeType.AbsolutePseudoClass,
                                        name: 'upward',
                                        arg: '#top .block',
                                        children: [],
                                    },
                                ],
                            },
                            {
                                type: NodeType.RegularSelector,
                                value: '.banner',
                                children: [],
                            },
                        ],
                    },
                ],
            };
            expect(parse(selector)).toEqual(expected);

            selector = '.test:upward(#top > .block) .banner';
            expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: '.test',
                                children: [],
                            },
                            {
                                type: NodeType.ExtendedSelector,
                                children: [
                                    {
                                        type: NodeType.AbsolutePseudoClass,
                                        name: 'upward',
                                        arg: '#top > .block',
                                        children: [],
                                    },
                                ],
                            },
                            {
                                type: NodeType.RegularSelector,
                                value: '.banner',
                                children: [],
                            },
                        ],
                    },
                ],
            };
            expect(parse(selector)).toEqual(expected);

            selector = '.test:nth-ancestor(1)> .banner';
            expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: '.test',
                                children: [],
                            },
                            {
                                type: NodeType.ExtendedSelector,
                                children: [
                                    {
                                        type: NodeType.AbsolutePseudoClass,
                                        name: 'nth-ancestor',
                                        arg: '1',
                                        children: [],
                                    },
                                ],
                            },
                            {
                                type: NodeType.RegularSelector,
                                value: '> .banner',
                                children: [],
                            },
                        ],
                    },
                ],
            };
            expect(parse(selector)).toEqual(expected);

            selector = '#main .target:nth-ancestor(2)+ .banner';
            expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: '#main .target',
                                children: [],
                            },
                            {
                                type: NodeType.ExtendedSelector,
                                children: [
                                    {
                                        type: NodeType.AbsolutePseudoClass,
                                        name: 'nth-ancestor',
                                        arg: '2',
                                        children: [],
                                    },
                                ],
                            },
                            {
                                type: NodeType.RegularSelector,
                                value: '+ .banner',
                                children: [],
                            },
                        ],
                    },
                ],
            };
            expect(parse(selector)).toEqual(expected);
        });
    });

    describe('regular selector AFTER extended relative selector', () => {
        it('relative pseudo-class and following regular selector', () => {
            let selector;
            let expected;

            selector = '.banner:has(img) .inner';
            expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: '.banner',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: 'img',
                                                                children: [],
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
                                type: NodeType.RegularSelector,
                                value: '.inner',
                                children: [],
                            },
                        ],
                    },
                ],
            };
            expect(parse(selector)).toEqual(expected);

            selector = ':not([class^="Navigation__subscribe"]) > div[data-cm-unit="show-failsafe"]';
            expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: 'html *',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '[class^="Navigation__subscribe"]',
                                                                children: [],
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
                                type: NodeType.RegularSelector,
                                value: '> div[data-cm-unit="show-failsafe"]',
                                children: [],
                            },
                        ],
                    },
                ],
            };
            expect(parse(selector)).toEqual(expected);

            selector = '.header > header + [id*="-"]:not([class]) > a[href*="adblock"]';
            expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: '.header > header + [id*="-"]',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '[class]',
                                                                children: [],
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
                                type: NodeType.RegularSelector,
                                value: '> a[href*="adblock"]',
                                children: [],
                            },
                        ],
                    },
                ],
            };
            expect(parse(selector)).toEqual(expected);

            selector = 'html:has(> body) > body.no_scroll';
            expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: 'html',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '> body',
                                                                children: [],
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
                                type: NodeType.RegularSelector,
                                value: '> body.no_scroll',
                                children: [],
                            },
                        ],
                    },
                ],
            };
            expect(parse(selector)).toEqual(expected);

            selector = 'td[align="left"]:not([width]) > a > img';
            expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: 'td[align="left"]',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '[width]',
                                                                children: [],
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
                                type: NodeType.RegularSelector,
                                value: '> a > img',
                                children: [],
                            },
                        ],
                    },
                ],
            };
            expect(parse(selector)).toEqual(expected);
        });

        it('relative pseudo-class + specified combinator after it', () => {
            let selector;
            let expected;

            selector = 'div:has(> #banner)> .inner';
            expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: 'div',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '> #banner',
                                                                children: [],
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
                                type: NodeType.RegularSelector,
                                value: '> .inner',
                                children: [],
                            },
                        ],
                    },
                ],
            };
            expect(parse(selector)).toEqual(expected);

            selector = 'td[align="left"]:not([width])+ a > img';
            expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: 'td[align="left"]',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '[width]',
                                                                children: [],
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
                                type: NodeType.RegularSelector,
                                value: '+ a > img',
                                children: [],
                            },
                        ],
                    },
                ],
            };
            expect(parse(selector)).toEqual(expected);
        });
    });

    describe('combined after combined with any combinator between', () => {
        it('contains + contains', () => {
            const selector = 'div:contains(base) + .paragraph:contains(text)';
            const expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: 'div',
                                children: [],
                            },
                            {
                                type: NodeType.ExtendedSelector,
                                children: [
                                    {
                                        type: NodeType.AbsolutePseudoClass,
                                        name: 'contains',
                                        arg: 'base',
                                        children: [],
                                    },
                                ],
                            },
                            {
                                type: NodeType.RegularSelector,
                                value: '+ .paragraph',
                                children: [],
                            },
                            {
                                type: NodeType.ExtendedSelector,
                                children: [
                                    {
                                        type: NodeType.AbsolutePseudoClass,
                                        name: 'contains',
                                        arg: 'text',
                                        children: [],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            };
            expect(parse(selector)).toEqual(expected);
        });

        it('not > contains', () => {
            const selector = '#root > div:not([class]) > div:contains(PRIVACY)';
            const expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: '#root > div',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '[class]',
                                                                children: [],
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
                                type: NodeType.RegularSelector,
                                value: '> div',
                                children: [],
                            },
                            {
                                type: NodeType.ExtendedSelector,
                                children: [
                                    {
                                        type: NodeType.AbsolutePseudoClass,
                                        name: 'contains',
                                        arg: 'PRIVACY',
                                        children: [],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            };
            expect(parse(selector)).toEqual(expected);
        });

        it('matches-attr > has', () => {
            // eslint-disable-next-line max-len
            const selector = '#app > div[class]:matches-attr("/data-v-/") > div > div:has(> a[href="https://example.com"])';
            const expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: '#app > div[class]',
                                children: [],
                            },
                            {
                                type: NodeType.ExtendedSelector,
                                children: [
                                    {
                                        type: NodeType.AbsolutePseudoClass,
                                        name: 'matches-attr',
                                        arg: '"/data-v-/"',
                                        children: [],
                                    },
                                ],
                            },
                            {
                                type: NodeType.RegularSelector,
                                value: '> div > div',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '> a[href="https://example.com"]',
                                                                children: [],
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
            expect(parse(selector)).toEqual(expected);
        });

        it('not not > has', () => {
            // eslint-disable-next-line max-len
            const selector = 'tr[data-id]:not([class]):not([id]) > td[class] > div[class*=" "]:has(> div[class*=" "] > iframe[src^="https://example.org/"])';
            const expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: 'tr[data-id]',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '[class]',
                                                                children: [],
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '[id]',
                                                                children: [],
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
                                type: NodeType.RegularSelector,
                                value: '> td[class] > div[class*=" "]',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                // eslint-disable-next-line max-len
                                                                value: '> div[class*=" "] > iframe[src^="https://example.org/"]',
                                                                children: [],
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
            expect(parse(selector)).toEqual(expected);
        });

        it('not > not not has', () => {
            // eslint-disable-next-line max-len
            const selector = 'div:not([style^="min-height:"]) > div[id][data-id^="toolkit-"]:not([data-bem]):not([data-m]):has(a[href^="https://example."]>img)';
            const expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: 'div',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '[style^="min-height:"]',
                                                                children: [],
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
                                type: NodeType.RegularSelector,
                                value: '> div[id][data-id^="toolkit-"]',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '[data-bem]',
                                                                children: [],
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '[data-m]',
                                                                children: [],
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: 'a[href^="https://example."]>img',
                                                                children: [],
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
            expect(parse(selector)).toEqual(expected);
        });

        it('not > upward', () => {
            // eslint-disable-next-line max-len
            const selector = '#root > div:not([class])> div[class] > div[class] > span[class] + a[href="https://example.org/test"]:upward(2)';
            const expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: '#root > div',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '[class]',
                                                                children: [],
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
                                type: NodeType.RegularSelector,
                                value: '> div[class] > div[class] > span[class] + a[href="https://example.org/test"]',
                                children: [],
                            },
                            {
                                type: NodeType.ExtendedSelector,
                                children: [
                                    {
                                        type: NodeType.AbsolutePseudoClass,
                                        name: 'upward',
                                        arg: '2',
                                        children: [],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            };
            expect(parse(selector)).toEqual(expected);
        });

        it('not not > regular', () => {
            const selector = 'body > div[id="root"] ~ script +div:not([class]):not([id]) > div[class*=" "]';
            const expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: 'body > div[id="root"] ~ script +div',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '[class]',
                                                                children: [],
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '[id]',
                                                                children: [],
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
                                type: NodeType.RegularSelector,
                                value: '> div[class*=" "]',
                                children: [],
                            },
                        ],
                    },
                ],
            };
            expect(parse(selector)).toEqual(expected);
        });

        it('not not > not not', () => {
            // eslint-disable-next-line max-len
            const selector = '#peek > div:not([class]):not([id]) > div[data-root][style*="position: fixed; bottom: 0px; z-index: 1000; display: flex; min-width: 50%; margin: 8px;"]:not([class]):not([id])';
            const expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: '#peek > div',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '[class]',
                                                                children: [],
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '[id]',
                                                                children: [],
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
                                type: NodeType.RegularSelector,
                                // eslint-disable-next-line max-len
                                value: '> div[data-root][style*="position: fixed; bottom: 0px; z-index: 1000; display: flex; min-width: 50%; margin: 8px;"]',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '[class]',
                                                                children: [],
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '[id]',
                                                                children: [],
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
            expect(parse(selector)).toEqual(expected);
        });

        it('matches-css > contains upward', () => {
            // eslint-disable-next-line max-len
            const selector = '#content-container > div[class] > div[class]:matches-css(z-index: 10) > div[class] > div[class] > h4:contains(cookies):upward(4)';
            const expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: '#content-container > div[class] > div[class]',
                                children: [],
                            },
                            {
                                type: NodeType.ExtendedSelector,
                                children: [
                                    {
                                        type: NodeType.AbsolutePseudoClass,
                                        name: 'matches-css',
                                        arg: 'z-index: 10',
                                        children: [],
                                    },
                                ],
                            },
                            {
                                type: NodeType.RegularSelector,
                                value: '> div[class] > div[class] > h4',
                                children: [],
                            },
                            {
                                type: NodeType.ExtendedSelector,
                                children: [
                                    {
                                        type: NodeType.AbsolutePseudoClass,
                                        name: 'contains',
                                        arg: 'cookies',
                                        children: [],
                                    },
                                ],
                            },
                            {
                                type: NodeType.ExtendedSelector,
                                children: [
                                    {
                                        type: NodeType.AbsolutePseudoClass,
                                        name: 'upward',
                                        arg: '4',
                                        children: [],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            };
            expect(parse(selector)).toEqual(expected);
        });

        it('not > has(not > regular)', () => {
            // eslint-disable-next-line max-len
            const selector = 'body > div:not([class]) > div[class]:has(> div:not([class]) > .branch-journeys-top a[target="_blank"][href^="/policy/"])';
            const expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: 'body > div',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '[class]',
                                                                children: [],
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
                                type: NodeType.RegularSelector,
                                value: '> div[class]',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '> div',
                                                                children: [],
                                                            },
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
                                                                                            {
                                                                                                type: NodeType.RegularSelector, // eslint-disable-line max-len
                                                                                                value: '[class]',
                                                                                                children: [],
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
                                                                type: NodeType.RegularSelector,
                                                                // eslint-disable-next-line max-len
                                                                value: '> .branch-journeys-top a[target="_blank"][href^="/policy/"]',
                                                                children: [],
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
            expect(parse(selector)).toEqual(expected);
        });

        it('not > only-child contains upward', () => {
            // eslint-disable-next-line max-len
            const selector = '.content > .block.rel ~ div[class*=" "]:not(.clear) > a[href="javascript:void(0)"]:only-child:contains(/^Open app$/):upward(1)';
            const expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: '.content > .block.rel ~ div[class*=" "]',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '.clear',
                                                                children: [],
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
                                type: NodeType.RegularSelector,
                                value: '> a[href="javascript:void(0)"]:only-child',
                                children: [],
                            },
                            {
                                type: NodeType.ExtendedSelector,
                                children: [
                                    {
                                        type: NodeType.AbsolutePseudoClass,
                                        name: 'contains',
                                        arg: '/^Open app$/',
                                        children: [],
                                    },
                                ],
                            },
                            {
                                type: NodeType.ExtendedSelector,
                                children: [
                                    {
                                        type: NodeType.AbsolutePseudoClass,
                                        name: 'upward',
                                        arg: '1',
                                        children: [],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            };
            expect(parse(selector)).toEqual(expected);
        });

        it('not~not', () => {
            const selector = 'article>div[id]:not([class])~div[class]:not([id])';
            const expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: 'article>div[id]',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '[class]',
                                                                children: [],
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
                                type: NodeType.RegularSelector,
                                value: '~div[class]',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '[id]',
                                                                children: [],
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
            expect(parse(selector)).toEqual(expected);
        });

        it('empty not not ~ empty not not + empty not not + not', () => {
            // eslint-disable-next-line max-len
            const selector = 'body > script + div:empty:not([class]):not([id]) ~ div:empty:not([class]):not([id]) + div:empty:not([class]):not([id]) + [id]:not([class])';
            const expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: 'body > script + div:empty',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '[class]',
                                                                children: [],
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '[id]',
                                                                children: [],
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
                                type: NodeType.RegularSelector,
                                value: '~ div:empty',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '[class]',
                                                                children: [],
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '[id]',
                                                                children: [],
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
                                type: NodeType.RegularSelector,
                                value: '+ div:empty',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '[class]',
                                                                children: [],
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '[id]',
                                                                children: [],
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
                                type: NodeType.RegularSelector,
                                value: '+ [id]',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '[class]',
                                                                children: [],
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
            expect(parse(selector)).toEqual(expected);
        });

        it('has(matches-css+ matches-css)', () => {
            // eslint-disable-next-line max-len
            const selector = '.category-double-article-container:has(.half-article:matches-css(display:none)+ .half-article:matches-css(display:none))';
            const expected = {
                type: NodeType.SelectorList,
                children: [
                    {
                        type: NodeType.Selector,
                        children: [
                            {
                                type: NodeType.RegularSelector,
                                value: '.category-double-article-container',
                                children: [],
                            },
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
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '.half-article',
                                                                children: [],
                                                            },
                                                            {
                                                                type: NodeType.ExtendedSelector,
                                                                children: [
                                                                    {
                                                                        type: NodeType.AbsolutePseudoClass,
                                                                        name: 'matches-css',
                                                                        arg: 'display:none',
                                                                        children: [],
                                                                    },
                                                                ],
                                                            },
                                                            {
                                                                type: NodeType.RegularSelector,
                                                                value: '+ .half-article',
                                                                children: [],
                                                            },
                                                            {
                                                                type: NodeType.ExtendedSelector,
                                                                children: [
                                                                    {
                                                                        type: NodeType.AbsolutePseudoClass,
                                                                        name: 'matches-css',
                                                                        arg: 'display:none',
                                                                        children: [],
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
            expect(parse(selector)).toEqual(expected);
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
        test.each(
            rawSelectors.map((raw) => ({ raw })),
        )('%s', ({ raw }) => {
            expectRegularSelector(raw, expected);
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

        test.each(
            validSelectors.map((selector) => ({ selector })),
        )('%s', ({ selector }) => {
            expectRegularSelector(selector);
        });
    });

    it('selector list', () => {
        const selectorList = 'a[data-st-area*="backTo" i], a[data-st-area*="goToSG" i]';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'a[data-st-area*="backTo" i]',
                            children: [],
                        },
                    ],
                },
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'a[data-st-area*="goToSG" i]',
                            children: [],
                        },
                    ],
                },
            ],
        };
        expect(parse(selectorList)).toEqual(expected);
    });

    it('extended selectors', () => {
        let selector;
        let expected;

        selector = 'body:has(div[class="page" i])';
        expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'body',
                            children: [],
                        },
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
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: 'div[class="page" i]',
                                                            children: [],
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
        expect(parse(selector)).toEqual(expected);

        selector = 'div > .fb-page[data-href$="/link/" i]:upward(2)';
        expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'div > .fb-page[data-href$="/link/" i]',
                            children: [],
                        },
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.AbsolutePseudoClass,
                                    name: 'upward',
                                    arg: '2',
                                    children: [],
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
