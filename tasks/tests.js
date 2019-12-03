/* global require */

/**
 * This task tests the javascript bundle
 */
const console = require('console');
const path = require('path');
const { runQunitPuppeteer, printOutput } = require('node-qunit-puppeteer');

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