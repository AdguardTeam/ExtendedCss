import { playwright } from '@vitest/browser-playwright';
import { configDefaults, defineConfig } from 'vitest/config';

const LOCAL_TEST_TIMEOUT_MS = 20 * 1000;
const PERFORMANCE_TEST_TIMEOUT_MS = 10 * 1000;

export default defineConfig({
    test: {
        globals: true,
        sequence: {
            hooks: 'list',
        },
        // Cap worker parallelism in CI. The remote BuildKit builder is CPU-rich
        // but capped at ~1.8 GB, so vitest would otherwise spawn one worker per
        // core and OOM before the suite finishes. CI is signalled by
        // ENV CI=true in the Docker test stages; local runs keep the default
        // (full) pool size. Vitest 4 made `maxWorkers` a top-level option
        // (the old `poolOptions.{forks,threads}` was removed).
        maxWorkers: process.env.CI ? 4 : undefined,
        projects: [
            {
                test: {
                    name: 'unit',
                    globals: true,
                    environment: 'jsdom',
                    include: [
                        'test/**/*.test.ts',
                    ],
                    exclude: [
                        ...configDefaults.exclude,
                        'test/browserstack/**',
                        'test/performance-selector/**',
                        'test/extended-css-playwright.test.ts',
                        'test/selector/query-playwright.test.ts',
                        'test/performance-xpath-evaluate.test.ts',
                    ],
                    testTimeout: LOCAL_TEST_TIMEOUT_MS,
                },
            },
            {
                test: {
                    name: 'browser',
                    globals: true,
                    include: [
                        'test/extended-css-playwright.test.ts',
                        'test/selector/query-playwright.test.ts',
                        'test/performance-xpath-evaluate.test.ts',
                    ],
                    browser: {
                        enabled: true,
                        provider: playwright(),
                        headless: true,
                        instances: [
                            { browser: 'chromium' },
                        ],
                    },
                    testTimeout: LOCAL_TEST_TIMEOUT_MS,
                },
            },
            {
                test: {
                    name: 'performance',
                    globals: true,
                    include: [
                        'test/performance-selector/performance-selector.test.ts',
                    ],
                    browser: {
                        enabled: true,
                        provider: playwright(),
                        headless: true,
                        instances: [
                            { browser: 'chromium' },
                        ],
                    },
                    testTimeout: PERFORMANCE_TEST_TIMEOUT_MS,
                },
            },
        ],
    },
});
