import { ExtCssRuleData } from '../../src/css-rule';

/**
 * CSS rule data object for testing.
 * Used for css-rule/parser and stylesheet/parser tests.
 *
 * Simplified version of `ExtCssRuleData` type without required `ast` property.
 */
export type TestCssRuleData = {
    selector: string,
    style?: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    debug?: string,
};

/**
 * Checks whether the parsed rules are the same as we expect.
 *
 * @param actual Array of actually parsed rules data objects.
 * @param expected Test cases expected objects.
 */
export const expectSameParsedRules = (actual: ExtCssRuleData[], expected: TestCssRuleData[]): void => {
    // toStrictEqual() cannot be used
    // because there is `ast` in `actual`
    // but there is not such property in `expected`
    expect(actual.length).toEqual(expected.length);
    actual.forEach((parsed, i) => {
        expect(parsed.selector).toEqual(expected[i]?.selector);
        expect(parsed.style).toEqual(expected[i]?.style);
        expect(parsed.debug).toEqual(expected[i]?.debug);
    });
};
