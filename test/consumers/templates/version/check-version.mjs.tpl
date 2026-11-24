import assert from 'node:assert/strict';

import { EXTENDED_CSS_VERSION } from '@adguard/extended-css/version';

assert.equal(typeof EXTENDED_CSS_VERSION, 'string');
assert.ok(EXTENDED_CSS_VERSION.length > 0);

console.log(`[consumers] version ESM import passed: ${EXTENDED_CSS_VERSION}`);
