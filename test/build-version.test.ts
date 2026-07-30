/**
 * @vitest-environment jsdom
 */

import { deriveDevVersion, resolveBuildVersion } from '../tools/build-version';

describe('build-version', () => {
    // Minimal changelog: an [Unreleased] section (ignored) plus one released
    // heading, version 2.3.1, so the derived dev version is 2.3.2-dev.
    const CHANGELOG = [
        '## [Unreleased]',
        '### Added',
        '- something new',
        '',
        '## [2.3.1]',
        '### Fixed',
        '- a bug',
        '',
    ].join('\n');

    describe('deriveDevVersion', () => {
        test('bumps the latest released patch and appends -dev', () => {
            expect(deriveDevVersion(CHANGELOG)).toBe('2.3.2-dev');
        });

        test('ignores prerelease qualifiers on the heading', () => {
            expect(deriveDevVersion('## [2.3.1-beta.1]\n- x\n')).toBe('2.3.2-dev');
        });

        test('throws when there is no released heading', () => {
            const onlyUnreleased = '## [Unreleased]\n### Added\n- x\n';
            expect(() => deriveDevVersion(onlyUnreleased))
                .toThrow('Unable to derive a development version from CHANGELOG.md');
        });
    });

    describe('resolveBuildVersion', () => {
        test('returns a valid stamped version unchanged', () => {
            expect(resolveBuildVersion('2.3.0', CHANGELOG)).toBe('2.3.0');
        });

        test('accepts supported prerelease stamps', () => {
            expect(resolveBuildVersion('2.3.0-dev.1', CHANGELOG)).toBe('2.3.0-dev.1');
            expect(resolveBuildVersion('2.3.0-alpha', CHANGELOG)).toBe('2.3.0-alpha');
            expect(resolveBuildVersion('2.3.0-beta.2', CHANGELOG)).toBe('2.3.0-beta.2');
        });

        test('throws on a malformed stamped version', () => {
            expect(() => resolveBuildVersion('2.3', CHANGELOG))
                .toThrow('Invalid version stamped into package.json');
            expect(() => resolveBuildVersion('2.3.0-rc.1', CHANGELOG))
                .toThrow('Invalid version stamped into package.json');
        });

        test('falls back to the derived dev version when none is stamped', () => {
            expect(resolveBuildVersion(undefined, CHANGELOG)).toBe('2.3.2-dev');
            expect(resolveBuildVersion('', CHANGELOG)).toBe('2.3.2-dev');
            expect(resolveBuildVersion('   ', CHANGELOG)).toBe('2.3.2-dev');
        });
    });
});
