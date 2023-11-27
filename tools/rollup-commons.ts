import resolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-ts';

import * as pkg from '../package.json';

if (!pkg.homepage) {
    throw new Error('homepage url should be set in package.json');
}

export const libOutputBanner = `/**
 * ${pkg.name} - v${pkg.version} - ${new Date().toDateString()}
 * ${pkg.homepage}
 * Copyright (c) ${new Date().getFullYear()} ${pkg.author}. Licensed ${pkg.license}
 */`;

export const commonPlugins = [
    json(),
    resolve(),
    commonjs({
        include: 'node_modules/**',
    }),
    typescript({
        transpiler: 'babel',
        // 'browserslist' should be set as 'targets' in babel.config.js
    }),
];
