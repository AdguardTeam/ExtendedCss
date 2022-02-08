import { parse } from '../../src/parser';

import { NodeTypes } from '../../src/nodes';

describe('regular selectors', () => {
    it('simple', () => {
        const selector = 'div';
        const expected = {
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: 'div',
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
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: 'div.banner',
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);

        selector = 'div.ad > a.redirect + a';
        expected = {
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: 'div.ad > a.redirect + a',
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);

        selector = 'div[style]';
        expected = {
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: 'div[style]',
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);

        selector = 'div#top[onclick*="redirect"]';
        expected = {
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: 'div#top[onclick*="redirect"]',
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
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: 'div > span',
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);

        selector = '.banner + div[style="clear:both;"]';
        expected = {
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: '.banner + div[style="clear:both;"]',
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
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: 'div',
                        },
                    ],
                },
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: 'span',
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);

        selector = 'div.banner, span[ad], div > a > img';
        expected = {
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: 'div.banner',
                        },
                    ],
                },
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: 'span[ad]',
                        },
                    ],
                },
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: 'div > a > img',
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
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: 'div:hover',
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
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: 'span',
                        },
                        {
                            type: NodeTypes.ExtendedSelector,
                            children: [
                                {
                                    type: NodeTypes.AbsolutePseudoClass,
                                    name: 'contains',
                                    arg: 'text',
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
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: 'div[id] > .row > span',
                        },
                        {
                            type: NodeTypes.ExtendedSelector,
                            children: [
                                {
                                    type: NodeTypes.AbsolutePseudoClass,
                                    name: 'contains',
                                    arg: '/^Advertising$/',
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
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: 'div > *',
                        },
                        {
                            type: NodeTypes.ExtendedSelector,
                            children: [
                                {
                                    type: NodeTypes.AbsolutePseudoClass,
                                    name: 'contains',
                                    arg: 'test',
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
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: '*',
                        },
                        {
                            type: NodeTypes.ExtendedSelector,
                            children: [
                                {
                                    type: NodeTypes.AbsolutePseudoClass,
                                    name: 'contains',
                                    arg: '(test)',
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
        const selector = '*:matches-css(width:400px)';
        const expected = {
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: '*',
                        },
                        {
                            type: NodeTypes.ExtendedSelector,
                            children: [
                                {
                                    type: NodeTypes.AbsolutePseudoClass,
                                    name: 'matches-css',
                                    arg: 'width:400px',
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
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: 'div',
                        },
                        {
                            type: NodeTypes.ExtendedSelector,
                            children: [
                                {
                                    type: NodeTypes.AbsolutePseudoClass,
                                    name: 'matches-attr',
                                    arg: '"/data-v-/"',
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
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: 'a',
                        },
                        {
                            type: NodeTypes.ExtendedSelector,
                            children: [
                                {
                                    type: NodeTypes.AbsolutePseudoClass,
                                    name: 'nth-ancestor',
                                    arg: '2',
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
        let selector = 'div:xpath(//h3[contains(text(),"Share it!")]/..)';
        let expected = {
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: 'div',
                        },
                        {
                            type: NodeTypes.ExtendedSelector,
                            children: [
                                {
                                    type: NodeTypes.AbsolutePseudoClass,
                                    name: 'xpath',
                                    arg: '//h3[contains(text(),"Share it!")]/..',
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
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: '[data-src^="https://example.org/"]',
                        },
                        {
                            type: NodeTypes.ExtendedSelector,
                            children: [
                                {
                                    type: NodeTypes.AbsolutePseudoClass,
                                    name: 'xpath',
                                    arg: '..',
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
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: '*',
                        },
                        {
                            type: NodeTypes.ExtendedSelector,
                            children: [
                                {
                                    type: NodeTypes.AbsolutePseudoClass,
                                    name: 'xpath',
                                    arg: '//div[@data-st-area=\'Advert\'][count(*)=2][not(header)]',
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(parse(selector)).toEqual(expected);
    });

    it('remove', () => {
        const selector = 'div[id][class][style]:remove()';
        const expected = {
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: 'div[id][class][style]',
                        },
                        {
                            type: NodeTypes.ExtendedSelector,
                            children: [
                                {
                                    type: NodeTypes.AbsolutePseudoClass,
                                    name: 'remove',
                                    arg: '',
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
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: 'div',
                        },
                        {
                            type: NodeTypes.ExtendedSelector,
                            children: [
                                {
                                    type: NodeTypes.RelativePseudoClass,
                                    name: 'has',
                                    children: [
                                        {
                                            // it might be :has(div, a, img)
                                            // so it should be SelectorList
                                            // https://drafts.csswg.org/selectors/#relational
                                            type: NodeTypes.SelectorList,
                                            children: [
                                                {
                                                    type: NodeTypes.Selector,
                                                    children: [
                                                        {
                                                            type: NodeTypes.RegularSelector,
                                                            value: 'span',
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
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: 'div.banner > div',
                        },
                        {
                            type: NodeTypes.ExtendedSelector,
                            children: [
                                {
                                    type: NodeTypes.RelativePseudoClass,
                                    name: 'has',
                                    children: [
                                        {
                                            // it might be :has(div, a, img)
                                            // so it should be SelectorList
                                            // https://drafts.csswg.org/selectors/#relational
                                            type: NodeTypes.SelectorList,
                                            children: [
                                                {
                                                    type: NodeTypes.Selector,
                                                    children: [
                                                        {
                                                            type: NodeTypes.RegularSelector,
                                                            value: '> a[class^="ad"]',
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
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: '.banner > *',
                        },
                        {
                            type: NodeTypes.ExtendedSelector,
                            children: [
                                {
                                    type: NodeTypes.RelativePseudoClass,
                                    name: 'has',
                                    children: [
                                        {
                                            // https://drafts.csswg.org/selectors/#relational
                                            type: NodeTypes.SelectorList,
                                            children: [
                                                {
                                                    type: NodeTypes.Selector,
                                                    children: [
                                                        {
                                                            type: NodeTypes.RegularSelector,
                                                            value: 'span',
                                                        },
                                                    ],
                                                },
                                                {
                                                    type: NodeTypes.Selector,
                                                    children: [
                                                        {
                                                            type: NodeTypes.RegularSelector,
                                                            value: 'p',
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
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: 'a[class][redirect]',
                        },
                        {
                            type: NodeTypes.ExtendedSelector,
                            children: [
                                {
                                    type: NodeTypes.AbsolutePseudoClass,
                                    name: 'upward',
                                    arg: '3',
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
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: 'div.advert',
                        },
                        {
                            type: NodeTypes.ExtendedSelector,
                            children: [
                                {
                                    type: NodeTypes.RelativePseudoClass,
                                    name: 'upward',
                                    children: [
                                        {
                                            type: NodeTypes.SelectorList,
                                            children: [
                                                {
                                                    type: NodeTypes.Selector,
                                                    children: [
                                                        {
                                                            type: NodeTypes.RegularSelector,
                                                            value: '.info',
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
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: 'img',
                        },
                        {
                            type: NodeTypes.ExtendedSelector,
                            children: [
                                {
                                    type: NodeTypes.RelativePseudoClass,
                                    name: 'upward',
                                    children: [
                                        {
                                            type: NodeTypes.SelectorList,
                                            children: [
                                                {
                                                    type: NodeTypes.Selector,
                                                    children: [
                                                        {
                                                            type: NodeTypes.RegularSelector,
                                                            value: 'header ~ div[class]',
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

describe('combined extended selectors', () => {
    it(':has():contains()', () => {
        const selector = 'div:has(span):contains(something)';
        const expected = {
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: 'div',
                        },
                        {
                            type: NodeTypes.ExtendedSelector,
                            children: [
                                {
                                    type: NodeTypes.RelativePseudoClass,
                                    name: 'has',
                                    children: [
                                        {
                                            type: NodeTypes.SelectorList,
                                            children: [
                                                {
                                                    type: NodeTypes.Selector,
                                                    children: [
                                                        {
                                                            type: NodeTypes.RegularSelector,
                                                            value: 'span',
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
                            type: NodeTypes.ExtendedSelector,
                            children: [
                                {
                                    type: NodeTypes.AbsolutePseudoClass,
                                    name: 'contains',
                                    arg: 'something',
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
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: 'div',
                        },
                        {
                            type: NodeTypes.ExtendedSelector,
                            children: [
                                {
                                    type: NodeTypes.RelativePseudoClass,
                                    name: 'has',
                                    children: [
                                        {
                                            type: NodeTypes.SelectorList,
                                            children: [
                                                {
                                                    type: NodeTypes.Selector,
                                                    children: [
                                                        {
                                                            type: NodeTypes.RegularSelector,
                                                            value: '> p',
                                                        },
                                                        {
                                                            type: NodeTypes.ExtendedSelector,
                                                            children: [
                                                                {
                                                                    type: NodeTypes.AbsolutePseudoClass,
                                                                    name: 'contains',
                                                                    arg: 'test',
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
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: 'div',
                        },
                        {
                            type: NodeTypes.ExtendedSelector,
                            children: [
                                {
                                    type: NodeTypes.RelativePseudoClass,
                                    name: 'upward',
                                    children: [
                                        {
                                            type: NodeTypes.SelectorList,
                                            children: [
                                                {
                                                    type: NodeTypes.Selector,
                                                    children: [
                                                        {
                                                            type: NodeTypes.RegularSelector,
                                                            value: '.ads',
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
                            type: NodeTypes.ExtendedSelector,
                            children: [
                                {
                                    type: NodeTypes.AbsolutePseudoClass,
                                    name: 'remove',
                                    arg: '',
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
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: 'div > p',
                        },
                        {
                            type: NodeTypes.ExtendedSelector,
                            children: [
                                {
                                    type: NodeTypes.AbsolutePseudoClass,
                                    name: 'contains',
                                    arg: 'PR',
                                },
                            ],
                        },
                        {
                            type: NodeTypes.ExtendedSelector,
                            children: [
                                {
                                    type: NodeTypes.AbsolutePseudoClass,
                                    name: 'upward',
                                    arg: '2',
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
            type: NodeTypes.SelectorList,
            children: [
                {
                    type: NodeTypes.Selector,
                    children: [
                        {
                            type: NodeTypes.RegularSelector,
                            value: '[data-ad-subtype]',
                        },
                        {
                            type: NodeTypes.ExtendedSelector,
                            children: [
                                {
                                    type: NodeTypes.AbsolutePseudoClass,
                                    name: 'upward',
                                    arg: '1',
                                },
                            ],
                        },
                        {
                            type: NodeTypes.ExtendedSelector,
                            children: [
                                {
                                    type: NodeTypes.AbsolutePseudoClass,
                                    name: 'matches-css',
                                    arg: 'min-height:/[0-9]+/',
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
