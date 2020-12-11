/* eslint-disable max-len,no-multi-str */
const { ExtendedCssParser } = exports;
const { initializeSizzle } = exports;

const Sizzle = initializeSizzle();

QUnit.test('Simple CSS', (assert) => {
    const selector = 'body';
    const cssText = `${selector} { display:none; }`;
    const cssObject = ExtendedCssParser.parseCss(cssText);
    assert.ok(cssObject instanceof Array);
    assert.equal(cssObject.length, 1);
    assert.ok(cssObject[0]);
    assert.equal(cssObject[0].selector.selectorText, selector);
    assert.ok(cssObject[0].style);
    assert.equal(cssObject[0].style.display, 'none');
});

QUnit.test('Test Sizzle tokenize cache', (assert) => {
    const selector = 'body';
    const cssText = `${selector} { display:none; }`;
    ExtendedCssParser.parseCss(cssText);

    // Check the tokens cache only now
    const tokens = Sizzle.tokenize(selector, false, { cacheOnly: true });
    assert.ok(tokens);
    assert.equal(tokens.length, 1);
    assert.equal(tokens[0].length, 1);
});

QUnit.test('Parse an invalid selector', (assert) => {
    assert.throws(() => {
        const cssText = 'div > { display:none; }';
        ExtendedCssParser.parseCss(cssText);
    },
    (error) => error.toString().includes('parse error at position'),
    'Expected ExtendedCssParser to throw on an invalid selector');
});

QUnit.test('Single invalid selector in a stylesheet', (assert) => {
    const cssText = 'body:has(div:invalid-pseudo(1)), div { display: none }';
    const cssObject = ExtendedCssParser.parseCss(cssText);
    assert.ok(cssObject instanceof Array);
    assert.equal(cssObject.length, 1);
});

QUnit.test('Convert remove pseudo-class into remove pseudo-property', (assert) => {
    const elementSelector = 'div:has(> div[class])';
    const selectorText = `${elementSelector}:remove()`;
    const cssText = `${selectorText} { display:none; }`;
    const cssObject = ExtendedCssParser.parseCss(cssText);
    assert.ok(cssObject instanceof Array);
    assert.equal(cssObject.length, 1);
    assert.equal(cssObject[0].selector.selectorText, elementSelector);
    assert.ok(cssObject[0].style);
    assert.equal(cssObject[0].style.remove, 'true');
});

QUnit.test('Scope handling', (assert) => {
    const inputCssText = 'div:has(:scope > a > img[id]) { display: none }';
    const cssObject = ExtendedCssParser.parseCss(inputCssText);
    const expectedOutputSelectorText = 'div:has(> a > img[id])';
    assert.ok(cssObject instanceof Array);
    assert.equal(cssObject.length, 1);
    assert.equal(cssObject[0].selector.selectorText, expectedOutputSelectorText);
});

QUnit.test('Parse stylesheet', (assert) => {
    const cssText = 'body { background: none!important; }\n div.wrapper { display: block!important; position: absolute; top:-2000px; }';
    const cssObject = ExtendedCssParser.parseCss(cssText);
    assert.ok(cssObject instanceof Array);
    assert.equal(cssObject.length, 2);

    assert.ok(cssObject[0]);
    assert.equal(cssObject[0].selector.selectorText, 'body');
    assert.ok(cssObject[0].style);
    assert.equal(cssObject[0].style.background, 'none!important');

    assert.ok(cssObject[1]);
    assert.equal(cssObject[1].selector.selectorText, 'div.wrapper');
    assert.ok(cssObject[1].style);
    assert.equal(cssObject[1].style.display, 'block!important');
    assert.equal(cssObject[1].style.position, 'absolute');
    assert.equal(cssObject[1].style.top, '-2000px');
});

QUnit.test('Parse stylesheet with extended selectors', (assert) => {
    const cssText = ':contains(/[\\w]{9,}/){display:none!important;visibility:hidden!important}\
        :matches-css(    background-image: /^url\\((.)[a-z]{4}:[a-z]{2}\\1nk\\)$/    ) + [-ext-matches-css-before=\'content:  /^[A-Z][a-z]{2}\\s/  \'][-ext-has=\'+:matches-css-after( content  :   /(\\d+\\s)*me/  ):contains(/^(?![\\s\\S])/)\'] {\
            width: 500px;height: 500px;\
            -webkit-border-radius: 30px;\
            -moz-border-radius: 30px;\
\
            -webkit-box-shadow: 1px -1px #b2492c, 2px -2px #b2492c, 3px -3px #b2492c, 4px -4px #b2492c, 5px -5px #b2492c, 6px -6px #b2492c, 7px -7px #b2492c, 8px -8px #b2492c, 9px -9px #b2492c, 10px -10px #b2492c;\
\
        }';

    const cssObject = ExtendedCssParser.parseCss(cssText);

    assert.ok(cssObject instanceof Array);
    assert.equal(cssObject.length, 2);

    assert.ok(cssObject[0]);
    assert.equal(cssObject[0].selector.selectorText, ':contains("/[\\\\w]{9,}/")');
    assert.ok(cssObject[0].style);
    assert.equal(cssObject[0].style.display, 'none!important');
    assert.equal(cssObject[0].style.visibility, 'hidden!important');

    assert.ok(cssObject[1]);
    assert.equal(cssObject[1].selector.selectorText, ':matches-css("    background-image: /^url\\\\((.)[a-z]{4}:[a-z]{2}\\\\1nk\\\\)$/    ") + :matches-css-before("content:  /^[A-Z][a-z]{2}\\\\s/  "):has(+:matches-css-after(" content  :   /(\\\\d+\\\\s)*me/  "):contains("/^(?![\\\\s\\\\S])/"))');

    assert.ok(cssObject[1].style);
    assert.equal(cssObject[1].style.width, '500px');
    assert.equal(cssObject[1].style.height, '500px');
    assert.equal(cssObject[1].style['-webkit-border-radius'], '30px');
    assert.equal(cssObject[1].style['-moz-border-radius'], '30px');
    assert.equal(cssObject[1].style['-webkit-box-shadow'], '1px -1px #b2492c, 2px -2px #b2492c, 3px -3px #b2492c, 4px -4px #b2492c, 5px -5px #b2492c, 6px -6px #b2492c, 7px -7px #b2492c, 8px -8px #b2492c, 9px -9px #b2492c, 10px -10px #b2492c');
});
