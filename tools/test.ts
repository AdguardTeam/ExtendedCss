import path from 'path';
import chalk from 'chalk';
import { runCLI } from 'jest';
import { program } from 'commander';

import copy from 'rollup-plugin-copy';
import del from 'rollup-plugin-delete';
import html2 from 'rollup-plugin-html2';

import { rollupRunner } from './rollup-runner';
import { commonPlugins, libOutputBanner } from './rollup-commons';

import type { Config } from '@jest/types';
import commonJestConfig from '../jest.config';
import performanceConfig from '../test/performance-selector/jest.config';

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

const { log } = console;

const PERFORMANCE_XPATH_EVALUATION_PATH = './test/helpers/xpath-evaluate-counter.ts';
const PERFORMANCE_SELECTOR_PATH = './test/helpers/performance-checker.ts';

const TEST_FILES_DIR_PATH = '../test/test-files';
const EXT_CSS_V1_BUNDLE_FILENAME = 'extCssV1.js';
const EXT_CSS_V2_BUNDLE_FILENAME = 'extCssV2.js';

const projectRootPath = path.resolve(__dirname, ROOT_PATH);
const srcInputPath = path.resolve(__dirname, SRC_DIR_PATH, SRC_FILENAME);
const selectorInputPath = path.resolve(__dirname, SELECTOR_SRC_DIR_PATH, SELECTOR_QUERY_FILE_NAME);
const testTempDir = path.resolve(__dirname, TEST_TEMP_DIR_PATH);
const browserstackTestInput = path.resolve(__dirname, TEST_BROWSERSTACK_DIR_PATH, BROWSERSTACK_TEST_FILE_NAME);
const testBrowserstackDir = path.resolve(__dirname, TEST_BROWSERSTACK_DIR_PATH);
const extCssV1BundlePath = path.resolve(__dirname, TEST_FILES_DIR_PATH, EXT_CSS_V1_BUNDLE_FILENAME);

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

// independent test config for xpath evaluate
const v2XpathEvaluationPerformanceTestConfig = {
    input: PERFORMANCE_XPATH_EVALUATION_PATH,
    output: [
        {
            file: `${testTempDir}/performance-xpath-evaluate.js`,
            format: OutputFormat.IIFE,
            name: 'v2ExtCssPerformanceXpath',
            banner: '/* xpath evaluation performance testing */',
        },
    ],
    plugins: [
        ...commonPlugins,
        html2({
            template: 'test/test-files/performance.html',
            fileName: `${testTempDir}/performance-xpath-evaluate.html`,
        }),
    ],
};
const buildXpathPerformanceTests = async () => {
    const name = 'xpath evaluate tests';
    await rollupRunner(v2XpathEvaluationPerformanceTestConfig, name);
};

const temp1HtmlPath = `${testTempDir}/performance-selector-temp1.html`;
const tempV1SelectorPerformanceConfig = {
    // bundled extCssV1 is being injected into template performance.html;
    // after that use the generated html as template for selectorPerformanceTestConfig
    input: extCssV1BundlePath,
    output: [
        {
            file: `${testTempDir}/${EXT_CSS_V1_BUNDLE_FILENAME}`,
            format: OutputFormat.IIFE,
            name: 'extCssV1',
            banner: '/* ExtendedCSS v1 for performance comparing */',
        },
    ],
    plugins: [
        html2({
            // output file
            fileName: temp1HtmlPath,
            // initial template to inject ExtendedCSS v1
            template: 'test/test-files/performance.html',
        }),
    ],
};

const temp2HtmlPath = `${testTempDir}/performance-selector-temp2.html`;
// ExtendedCss v2 should be bundled before running selector performance comparing test
const tempV2SelectorPerformanceConfig = {
    input: srcInputPath,
    output: [
        {
            file: `${testTempDir}/${EXT_CSS_V2_BUNDLE_FILENAME}`,
            format: OutputFormat.IIFE,
            name: 'extCssV2',
            banner: '/* ExtendedCSS v2 for performance comparing */',
        },
    ],
    plugins: [
        ...commonPlugins,
        html2({
            // output file
            fileName: temp2HtmlPath,
            // template is generated previously html with injected ExtendedCss v1
            template: temp1HtmlPath,
        }),
    ],
};

const selectorPerformanceTestConfig = {
    input: PERFORMANCE_SELECTOR_PATH,
    output: [
        {
            file: `${testTempDir}/performance-selector.js`,
            format: OutputFormat.IIFE,
            name: 'extCssPerformance',
            banner: '/* selector performance testing */',
        },
    ],
    plugins: [
        ...commonPlugins,
        html2({
            template: temp2HtmlPath,
            fileName: `${testTempDir}/performance-selector.html`,
        }),
        // bundled ExtendedCSS v1 lib code is stored in test/test-files,
        // it should be copied to test/dist
        copy({
            targets: [
                { src: extCssV1BundlePath, dest: testTempDir },
            ],
        }),
    ],
};
const buildPerformanceSelectorTests = async () => {
    const v1PreparationBuildName = 'prepare ExtendedCss v1';
    await rollupRunner(tempV1SelectorPerformanceConfig, v1PreparationBuildName);
    const v2PreparationBuildName = 'prepare ExtendedCss v2';
    await rollupRunner(tempV2SelectorPerformanceConfig, v2PreparationBuildName);
    const finalBuildName = 'selector performance compare tests';
    await rollupRunner(selectorPerformanceTestConfig, finalBuildName);
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

/**
 * Runs jest tests.
 *
 * @param config Jest config.
 */
const runJest = async (config: Config.InitialOptions): Promise<void> => {
    const { results } = await runCLI(config as Config.Argv, [projectRootPath]);
    if (results.success) {
        log(chalk.greenBright('Tests completed'));
    } else {
        throw new Error(chalk.redBright.bold('Tests failed'));
    }
};

const runTestsLocally = async (): Promise<void> => {
    await buildSelectorTests();
    await buildXpathPerformanceTests();
    await runJest(commonJestConfig);
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

// run performance selector tests, should be run manually only when needed
const runSelectorPerformanceTests = async (): Promise<void> => {
    await buildPerformanceSelectorTests();
    await runJest(performanceConfig);
};

program
    .command('performance')
    .description('only performance selector tests run')
    .action(async () => {
        await runSelectorPerformanceTests();
    });

program.parse(process.argv);
