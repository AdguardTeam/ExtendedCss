import path from 'node:path';

import { nodeResolve } from '@rollup/plugin-node-resolve';
import { rollup } from 'rollup';

import {
    createFixture,
    packAndInstallPackage,
    removeFixture,
    runBundleSmokeTest,
} from './utils';

/**
 * Runs the Rollup consumer fixture.
 *
 * The fixture bundles an ES module `import` of the package and runs the
 * resulting CommonJS bundle in jsdom. The smoke test applies an extended
 * selector and checks the resulting style.
 */
export const runRollupConsumer = async (): Promise<void> => {
    const fixtureDir = createFixture('rollup');

    try {
        packAndInstallPackage(fixtureDir);

        const bundle = await rollup({
            input: path.join(fixtureDir, 'entry-esm.js'),
            plugins: [
                nodeResolve(),
            ],
        });

        try {
            await bundle.write({
                file: path.join(fixtureDir, 'bundle-rollup.cjs'),
                format: 'cjs',
                exports: 'named',
            });
        } finally {
            await bundle.close();
        }

        runBundleSmokeTest(fixtureDir, 'bundle-rollup.cjs');

        console.log('[consumers] Rollup bundled the ESM entry point and the bundle ran.');
    } finally {
        removeFixture(fixtureDir);
    }
};
