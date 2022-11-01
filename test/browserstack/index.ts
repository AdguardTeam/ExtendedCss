// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import browserstackRunner from 'browserstack-runner';
import dotenv from 'dotenv';
import { rawConfig } from './config';

interface BrowserConfig {
    [key: string]: string | null;
}

interface BrowserstackConfig {
    [key: string]: string | number | boolean | undefined | string[] | BrowserConfig[];
}

dotenv.config();

const config: BrowserstackConfig = {
    ...rawConfig,
    username: process.env.BROWSERSTACK_USER,
    key: process.env.BROWSERSTACK_KEY,
    // limit each runner with 60 seconds
    // if not set defaults to 5 min (300 s)
    timeout: 60,
};

export const runBrowserstack = async () => {
    browserstackRunner.run(config, (error: any): void => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (error) {
            throw error;
        }
        console.log('Test Finished');
    });
};
