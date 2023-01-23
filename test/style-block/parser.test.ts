import { parseStyleBlock } from '../../src/style-block/parser';

type ThrowInput = {
    /**
     * Style block to parse.
     */
    actual: string,

    /**
     * Error text to match.
     */
    error: string,
};

const expectToThrowInput = (input: ThrowInput): void => {
    const { actual, error } = input;
    expect(() => {
        parseStyleBlock(actual);
    }).toThrow(error);
};

describe('style declaration block parsing', () => {
    describe('one style declaration + no warning', () => {
        describe('just display none', () => {
            const testCases = [
                'display: none',
                'display: none;',
                'display: none; ',
                'display:none;',
                ' display: none;   ',
                '   display: none;',
                '\tdisplay: none;',
                '\rdisplay: none;',
                '\ndisplay: none;',
                '\fdisplay: none;',
                'display : none ;',
                'display: none;\t',
                'display: none;\r',
                'display: none;\n',
                'display: none;\f',
            ];
            const expected = [{
                property: 'display',
                value: 'none',
            }];
            test.each(testCases)('%s', (actual) => {
                expect(parseStyleBlock(actual)).toStrictEqual(expected);
            });
        });

        describe('various single declarations', () => {
            const testCases = [
                {
                    actual: 'display: none !important',
                    expected: [{
                        property: 'display',
                        value: 'none !important',
                    }],
                },
                {
                    actual: ' remove: true;',
                    expected: [{
                        property: 'remove',
                        value: 'true',
                    }],
                },
                {
                    actual: 'width: auto !important; ',
                    expected: [{
                        property: 'width',
                        value: 'auto !important',
                    }],
                },
                {
                    actual: 'content: "test:123"',
                    expected: [{
                        property: 'content',
                        value: '"test:123"',
                    }],
                },
                {
                    actual: 'content: "\\""',
                    expected: [{
                        property: 'content',
                        value: '"\\""',
                    }],
                },
                {
                    actual: 'position: relative !important',
                    expected: [{
                        property: 'position',
                        value: 'relative !important',
                    }],
                },
                {
                    actual: ' z-index: 1999999999 !important;',
                    expected: [{
                        property: 'z-index',
                        value: '1999999999 !important',
                    }],
                },
                {
                    actual: 'grid-template-rows: auto !important;',
                    expected: [{
                        property: 'grid-template-rows',
                        value: 'auto !important',
                    }],
                },
                {
                    actual: 'background-image: none !important;',
                    expected: [{
                        property: 'background-image',
                        value: 'none !important',
                    }],
                },
                {
                    actual: 'background-color: rgba(253,253,253,1) !important',
                    expected: [{
                        property: 'background-color',
                        value: 'rgba(253,253,253,1) !important',
                    }],
                },
            ];
            test.each(testCases)('$actual', ({ actual, expected }) => {
                expect(parseStyleBlock(actual)).toStrictEqual(expected);
            });
        });
    });

    describe('list of declarations', () => {
        const testCases = [
            {
                actual: 'color: red; debug: global',
                expected: [
                    {
                        property: 'color',
                        value: 'red',
                    },
                    {
                        property: 'debug',
                        value: 'global',
                    },
                ],
            },
            {
                actual: 'width: auto !important; margin: 0 !important',
                expected: [
                    {
                        property: 'width',
                        value: 'auto !important',
                    },
                    {
                        property: 'margin',
                        value: '0 !important',
                    },
                ],
            },
            {
                actual: ' background: #000!important; padding: 0!important; ',
                expected: [
                    {
                        property: 'background',
                        value: '#000!important',
                    },
                    {
                        property: 'padding',
                        value: '0!important',
                    },
                ],
            },
            {
                actual: 'background-image: none !important; background-color: #e4f1f6 !important',
                expected: [
                    {
                        property: 'background-image',
                        value: 'none !important',
                    },
                    {
                        property: 'background-color',
                        value: '#e4f1f6 !important',
                    },
                ],
            },
            {
                actual: ' position : relative !important; top: 0 !important',
                expected: [
                    {
                        property: 'position',
                        value: 'relative !important',
                    },
                    {
                        property: 'top',
                        value: '0 !important',
                    },
                ],
            },
            {
                actual: '-webkit-animation: none !important; color: #837e6e !important; ',
                expected: [
                    {
                        property: '-webkit-animation',
                        value: 'none !important',
                    },
                    {
                        property: 'color',
                        value: '#837e6e !important',
                    },
                ],
            },
            {
                actual: 'zoom: 0.1 !important; filter: grayscale(1) !important ',
                expected: [
                    {
                        property: 'zoom',
                        value: '0.1 !important',
                    },
                    {
                        property: 'filter',
                        value: 'grayscale(1) !important',
                    },
                ],
            },
            {
                actual: '  margin: 0 !important; min-height: 0 !important; padding-top: 0 !important ',
                expected: [
                    {
                        property: 'margin',
                        value: '0 !important',
                    },
                    {
                        property: 'min-height',
                        value: '0 !important',
                    },
                    {
                        property: 'padding-top',
                        value: '0 !important',
                    },
                ],
            },
            {
                actual: "display: none; content: 'adguard4;test-rule-ext-css' !important",
                expected: [
                    {
                        property: 'display',
                        value: 'none',
                    },
                    {
                        property: 'content',
                        value: "'adguard4;test-rule-ext-css' !important",
                    },
                ],
            },
        ];
        test.each(testCases)('$actual', ({ actual, expected }) => {
            expect(parseStyleBlock(actual)).toStrictEqual(expected);
        });
    });

    describe('invalid style blocks', () => {
        const testCases = [
            {
                actual: '" ',
                error: 'Invalid style declaration',
            },
            {
                actual: 'padding top: 0;',
                error: 'Invalid style property',
            },
            {
                actual: 'padding-bottom: 0; padding top: 0;',
                error: 'Invalid style property',
            },
            {
                actual: 'content: "test}',
                error: 'Unbalanced style declaration quotes',
            },
        ];
        test.each(testCases)('$actual - $error', (t) => expectToThrowInput(t));
    });
});
