import path from 'path';
import { writeFile } from './utils';
import { program } from 'commander';

import { terser } from 'rollup-plugin-terser';

import { commonPlugins, libOutputBanner } from './rollup-commons';
import { rollupRunner } from './rollup-runner';

import {
    SRC_DIR_PATH,
    SRC_FILENAME,
    LIBRARY_NAME,
    LIB_FILE_NAME,
    DIST_DIR_PATH,
    BUILD_TXT_FILENAME,
    OutputFormat,
} from './constants';

import { version } from '../package.json';

const srcInputPath = path.resolve(__dirname, SRC_DIR_PATH, SRC_FILENAME);
const prodOutputDir = path.resolve(__dirname, DIST_DIR_PATH);

const prodConfig = {
    input: srcInputPath,
    output: [
        {
            file: `${prodOutputDir}/${LIB_FILE_NAME}.js`,
            format: OutputFormat.IIFE,
            name: LIBRARY_NAME,
            banner: libOutputBanner,
        },
        {
            file: `${prodOutputDir}/${LIB_FILE_NAME}.esm.js`,
            format: OutputFormat.ESM,
            name: LIBRARY_NAME,
            banner: libOutputBanner,
        },
        {
            file: `${prodOutputDir}/${LIB_FILE_NAME}.cjs.js`,
            format: OutputFormat.CJS,
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

const buildLib = async (): Promise<void> => {
    const configName = 'extended-css prod build';
    await rollupRunner(prodConfig, configName);
};

const buildTxt = async (): Promise<void> => {
    const content = `version=${version}`;
    await writeFile(path.resolve(__dirname, DIST_DIR_PATH, BUILD_TXT_FILENAME), content);
};

// prod extended-css build is default run with no command
program
    .description('Builds extended-css')
    .action(async () => {
        await buildLib();
        await buildTxt();
    });

program.parse(process.argv);
