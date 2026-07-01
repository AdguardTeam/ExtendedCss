import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { writeFile } from './utils';
import { program } from 'commander';

import { terser } from 'rollup-plugin-terser';

import { commonPlugins, libOutputBanner } from './rollup-commons';
import { rollupRunner } from './rollup-runner';

import {
    SRC_DIR_PATH,
    SRC_FILENAME,
    SRC_DEFAULT_FILENAME,
    SRC_APPLY_FILENAME,
    LIBRARY_NAME,
    LIB_FILE_NAME,
    APPLY_LIB_FILE_NAME,
    APPLY_GLOBAL_NAME,
    DIST_DIR_PATH,
    BUILD_TXT_FILENAME,
    OutputFormat,
    SRC_VERSION_FILENAME,
} from './constants';

import { version } from '../package.json';

const srcInputPath = path.resolve(__dirname, SRC_DIR_PATH, SRC_FILENAME);
const srcVersionPath = path.resolve(__dirname, SRC_DIR_PATH, SRC_VERSION_FILENAME);
const srcInputDefaultPath = path.resolve(__dirname, SRC_DIR_PATH, SRC_DEFAULT_FILENAME);
const srcInputApplyPath = path.resolve(__dirname, SRC_DIR_PATH, SRC_APPLY_FILENAME);

const prodOutputDir = path.resolve(__dirname, DIST_DIR_PATH);

const { log } = console;

/**
 * Maximum allowed size (in bytes) of the minified apply IIFE bundle.
 *
 * The bundle is injected via `chrome.scripting.executeScript()` (AG-45086) and
 * must stay small; MV3 `scripting.executeScript` recommends staying well under
 * the per-file limits.
 */
const APPLY_BUNDLE_SIZE_LIMIT_BYTES = 500 * 1024;

/**
 * Asserts that the minified apply IIFE bundle stays under the configured size
 * limit. Fails the build (`pnpm build`) if the bundle is too large for
 * `chrome.scripting.executeScript()` injection.
 *
 * @throws If the bundle exceeds `APPLY_BUNDLE_SIZE_LIMIT_BYTES`.
 */
const assertApplyBundleSize = (): void => {
    const minifiedPath = path.resolve(prodOutputDir, `${APPLY_LIB_FILE_NAME}.min.js`);
    const { size: sizeBytes } = fs.statSync(minifiedPath);
    const limitBytes = APPLY_BUNDLE_SIZE_LIMIT_BYTES;
    if (sizeBytes >= limitBytes) {
        const sizeKb = Math.round(sizeBytes / 1024);
        const limitKb = Math.round(limitBytes / 1024);
        throw new Error(
            `Apply bundle size ${sizeKb} KB exceeds the ${limitKb} KB limit: ${minifiedPath}.`,
        );
    }
    log(
        chalk.greenBright('Apply bundle size:'),
        `${Math.round(sizeBytes / 1024)} KB (limit ${Math.round(limitBytes / 1024)} KB)`,
    );
};

/**
 * Public method `query()` will be available as named export.
 *
 * @example
 * import { ExtendedCss } from '@adguard/extended-css';
 * ExtendedCss.query();
 */
const namedProdConfig = {
    input: srcInputPath,
    output: [
        {
            file: `${prodOutputDir}/${LIB_FILE_NAME}.esm.js`,
            format: OutputFormat.ESM,
            name: LIBRARY_NAME,
            banner: libOutputBanner,
        },
        {
            // umd is preferred over cjs to avoid variables renaming in tsurlfilter
            file: `${prodOutputDir}/${LIB_FILE_NAME}.umd.js`,
            format: OutputFormat.UMD,
            name: LIBRARY_NAME,
            banner: libOutputBanner,
        },
    ],
    plugins: commonPlugins,
};

/**
 * @example
 * import { EXTENDED_CSS_VERSION } from '@adguard/extended-css/version';
 */
const versionProdConfig = {
    input: srcVersionPath,
    output: [
        {
            file: `${prodOutputDir}/version.cjs.js`,
            format: OutputFormat.CJS,
            name: `${LIBRARY_NAME}/version`,
            banner: libOutputBanner,
        },
        {
            file: `${prodOutputDir}/version.esm.mjs`,
            format: OutputFormat.ESM,
            name: `${LIBRARY_NAME}/version`,
            banner: libOutputBanner,
        },
    ],
    plugins: commonPlugins,
};

/**
 * Needed for debug purposes, check "Debugging extended selectors" in README.md.
 */
const defaultProdConfig = {
    input: srcInputDefaultPath,
    output: [
        {
            file: `${prodOutputDir}/${LIB_FILE_NAME}.js`,
            format: OutputFormat.IIFE,
            name: LIBRARY_NAME,
            banner: libOutputBanner,
        },

        {
            file: `${prodOutputDir}/${LIB_FILE_NAME}.min.js`,
            format: OutputFormat.IIFE,
            name: LIBRARY_NAME,
            banner: libOutputBanner,
            plugins: [terser({
                output: {
                    comments: false,
                    preamble: libOutputBanner,
                },
            })],
        },
    ],
    plugins: commonPlugins,
};

/**
 * Self-contained minified IIFE exposing `applyExtendedCss` for injection via
 * `chrome.scripting.executeScript()` (AG-45086). Mirrors
 * `defaultProdConfig` but uses the apply entry point.
 */
const applyProdConfig = {
    input: srcInputApplyPath,
    output: [
        {
            file: `${prodOutputDir}/${APPLY_LIB_FILE_NAME}.js`,
            format: OutputFormat.IIFE,
            name: APPLY_GLOBAL_NAME,
            banner: libOutputBanner,
        },
        {
            file: `${prodOutputDir}/${APPLY_LIB_FILE_NAME}.min.js`,
            format: OutputFormat.IIFE,
            name: APPLY_GLOBAL_NAME,
            banner: libOutputBanner,
            plugins: [terser({
                output: {
                    comments: false,
                    preamble: libOutputBanner,
                },
            })],
        },
    ],
    plugins: commonPlugins,
};

const buildLib = async (): Promise<void> => {
    const namedConfigName = 'extended-css prod build for named export';
    await rollupRunner(namedProdConfig, namedConfigName);
    const versionConfigName = 'extended-css version for named export';
    await rollupRunner(versionProdConfig, versionConfigName);
    const defaultConfigName = 'extended-css prod build for default export for debugging';
    await rollupRunner(defaultProdConfig, defaultConfigName);
    const applyConfigName = 'extended-css prod build for apply injection entry';
    await rollupRunner(applyProdConfig, applyConfigName);

    assertApplyBundleSize();
};

const buildTxt = async (): Promise<void> => {
    const content = `version=${version}`;
    await writeFile(path.resolve(__dirname, DIST_DIR_PATH, BUILD_TXT_FILENAME), content);
};

/**
 * Prod extended-css build is default run with no command.
 */
program
    .description('Builds extended-css')
    .action(async () => {
        await buildLib();
        await buildTxt();
    });

program.parse(process.argv);
