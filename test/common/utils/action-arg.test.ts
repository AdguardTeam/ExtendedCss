/**
 * @vitest-environment jsdom
 */

import { createActionArgMatcher, normalizeActionArg } from '../../../src/common/utils/action-arg';

describe('normalizeActionArg', () => {
    test.each([
        ['href', 'href'],
        ['"data-ad"', 'data-ad'],
        ["'data-ad'", 'data-ad'],
        ['/^data-/i', '/^data-/i'],
        ['', ''],
        ['/+', ''],
        ['/+/', ''],
        ['/[/', ''],
        ['/x/ii', ''],
        ['/x/g', ''],
        ['"foo bar"', ''],
        ['foo bar', ''],
        ['foo()', ''],
    ])("should normalize '%s' to '%s'", (actual, expected) => {
        expect(normalizeActionArg(actual)).toBe(expected);
    });
});

describe('createActionArgMatcher', () => {
    it('should match plain args exactly', () => {
        const isMatch = createActionArgMatcher('href');

        expect(isMatch('href')).toBe(true);
        expect(isMatch('ref')).toBe(false);
        expect(isMatch('data-href')).toBe(false);
    });

    it('should match regexp args with flags', () => {
        const isMatch = createActionArgMatcher('/^DATA-/i');

        expect(isMatch('data-ad')).toBe(true);
        expect(isMatch('DATA-TRACK')).toBe(true);
        expect(isMatch('xdata-ad')).toBe(false);
    });

    it('should never match invalid regexp args', () => {
        const isMatch = createActionArgMatcher('/+/');

        expect(isMatch('/+/')).toBe(false);
        expect(isMatch('href')).toBe(false);
    });
});
