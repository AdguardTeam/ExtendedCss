/* global require */

/**
 * This task compiles sources to javascript bundle
 */
const fs = require('fs');
const console = require('console');
const { rollup } = require('rollup');

const pkg = require('../package.json');
const config = require('./config');

//TODO: Clean

if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir);
}

const inputOptions = {
    input: 'index.js'
};

const outputOptions = {
    file: `${config.outputDir}/${config.fileName}`,
    format: 'iife',
    banner:
`/*! ${pkg.title || pkg.name} - v${pkg.version} - ${new Date().toDateString()}
${pkg.homepage ? "* " + pkg.homepage : ""}
* Copyright (c) ${new Date().getFullYear()} ${pkg.author} ; Licensed ${pkg.licenses.map(l => l.type).join(", ")} 
*/`
};

//TODO: uglify

async function build() {
    try {
        console.info('Start compiling sources');

        const bundle = await rollup(inputOptions);
        console.log(bundle.watchFiles); // an array of file names this bundle depends on
        await bundle.write(outputOptions);

        console.info('Finished compiling sources');
        console.info(`Output is ${outputOptions.file}`);
    } catch (ex) {
        console.error(ex);
    }
}

build();