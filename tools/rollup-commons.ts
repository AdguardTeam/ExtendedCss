import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-ts';

import * as pkg from '../package.json';

export const libOutputBanner = `/*! ${pkg.name} - v${pkg.version} - ${new Date().toDateString()}
${pkg.homepage ? `* ${pkg.homepage}` : ''}
* Copyright (c) ${new Date().getFullYear()} ${pkg.author}. Licensed ${pkg.license}
*/`;

export const commonPlugins = [
    resolve(),
    commonjs({
        include: 'node_modules/**',
    }),
    typescript({
        transpiler: 'babel',
        browserslist: ['last 1 version', '> 1%'],
    }),
];
