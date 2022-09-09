/**
 * @jest-environment jsdom
 */

import { parse } from '../../src/stylesheet';
import { ExtCssDocument } from '../../src/selector';

import { STYLESHEET_ERROR_PREFIX } from '../../src/common/constants';

interface TestRuleData {
    selector: string,
    style?: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    debug?: string,
}

interface SingleRuleInput {
    actual: string, // css rule
    expected: TestRuleData, // rule data
}
const expectSingleRuleParsed = (input: SingleRuleInput): void => {
    const { actual, expected } = input;
    const extCssDoc = new ExtCssDocument();
    const parsed = parse(actual, extCssDoc);
    expect(parsed.length).toEqual(1);
    expect(parsed[0].selector).toEqual(expected.selector);
    expect(parsed[0].style).toEqual(expected.style);
    expect(parsed[0].debug).toEqual(expected.debug);
};

interface MultipleRuleInput {
    actual: string, // css rule
    expected: TestRuleData[], // array of rule data objects
}
const expectMultipleRulesParsed = (input: MultipleRuleInput): void => {
    const { actual, expected } = input;
    const extCssDoc = new ExtCssDocument();
    const parsedRules = parse(actual, extCssDoc);
    parsedRules.forEach((parsed, i) => {
        expect(parsed.selector).toEqual(expected[i].selector);
        expect(parsed.style).toEqual(expected[i].style);
        expect(parsed.debug).toEqual(expected[i].debug);
    });
};

interface ToThrowInput {
    selector: string,   // selector for extCss querySelectorAll()
    error: string,      // error text to match
}
const expectToThrowInput = (input: ToThrowInput): void => {
    const { selector, error } = input;
    expect(() => {
        const extCssDoc = new ExtCssDocument();
        parse(selector, extCssDoc);
    }).toThrow(error);
};

describe('stylesheet parser', () => {
    describe('one rule', () => {
        describe('simple selector + one style declaration', () => {
            const testsInputs = [
                {
                    actual: 'body { display:none; }',
                    expected: {
                        selector: 'body',
                        style: { display: 'none' },
                    },
                },
                {
                    actual: '.banner { display: none !important; }',
                    expected: {
                        selector: '.banner',
                        style: { display: 'none !important' },
                    },
                },
                {
                    actual: '.banner { display: none!important; }',
                    expected: {
                        selector: '.banner',
                        style: { display: 'none!important' },
                    },
                },
                {
                    actual: '.banner {display:none!important;}',
                    expected: {
                        selector: '.banner',
                        style: { display: 'none!important' },
                    },
                },
                {
                    actual: '.banner img { margin-top: 0 !important; }',
                    expected: {
                        selector: '.banner img',
                        style: { 'margin-top': '0 !important' },
                    },
                },
                {
                    actual: '#modal form#email-sign-up-form:upward(#modal) {display: none!important; }',
                    expected: {
                        selector: '#modal form#email-sign-up-form:upward(#modal)',
                        style: { display: 'none!important' },
                    },
                },
                {
                    actual: '.pdp-psy > .gb_Lc.gb_g[data-ved]{display:none!important;}',
                    expected: {
                        selector: '.pdp-psy > .gb_Lc.gb_g[data-ved]',
                        style: { display: 'none!important' },
                    },
                },
                {
                    actual: 'div:has(:scope > a > img[id]) { display: none; }',
                    expected: {
                        selector: 'div:has(:scope > a > img[id])',
                        style: { display: 'none' },
                    },
                },
            ];
            test.each(testsInputs)('%s', (input) => expectSingleRuleParsed(input));
        });

        describe('tricky selector + one style declaration', () => {
            const testsInputs = [
                // '{' in selector
                {
                    actual: 'head > style:contains(body{background: #410e13) { display: none !important; }',
                    expected: {
                        selector: 'head > style:contains(body{background: #410e13)',
                        style: { display: 'none !important' },
                    },
                },
                {
                    actual: '[-ext-matches-css-before=\'content:  /^[A-Z][a-z]{2}\\s/  \'] { display :none !important; }', // eslint-disable-line max-len
                    expected: {
                        selector: '[-ext-matches-css-before=\'content:  /^[A-Z][a-z]{2}\\s/  \']',
                        style: { display: 'none !important' },
                    },
                },
                {
                    actual: 'a[href][data-item^=\'{"sources":[\'][data-item*=\'Video Ad\'] { display: none !important; }', // eslint-disable-line max-len
                    expected: {
                        selector: 'a[href][data-item^=\'{"sources":[\'][data-item*=\'Video Ad\']',
                        style: { display: 'none !important' },
                    },
                },
                // style without ';' at the end
                {
                    actual: '#consent-modal { display: none !important }',
                    expected: {
                        selector: '#consent-modal',
                        style: { display: 'none !important' },
                    },
                },
            ];
            test.each(testsInputs)('%s', (input) => expectSingleRuleParsed(input));
        });

        describe('multiple styles', () => {
            const testsInputs = [
                {
                    actual: '#inner { position: absolute!important; left: -3000px!important; }',
                    expected: {
                        selector: '#inner',
                        style: { position: 'absolute!important', left: '-3000px!important' },
                    },
                },
                {
                    actual: `#inner {
                        position: absolute!important;
                        left: -3000px!important;
                    }`,
                    expected: {
                        selector: '#inner',
                        style: { position: 'absolute!important', left: '-3000px!important' },
                    },
                },
                {
                    actual: '.con > .related[data-desc] > li { margin-right: 0!important; margin-left: 20px!important; }', // eslint-disable-line max-len
                    expected: {
                        selector: '.con > .related[data-desc] > li',
                        style: { 'margin-right': '0!important', 'margin-left': '20px!important' },
                    },
                },
                {
                    actual: ':contains(/[\\w]{9,}/){display:none!important;visibility:hidden!important}',
                    expected: {
                        selector: ':contains(/[\\w]{9,}/)',
                        style: { display: 'none!important', visibility: 'hidden!important' },
                    },
                },
                {
                    /* eslint-disable max-len */
                    actual: ':matches-css(    background-image: /^url\\((.)[a-z]{4}:[a-z]{2}\\1nk\\)$/    ) + [-ext-matches-css-before=\'content:  /^[A-Z][a-z]{2}\\s/  \'][-ext-has=\'+:matches-css-after( content  :   /(\\d+\\s)*me/  ):contains(/^(?![\\s\\S])/)\'] {\
                        width: 500px;height: 500px;\
                        -webkit-border-radius: 30px;\
                        -moz-border-radius: 30px;\
                        \
                        -webkit-box-shadow: 1px -1px #b2492c, 2px -2px #b2492c, 3px -3px #b2492c, 4px -4px #b2492c, 5px -5px #b2492c, 6px -6px #b2492c, 7px -7px #b2492c, 8px -8px #b2492c, 9px -9px #b2492c, 10px -10px #b2492c;\
                        \
                    }',
                    expected: {
                        selector: ':matches-css(    background-image: /^url\\((.)[a-z]{4}:[a-z]{2}\\1nk\\)$/    ) + [-ext-matches-css-before=\'content:  /^[A-Z][a-z]{2}\\s/  \'][-ext-has=\'+:matches-css-after( content  :   /(\\d+\\s)*me/  ):contains(/^(?![\\s\\S])/)\']',
                        style: {
                            width: '500px',
                            height: '500px',
                            '-webkit-border-radius': '30px',
                            '-moz-border-radius': '30px',
                            '-webkit-box-shadow': '1px -1px #b2492c, 2px -2px #b2492c, 3px -3px #b2492c, 4px -4px #b2492c, 5px -5px #b2492c, 6px -6px #b2492c, 7px -7px #b2492c, 8px -8px #b2492c, 9px -9px #b2492c, 10px -10px #b2492c',
                        },
                    },
                    /* eslint-enable max-len */
                },
            ];
            test.each(testsInputs)('%s', (input) => expectSingleRuleParsed(input));
        });
    });

    describe('multiple rules', () => {
        const testsInputs = [
            {
                actual: '.banner {display:none!important;}\n .header { margin: 0 !important; }',
                expected: [
                    {
                        selector: '.banner',
                        style: { display: 'none!important' },
                    },
                    {
                        selector: '.header',
                        style: { margin: '0 !important' },
                    },
                ],
            },
            // like previous but with no line break '\n'
            {
                actual: '.banner {display:none!important;} .header { margin: 0 !important; }',
                expected: [
                    {
                        selector: '.banner',
                        style: { display: 'none!important' },
                    },
                    {
                        selector: '.header',
                        style: { margin: '0 !important' },
                    },
                ],
            },
            {
                // eslint-disable-next-line max-len
                actual: 'body { background: none!important; } div.wrapper { display: block!important; position: absolute; top:-2000px; }',
                expected: [
                    {
                        selector: 'body',
                        style: { background: 'none!important' },
                    },
                    {
                        selector: 'div.wrapper',
                        style: {
                            display: 'block!important',
                            position: 'absolute',
                            top: '-2000px',
                        },
                    },
                ],
            },
            {
                // eslint-disable-next-line max-len
                actual: 'body { background: none!important; }\n div.wrapper { display: block!important; position: absolute; top:-2000px; }',
                expected: [
                    {
                        selector: 'body',
                        style: { background: 'none!important' },
                    },
                    {
                        selector: 'div.wrapper',
                        style: {
                            display: 'block!important',
                            position: 'absolute',
                            top: '-2000px',
                        },
                    },
                ],
            },
            {
                // eslint-disable-next-line max-len
                actual: 'div.wrapper>div[-ext-has=".banner"] { display:none!important; } div.wrapper>div[-ext-contains="some word"] { background:none!important; }',
                expected: [
                    {
                        selector: 'div.wrapper>div[-ext-has=".banner"]',
                        style: { display: 'none!important' },
                    },
                    {
                        selector: 'div.wrapper>div[-ext-contains="some word"]',
                        style: { background: 'none!important' },
                    },
                ],
            },
            {
                /* eslint-disable max-len */
                actual: ':contains(/[\\w]{9,}/){display:none!important;visibility:hidden!important}\
                    :matches-css(    background-image: /^url\\((.)[a-z]{4}:[a-z]{2}\\1nk\\)$/    ) + [-ext-matches-css-before=\'content:  /^[A-Z][a-z]{2}\\s/  \'][-ext-has=\'+:matches-css-after( content  :   /(\\d+\\s)*me/  ):contains(/^(?![\\s\\S])/)\'] {\
                        width: 500px;height: 500px;\
                        -webkit-border-radius: 30px;\
                        -moz-border-radius: 30px;\
                        \
                        -webkit-box-shadow: 1px -1px #b2492c, 2px -2px #b2492c, 3px -3px #b2492c, 4px -4px #b2492c, 5px -5px #b2492c, 6px -6px #b2492c, 7px -7px #b2492c, 8px -8px #b2492c, 9px -9px #b2492c, 10px -10px #b2492c;\
                        \
                    }',
                expected: [
                    {
                        selector: ':contains(/[\\w]{9,}/)',
                        style: {
                            display: 'none!important',
                            visibility: 'hidden!important',
                        },
                    },
                    {
                        selector: ':matches-css(    background-image: /^url\\((.)[a-z]{4}:[a-z]{2}\\1nk\\)$/    ) + [-ext-matches-css-before=\'content:  /^[A-Z][a-z]{2}\\s/  \'][-ext-has=\'+:matches-css-after( content  :   /(\\d+\\s)*me/  ):contains(/^(?![\\s\\S])/)\']',
                        style: {
                            width: '500px',
                            height: '500px',
                            '-webkit-border-radius': '30px',
                            '-moz-border-radius': '30px',
                            '-webkit-box-shadow': '1px -1px #b2492c, 2px -2px #b2492c, 3px -3px #b2492c, 4px -4px #b2492c, 5px -5px #b2492c, 6px -6px #b2492c, 7px -7px #b2492c, 8px -8px #b2492c, 9px -9px #b2492c, 10px -10px #b2492c',
                        },
                    },
                ],
                /* eslint-enable max-len */
            },
        ];
        test.each(testsInputs)('%s', (input) => expectMultipleRulesParsed(input));
    });

    describe('do not fail on rule with invalid selector', () => {
        // querySelectorAll() will fail on invalid selector
        const testsInputs = [
            {
                actual: 'body > { display:none; }',
                expected: {
                    selector: 'body >',
                    style: { display: 'none' },
                },
            },
            {
                actual: 'div:invalid-pseudo(1), div { display: none !important; }',
                expected: {
                    selector: 'div:invalid-pseudo(1), div',
                    style: { display: 'none !important' },
                },
            },
            {
                actual: 'body:has(div:invalid-pseudo(1)), div { display: none }',
                expected: {
                    selector: 'body:has(div:invalid-pseudo(1)), div',
                    style: { display: 'none' },
                },
            },
        ];
        test.each(testsInputs)('%s', (input) => expectSingleRuleParsed(input));
    });

    describe('remove pseudos', () => {
        describe('remove pseudo-property', () => {
            const testsInputs = [
                {
                    actual: '.banner { remove: true; }',
                    expected: {
                        selector: '.banner',
                        style: { remove: 'true' },
                    },
                },
                {
                    actual: '.banner { remove:true; }',
                    expected: {
                        selector: '.banner',
                        style: { remove: 'true' },
                    },
                },
                {
                    actual: 'head > style:contains(body{background: #410e13) { remove: true; }',
                    expected: {
                        selector: 'head > style:contains(body{background: #410e13)',
                        style: { remove: 'true' },
                    },
                },
            ];
            test.each(testsInputs)('%s', (input) => expectSingleRuleParsed(input));
        });

        describe('single rule with remove pseudo-class', () => {
            const testsInputs = [
                {
                    actual: 'div[class]:remove()',
                    expected: {
                        selector: 'div[class]',
                        style: { remove: 'true' },
                    },
                },
                {
                    actual: '.banner > *:remove()',
                    expected: {
                        selector: '.banner > *',
                        style: { remove: 'true' },
                    },
                },
                {
                    // no fail as selector will be validated later
                    actual: '.banner > :remove()',
                    expected: {
                        // trimmed selector before pseudo-class
                        selector: '.banner >',
                        style: { remove: 'true' },
                    },
                },
                {
                    actual: 'div[id][class][style]:remove()',
                    expected: {
                        selector: 'div[id][class][style]',
                        style: { remove: 'true' },
                    },
                },
                {
                    actual: 'body > div:not([id]):not([class]):not([style]):empty:remove()',
                    expected: {
                        selector: 'body > div:not([id]):not([class]):not([style]):empty',
                        style: { remove: 'true' },
                    },
                },
                {
                    actual: 'div#test-remove #test-remove-inner-id:remove()',
                    expected: {
                        selector: 'div#test-remove #test-remove-inner-id',
                        style: { remove: 'true' },
                    },
                },
                {
                    actual: 'div[id*="remove"]:has(> div > .test-remove-inner-class):remove()',
                    expected: {
                        selector: 'div[id*="remove"]:has(> div > .test-remove-inner-class)',
                        style: { remove: 'true' },
                    },
                },
                {
                    actual: 'div[class]:contains(remove):remove()',
                    expected: {
                        selector: 'div[class]:contains(remove)',
                        style: { remove: 'true' },
                    },
                },
                {
                    actual: '#test-remove-inner-for-upward:upward(div[id]):remove()',
                    expected: {
                        selector: '#test-remove-inner-for-upward:upward(div[id])',
                        style: { remove: 'true' },
                    },
                },
                {
                    actual: '#test-remove-inner-for-xpath-pseudo:xpath(../../..):remove()',
                    expected: {
                        selector: '#test-remove-inner-for-xpath-pseudo:xpath(../../..)',
                        style: { remove: 'true' },
                    },
                },
            ];
            test.each(testsInputs)('%s', (input) => expectSingleRuleParsed(input));
        });

        describe('both remove pseudo-class and pseudo-property', () => {
            const testsInputs = [
                {
                    actual: '.banner:remove() { remove: true; }',
                    expected: {
                        selector: '.banner',
                        style: { remove: 'true' },
                    },
                },
            ];
            test.each(testsInputs)('%s', (input) => expectSingleRuleParsed(input));
        });
    });

    describe('debug pseudo-property', () => {
        const testsInputs = [
            // 'true' value
            {
                actual: '.banner { debug: true; }',
                expected: {
                    selector: '.banner',
                    debug: 'true',
                },
            },
            {
                actual: '.banner { display: none; debug: true; }',
                expected: {
                    selector: '.banner',
                    debug: 'true',
                    style: { display: 'none' },
                },
            },
            // 'global' value
            {
                actual: '.banner { debug: global; }',
                expected: {
                    selector: '.banner',
                    debug: 'global',
                },
            },
            {
                actual: '.banner { display: none; debug: global; }',
                expected: {
                    selector: '.banner',
                    debug: 'global',
                    style: { display: 'none' },
                },
            },
            // invalid value
            {
                actual: '.banner { display: none; debug: false; }',
                expected: {
                    selector: '.banner',
                    style: { display: 'none' },
                },
            },
            {
                actual: '.banner { display: none; debug: "" }',
                expected: {
                    selector: '.banner',
                    style: { display: 'none' },
                },
            },
        ];
        test.each(testsInputs)('%s', (input) => expectSingleRuleParsed(input));
    });

    it('debug global for one rule in list', () => {
        const actual = `
            #case14:not(without-debug-before-global) { display:none; }
            #case14:not(with-global-debug) { display:none; debug: global }
            #case14:not(without-debug-after-global) { display:none; }
        `;
        const expected = [
            {
                selector: '#case14:not(without-debug-before-global)',
                style: { display: 'none' },
            },
            {
                selector: '#case14:not(with-global-debug)',
                style: { display: 'none' },
                debug: 'global',
            },
            {
                selector: '#case14:not(without-debug-after-global)',
                style: { display: 'none' },
            },
        ];
        expectMultipleRulesParsed({ actual, expected });
    });

    describe('invalid stylesheets', () => {
        describe('selector with no style declaration', () => {
            const error = STYLESHEET_ERROR_PREFIX.NO_STYLE_OR_REMOVE;
            const invalidSelectors = [
                '.banner',
                '.block > span:contains({background: #410e13})',
                '[-ext-matches-css-before=\'content:  /^[A-Z][a-z]{2}\\s/  \']',
            ];
            test.each(invalidSelectors)('%s', (selector) => expectToThrowInput({ selector, error }));
        });

        describe('invalid remove pseudo-class', () => {
            const error = STYLESHEET_ERROR_PREFIX.INVALID_REMOVE;
            const invalidSelectors = [
                ':remove()',
                '.block:remove() > .banner:remove()',
                '.block:remove():upward(2)',
                'div:remove():contains(/test-content/)',
                '.banner:has(> div[class]):remove():upward()',
                'div:remove(0)',
                'div:not([class]):remove(invalid)',
            ];
            test.each(invalidSelectors)('%s', (selector) => expectToThrowInput({ selector, error }));
        });

        describe('invalid style declaration', () => {
            const toThrowInputs = [
                { selector: 'div { }', error: STYLESHEET_ERROR_PREFIX.NO_STYLE },
                { selector: 'div { display', error: STYLESHEET_ERROR_PREFIX.INVALID_STYLE },
                { selector: 'div { display:', error: STYLESHEET_ERROR_PREFIX.UNCLOSED_STYLE },
                { selector: 'div { display: }', error: STYLESHEET_ERROR_PREFIX.NO_VALUE },
                { selector: 'div { : none }', error: STYLESHEET_ERROR_PREFIX.NO_PROPERTY },
                { selector: 'div { display: none; visible ', error: STYLESHEET_ERROR_PREFIX.INVALID_STYLE },
                { selector: 'div { display: none; visible }', error: STYLESHEET_ERROR_PREFIX.INVALID_STYLE },
                { selector: 'div { remove }', error: STYLESHEET_ERROR_PREFIX.INVALID_STYLE },
            ];
            test.each(toThrowInputs)('%s', (input) => expectToThrowInput(input));
        });
    });

    describe('various combinations', () => {
        const testsInputs = [
            {
                actual: 'div:has(> div[class]):remove() { display: none !important; }',
                expected: {
                    selector: 'div:has(> div[class])',
                    style: { remove: 'true' },
                },
            },
            {
                actual: 'div[class]:contains(remove) { display: none !important; remove: true; }',
                expected: {
                    selector: 'div[class]:contains(remove)',
                    style: { remove: 'true' },
                },
            },
            {
                actual: 'div[class]:contains(remove) { display: none !important; remove: true; debug: true; }',
                expected: {
                    selector: 'div[class]:contains(remove)',
                    style: { remove: 'true' },
                    debug: 'true',
                },
            },
        ];
        test.each(testsInputs)('%s', (input) => expectSingleRuleParsed(input));
    });

    /**
     * TODO: remake
     * do NOT merge styles
     */
    describe('merge styles for same selectors', () => {
        describe('single rule as result', () => {
            const testsInputs = [
                // selector duplicate
                {
                    actual: '#ad { top: 0 !important; } #ad { margin: 0; }',
                    expected: {
                        selector: '#ad',
                        style: { top: '0 !important', margin: '0' },
                    },
                },
                // style property duplicate
                {
                    actual: 'div { display: none; } div { top: 0 !important; } div { display: none }',
                    expected: {
                        selector: 'div',
                        style: { display: 'none', top: '0 !important' },
                    },
                },
                {
                    actual: 'div { display: none; } div { display: none }',
                    expected: {
                        selector: 'div',
                        style: { display: 'none' },
                    },
                },
                // the last value is final for property
                {
                    actual: 'div { display: none !important; } div { display: none }',
                    expected: {
                        selector: 'div',
                        style: { display: 'none' },
                    },
                },
                {
                    actual: 'div { display: none; } div { display: none !important; }',
                    expected: {
                        selector: 'div',
                        style: { display: 'none !important' },
                    },
                },
                {
                    actual: 'div { display: none !important }\n div { display: block !important; }',
                    expected: {
                        selector: 'div',
                        style: { display: 'block !important' },
                    },
                },
                // remove property
                {
                    actual: '.banner { top: 0 !important }\n .banner { remove: true; }',
                    expected: {
                        selector: '.banner',
                        style: { remove: 'true' },
                    },
                },
                {
                    actual: '.banner { remove: true; } .banner { top: 0 !important }',
                    expected: {
                        selector: '.banner',
                        style: { remove: 'true' },
                    },
                },
                // debug property
                {
                    actual: 'div[attr] { top: 0 !important } div[attr] { debug: true; }',
                    expected: {
                        selector: 'div[attr]',
                        style: { top: '0 !important' },
                        debug: 'true',
                    },
                },
                {
                    actual: 'div[attr] { top: 0 !important } div[attr] { debug: global; }',
                    expected: {
                        selector: 'div[attr]',
                        style: { top: '0 !important' },
                        debug: 'global',
                    },
                },
            ];
            test.each(testsInputs)('%s', (input) => expectSingleRuleParsed(input));
        });

        describe('multiple rules as result', () => {
            const testsInputs = [
                {
                    // the last value is final for 'display' property for 'div'
                    actual: 'div { display: none !important; } .class { top: 0 !important; } div { display: none }',
                    expected: [
                        {
                            selector: 'div',
                            style: { display: 'none' },
                        },
                        {
                            selector: '.class',
                            style: { top: '0 !important' },
                        },
                    ],
                },
            ];
            test.each(testsInputs)('%s', (input) => expectMultipleRulesParsed(input));
        });
    });

    /**
     * TODO: add tests for debug pseudo-property --- 'global'
     */

    /**
     * TODO: handle multiple rules with same selector and :
     *
     * 1 same style declaration -- return unique -- DONE
     *
     * 2 different style declaration:
     *
     *   - with multiple css style for same property -- no need
     *     'div { display: none; }\n div { display: block !important; } ' // should be handled by 'important'
     *     'div { display: none !important }\n div { display: block !important; }' // conflicting
     *
     * 3 fail on comments and mediaquery
     *   - '#$?#h1 { background-color: #fd3332 !important; /* red header * / }  - with no space before last '/'
     *   - '#$#@media (max-width: 768px) { body { padding-top: 50px !important; } }'
     */

    /**
     * TODO: add tests for invalid css rules
     */
});
