import fs from 'fs-extra';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from 'rollup-plugin-ts';
import { terser } from 'rollup-plugin-terser';
import copy from 'rollup-plugin-copy';
import del from 'rollup-plugin-delete';

// TODO: ditch while remaking build process: AG-16034
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import generateHtml from 'rollup-plugin-generate-html';

import * as pkg from './package.json';

const PROD_OUTPUT_PATH = 'dist';
const SOURCE_PATH = './src/index.ts';
const LIBRARY_NAME = 'ExtendedCSS';

const SELECTOR_SOURCE_PATH = './src/selector/query.ts';
const TEST_TEMP_DIR = 'test/dist';
const TEST_BROWSERSTACK_DIR = 'test/browserstack';

const banner = `/*! ${pkg.name} - v${pkg.version} - ${new Date().toDateString()}
${pkg.homepage ? `* ${pkg.homepage}` : ''}
* Copyright (c) ${new Date().getFullYear()} ${pkg.author}. Licensed ${pkg.license}
*/`;

const commonPlugins = [
    resolve(),
    commonjs({
        include: 'node_modules/**',
    }),
    typescript({
        transpiler: 'babel',
        browserslist: ['last 1 version', '> 1%'],
    }),
];

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
        ...commonPlugins,
        // TODO: ditch while building types: AG-15672
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
        ...commonPlugins,
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

// needed for following browserstackConfig
const singleExtCssJsConfig = {
    input: SOURCE_PATH,
    output: [
        {
            file: `${TEST_TEMP_DIR}/${pkg.name}.js`,
            format: 'iife',
            name: 'BrowserstackTest',
            banner,
        },
    ],
    plugins: commonPlugins,
};

const browserstackTestConfig = {
    input: `${TEST_BROWSERSTACK_DIR}/browserstack.test.ts`,
    output: [
        {
            file: `${TEST_TEMP_DIR}/browserstack.test.js`,
            format: 'iife',
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
                        `${TEST_BROWSERSTACK_DIR}/browserstack.html`,
                        'node_modules/qunit/qunit/**',
                    ],
                    dest: TEST_TEMP_DIR,
                },
            ],
        }),
    ],
};

/**
 * Guarantees directory existence
 * @param {string} dirPath path to directory
 */
// TODO: ditch while remaking build process: AG-16034
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const assureDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath);
    } else {
        fs.emptyDirSync(dirPath);
    }
};

let resultConfigs = [prodConfig];

const isTest = process.env.TEST_SELECTOR_PLAYWRIGHT === 'true';

const isBrowserstack = process.env.TEST_BROWSERSTACK === 'true';

if (isTest) {
    assureDir(TEST_TEMP_DIR);
    resultConfigs = [testConfig];
} else if (isBrowserstack) {
    assureDir(TEST_TEMP_DIR);
    resultConfigs = [singleExtCssJsConfig, browserstackTestConfig];
} else {
    assureDir(PROD_OUTPUT_PATH);
    // resultConfigs already contains prodConfig
}

export default resultConfigs;
