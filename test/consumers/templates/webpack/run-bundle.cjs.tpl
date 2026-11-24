'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');

const { JSDOM } = require('jsdom');

const bundlePath = path.resolve(process.argv[2]);

const dom = new JSDOM(
    `<!doctype html>
    <html>
        <head></head>
        <body>
            <div id="banner">ads</div>
            <div id="content">normal content</div>
        </body>
    </html>`,
    {
        url: 'https://example.com/',
        pretendToBeVisual: true,
    },
);

global.window = dom.window;
global.document = dom.window.document;
global.MutationObserver = dom.window.MutationObserver;
global.Node = dom.window.Node;
global.Element = dom.window.Element;
global.HTMLElement = dom.window.HTMLElement;
global.XPathResult = dom.window.XPathResult;
global.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);

// `navigator` is read-only in Node.js, so define it explicitly.
Object.defineProperty(globalThis, 'navigator', {
    value: dom.window.navigator,
    configurable: true,
});

const bundle = require(bundlePath);

assert.equal(typeof bundle.ExtendedCss, 'function', 'The bundle must export ExtendedCss.');
assert.equal(
    typeof bundle.EXTENDED_CSS_VERSION,
    'string',
    'The bundle must export EXTENDED_CSS_VERSION.',
);
assert.ok(bundle.EXTENDED_CSS_VERSION.length > 0, 'EXTENDED_CSS_VERSION must not be empty.');

const extendedCss = new bundle.ExtendedCss({
    styleSheet: '#banner:contains(ads) { display: none !important; }',
});

extendedCss.apply();

const banner = document.getElementById('banner');
assert.ok(banner, 'The test page must contain the banner element.');
assert.equal(
    banner.style.getPropertyValue('display'),
    'none',
    'The extended selector must set display to none.',
);
assert.equal(
    banner.style.getPropertyPriority('display'),
    'important',
    'The applied display value must be important.',
);

extendedCss.dispose();

console.log('[consumers] Node.js bundle smoke test passed.');
