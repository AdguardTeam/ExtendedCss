import fs from 'fs-extra';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from 'rollup-plugin-ts';
import { terser } from 'rollup-plugin-terser';
import copy from 'rollup-plugin-copy';
import del from 'rollup-plugin-delete';
import generateHtml from 'rollup-plugin-generate-html';

import * as pkg from './package.json';

const PROD_OUTPUT_PATH = 'dist';
const SOURCE_PATH = './src/index.ts';
const LIBRARY_NAME = 'ExtendedCSS';

const SELECTOR_SOURCE_PATH = './src/selector/query.ts';
const TEST_TEMP_DIR = 'test/dist';

const banner = `/*! ${pkg.name} - v${pkg.version} - ${new Date().toDateString()}
${pkg.homepage ? `* ${pkg.homepage}` : ''}
* Copyright (c) ${new Date().getFullYear()} ${pkg.author}. Licensed ${pkg.license}
*/`;

const prodConfig = {
    input: SOURCE_PATH,
    output: [
        {
            file: `${PROD_OUTPUT_PATH}/${pkg.name}.js`,
            format: 'iife',
            name: LIBRARY_NAME,
            banner,
        },
        {
            file: `${PROD_OUTPUT_PATH}/${pkg.name}.esm.js`,
            format: 'esm',
            name: LIBRARY_NAME,
            banner,
        },
        {
            file: `${PROD_OUTPUT_PATH}/${pkg.name}.cjs.js`,
            format: 'cjs',
            name: LIBRARY_NAME,
            banner,
        },
        {
            file: `${PROD_OUTPUT_PATH}/${pkg.name}.min.js`,
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
            browserslist: ['last 1 version', '> 1%'],
        }),
        copy({
            targets: [
                { src: 'types/extended-css.d.ts', dest: PROD_OUTPUT_PATH },
            ],
        }),
        del({
            targets: [PROD_OUTPUT_PATH],
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
            name: 'testExtCss',
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
            browserslist: ['last 1 version', '> 1%'],
        }),
        generateHtml({
            filename: `${TEST_TEMP_DIR}/empty.html`,
            template: 'test/test-files/empty.html',
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

const isTest = process.env.TEST_SELECTOR_PLAYWRIGHT === 'true';
if (isTest) {
    if (!fs.existsSync(TEST_TEMP_DIR)) {
        fs.mkdirSync(TEST_TEMP_DIR);
    } else {
        fs.emptyDirSync(TEST_TEMP_DIR);
    }

    resultConfigs = [testConfig];
} else {
    if (!fs.existsSync(PROD_OUTPUT_PATH)) {
        fs.mkdirSync(PROD_OUTPUT_PATH);
    } else {
        fs.emptyDirSync(PROD_OUTPUT_PATH);
    }
}

export default resultConfigs;
