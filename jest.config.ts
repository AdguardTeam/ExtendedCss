import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
    testPathIgnorePatterns: ['./test/browserstack'],
};

export default config;
