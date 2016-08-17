/* global QUnit */
/* global CssParser */

QUnit.test( "Simple CSS", function(assert) {
  
    var cssText = 'body { display:none; }';
    var cssObject = CssParser.parse(cssText);    
    assert.ok(cssObject instanceof Array);
    assert.equal(cssObject.length, 1);
    assert.ok(cssObject[0]);
    assert.equal(cssObject[0].selectors, 'body');
    assert.ok(cssObject[0].style);
    assert.equal(cssObject[0].style.display, 'none');
});

QUnit.test("Parse stylesheet", function(assert) {

    var cssText = 'body { background: none!important; }\n div.wrapper { display: block!important; position: absolute; top:-2000px; }';
    var cssObject = CssParser.parse(cssText);
    assert.ok(cssObject instanceof Array);
    assert.equal(cssObject.length, 2);

    assert.ok(cssObject[0]);
    assert.equal(cssObject[0].selectors, 'body');
    assert.ok(cssObject[0].style);
    assert.equal(cssObject[0].style.background, 'none!important');

    assert.ok(cssObject[1]);
    assert.equal(cssObject[1].selectors, 'div.wrapper');
    assert.ok(cssObject[1].style);
    assert.equal(cssObject[1].style.display, 'block!important');
    assert.equal(cssObject[1].style.position, 'absolute');
    assert.equal(cssObject[1].style.top, '-2000px');
});