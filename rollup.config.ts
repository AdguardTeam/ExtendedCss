import fs from 'fs-extra';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from 'rollup-plugin-ts';
import { terser } from 'rollup-plugin-terser';
import copy from 'rollup-plugin-copy';
import del from 'rollup-plugin-delete';
import generateHtml from 'rollup-plugin-generate-html';

import * as pkg from './package.json';

const OUTPUT_PATH = 'dist-v2';
const SOURCE_PATH = './src/index.ts';
const LIBRARY_NAME = 'ExtendedCSS';

const SELECTOR_SOURCE_PATH = './src/selector/index.ts';
const TEST_TEMP_DIR = 'test/build';

const banner = `/*! ${pkg.name} - v${pkg.version} - ${new Date().toDateString()}
${pkg.homepage ? `* ${pkg.homepage}` : ''}
* Copyright (c) ${new Date().getFullYear()} ${pkg.author}. Licensed ${pkg.license}
*/`;

if (!fs.existsSync(OUTPUT_PATH)) {
    fs.mkdirSync(OUTPUT_PATH);
} else {
    fs.emptyDirSync(OUTPUT_PATH);
}

const prodConfig = {
    input: SOURCE_PATH,
    output: [
        {
            file: `${OUTPUT_PATH}/${pkg.name}.js`,
            format: 'iife',
            name: LIBRARY_NAME,
            banner,
        },
        {
            file: `${OUTPUT_PATH}/${pkg.name}.esm.js`,
            format: 'esm',
            name: LIBRARY_NAME,
            banner,
        },
        {
            file: `${OUTPUT_PATH}/${pkg.name}.cjs.js`,
            format: 'cjs',
            name: LIBRARY_NAME,
            banner,
        },
        {
            file: `${OUTPUT_PATH}/${pkg.name}.min.js`,
            format: 'iife',
            name: LIBRARY_NAME,
            banner,
            plugins: [terser({
                output: {
                    comments: false,
                    preamble: banner,
                },
            })],
        },
    ],
    plugins: [
        resolve(),
        commonjs({
            include: 'node_modules/**',
        }),
        typescript({
            transpiler: 'babel',
            browserslist: ['last 1 version', 'ie >= 11'],
        }),
        copy({
            targets: [
                { src: 'types/extended-css.d.ts', dest: OUTPUT_PATH },
            ],
        }),
        del({
            targets: [OUTPUT_PATH],
            hook: 'buildStart',
        }),
    ],
};

const testConfig = {
    input: SELECTOR_SOURCE_PATH,
    output: [
        {
            file: `${TEST_TEMP_DIR}/selector.js`,
            format: 'iife',
            name: 'extCSS',
            banner: '/* querySelectorAll testing */',
        },
    ],
    plugins: [
        resolve(),
        commonjs({
            include: 'node_modules/**',
        }),
        typescript({
            transpiler: 'babel',
            browserslist: ['last 1 version', 'ie >= 11'],
        }),
        generateHtml({
            filename: `${TEST_TEMP_DIR}/empty.html`,
            template: 'test/v2/test-files/empty.html',
            selector: 'body',
            inline: true,
        }),
        del({
            targets: [TEST_TEMP_DIR],
            hook: 'buildStart',
        }),
    ],
};

let resultConfigs = [prodConfig];

const isTest = process.env.TEST_SELECTOR === 'true';
if (isTest) {
    if (!fs.existsSync(TEST_TEMP_DIR)) {
        fs.mkdirSync(TEST_TEMP_DIR);
    } else {
        fs.emptyDirSync(TEST_TEMP_DIR);
    }

    resultConfigs = [testConfig];
}

export default resultConfigs;
