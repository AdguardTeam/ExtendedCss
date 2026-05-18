import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { program } from 'commander';

import copy from 'rollup-plugin-copy';

import { rollupRunner } from './rollup-runner';
import { commonPlugins, libOutputBanner } from './rollup-commons';

import { runBrowserstack } from '../test/browserstack';

import {
    LIB_FILE_NAME,
    OutputFormat,
    ROOT_PATH,
    SRC_DIR_PATH,
    SRC_FILENAME,
    TEST_TEMP_DIR_PATH,
    TEST_BROWSERSTACK_DIR_PATH,
    BROWSERSTACK_TEST_FILE_NAME,
} from './constants';

const { log } = console;

const projectRootPath = path.resolve(__dirname, ROOT_PATH);
const srcInputPath = path.resolve(__dirname, SRC_DIR_PATH, SRC_FILENAME);
const testTempDir = path.resolve(__dirname, TEST_TEMP_DIR_PATH);
const browserstackTestInput = path.resolve(
    __dirname,
    TEST_BROWSERSTACK_DIR_PATH,
    BROWSERSTACK_TEST_FILE_NAME,
);
const testBrowserstackDir = path.resolve(__dirname, TEST_BROWSERSTACK_DIR_PATH);

/**
 * Runs Vitest with specified project names.
 *
 * @param projects Array of project names to run.
 */
const runVitestProjects = (projects: string[]): void => {
    const projectArgs = projects.map((p) => `--project ${p}`).join(' ');
    const cmd = `npx vitest run ${projectArgs}`;
    log(chalk.blueBright(`Running: ${cmd}`));
    execSync(cmd, { cwd: projectRootPath, stdio: 'inherit' });
    log(chalk.greenBright('Tests completed'));
};

/**
 * Builds BrowserStack test assets using Rollup.
 */
const buildBrowserstackAssets = async (): Promise<void> => {
    // Build library IIFE bundle
    await rollupRunner({
        input: srcInputPath,
        output: [{
            file: `${testTempDir}/${LIB_FILE_NAME}.js`,
            format: OutputFormat.IIFE,
            name: 'BrowserstackTest',
            banner: libOutputBanner,
        }],
        plugins: commonPlugins,
    }, 'extended-css for browserstack');

    // Build test IIFE bundle with asset copying
    await rollupRunner({
        input: browserstackTestInput,
        output: [{
            file: `${testTempDir}/browserstack.test.js`,
            format: OutputFormat.IIFE,
            name: 'BrowserstackTest',
            banner: '/* browserstack qunit testing */',
        }],
        plugins: [
            ...commonPlugins,
            copy({
                verbose: true,
                targets: [{
                    src: [
                        `${testBrowserstackDir}/browserstack.html`,
                        'node_modules/qunit/qunit/**',
                    ],
                    dest: testTempDir,
                }],
            }),
        ],
    }, 'tests for browserstack');
};

const runTestsLocally = (): void => {
    runVitestProjects(['unit', 'browser']);
};

const runTestsOnBrowserstack = async (): Promise<void> => {
    await buildBrowserstackAssets();
    await runBrowserstack();
};

const runSelectorPerformanceTests = (): void => {
    runVitestProjects(['performance']);
};

// run tests locally and on browserstack if no command specified
program
    .description('full testing')
    .action(async () => {
        await runTestsLocally();
        await runTestsOnBrowserstack();
    });

program
    .command('local')
    .description('only local tests run, no browserstack')
    .action(async () => {
        await runTestsLocally();
    });

program
    .command('browserstack')
    .description('only browserstack tests run')
    .action(async () => {
        await runTestsOnBrowserstack();
    });

// run performance selector tests, should be run manually only when needed
program
    .command('performance')
    .description('only performance selector tests run')
    .action(async () => {
        await runSelectorPerformanceTests();
    });

program.parse(process.argv);
