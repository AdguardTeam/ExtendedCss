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

const rollupConfig = {
    input: "./index.js",
    output: [
        {
            file: `${config.outputDir}/${config.fileName}.js`,
            format: 'iife',
            name: 'ExtendedCss',
            banner: banner,
        },
        {
            file: `${config.outputDir}/${config.fileName}.min.js`,
            format: 'iife',
            name: 'ExtendedCss',
            banner: banner,
            plugins: [terser()],
        },
    ],
};

(async () => {
    try {
        console.info('Start compiling sources');

        const bundle = await rollup(rollupConfig);
        console.log(bundle.watchFiles);

        rollupConfig.output.forEach(async (option)=> {
            await bundle.write(option);
        });

        console.info('Finished compiling sources');
    } catch (ex) {
        console.error(ex);
    }
})();