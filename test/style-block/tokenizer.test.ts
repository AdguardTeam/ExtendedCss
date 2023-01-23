/**
 * @jest-environment jsdom
 */

import { tokenizeStyleBlock } from '../../src/style-block';

describe('style declaration block tokenizer', () => {
    describe('single declaration', () => {
        describe('simple', () => {
            const testCases = [
                {
                    // it shall be trimmed before the tokenization
                    actual: '  display: none   ',
                    expected: [
                        { type: 'word', value: 'display' },
                        { type: 'mark', value: ':' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: 'none' },
                    ],
                },
                {
                    actual: 'display: none',
                    expected: [
                        { type: 'word', value: 'display' },
                        { type: 'mark', value: ':' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: 'none' },
                    ],
                },
                {
                    actual: 'display: none;',
                    expected: [
                        { type: 'word', value: 'display' },
                        { type: 'mark', value: ':' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: 'none' },
                        { type: 'mark', value: ';' },
                    ],
                },
                {
                    actual: 'display:none;',
                    expected: [
                        { type: 'word', value: 'display' },
                        { type: 'mark', value: ':' },
                        { type: 'word', value: 'none' },
                        { type: 'mark', value: ';' },
                    ],
                },
                {
                    actual: 'display : none ;',
                    expected: [
                        { type: 'word', value: 'display' },
                        { type: 'mark', value: ' ' },
                        { type: 'mark', value: ':' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: 'none' },
                        { type: 'mark', value: ' ' },
                        { type: 'mark', value: ';' },
                    ],
                },
                {
                    actual: 'display: none!important;',
                    expected: [
                        { type: 'word', value: 'display' },
                        { type: 'mark', value: ':' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: 'none!important' },
                        { type: 'mark', value: ';' },
                    ],
                },
                {
                    actual: 'display: none !important;',
                    expected: [
                        { type: 'word', value: 'display' },
                        { type: 'mark', value: ':' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: 'none' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: '!important' },
                        { type: 'mark', value: ';' },
                    ],
                },
                {
                    actual: 'remove: true;',
                    expected: [
                        { type: 'word', value: 'remove' },
                        { type: 'mark', value: ':' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: 'true' },
                        { type: 'mark', value: ';' },
                    ],
                },
                {
                    actual: 'debug: global',
                    expected: [
                        { type: 'word', value: 'debug' },
                        { type: 'mark', value: ':' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: 'global' },
                    ],
                },
                {
                    actual: 'width: 100% !important;',
                    expected: [
                        { type: 'word', value: 'width' },
                        { type: 'mark', value: ':' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: '100%' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: '!important' },
                        { type: 'mark', value: ';' },
                    ],
                },
            ];
            test.each(testCases)('$actual', ({ actual, expected }) => {
                expect(tokenizeStyleBlock(actual)).toEqual(expected);
            });
        });

        describe('more complicated', () => {
            const testCases = [
                {
                    actual: 'padding-top: 0!important;',
                    expected: [
                        { type: 'word', value: 'padding-top' },
                        { type: 'mark', value: ':' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: '0!important' },
                        { type: 'mark', value: ';' },
                    ],
                },
                {
                    actual: 'pointer-events: none !important',
                    expected: [
                        { type: 'word', value: 'pointer-events' },
                        { type: 'mark', value: ':' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: 'none' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: '!important' },
                    ],
                },
                {
                    actual: '-webkit-filter: none !important;',
                    expected: [
                        { type: 'word', value: '-webkit-filter' },
                        { type: 'mark', value: ':' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: 'none' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: '!important' },
                        { type: 'mark', value: ';' },
                    ],
                },
                {
                    actual: 'box-shadow: 0 -8px 15px #333333 !important',
                    expected: [
                        { type: 'word', value: 'box-shadow' },
                        { type: 'mark', value: ':' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: '0' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: '-8px' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: '15px' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: '#333333' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: '!important' },
                    ],
                },
                {
                    actual: 'width: calc(100% - 290px) !important',
                    expected: [
                        { type: 'word', value: 'width' },
                        { type: 'mark', value: ':' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: 'calc(100%' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: '-' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: '290px)' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: '!important' },
                    ],
                },
            ];
            test.each(testCases)('$actual', ({ actual, expected }) => {
                expect(tokenizeStyleBlock(actual)).toEqual(expected);
            });
        });

        describe('content property', () => {
            const testCases = [
                {
                    actual: 'content: none !important',
                    expected: [
                        { type: 'word', value: 'content' },
                        { type: 'mark', value: ':' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: 'none' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: '!important' },
                    ],
                },
                {
                    actual: 'content: initial !important',
                    expected: [
                        { type: 'word', value: 'content' },
                        { type: 'mark', value: ':' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: 'initial' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: '!important' },
                    ],
                },
                {
                    actual: 'content: url(image.jpg);',
                    expected: [
                        { type: 'word', value: 'content' },
                        { type: 'mark', value: ':' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: 'url(image.jpg)' },
                        { type: 'mark', value: ';' },
                    ],
                },
                {
                    actual: 'content: "1";',
                    expected: [
                        { type: 'word', value: 'content' },
                        { type: 'mark', value: ':' },
                        { type: 'mark', value: ' ' },
                        { type: 'mark', value: '"' },
                        { type: 'word', value: '1' },
                        { type: 'mark', value: '"' },
                        { type: 'mark', value: ';' },
                    ],
                },
                {
                    actual: 'content: "1 2";',
                    expected: [
                        { type: 'word', value: 'content' },
                        { type: 'mark', value: ':' },
                        { type: 'mark', value: ' ' },
                        { type: 'mark', value: '"' },
                        { type: 'word', value: '1' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: '2' },
                        { type: 'mark', value: '"' },
                        { type: 'mark', value: ';' },
                    ],
                },
                {
                    actual: 'content: attr(data-done) " Email: ";',
                    expected: [
                        { type: 'word', value: 'content' },
                        { type: 'mark', value: ':' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: 'attr(data-done)' },
                        { type: 'mark', value: ' ' },
                        { type: 'mark', value: '"' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: 'Email' },
                        { type: 'mark', value: ':' },
                        { type: 'mark', value: ' ' },
                        { type: 'mark', value: '"' },
                        { type: 'mark', value: ';' },
                    ],
                },
                {
                    actual: 'content: "test:123"',
                    expected: [
                        { type: 'word', value: 'content' },
                        { type: 'mark', value: ':' },
                        { type: 'mark', value: ' ' },
                        { type: 'mark', value: '"' },
                        { type: 'word', value: 'test' },
                        { type: 'mark', value: ':' },
                        { type: 'word', value: '123' },
                        { type: 'mark', value: '"' },
                    ],
                },
            ];
            test.each(testCases)('$actual', ({ actual, expected }) => {
                expect(tokenizeStyleBlock(actual)).toEqual(expected);
            });
        });

        describe('background-* properties', () => {
            const testCases = [
                {
                    actual: ' background: #000!important; ',
                    expected: [
                        { type: 'word', value: 'background' },
                        { type: 'mark', value: ':' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: '#000!important' },
                        { type: 'mark', value: ';' },
                    ],
                },
                {
                    actual: 'background-image: none !important;',
                    expected: [
                        { type: 'word', value: 'background-image' },
                        { type: 'mark', value: ':' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: 'none' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: '!important' },
                        { type: 'mark', value: ';' },
                    ],
                },
                {
                    actual: 'background-color: #e4f1f6 !important',
                    expected: [
                        { type: 'word', value: 'background-color' },
                        { type: 'mark', value: ':' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: '#e4f1f6' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: '!important' },
                    ],
                },
                {
                    actual: 'background-color: rgba(253,253,253,1)!important;',
                    expected: [
                        { type: 'word', value: 'background-color' },
                        { type: 'mark', value: ':' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: 'rgba(253,253,253,1)!important' },
                        { type: 'mark', value: ';' },
                    ],
                },
                {
                    actual: 'background-color: rgb(255, 255, 238) !important;',
                    expected: [
                        { type: 'word', value: 'background-color' },
                        { type: 'mark', value: ':' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: 'rgb(255,' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: '255,' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: '238)' },
                        { type: 'mark', value: ' ' },
                        { type: 'word', value: '!important' },
                        { type: 'mark', value: ';' },
                    ],
                },
            ];
            test.each(testCases)('$actual', ({ actual, expected }) => {
                expect(tokenizeStyleBlock(actual)).toEqual(expected);
            });
        });
    });

    describe('list of declarations', () => {
        const testCases = [
            {
                actual: 'display: none; debug: true;',
                expected: [
                    { type: 'word', value: 'display' },
                    { type: 'mark', value: ':' },
                    { type: 'mark', value: ' ' },
                    { type: 'word', value: 'none' },
                    { type: 'mark', value: ';' },
                    { type: 'mark', value: ' ' },
                    { type: 'word', value: 'debug' },
                    { type: 'mark', value: ':' },
                    { type: 'mark', value: ' ' },
                    { type: 'word', value: 'true' },
                    { type: 'mark', value: ';' },
                ],
            },
            {
                actual: 'background-image: none !important; background-color: #e4f1f6 !important; ',
                expected: [
                    { type: 'word', value: 'background-image' },
                    { type: 'mark', value: ':' },
                    { type: 'mark', value: ' ' },
                    { type: 'word', value: 'none' },
                    { type: 'mark', value: ' ' },
                    { type: 'word', value: '!important' },
                    { type: 'mark', value: ';' },
                    { type: 'mark', value: ' ' },
                    { type: 'word', value: 'background-color' },
                    { type: 'mark', value: ':' },
                    { type: 'mark', value: ' ' },
                    { type: 'word', value: '#e4f1f6' },
                    { type: 'mark', value: ' ' },
                    { type: 'word', value: '!important' },
                    { type: 'mark', value: ';' },
                ],
            },
        ];
        test.each(testCases)('$actual', ({ actual, expected }) => {
            expect(tokenizeStyleBlock(actual)).toEqual(expected);
        });
    });

    describe('trim style block', () => {
        const testCases = [
            ' display: none;',
            '   display: none;',
            '\tdisplay: none;',
            '\rdisplay: none;',
            '\ndisplay: none;',
            '\fdisplay: none;',
            'display: none; ',
            'display: none;   ',
            'display: none;\t',
            'display: none;\r',
            'display: none;\n',
            'display: none;\f',
        ];
        // should be 'display: none;'
        const expected = [
            { type: 'word', value: 'display' },
            { type: 'mark', value: ':' },
            { type: 'mark', value: ' ' },
            { type: 'word', value: 'none' },
            { type: 'mark', value: ';' },
        ];
        test.each(testCases)('%s', (actual) => {
            expect(tokenizeStyleBlock(actual)).toEqual(expected);
        });
    });
});
