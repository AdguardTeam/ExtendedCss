import { parse } from '../../src/parser';

import { NodeTypes } from '../../src/nodes';

describe('parser', () => {
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

    /**
     * TODO:
     */
    // it('extended pseudo-class has', () => {
    //     let selector = 'div:has(span)';
    //     let expected = {
    //         type: NODE_TYPES.SELECTOR_LIST,
    //         children: [
    //             {
    //                 type: NODE_TYPES.SELECTOR,
    //                 children: [
    //                     {
    //                         type: 'ExtendedSelector',
    //                         children: [
    //                             {
    //                                 type: NODE_TYPES.REGULAR,
    //                                 value: 'div',
    //                             },
    //                             {
    //                                 type: 'ExtendedPseudoSelector',
    //                                 children: [
    //                                     {
    //                                         type: 'PseudoClassSelector',
    //                                         value: 'has',
    //                                     },
    //                                     {
    //                                         // it might be :has(div, a, img)
    //                                         // so it should be SelectorList
    //                                         // https://drafts.csswg.org/selectors/#relational
    //                                         type: NODE_TYPES.SELECTOR_LIST,
    //                                         children: [
    //                                             {
    //                                                 type: NODE_TYPES.SELECTOR,
    //                                                 children: [
    //                                                     {
    //                                                         type: NODE_TYPES.REGULAR,
    //                                                         value: 'span',
    //                                                     },
    //                                                 ],
    //                                             },
    //                                         ],
    //                                     },
    //                                 ],
    //                             },
    //                         ],
    //                     },
    //                 ],
    //             },
    //         ],
    //     };
    //     expect(parser(selector)).toEqual(expected);
    //     parser(selector);
    //
    //     // another example
    //     // div.banner > div:has(span, p), a img.ad
    // });

    /**
     * TODO: fix test after style declaration support
     */
    // it('style declaration', () => {
    //     let selector = 'div { display: none; }';
    //     let expected = {
    //         type: 'CosmeticRule',
    //         start: 0,
    //         end: 21,
    //         children: [
    //             {
    //                 type: NODE_TYPES.REGULAR, // no pseudo in it
    //                 start: 0,
    //                 end: 2,
    //                 children: [
    //                     {
    //                         type: 'SimpleSelector',
    //                         start: 0,
    //                         end: 2,
    //                         children: [
    //                             {
    //                                 type: 'TypeSelector',
    //                                 start: 0,
    //                                 end: 2,
    //                                 value: 'div',
    //                             },
    //                         ],
    //                     },
    //                 ],
    //             },
    //             {
    //                 type: 'Space',
    //                 start: 3,
    //                 end: 4,
    //                 // children: null, // TODO: remove later
    //             },
    //             {
    //                 type: 'DeclarationBlock',
    //                 start: 4,
    //                 end: 21,
    //                 children: [
    //                     {
    //                         type: 'Declaration',
    //                         start: 6,
    //                         end: 19,
    //                         children: [
    //                             {
    //                                 type: 'Property',
    //                                 start: 6,
    //                                 end: 13,
    //                                 value: 'display',
    //                             },
    //                             {
    //                                 type: 'Value',
    //                                 start: 14,
    //                                 end: 21,
    //                                 value: 'display',
    //                             },
    //                         ],
    //                     },
    //                 ],
    //             },
    //         ],
    //     };
    //     expect(parser(selector)).toEqual(expected);

    //     selector = 'div { display: none!important; }';
    //     expected = {
    //         type: 'CosmeticRule',
    //         start: 0,
    //         end: 32,
    //         children: [
    //             {
    //                 type: NODE_TYPES.REGULAR, // no pseudo in it
    //                 start: 0,
    //                 end: 2,
    //                 children: [
    //                     {
    //                         type: 'SimpleSelector',
    //                         start: 0,
    //                         end: 2,
    //                         children: [
    //                             {
    //                                 type: 'TypeSelector',
    //                                 start: 0,
    //                                 end: 2,
    //                                 value: 'div',
    //                             },
    //                         ],
    //                     },
    //                 ],
    //             },
    //             {
    //                 type: 'Space',
    //                 start: 3,
    //                 end: 4,
    //                 // children: null, // TODO: remove later
    //             },
    //             {
    //                 type: 'DeclarationBlock',
    //                 start: 4,
    //                 end: 32,
    //                 children: [
    //                     {
    //                         type: 'Declaration',
    //                         start: 6,
    //                         end: 19,
    //                         children: [
    //                             {
    //                                 type: 'Property',
    //                                 start: 6,
    //                                 end: 13,
    //                                 value: 'display',
    //                             },
    //                             {
    //                                 type: 'Value',
    //                                 start: 14,
    //                                 end: 21,
    //                                 value: 'display',
    //                             },
    //                             {
    //                                 type: 'CssRule',
    //                                 start: 20,
    //                                 end: 29,
    //                                 value: 'important',
    //                             },
    //                         ],
    //                     },
    //                 ],
    //             },
    //         ],
    //     };
    //     expect(parser(selector)).toEqual(expected);
    // });
});
