import {
    createFixture,
    getTscPath,
    packAndInstallPackage,
    removeFixture,
    runCommand,
} from './utils';

/**
 * Runs the TypeScript consumer fixture.
 *
 * The fixture imports the package and the `/version` subpath and compiles
 * with two module resolution modes: `bundler` and `node16`. Type-level
 * assertions in the fixture make the compilation fail when a public type
 * resolves to `any`.
 */
export const runTypescriptConsumer = (): void => {
    const fixtureDir = createFixture('typescript');

    try {
        packAndInstallPackage(fixtureDir);

        const tscPath = getTscPath();
        for (const configName of ['tsconfig.bundler.json', 'tsconfig.node16.json']) {
            runCommand(
                process.execPath,
                [tscPath, '--project', configName, '--noEmit'],
                fixtureDir,
            );
        }

        console.log('[consumers] TypeScript types resolved with bundler and node16 resolution.');
    } finally {
        removeFixture(fixtureDir);
    }
};
