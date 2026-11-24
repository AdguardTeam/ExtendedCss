'use strict';

const assert = require('node:assert/strict');

const { EXTENDED_CSS_VERSION } = require('@adguard/extended-css/version');

assert.equal(typeof EXTENDED_CSS_VERSION, 'string');
assert.ok(EXTENDED_CSS_VERSION.length > 0);

console.log(`[consumers] version CommonJS require passed: ${EXTENDED_CSS_VERSION}`);
