import { tokenize } from '../../src/tokenizer';

describe('tokenizer', () => {
    it('simple', () => {
        let selector = 'div.banner';
        let expected = [
            { type: 'word', value: 'div' },
            { type: 'mark', value: '.' },
            { type: 'word', value: 'banner' },
        ];
        expect(tokenize(selector)).toEqual(expected);

        selector = '.banner';
        expected = [
            { type: 'mark', value: '.' },
            { type: 'word', value: 'banner' },
        ];
        expect(tokenize(selector)).toEqual(expected);

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
        expect(tokenize(selector)).toEqual(expected);
    });

    it('pseudo-class with regex', () => {
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
        expect(tokenize(selector)).toEqual(expected);
    });
});
