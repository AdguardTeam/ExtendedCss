import { parse } from '../../src/parser';

import { NodeType } from '../../src/nodes';

describe('regular selectors', () => {
    it('simple', () => {
        const selector = 'div';
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
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);
    });

    it('compound', () => {
        let selector = 'div.banner';
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
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);

        selector = 'div.ad > a.redirect + a';
        expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'div.ad > a.redirect + a',
                            children: [],
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);

        selector = 'div[style]';
        expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'div[style]',
                            children: [],
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);

        selector = 'div#top[onclick*="redirect"]';
        expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'div#top[onclick*="redirect"]',
                            children: [],
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);
    });

    it('complex', () => {
        let selector = 'div > span';
        let expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'div > span',
                            children: [],
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);

        selector = '.banner + div[style="clear:both;"]';
        expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: '.banner + div[style="clear:both;"]',
                            children: [],
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);
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
    });

    it('regular selector with pseudo-class', () => {
        const selector = 'div:hover';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'div:hover',
                            children: [],
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);
    });
});

describe('absolute extended selectors', () => {
    it('contains', () => {
        let selector = 'span:contains(text)';
        let expected = {
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

        selector = 'div[id] > .row > span:contains(/^Advertising$/)';
        expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'div[id] > .row > span',
                            children: [],
                        },
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.AbsolutePseudoClass,
                                    name: 'contains',
                                    arg: '/^Advertising$/',
                                    children: [],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);

        selector = 'div > :contains(test)';
        expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'div > *',
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
        };
        expect(parse(selector)).toEqual(expected);

        selector = ':contains((test))';
        expected = {
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
                                    arg: '(test)',
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

    it('matches-css', () => {
        let selector;
        let expected;

        selector = '*:matches-css(width:400px)';
        expected = {
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
                                    name: 'matches-css',
                                    arg: 'width:400px',
                                    children: [],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);

        selector = 'div:matches-css(background-image: /^url\\("data:image\\/gif;base64.+/)';
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
                                    type: NodeType.AbsolutePseudoClass,
                                    name: 'matches-css',
                                    arg: 'background-image: /^url\\("data:image\\/gif;base64.+/',
                                    children: [],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);

        selector = 'div:matches-css(background-image: /^url\\([a-z]{4}:[a-z]{5}/)';
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
                                    type: NodeType.AbsolutePseudoClass,
                                    name: 'matches-css',
                                    arg: 'background-image: /^url\\([a-z]{4}:[a-z]{5}/',
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

    it('matches-attr', () => {
        const selector = 'div:matches-attr("/data-v-/")';
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
                                    name: 'matches-attr',
                                    arg: '"/data-v-/"',
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

    it('nth-ancestor', () => {
        const selector = 'a:nth-ancestor(2)';
        const expected = {
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
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);
    });

    it('xpath', () => {
        let selector;
        let expected;

        selector = 'div:xpath(//h3[contains(text(),"Share it!")]/..)';
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
                                    type: NodeType.AbsolutePseudoClass,
                                    name: 'xpath',
                                    arg: '//h3[contains(text(),"Share it!")]/..',
                                    children: [],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);

        selector = '[data-src^="https://example.org/"]:xpath(..)';
        expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: '[data-src^="https://example.org/"]',
                            children: [],
                        },
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.AbsolutePseudoClass,
                                    name: 'xpath',
                                    arg: '..',
                                    children: [],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);

        selector = ':xpath(//div[@data-st-area=\'Advert\'][count(*)=2][not(header)])';
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
                                    type: NodeType.AbsolutePseudoClass,
                                    name: 'xpath',
                                    arg: '//div[@data-st-area=\'Advert\'][count(*)=2][not(header)]',
                                    children: [],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);

        // TODO:
        // eslint-disable-next-line max-len
        // namu.wiki##:xpath(//article//div[count(div[*[*[*]]])=2][count(div[*[*[*]]][1]//img[starts-with(@src,'data:image/png;base64,')])>2][div[*[*[*]]][2][count(div[@class]/div[last()][count(div)=3])>=2]])
        // eslint-disable-next-line max-len
        // namu.wiki##:xpath(//article/h1/following-sibling::p[1]/following-sibling::div[1]//div[1][@class][@id][not(ancestor::div[@id]/ancestor::article)])
    });

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
});

describe('upward extended pseudo-class', () => {
    it('number arg - absolute', () => {
        const selector = 'a[class][redirect]:upward(3)';
        const expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'a[class][redirect]',
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
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);
    });

    it('selector arg - relative', () => {
        let selector = 'div.advert:upward(.info)';
        let expected = {
            type: NodeType.SelectorList,
            children: [
                {
                    type: NodeType.Selector,
                    children: [
                        {
                            type: NodeType.RegularSelector,
                            value: 'div.advert',
                            children: [],
                        },
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.RelativePseudoClass,
                                    name: 'upward',
                                    children: [
                                        {
                                            type: NodeType.SelectorList,
                                            children: [
                                                {
                                                    type: NodeType.Selector,
                                                    children: [
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '.info',
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

        selector = 'img:upward(header ~ div[class])';
        expected = {
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
                        {
                            type: NodeType.ExtendedSelector,
                            children: [
                                {
                                    type: NodeType.RelativePseudoClass,
                                    name: 'upward',
                                    children: [
                                        {
                                            type: NodeType.SelectorList,
                                            children: [
                                                {
                                                    type: NodeType.Selector,
                                                    children: [
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: 'header ~ div[class]',
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

    it(':has(:contains())', () => {
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
                                    type: NodeType.RelativePseudoClass,
                                    name: 'upward',
                                    children: [
                                        {
                                            type: NodeType.SelectorList,
                                            children: [
                                                {
                                                    type: NodeType.Selector,
                                                    children: [
                                                        {
                                                            type: NodeType.RegularSelector,
                                                            value: '.ads',
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

    /**
     * TODO
     */
    // it(':contains() + :contains()', () => {
    //     const selector = 'div:contains(base) + .paragraph:contains(text)';
    //     const expected = {
    //         type: NodeType.SelectorList,
    //         children: [
    //             {
    //                 type: NodeType.Selector,
    //                 children: [
    //                     {
    //                         type: NodeType.RegularSelector,
    //                         value: 'div',
    //                     },
    //                     {
    //                         type: NodeType.ExtendedSelector,
    //                         children: [
    //                             {
    //                                 type: NodeType.AbsolutePseudoClass,
    //                                 name: 'contains',
    //                                 arg: 'base',
    //                             },
    //                         ],
    //                     },
    //                     {
    //                         type: NodeType.RegularSelector,
    //                         value: ' + .paragraph',
    //                     },
    //                     {
    //                         type: NodeType.ExtendedSelector,
    //                         children: [
    //                             {
    //                                 type: NodeType.AbsolutePseudoClass,
    //                                 name: 'contains',
    //                                 arg: 'text',
    //                             },
    //                         ],
    //                     },
    //                 ],
    //             },
    //         ],
    //     };
    //     expect(parse(selector)).toEqual(expected);
    // });
});

/**
 * TODO: extended and standard pseudo-classes combined, and other combinations
 *
 * div[style="width:640px;height:360px"][id="video-player"]:upward(div:not([class]))
 * a[href^="https://kampanj."]:upward(1):not(section)
 *
 * .vjs-playing:upward(1) ~ .no-autoplay-overlay
 */

/**
 * TODO: fix test after style declaration support
 */
// describe('style declaration', () => {
//     it('style declaration', () => {
//         let selector = 'div { display: none; }';
//         let expected = {
//             type: 'CosmeticRule',
//             start: 0,
//             end: 21,
//             children: [
//                 {
//                     type: NodeTypes.REGULAR, // no pseudo in it
//                     start: 0,
//                     end: 2,
//                     children: [
//                         {
//                             type: 'SimpleSelector',
//                             start: 0,
//                             end: 2,
//                             children: [
//                                 {
//                                     type: 'TypeSelector',
//                                     start: 0,
//                                     end: 2,
//                                     value: 'div',
//                                 },
//                             ],
//                         },
//                     ],
//                 },
//                 {
//                     type: 'Space',
//                     start: 3,
//                     end: 4,
//                     // children: null, // TODO: remove later
//                 },
//                 {
//                     type: 'DeclarationBlock',
//                     start: 4,
//                     end: 21,
//                     children: [
//                         {
//                             type: 'Declaration',
//                             start: 6,
//                             end: 19,
//                             children: [
//                                 {
//                                     type: 'Property',
//                                     start: 6,
//                                     end: 13,
//                                     value: 'display',
//                                 },
//                                 {
//                                     type: 'Value',
//                                     start: 14,
//                                     end: 21,
//                                     value: 'display',
//                                 },
//                             ],
//                         },
//                     ],
//                 },
//             ],
//         };
//         expect(parser(selector)).toEqual(expected);

//         selector = 'div { display: none!important; }';
//         expected = {
//             type: 'CosmeticRule',
//             start: 0,
//             end: 32,
//             children: [
//                 {
//                     type: NodeTypes.REGULAR, // no pseudo in it
//                     start: 0,
//                     end: 2,
//                     children: [
//                         {
//                             type: 'SimpleSelector',
//                             start: 0,
//                             end: 2,
//                             children: [
//                                 {
//                                     type: 'TypeSelector',
//                                     start: 0,
//                                     end: 2,
//                                     value: 'div',
//                                 },
//                             ],
//                         },
//                     ],
//                 },
//                 {
//                     type: 'Space',
//                     start: 3,
//                     end: 4,
//                     // children: null, // TODO: remove later
//                 },
//                 {
//                     type: 'DeclarationBlock',
//                     start: 4,
//                     end: 32,
//                     children: [
//                         {
//                             type: 'Declaration',
//                             start: 6,
//                             end: 19,
//                             children: [
//                                 {
//                                     type: 'Property',
//                                     start: 6,
//                                     end: 13,
//                                     value: 'display',
//                                 },
//                                 {
//                                     type: 'Value',
//                                     start: 14,
//                                     end: 21,
//                                     value: 'display',
//                                 },
//                                 {
//                                     type: 'CssRule',
//                                     start: 20,
//                                     end: 29,
//                                     value: 'important',
//                                 },
//                             ],
//                         },
//                     ],
//                 },
//             ],
//         };
//         expect(parser(selector)).toEqual(expected);
//     });
// });
