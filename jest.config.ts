import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
    silent: true,
    testPathIgnorePatterns: [
        './test/browserstack',
        './tools/test',
        // do not run performance selector tests while `pnpm test local`
        // as it should be run separately and manually
        './test/performance-selector/performance-selector.test.ts',
    ],
};

export default config;
