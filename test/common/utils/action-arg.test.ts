/**
 * @vitest-environment jsdom
 */

import {
    MAX_ACTION_ARG_MATCHERS_COUNT,
    createActionArgMatcher,
    normalizeActionArg,
} from '../../../src/common/utils/action-arg';

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

    it('should evict the least recently used matchers when the cache is full', () => {
        const firstMatcher = createActionArgMatcher('cache-test-first');
        for (let i = 0; i < MAX_ACTION_ARG_MATCHERS_COUNT; i += 1) {
            createActionArgMatcher(`cache-test-${i}`);
        }

        // the first matcher should be evicted as the least recently used
        expect(createActionArgMatcher('cache-test-first')).not.toBe(firstMatcher);
    });
});
