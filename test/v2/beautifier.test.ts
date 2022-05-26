import { beautify } from '../../src/beautifier';

describe('beautifier', () => {
    describe('trim selectors', () => {
        const rawSelectors = [
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
        const expected = '#test p';

        test.each(
            rawSelectors.map((raw) => ({ raw })),
        )('%s', ({ raw }) => {
            expect(beautify(raw)).toEqual(expected);
        });
    });
});
