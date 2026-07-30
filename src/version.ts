/**
 * @file Extended CSS version.
 */

// ! Notice:
// `EXTENDED_CSS_VERSION` is a build-time placeholder
// (`'__EXTENDED_CSS_VERSION__'`, see `src/common/constants.ts`). The Rollup
// bundler replaces it with the real package version via
// `@rollup/plugin-replace` (configured in `tools/rollup-commons.ts`), with the
// version resolved by `tools/build-version.ts` (`getBuildVersion()`).
// Re-exporting the placeholder here avoids importing `version` from
// `package.json` in `src/`, which would break `tsc`'s declaration output
// (`dist/types/src/version.d.ts`) with a wrong relative path to `package.json`.
export { EXTENDED_CSS_VERSION } from './common/constants';
