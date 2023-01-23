// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import browserstackRunner from 'browserstack-runner';
import dotenv from 'dotenv';
import { rawConfig } from './config';

// limit for each worker
const TIMEOUT_PER_WORKER_SEC = 50;

type BrowserConfig = {
    [key: string]: string | null;
};

type BrowserstackConfig = {
    [key: string]: string | number | boolean | undefined | string[] | BrowserConfig[];
};

dotenv.config();

const config: BrowserstackConfig = {
    ...rawConfig,
    username: process.env.BROWSERSTACK_USER,
    key: process.env.BROWSERSTACK_KEY,
    // if not limited, default timeout is used
    // which is 5 min (300 s)
    timeout: TIMEOUT_PER_WORKER_SEC,
};

export const runBrowserstack = async () => {
    // for invalid config.browsers capability the error is thrown
    // but there is no exit on fail.
    // that's why we need workaround with `report` checking
    let launchedWorkersCount = 0;

    browserstackRunner.run(config, (error: unknown, report: unknown[]): void => {
        if (error) {
            throw error;
        }
        if (report) {
            launchedWorkersCount = report.length;
        }
        console.log('Test Finished');
    });

    setTimeout(() => {
        if (launchedWorkersCount !== rawConfig.browsers.length) {
            throw new Error('Some browsers were not launched');
        }
    }, rawConfig.browsers.length * TIMEOUT_PER_WORKER_SEC * 1000);
};
