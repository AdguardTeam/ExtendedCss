import path from 'node:path';
import fs from 'node:fs';

/**
 * Numeric package version with an optional supported prerelease tag.
 */
const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)(-(dev|alpha|beta)(\.\d+)?)?$/;

/**
 * First released changelog heading. The `## [Unreleased]` heading does not match.
 */
const CHANGELOG_VERSION_PATTERN = /^## \[(\d+\.\d+\.\d+)(?:-[^\]]+)?\](?:\s|$)/m;

/**
 * Shape of the package.json fields read by getBuildVersion().
 */
interface PackageJsonLike {
    /**
     * The version field from package.json, which may be stamped by CI or a release workflow.
     */
    version?: string;
}

/**
 * Derives the next patch development version from changelog content.
 *
 * @param changelog Content of the CHANGELOG.md file.
 *
 * @returns The derived development version.
 *
 * @throws When the changelog has no released heading.
 */
export const deriveDevVersion = (changelog: string): string => {
    const match = changelog.match(CHANGELOG_VERSION_PATTERN);

    if (!match) {
        throw new Error('Unable to derive a development version from CHANGELOG.md');
    }

    const core = match[1];

    if (core === undefined) {
        throw new Error('Unable to derive a development version from CHANGELOG.md');
    }

    const parts = core.split('.');
    const major = parts[0];
    const minor = parts[1];
    const patch = parts[2];

    if (major === undefined || minor === undefined || patch === undefined) {
        throw new Error('Unable to derive a development version from CHANGELOG.md');
    }

    const nextPatch = Number(patch) + 1;

    return `${major}.${minor}.${nextPatch}-dev`;
};

/**
 * Resolves the build version from a stamped package version and the changelog.
 *
 * @param rawVersion Raw version string from package.json.
 * @param changelog Content of the CHANGELOG.md file.
 *
 * @returns The resolved build version.
 *
 * @throws When the stamped version is malformed or the changelog has no released heading.
 */
export const resolveBuildVersion = (rawVersion: string | undefined, changelog: string): string => {
    const value = rawVersion ? rawVersion.trim() : '';
    if (!value) {
        return deriveDevVersion(changelog);
    }
    if (!VERSION_PATTERN.test(value)) {
        throw new Error(
            `Invalid version stamped into package.json: '${value}'. Expected x.y.z[-(dev|alpha|beta)].`,
        );
    }
    return value;
};

/**
 * Resolves the repository build version without mutating `package.json`.
 *
 * Uses the `version` field stamped into `package.json` (by CI or a release
 * workflow) when it is present and well-formed; otherwise derives the next
 * patch `-dev` version from the latest released `CHANGELOG.md` heading.
 * This mirrors the `@adguard/scriptlets` build-version mechanism.
 *
 * @returns Resolved version to stamp into all build artifacts.
 *
 * @throws When a stamped version is malformed or the changelog has no released heading.
 */
export const getBuildVersion = (): string => {
    const pkgPath = path.resolve(__dirname, '../package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as PackageJsonLike;
    const changelogPath = path.resolve(__dirname, '../CHANGELOG.md');
    const changelog = fs.readFileSync(changelogPath, 'utf8');
    return resolveBuildVersion(pkg.version, changelog);
};
