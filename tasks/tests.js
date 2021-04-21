/* eslint-disable no-console */
/**
 * This task tests the javascript bundle
 */
const { runQunitPuppeteer, printResultSummary, printFailedTests } = require('node-qunit-puppeteer');
const { rollup } = require('rollup');
const { babel } = require('@rollup/plugin-babel');
const copy = require('rollup-plugin-copy');
const resolve = require('@rollup/plugin-node-resolve').nodeResolve;
const commonjs = require('@rollup/plugin-commonjs');
const del = require('rollup-plugin-delete');
const { server } = require('./server');

const TESTS_RUN_TIMEOUT = 15000;

const testModules = [
    'utils',
    'css-parser',
    'extended-css',
    'performance',
    'selector',
    'dist',
];

const testsConfigs = testModules.map((module) => {
    const inputPathPart = `${module}/${module}.test.js`;
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
                targets: [{ src: `./test/${module}/${module}.html`, dest: `./test/build/${module}` }],
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
                    { src: './dist/*', dest: './test/build/dist' },
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

const runQunit = async (module) => {
    const qunitArgs = {
        targetUrl: `http://localhost:${server.port}/test/build/${module}/${module}.html`,
        timeout: TESTS_RUN_TIMEOUT,
        puppeteerArgs: ['--no-sandbox', '--allow-file-access-from-files'],
    };

    try {
        await server.start();
        const result = await runQunitPuppeteer(qunitArgs);
        printResultSummary(result, console);
        if (result.stats.failed > 0) {
            printFailedTests(result, console);
        }
        await server.stop();
    } catch (e) {
        await server.stop();
        console.error(e);
        process.exit(1);
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

        // eslint-disable-next-line no-restricted-syntax
        for (const module of testModules) {
            // eslint-disable-next-line no-await-in-loop
            await runQunit(module);
        }
    } catch (ex) {
        console.log(ex);
    }
})();
