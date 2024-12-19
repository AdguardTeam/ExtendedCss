/**
 * @adguard/extended-css - v2.1.1 - Thu Dec 19 2024
 * https://github.com/AdguardTeam/ExtendedCss#homepage
 * Copyright (c) 2024 AdGuard. Licensed GPL-3.0
 */
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var version = "2.1.1";

/**
 * @file Extended CSS version.
 */
// Don't export version from package.json directly, because if you run
// `tsc` in the root directory, it will generate `dist/types/src/version.d.ts`
// with wrong relative path to `package.json`. So we need this little "hack"

const EXTENDED_CSS_VERSION = version;

exports.EXTENDED_CSS_VERSION = EXTENDED_CSS_VERSION;
