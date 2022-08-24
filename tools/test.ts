import path from 'path';
import chalk from 'chalk';
import { runCLI } from 'jest';
import { program } from 'commander';

import copy from 'rollup-plugin-copy';
import del from 'rollup-plugin-delete';
import html2 from 'rollup-plugin-html2';

import { rollupRunner } from './rollup-runner';
import { commonPlugins, libOutputBanner } from './rollup-commons';

import { runBrowserstack } from '../test/browserstack';

import {
    LIB_FILE_NAME,
    OutputFormat,
    ROOT_PATH,
    SRC_DIR_PATH,
    SRC_FILENAME,
    SELECTOR_QUERY_FILE_NAME,
    SELECTOR_SRC_DIR_PATH,
    TEST_TEMP_DIR_PATH,
    TEST_BROWSERSTACK_DIR_PATH,
    BROWSERSTACK_TEST_FILE_NAME,
} from './constants';

import jestConfig from '../jest.config';

const { log } = console;

const projectRootPath = path.resolve(__dirname, ROOT_PATH);
const srcInputPath = path.resolve(__dirname, SRC_DIR_PATH, SRC_FILENAME);
const selectorInputPath = path.resolve(__dirname, SELECTOR_SRC_DIR_PATH, SELECTOR_QUERY_FILE_NAME);
const testTempDir = path.resolve(__dirname, TEST_TEMP_DIR_PATH);
const browserstackTestInput = path.resolve(__dirname, TEST_BROWSERSTACK_DIR_PATH, BROWSERSTACK_TEST_FILE_NAME);
const testBrowserstackDir = path.resolve(__dirname, TEST_BROWSERSTACK_DIR_PATH);

const selectorTestConfig = {
    input: selectorInputPath,
    output: [
        {
            file: `${testTempDir}/selector.js`,
            format: OutputFormat.IIFE,
            name: 'testExtCss',
            banner: '/* querySelectorAll testing */',
        },
    ],
    plugins: [
        ...commonPlugins,
        html2({
            template: 'test/test-files/empty.html',
        }),
        del({
            targets: [testTempDir],
            hook: 'buildStart',
        }),
    ],
};
const buildSelectorTests = async () => {
    const name = 'selector tests for playwright';
    await rollupRunner(selectorTestConfig, name);
};

// needed for browserstack tests
const browserstackLibConfig = {
    input: srcInputPath,
    output: [
        {
            file: `${testTempDir}/${LIB_FILE_NAME}.js`,
            format: OutputFormat.IIFE,
            name: 'BrowserstackTest',
            banner: libOutputBanner,
        },
    ],
    plugins: commonPlugins,
};
const buildLibForBrowserstack = async () => {
    const name = 'extended-css for browserstack';
    await rollupRunner(browserstackLibConfig, name);
};

const browserstackTestConfig = {
    input: browserstackTestInput,
    output: [
        {
            file: `${testTempDir}/browserstack.test.js`,
            format: OutputFormat.IIFE,
            name: 'BrowserstackTest',
            banner: '/* browserstack qunit testing */',
        },
    ],
    plugins: [
        ...commonPlugins,
        copy({
            verbose: true,
            targets: [
                {
                    src: [
                        `${testBrowserstackDir}/browserstack.html`,
                        'node_modules/qunit/qunit/**',
                    ],
                    dest: testTempDir,
                },
            ],
        }),
    ],
};
const buildBrowserstackTests = async (): Promise<void> => {
    const name = 'tests for browserstack';
    await rollupRunner(browserstackTestConfig, name);
};

const runJest = async (): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await runCLI(jestConfig as any, [projectRootPath]);

    if (result.results.success) {
        log(chalk.greenBright('Tests completed'));
    } else {
        log(chalk.redBright.bold('Tests failed'));
    }
};

const runTestsLocally = async (): Promise<void> => {
    await buildSelectorTests();
    await runJest();
};

const runTestsOnBrowserstack = async (): Promise<void> => {
    await buildLibForBrowserstack();
    await buildBrowserstackTests();
    await runBrowserstack();
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

program.parse(process.argv);
