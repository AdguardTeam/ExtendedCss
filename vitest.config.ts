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
