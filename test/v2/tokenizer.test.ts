import { tokenizer } from '../../src/tokenizer';

describe('tokenizer', () => {
    it('simple', () => {
        let selector = 'div.banner';
        let expected = [
            // token, position, length
            ['div', 0, 3],
            ['.', 3, 1],
            ['banner', 4, 6],
        ];
        expect(tokenizer(selector)).toEqual(expected);

        selector = '.banner';
        expected = [
            ['.', 0, 1],
            ['banner', 1, 6],
        ];
        expect(tokenizer(selector)).toEqual(expected);

        selector = 'div[id][class] > .banner';
        expected = [
            ['div', 0, 3],
            ['[', 3, 1],
            ['id', 4, 2],
            [']', 6, 1],
            ['[', 7, 1],
            ['class', 8, 5],
            [']', 13, 1],
            [' ', 14, 1],
            ['>', 15, 1],
            [' ', 16, 1],
            ['.', 17, 1],
            ['banner', 18, 6],
        ];
        expect(tokenizer(selector)).toEqual(expected);

    });
});
