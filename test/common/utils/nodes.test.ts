/**
 * @vitest-environment jsdom
 */

import { getElementSelectorDesc } from '../../../src/common/utils/nodes';

describe('getElementSelectorDesc', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    const testInputs = [
        {
            name: 'plain attribute values',
            html: '<div id="ad" class="banner top"></div>',
            expected: 'div[id="ad"][class="banner top"]',
        },
        {
            name: 'double quote in attribute value',
            html: '<div data-config=\'{"slot":1}\'></div>',
            expected: 'div[data-config="{\\"slot\\":1}"]',
        },
        {
            name: 'backslash in attribute value',
            html: '<div data-path="a\\b"></div>',
            expected: 'div[data-path="a\\\\b"]',
        },
        {
            name: 'double quote and backslash in attribute value',
            html: '<div data-raw=\'"a\\b"\'></div>',
            expected: 'div[data-raw="\\"a\\\\b\\""]',
        },
        {
            name: 'line feed in attribute value',
            html: '<div class="banner\n    top"></div>',
            expected: 'div[class="banner\\a     top"]',
        },
        {
            name: 'carriage return and form feed in attribute value',
            // character references are used as HTML parser replaces a raw carriage return with a line feed
            html: '<div data-text="a&#13;b&#12;c"></div>',
            expected: 'div[data-text="a\\d b\\c c"]',
        },
        {
            name: 'special characters in attribute name',
            html: '<div @click.prevent="open" :class="state"></div>',
            expected: 'div[\\@click\\.prevent="open"][\\:class="state"]',
        },
        {
            name: 'attribute name starting with digit',
            html: '<div 1data="a" -2data="b"></div>',
            expected: 'div[\\31 data="a"][-\\32 data="b"]',
        },
        {
            name: 'hyphen as attribute name',
            html: '<div -="a"></div>',
            expected: 'div[\\-="a"]',
        },
        {
            name: 'attribute with namespace',
            html: '<svg xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"></svg>',
            expected: 'svg[*|xlink="http://www.w3.org/1999/xlink"][*|space="preserve"]',
        },
        {
            name: 'valid identifier as attribute name',
            html: '<div data-a_b="a" -data="b" _ngcontent-c1="c"></div>',
            expected: 'div[data-a_b="a"][-data="b"][_ngcontent-c1="c"]',
        },
    ];

    test.each(testInputs)('$name', ({ html, expected }) => {
        document.body.innerHTML = html;
        const element = document.body.firstElementChild as Element;

        const selectorDesc = getElementSelectorDesc(element);

        expect(selectorDesc).toEqual(expected);
        // the description is used as a selector, so it should select the element it describes
        expect(document.body.querySelector(`:scope>${selectorDesc}`)).toBe(element);
    });
});
