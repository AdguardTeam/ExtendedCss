/* global QUnit, Sizzle */
/* global ExtendedCssParser */

QUnit.test("Simple CSS", function (assert) {

    var selector = 'body';
    var cssText = selector + ' { display:none; }';
    var cssObject = ExtendedCssParser.parseCss(cssText);
    assert.ok(cssObject instanceof Array);
    assert.equal(cssObject.length, 1);
    assert.ok(cssObject[0]);
    assert.equal(cssObject[0].selector.selectorText, selector);
    assert.ok(cssObject[0].style);
    assert.equal(cssObject[0].style.display, 'none');
});

QUnit.test("Test Sizzle tokenize cache", function (assert) {

    var selector = 'body';
    var cssText = selector + ' { display:none; }';
    var cssObject = ExtendedCssParser.parseCss(cssText);

    // Check the tokens cache only now
    var tokens = Sizzle.tokenize(selector, false, { cacheOnly: true });
    assert.ok(tokens);
    assert.equal(tokens.length, 1);
    assert.equal(tokens[0].length, 1);
});

QUnit.test("Parse an invalid selector", function (assert) {

    assert.expect(1);
    assert.throws(function () {
        var cssText = 'div > { display:none; }';
        var cssObject = ExtendedCssParser.parseCss(cssText);
    }, function (error) {
        return !!error;
    }, "Expected ExtendedCssParser to throw on an invalid selector");
});

QUnit.test("Single invalid selector in a stylesheet", function(assert) {
    var cssText = "body:has(div:invalid-pseudo(1)), div { display: none }";
    var cssObject = ExtendedCssParser.parseCss(cssText);
    assert.ok(cssObject instanceof Array);
    assert.equal(cssObject.length, 1);
});

QUnit.test("Parse stylesheet", function (assert) {

    var cssText = 'body { background: none!important; }\n div.wrapper { display: block!important; position: absolute; top:-2000px; }';
    var cssObject = ExtendedCssParser.parseCss(cssText);
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

QUnit.test("Parse stylesheet with extended selectors", function (assert) {

    var cssText =
        ':contains(/[\\w]{9,}/){display:none!important;visibility:hidden!important}\
        :matches-css(    background-image: /^url\\((.)[a-z]{4}:[a-z]{2}\\1nk\\)$/    ) + [-ext-matches-css-before=\'content:  /^[A-Z][a-z]{2}\\s/  \'][-ext-has=\'+:matches-css-after( content  :   /(\\d+\\s)*me/  ):contains(/^(?![\\s\\S])/)\'] {\
            width: 500px;height: 500px;\
            -webkit-border-radius: 30px;\
            -moz-border-radius: 30px;\
\
            -webkit-box-shadow: 1px -1px #b2492c, 2px -2px #b2492c, 3px -3px #b2492c, 4px -4px #b2492c, 5px -5px #b2492c, 6px -6px #b2492c, 7px -7px #b2492c, 8px -8px #b2492c, 9px -9px #b2492c, 10px -10px #b2492c;\
\
        }';

    var cssObject = ExtendedCssParser.parseCss(cssText);
    assert.ok(cssObject instanceof Array);
    assert.equal(cssObject.length, 2);

    assert.ok(cssObject[0]);
    assert.equal(cssObject[0].selector.selectorText, ':contains("/[\\\\w]{9,}/")');
    assert.ok(cssObject[0].style);
    assert.equal(cssObject[0].style.display, 'none!important');
    assert.equal(cssObject[0].style.visibility, 'hidden!important');

    assert.ok(cssObject[1]);
    assert.equal(cssObject[1].selector.selectorText, ':matches-css("    background-image: /^url\\\\((.)[a-z]{4}:[a-z]{2}\\\\1nk\\\\)$/    ") + :matches-css-before("content:  /^[A-Z][a-z]{2}\\\\s/  "):has(+:matches-css-after(" content  :   /(\\\\d+\\\\s)*me/  "):contains("/^(?![\\\\s\\\\S])/"))')

    assert.ok(cssObject[1].style);
    assert.equal(cssObject[1].style.width, '500px');
    assert.equal(cssObject[1].style.height, '500px');
    assert.equal(cssObject[1].style["-webkit-border-radius"], '30px');
    assert.equal(cssObject[1].style["-moz-border-radius"], '30px');
    assert.equal(cssObject[1].style["-webkit-box-shadow"], '1px -1px #b2492c, 2px -2px #b2492c, 3px -3px #b2492c, 4px -4px #b2492c, 5px -5px #b2492c, 6px -6px #b2492c, 7px -7px #b2492c, 8px -8px #b2492c, 9px -9px #b2492c, 10px -10px #b2492c');
});
