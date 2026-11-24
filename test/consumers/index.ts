import { runIifeConsumer } from './iife-consumer';
import { runRollupConsumer } from './rollup-consumer';
import { runTypescriptConsumer } from './typescript-consumer';
import { runVersionConsumer } from './version-consumer';
import { runWebpackConsumer } from './webpack-consumer';
import { assertDistReady, assertPackageTargets } from './utils';

/**
 * A named consumer test.
 */
interface IConsumerTest {
    /**
     * Test name for log output.
     */
    name: string;

    /**
     * Test body.
     */
    run: () => void | Promise<void>;
}

/**
 * Runs all consumer tests against the packed package.
 *
 * Run `pnpm build` before this function. Each fixture installs the package
 * from an `npm pack` tarball, so no fixture reads files from `src/`.
 */
export const runConsumerTests = async (): Promise<void> => {
    assertDistReady();
    assertPackageTargets();

    const consumerTests: IConsumerTest[] = [
        { name: 'TypeScript declarations', run: runTypescriptConsumer },
        { name: 'version subpath', run: runVersionConsumer },
        { name: 'webpack ESM and CommonJS bundles', run: runWebpackConsumer },
        { name: 'Rollup ESM bundle', run: runRollupConsumer },
        { name: 'IIFE files in Playwright', run: runIifeConsumer },
    ];

    for (const consumerTest of consumerTests) {
        console.log(`\n[consumers] Starting: ${consumerTest.name}`);
        await consumerTest.run();
        console.log(`[consumers] Passed: ${consumerTest.name}`);
    }

    console.log('\n[consumers] All consumer tests passed.');
};
