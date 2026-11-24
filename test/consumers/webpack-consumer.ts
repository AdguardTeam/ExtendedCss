import path from 'node:path';

import webpack from 'webpack';

import {
    createFixture,
    packAndInstallPackage,
    removeFixture,
    runBundleSmokeTest,
} from './utils';

/**
 * Bundles one fixture entry with webpack.
 *
 * @param fixtureDir Fixture directory.
 * @param entryName Entry file name inside the fixture directory.
 * @param outputName Output bundle file name.
 *
 * @returns A promise that resolves when the bundle is built.
 */
const runWebpackBuild = (fixtureDir: string, entryName: string, outputName: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        webpack({
            mode: 'production',
            target: 'node',
            entry: path.join(fixtureDir, entryName),
            output: {
                path: fixtureDir,
                filename: outputName,
                library: {
                    type: 'commonjs2',
                },
            },
            devtool: false,
            optimization: {
                minimize: false,
            },
        }, (error, stats) => {
            if (error) {
                reject(error);
                return;
            }

            if (!stats) {
                reject(new Error('webpack did not return build statistics.'));
                return;
            }

            if (stats.hasErrors()) {
                reject(new Error(stats.toString({ all: false, errors: true })));
                return;
            }

            resolve();
        });
    });
};

/**
 * Runs the webpack consumer fixture.
 *
 * The fixture builds one bundle from an ES module `import` and one bundle
 * from a CommonJS `require`. Both bundles run in jsdom, and the smoke test
 * applies an extended selector and checks the resulting style.
 */
export const runWebpackConsumer = async (): Promise<void> => {
    const fixtureDir = createFixture('webpack');

    try {
        packAndInstallPackage(fixtureDir);

        await runWebpackBuild(fixtureDir, 'entry-esm.js', 'bundle-esm.cjs');
        runBundleSmokeTest(fixtureDir, 'bundle-esm.cjs');

        await runWebpackBuild(fixtureDir, 'entry-cjs.js', 'bundle-cjs.cjs');
        runBundleSmokeTest(fixtureDir, 'bundle-cjs.cjs');

        console.log('[consumers] webpack bundled the ESM and CommonJS entry points and both bundles ran.');
    } finally {
        removeFixture(fixtureDir);
    }
};
