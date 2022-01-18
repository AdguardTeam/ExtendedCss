import { tokenizer } from '../../src/tokenizer';

describe('tokenizer', () => {
    it('simple', () => {
        const selector = 'div.class';
        expect(tokenizer(selector)).toBe(selector);
    });
});
