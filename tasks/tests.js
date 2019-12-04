/* global require */

/**
 * This task tests the javascript bundle
 */
const console = require('console');
const path = require('path');
const { runQunitPuppeteer, printOutput } = require('node-qunit-puppeteer');
const fs = require('fs');
const { rollup } = require('rollup');

//TODO: Clean

if (!fs.existsSync('build')) {
    fs.mkdirSync('build');
}

const options = [
    {
        inputOptions: {
            input: './lib/sizzle.patched.js',
        },
        outputOptions: {
            file: `build/sizzle.patched.js`,
            format: 'iife',
            name: 'exportsSizzle',
        }
    },
    {
        inputOptions: {
            input: './lib/utils.js',
        },
        outputOptions: {
            file: `build/utils.js`,
            format: 'iife',
            name: 'exportsUtils',
        }
    },
    {
        inputOptions: {
            input: './lib/extended-css-selector.js',
        },
        outputOptions: {
            file: `build/extended-css-selector.js`,
            format: 'iife',
            name: 'exports'
        }
    },
    {
        inputOptions: {
            input: './lib/extended-css-parser.js',
        },
        outputOptions: {
            file: `build/extended-css-parser.js`,
            format: 'iife',
            name: 'exports',
        }
    },
    {
        inputOptions: {
            input: './lib/extended-css.js',
        },
        outputOptions: {
            file: `build/extended-css.js`,
            format: 'iife',
            name: 'exports',
        }
    },
];

const runQunit = async (testFilePath) => {
    const qunitArgs = {
        targetUrl: `file://${path.resolve(__dirname, testFilePath)}`,
        timeout: 10000,
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
        options.forEach(async (option)=> {
            const bundle = await rollup(option.inputOptions);
            console.log(bundle.watchFiles); // an array of file names this bundle depends on
            await bundle.write(option.outputOptions);
        });

        console.info('Finished compiling sources');

        console.log('Running tests..');

        await runQunit('../test/css-parser/test-css-parser.html');
        await runQunit('../test/extended-css/test-extended-css.html');
        await runQunit('../test/performance/test-performance.html');
        await runQunit('../test/selector/test-selector.html');
        await runQunit('../test/dist/test-dist.html');

        console.log('Tests passed OK');
    } catch (ex) {
        console.log(ex);
    }
})();