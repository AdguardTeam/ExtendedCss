/* Start with creating ExtendedCss */
var cssText = document.getElementById("extendedCss").innerHTML;
var extendedCss = new ExtendedCss({ styleSheet: cssText });
extendedCss.apply();

/**
 * Asserts that specified function has specified expected styles
 */
var assertElementStyle = function (id, expectedStyle, assert) {
    var element = document.getElementById(id);
    var resultOk = true;
    if (!element) {
        resultOk = false;
    }

    for (var prop in expectedStyle) {
        var left = element.style.getPropertyValue(prop) || "";
        var right = expectedStyle[prop];

        if (left != right) {
            resultOk = false;
        }
    }

    assert.ok(resultOk, id + (resultOk ? ' ok' : ' element either does not exist or has different style.'));
};

QUnit.test("Modifer -ext-has", function (assert) {
    assertElementStyle("case1-blocked", { display: "none" }, assert);
});

QUnit.test("Append our style", function (assert) {
    assertElementStyle("case3-modified", { "display": "block", "visibility": "hidden" }, assert);
});