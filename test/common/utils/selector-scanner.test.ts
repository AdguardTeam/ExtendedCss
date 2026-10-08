/**
 * @vitest-environment jsdom
 */

import {
    findClosingParenthesis,
    findStyleBlockStarts,
    scanSelector,
} from '../../../src/common/utils/selector-scanner';

describe('selector-scanner', () => {
    describe('findStyleBlockStarts', () => {
        it('finds style block starts in a plain selector', () => {
            const input = 'div { color: red; }';
            expect(findStyleBlockStarts(input)).toEqual([input.indexOf('{')]);
        });

        it('finds all style block starts in a multi-rule string', () => {
            const input = 'a { color: red } b { color: blue }';
            expect(findStyleBlockStarts(input)).toEqual([input.indexOf('{'), input.lastIndexOf('{')]);
        });

        it('skips braces inside quoted strings', () => {
            const input = 'div[data-x="a{b"] { color: red }';
            expect(findStyleBlockStarts(input)).toEqual([input.lastIndexOf('{')]);
        });

        it('skips braces inside regexp literals', () => {
            const input = 'div:remove-attr(/^a{1,2}$/) { color: red }';
            expect(findStyleBlockStarts(input)).toEqual([input.lastIndexOf('{')]);
        });

        it('skips braces inside action arguments', () => {
            const input = '#d:remove-class(ad{foo) { color: red }';
            expect(findStyleBlockStarts(input)).toEqual([input.lastIndexOf('{')]);
        });

        it('skips braces inside :xpath() arguments', () => {
            const input = ':xpath(//div[contains(., "{")]) { color: red }';
            expect(findStyleBlockStarts(input)).toEqual([input.lastIndexOf('{')]);
        });

        it('treats a quote after an escaped backslash as a closing quote', () => {
            const input = 'div[data-x="a\\\\"] { color: red }';
            expect(findStyleBlockStarts(input)).toEqual([input.lastIndexOf('{')]);
        });

        it('returns an empty array when there is no style block', () => {
            expect(findStyleBlockStarts('div:remove-attr(href)')).toEqual([]);
        });
    });

    describe('findClosingParenthesis', () => {
        it('finds the closing parenthesis after a regexp argument', () => {
            const input = 'div:remove-attr(/^data-(x|y)$/)';
            const argStartIndex = 'div:remove-attr('.length;
            expect(findClosingParenthesis(input, argStartIndex, 'remove-attr')).toBe(input.length - 1);
        });

        it('skips closing parentheses inside quoted strings', () => {
            const input = 'div:remove-class("a)b")';
            const argStartIndex = 'div:remove-class('.length;
            expect(findClosingParenthesis(input, argStartIndex, 'remove-class')).toBe(input.length - 1);
        });

        it('returns -1 for an unclosed regexp argument', () => {
            const input = 'div:remove-attr(/foo';
            const argStartIndex = 'div:remove-attr('.length;
            expect(findClosingParenthesis(input, argStartIndex, 'remove-attr')).toBe(-1);
        });
    });

    describe('scanSelector', () => {
        it('reports only top-level colons', () => {
            const input = 'div:has(> a:contains(x)):remove()';
            const indexes: number[] = [];
            scanSelector(input, {
                onTopLevelColon: (index) => {
                    indexes.push(index);
                },
            });
            expect(indexes).toEqual([input.indexOf(':has'), input.indexOf(':remove')]);
        });

        it('does not report braces of action arguments', () => {
            const input = '#d:remove-class(ad{foo) { color: red }';
            const indexes: number[] = [];
            scanSelector(input, {
                onTopLevelColon: (index) => {
                    const closingIndex = input.indexOf(')', index);
                    return closingIndex === -1 ? undefined : closingIndex;
                },
                onStyleBlockStart: (index) => {
                    indexes.push(index);
                },
            });
            expect(indexes).toEqual([input.lastIndexOf('{')]);
        });
    });
});
