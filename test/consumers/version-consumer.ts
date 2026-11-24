import {
    createFixture,
    packAndInstallPackage,
    removeFixture,
    runCommand,
} from './utils';

/**
 * Runs the runtime checks for the `/version` subpath.
 *
 * The fixture imports `@adguard/extended-css/version` from an ES module and
 * from a CommonJS module. This loads `version.esm.mjs` and `version.cjs.js`
 * through the `exports` map.
 */
export const runVersionConsumer = (): void => {
    const fixtureDir = createFixture('version');

    try {
        packAndInstallPackage(fixtureDir);

        runCommand(process.execPath, ['check-version.mjs'], fixtureDir);
        runCommand(process.execPath, ['check-version.cjs'], fixtureDir);

        console.log('[consumers] Version subpath loaded from ESM and CommonJS.');
    } finally {
        removeFixture(fixtureDir);
    }
};
