/* Start with creating ExtendedCss */
var cssText = document.getElementById("extendedCss").innerHTML;
var extendedCss = new ExtendedCss(cssText);
extendedCss.apply();

/**
 * Asserts that specified function has specified expected styles
 */
var assertElementStyle = function(id, expectedStyle, assert) {
    var element = document.getElementById(id);
    assert.ok(element);

    for (var prop in expectedStyle) {
        assert.equal(element.style[prop], expectedStyle[prop]);
    }
}

QUnit.test("Modifer -ext-has", function(assert) {  
    assertElementStyle("case1-blocked", { display: "none" }, assert);
});

QUnit.test("Modifer -ext-contains", function(assert) {
    assertElementStyle("case2-blocked1", { display: "none" }, assert);
    assertElementStyle("case2-blocked2", { display: "none" }, assert);
    assertElementStyle("case2-notblocked", { display: "" }, assert);
});

QUnit.test("Append our style", function(assert) {
    assertElementStyle("case3-modified", { "display": "block", "visibility": "hidden" }, assert);
});

QUnit.test("Composite style", function(assert) {
    assertElementStyle("case4-blocked", { "display": "none" }, assert);
    assertElementStyle("case4-notblocked", { "display": "" }, assert);
});

QUnit.test("Reaction on DOM modification", function(assert) {
    var done = assert.async();
    assertElementStyle("case5-blocked", { display: "none" }, assert);
    var el = document.getElementById("case5-blocked");
    document.getElementById("container").appendChild(el);

    setTimeout(function() {
        assertElementStyle("case5-blocked", { display: "" }, assert);
        done();
    }, 100);
});

QUnit.test("Affected elements length (simple)", function(assert) {

    var done = assert.async();

    var affectedLength;
    var startLength = extendedCss.getAffectedElements().length;
    assert.ok(1, "Start test: " + startLength + " elements affected");
    var toBeBlocked = document.getElementById("case6-blocked");
    assertElementStyle("case6-blocked", { "display": "" }, assert);
    
    var banner = document.createElement("div");
    banner.setAttribute("class", "banner");
    toBeBlocked.appendChild(banner);

    setTimeout(function() {
        assertElementStyle("case6-blocked", { "display": "none" }, assert);
        affectedLength = extendedCss.getAffectedElements().length
        assert.equal(affectedLength, startLength + 1);
        assert.ok(1, "Element blocked: " + affectedLength + " elements affected");
        
        toBeBlocked.removeChild(banner);
        setTimeout(function() {
            assertElementStyle("case6-blocked", { "display": "" }, assert);
            affectedLength = extendedCss.getAffectedElements().length
            assert.equal(affectedLength, startLength);
            assert.ok(1, "Element unblocked: " + affectedLength + " elements affected");
            done();
        }, 100);
    }, 100);
});

QUnit.test("Affected elements length (root element removal)", function(assert) {

    var done = assert.async();

    var affectedLength;
    var startLength = extendedCss.getAffectedElements().length;
    assert.ok(1, "Start test: " + startLength + " elements affected");
    assertElementStyle("case7-blocked", { "display": "none" }, assert);

    var root = document.getElementById("case7");
    root.parentNode.removeChild(root);

    setTimeout(function() {
        affectedLength = extendedCss.getAffectedElements().length
        assert.equal(affectedLength, startLength - 1);
        assert.ok(1, "Element blocked: " + affectedLength + " elements affected");
        done();
    }, 100);
});
QUnit.test("Modifer -ext-matches-css-before", function(assert) {
    assertElementStyle("case8-blocked", { "display": "none" }, assert);
});
QUnit.test("Font-size style", function(assert) {
    assertElementStyle("case9-notblocked", { "display": "", "font-size": "16px" }, assert);
});