import type { Config } from '@jest/types';

export const performanceConfig: Config.InitialOptions = {
    silent: true,
    testPathIgnorePatterns: [
        './test/browserstack',
        './tools/test',
    ],
    // for manual run of performance selector tests
    testRegex: ['performance-selector.test.ts'],
};

export default performanceConfig;
