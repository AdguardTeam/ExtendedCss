/* global require */

/**
 * This task compiles sources to javascript bundle
 */
const fs = require('fs');
const console = require('console');
const { rollup } = require('rollup');

const pkg = require('../package.json');
const config = require('./config');

if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir);
}

const inputOptions = {
    input: 'index.js',
    external: ['configuration'],
};

const outputOptions = {
    file: `${config.outputDir}/${config.fileName}`,
    format: 'iife',
    // globals: {
    //     // contentScriptConfiguration will be replaced in runtime
    //     // by a dynamically built configuration object
    //     configuration: config.contentScriptConfigurationName,
    // },
    banner: `/* ${pkg.name} v${pkg.version} ${new Date().toDateString()} */`,
};

async function build() {
    try {
        console.info('Start compiling sources');

        const bundle = await rollup(inputOptions);
        await bundle.write(outputOptions);

        console.info('Finished compiling sources');
        console.info(`Output is ${outputOptions.file}`);
    } catch (ex) {
        console.error(ex);
    }
}

build();