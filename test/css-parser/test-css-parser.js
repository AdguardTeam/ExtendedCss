QUnit.test( "Simple CSS", function(assert) {
  
    var cssText = 'body { display:none; }';
    var cssObject = cssParser.parse(cssText);    
    assert.ok(cssObject instanceof Array);
    assert.equal(cssObject.length, 1);
    assert.ok(cssObject[0]);
    assert.equal(cssObject[0].selectors, 'body');
    assert.ok(cssObject[0].style);
    assert.equal(cssObject[0].style.display, 'none');
});