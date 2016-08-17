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