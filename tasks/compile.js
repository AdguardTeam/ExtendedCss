/* eslint-disable no-console */
/**
 * This task compiles sources to javascript bundle
 */
const fs = require('fs-extra');
const { rollup } = require('rollup');
const { terser } = require('rollup-plugin-terser');
const babel = require('rollup-plugin-babel');
const copy = require('rollup-plugin-copy');

const pkg = require('../package.json');
const config = require('./config');

if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir);
} else {
    fs.emptyDirSync(config.outputDir);
}

const banner = `/*! ${pkg.name} - v${pkg.version} - ${new Date().toDateString()}
${pkg.homepage ? `* ${pkg.homepage}` : ''}
* Copyright (c) ${new Date().getFullYear()} ${pkg.author} ; Licensed ${pkg.licenses.map(l => l.type).join(', ')}
*/`;

const rollupConfig = {
    input: './index.js',
    output: [
        {
            file: `${config.outputDir}/${config.fileName}.js`,
            format: 'iife',
            name: 'ExtendedCss',
            banner,
        },
        {
            file: `${config.outputDir}/${config.fileName}.esm.js`,
            format: 'esm',
            name: 'ExtendedCss',
            banner,
        },
        {
            file: `${config.outputDir}/${config.fileName}.min.js`,
            format: 'iife',
            name: 'ExtendedCss',
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
        babel({
            exclude: 'node_modules/**',
        }),
        copy({
            targets: [
                { src: 'types/extended-css.d.ts', dest: 'dist/' },
            ],
        }),
    ],
};

(async () => {
    try {
        console.info('Start compiling sources');

        const bundle = await rollup(rollupConfig);
        console.log(bundle.watchFiles);

        rollupConfig.output.forEach((option) => {
            bundle.write(option);
        });

        console.info('Finished compiling sources');
    } catch (ex) {
        console.error(ex);
    }
})();
