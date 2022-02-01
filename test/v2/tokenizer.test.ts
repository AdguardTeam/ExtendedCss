import { tokenize } from '../../src/tokenizer';

describe('tokenizer', () => {
    it('simple', () => {
        let selector = 'div.banner';
        let expected = [
            // type, value
            ['word', 'div'],
            ['mark', '.'],
            ['word', 'banner'],
        ];
        expect(tokenize(selector)).toEqual(expected);

        selector = '.banner';
        expected = [
            // type, value
            ['mark', '.'],
            ['word', 'banner'],
        ];
        // expected = [
        //     // type, value, start, end
        //     ['mark', '.', 0, 0],
        //     ['word', 'banner', 1, 6],
        // ];
        expect(tokenize(selector)).toEqual(expected);

        selector = 'div[id][class] > .banner';
        expected = [
            // type, value
            ['word', 'div'],
            ['mark', '['],
            ['word', 'id'],
            ['mark', ']'],
            ['mark', '['],
            ['word', 'class'],
            ['mark', ']'],
            ['mark', ' '],
            ['mark', '>'],
            ['mark', ' '],
            ['mark', '.'],
            ['word', 'banner'],
        ];
        // expected = [
        //     // type, value, start, end
        //     ['word', 'div', 0, 2],
        //     ['mark', '[', 3, 3],
        //     ['word', 'id', 4, 5],
        //     ['mark', ']', 6, 6],
        //     ['mark', '[', 7, 7],
        //     ['word', 'class', 8, 12],
        //     ['mark', ']', 13, 13],
        //     ['space', ' ', 14, 14],
        //     ['mark', '>', 15, 15],
        //     ['space', ' ', 16, 16],
        //     ['mark', '.', 17, 17],
        //     ['word', 'banner', 18, 23],
        // ];
        expect(tokenize(selector)).toEqual(expected);
    });
});
