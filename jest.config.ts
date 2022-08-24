import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
    silent: true,
    testPathIgnorePatterns: [
        './test/browserstack',
        './tools/test',
    ],
};

export default config;
