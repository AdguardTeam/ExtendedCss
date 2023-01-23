/**
 * @jest-environment jsdom
 */

import { tokenizeAttribute, tokenizeSelector } from '../../src/selector/tokenizer';

describe('tokenizer', () => {
    it('selector tokenizer - simple', () => {
        let selector = 'div.banner';
        let expected = [
            { type: 'word', value: 'div' },
            { type: 'mark', value: '.' },
            { type: 'word', value: 'banner' },
        ];
        expect(tokenizeSelector(selector)).toEqual(expected);

        selector = '.banner';
        expected = [
            { type: 'mark', value: '.' },
            { type: 'word', value: 'banner' },
        ];
        expect(tokenizeSelector(selector)).toEqual(expected);

        selector = 'div[id][class] > .banner';
        expected = [
            { type: 'word', value: 'div' },
            { type: 'mark', value: '[' },
            { type: 'word', value: 'id' },
            { type: 'mark', value: ']' },
            { type: 'mark', value: '[' },
            { type: 'word', value: 'class' },
            { type: 'mark', value: ']' },
            { type: 'mark', value: ' ' },
            { type: 'mark', value: '>' },
            { type: 'mark', value: ' ' },
            { type: 'mark', value: '.' },
            { type: 'word', value: 'banner' },
        ];
        expect(tokenizeSelector(selector)).toEqual(expected);

        selector = 'div[class="banner"]';
        expected = [
            { type: 'word', value: 'div' },
            { type: 'mark', value: '[' },
            { type: 'word', value: 'class=' },
            { type: 'mark', value: '"' },
            { type: 'word', value: 'banner' },
            { type: 'mark', value: '"' },
            { type: 'mark', value: ']' },
        ];
        expect(tokenizeSelector(selector)).toEqual(expected);
    });

    it('selector tokenizer - pseudo-class with regex', () => {
        const selector = 'div:matches-css(background-image: /^url\\("data:image\\/gif;base64.+/)';
        const expected = [
            { type: 'word', value: 'div' },
            { type: 'mark', value: ':' },
            { type: 'word', value: 'matches-css' },
            { type: 'mark', value: '(' },
            { type: 'word', value: 'background-image' },
            { type: 'mark', value: ':' },
            { type: 'mark', value: ' ' },
            { type: 'mark', value: '/' },
            { type: 'mark', value: '^' },
            { type: 'word', value: 'url' },
            { type: 'mark', value: '\\' },
            { type: 'mark', value: '(' },
            { type: 'mark', value: '"' },
            { type: 'word', value: 'data' },
            { type: 'mark', value: ':' },
            { type: 'word', value: 'image' },
            { type: 'mark', value: '\\' },
            { type: 'mark', value: '/' },
            { type: 'word', value: 'gif' },
            { type: 'mark', value: ';' },
            { type: 'word', value: 'base64' },
            { type: 'mark', value: '.' },
            { type: 'mark', value: '+' },
            { type: 'mark', value: '/' },
            { type: 'mark', value: ')' },
        ];
        expect(tokenizeSelector(selector)).toEqual(expected);
    });

    describe('selector tokenizer - trim selectors', () => {
        const testCases = [
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
        // should be '#test p'
        const expected = [
            { type: 'mark', value: '#' },
            { type: 'word', value: 'test' },
            { type: 'mark', value: ' ' },
            { type: 'word', value: 'p' },
        ];
        test.each(testCases)('%s', (actual) => {
            expect(tokenizeSelector(actual)).toEqual(expected);
        });
    });

    it('attribute tokenizer', () => {
        let attribute;
        let expected;

        attribute = 'class="banner"';
        expected = [
            { type: 'word', value: 'class' },
            { type: 'mark', value: '=' },
            { type: 'mark', value: '"' },
            { type: 'word', value: 'banner' },
            { type: 'mark', value: '"' },
        ];
        expect(tokenizeAttribute(attribute)).toEqual(expected);

        attribute = 'class="case"i';
        expected = [
            { type: 'word', value: 'class' },
            { type: 'mark', value: '=' },
            { type: 'mark', value: '"' },
            { type: 'word', value: 'case' },
            { type: 'mark', value: '"' },
            { type: 'word', value: 'i' },
        ];
        expect(tokenizeAttribute(attribute)).toEqual(expected);

        attribute = 'alt-data^="slot"';
        expected = [
            { type: 'word', value: 'alt-data' },
            { type: 'mark', value: '^' },
            { type: 'mark', value: '=' },
            { type: 'mark', value: '"' },
            { type: 'word', value: 'slot' },
            { type: 'mark', value: '"' },
        ];
        expect(tokenizeAttribute(attribute)).toEqual(expected);
    });
});
