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
            attributes: { id: 'ad', class: 'banner top' },
            expected: 'div[id="ad"][class="banner top"]',
        },
        {
            name: 'double quote in attribute value',
            attributes: { 'data-config': '{"slot":1}' },
            expected: 'div[data-config="{\\"slot\\":1}"]',
        },
        {
            name: 'backslash in attribute value',
            attributes: { 'data-path': 'a\\b' },
            expected: 'div[data-path="a\\\\b"]',
        },
        {
            name: 'double quote and backslash in attribute value',
            attributes: { 'data-raw': '"a\\b"' },
            expected: 'div[data-raw="\\"a\\\\b\\""]',
        },
    ];

    test.each(testInputs)('$name', ({ attributes, expected }) => {
        const element = document.createElement('div');
        Object.entries(attributes).forEach(([name, value]) => {
            element.setAttribute(name, value);
        });
        document.body.appendChild(element);

        const selectorDesc = getElementSelectorDesc(element);

        expect(selectorDesc).toEqual(expected);
        // the description is used as a selector, so it should select the element it describes
        expect(document.body.querySelector(`:scope>${selectorDesc}`)).toBe(element);
    });
});
