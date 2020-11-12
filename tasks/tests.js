/* eslint-disable no-console */
/**
 * This task tests the javascript bundle
 */
const path = require('path');
const { runQunitPuppeteer, printOutput } = require('node-qunit-puppeteer');
const { rollup } = require('rollup');
const { babel } = require('@rollup/plugin-babel');
const copy = require('rollup-plugin-copy');
const resolve = require('@rollup/plugin-node-resolve').nodeResolve;
const commonjs = require('@rollup/plugin-commonjs');
const del = require('rollup-plugin-delete');

const testsInputs = ['utils', 'css-parser', 'dist', 'extended-css', 'performance', 'selector'];

const testsConfigs = testsInputs.map((input) => {
    const inputPathPart = `${input}/${input}.test.js`;
    const inputFile = `./test/${inputPathPart}`;
    const outputFile = `./test/build/${inputPathPart}`;

    return {
        input: inputFile,
        output: {
            file: outputFile,
            format: 'iife',
        },
        plugins: [
            copy({
                verbose: true,
                targets: [{ src: `./test/${input}/${input}.html`, dest: `./test/build/${input}` }],
            }),
            resolve(),
            commonjs({
                include: 'node_modules/**',
            }),
            babel({
                exclude: 'node_modules/**',
                babelHelpers: 'bundled',
            }),
        ],
    };
});

const rollupConfigs = [
    {
        input: './test/index.js',
        output: {
            file: './test/build/index.js',
            format: 'iife',
            name: 'exports',
        },
        plugins: [
            del({
                targets: ['./test/build'],
                verbose: true,
            }),
            copy({
                verbose: true,
                targets: [
                    { src: './test/qunit/**', dest: './test/build/qunit' },
                    { src: './test/index.html', dest: './test/build' },
                ],
            }),
            resolve(),
            commonjs({
                include: 'node_modules/**',
            }),
            babel({
                exclude: 'node_modules/**',
                babelHelpers: 'bundled',
            }),
        ],
    },
    ...testsConfigs,
];

const runQunit = async (testFilePath) => {
    const qunitArgs = {
        targetUrl: `file://${path.resolve(__dirname, testFilePath)}`,
        timeout: 15000,
        redirectConsole: true,
    };

    const result = await runQunitPuppeteer(qunitArgs);

    printOutput(result, console);
    if (result.stats.failed > 0) {
        throw new Error('Some of the unit tests failed');
    }
};

(async () => {
    try {
        console.info('Start compiling sources');

        /**
         * As we are not able to use es6 modules in browser environment, we first compile sources.
         */
        // eslint-disable-next-line no-restricted-syntax
        for (const config of rollupConfigs) {
            // eslint-disable-next-line no-await-in-loop
            const bundle = await rollup(config);
            // an array of file names this bundle depends on
            console.log(bundle.watchFiles);
            // eslint-disable-next-line no-await-in-loop
            await bundle.write(config.output);
        }

        console.info('Finished compiling sources');

        console.log('Running tests..');

        await runQunit('../test/build/utils/utils.html');
        await runQunit('../test/build/css-parser/css-parser.html');
        await runQunit('../test/build/extended-css/extended-css.html');
        await runQunit('../test/build/performance/performance.html');
        await runQunit('../test/build/selector/selector.html');
        await runQunit('../test/build/dist/dist.html');

        console.log('Tests passed OK');
    } catch (ex) {
        console.log(ex);
    }
})();
