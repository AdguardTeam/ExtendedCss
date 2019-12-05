/* global require */

/**
 * This task compiles sources to javascript bundle
 */
const fs = require('fs-extra');
const console = require('console');
const { rollup } = require('rollup');
const { terser } = require('rollup-plugin-terser');


const pkg = require('../package.json');
const config = require('./config');

if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir);
} else {
    fs.emptyDirSync(config.outputDir);
}

const banner = `/*! ${pkg.name} - v${pkg.version} - ${new Date().toDateString()}
${pkg.homepage ? "* " + pkg.homepage : ""}
* Copyright (c) ${new Date().getFullYear()} ${pkg.author} ; Licensed ${pkg.licenses.map(l => l.type).join(", ")}
*/`;

const rollupConfigs = [
    {
        inputOptions: {
            input: './index.js',
        },
        outputOptions: {
            file: `${config.outputDir}/${config.fileName}.js`,
            format: 'iife',
            name: 'ExtendedCss',
            banner: banner,
        }
    },
    {
        inputOptions: {
            input: './index.js',
        },
        outputOptions: {
            file: `${config.outputDir}/${config.fileName}.min.js`,
            format: 'iife',
            name: 'ExtendedCss',
            banner: banner,
            plugins: [terser()]
        }
    },
];

(async () => {
    try {
        console.info('Start compiling sources');

        rollupConfigs.forEach(async (option)=> {
            const bundle = await rollup(option.inputOptions);
            // an array of file names this bundle depends on
            console.log(bundle.watchFiles);
            await bundle.write(option.outputOptions);
        });

        console.info('Finished compiling sources');
    } catch (ex) {
        console.error(ex);
    }
})();