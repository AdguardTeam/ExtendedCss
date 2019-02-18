var LOOP_COUNT = 10000;

var testPerformance = function (selector, assert) {
    var startTime = new Date().getTime();
    var iCount = LOOP_COUNT;
    var resultOk = true;
    while (iCount--) {
        var nodes = selector.querySelectorAll();
        if (!nodes || !nodes.length) {
            resultOk = false;
        }
    }
    var elapsed = new Date().getTime() - startTime;
    var msg = 'Elapsed: ' + elapsed + ' ms\n';
    msg += 'Count: ' + LOOP_COUNT + '\n';
    msg += 'Average: ' + elapsed / LOOP_COUNT + ' ms';
    assert.ok(resultOk, msg);
};

QUnit.test("Tokenize performance", function (assert) {
    initializeSizzle(); // Force Sizzle to be initialized
    var selectorText = "#case5 > div:not([style^=\"min-height:\"]) > div[id][data-uniqid^=\"toolkit-\"]:not([data-bem]):not([data-mnemo])[-ext-has='a[href^=\"https://an.yandex.\"]>img']";
    var startTime = new Date().getTime();

    var resultOk = true;
    var iCount = LOOP_COUNT;
    while (iCount--) {
        var tokens = Sizzle.tokenize(selectorText, false, { returnUnsorted: true });
        if (!tokens || !tokens.length) {
            resultOk = false;
        }
    }
    var elapsed = new Date().getTime() - startTime;
    var msg = 'Elapsed: ' + elapsed + ' ms\n';
    msg += 'Count: ' + LOOP_COUNT + '\n';
    msg += 'Average: ' + elapsed / LOOP_COUNT + ' ms';
    assert.ok(resultOk, msg);
});

QUnit.test("Test simple selector", function (assert) {
    var selector = {
        querySelectorAll: function () {
            return document.querySelectorAll(".container #case1 div div");
        }
    }
    testPerformance(selector, assert);
});

QUnit.test("Case 1. :has performance", function (assert) {
    var selectorText = ".container #case1 div div:has(.banner)";
    var selector = ExtendedSelectorFactory.createSelector(selectorText);
    testPerformance(selector, assert);
});

QUnit.test("Case 2. :contains performance", function (assert) {
    var selectorText = ".container #case2 div div:contains(Block this)";
    var selector = ExtendedSelectorFactory.createSelector(selectorText);
    testPerformance(selector, assert);
});

QUnit.test("Case 3. :matches-css performance", function (assert) {
    var selectorText = ".container #case3 div div:matches-css(background-image: data:*)";
    var selector = ExtendedSelectorFactory.createSelector(selectorText);
    testPerformance(selector, assert);
});

QUnit.test("Case 4. :has and :contains composite performance", function (assert) {
    var selectorText = ".container #case4 div div:has(.banner:contains(Block this))";
    var selector = ExtendedSelectorFactory.createSelector(selectorText);
    testPerformance(selector, assert);
});

QUnit.test("Case 5. complicated selector", function (assert) {
    // https://github.com/AdguardTeam/ExtendedCss/issues/25

    var selectorText = "#case5 > div:not([style^=\"min-height:\"]) > div[id][data-uniqid^=\"toolkit-\"]:not([data-bem]):not([data-mnemo])[-ext-has='a[href^=\"https://an.yandex.\"]>img']";
    var selector = ExtendedSelectorFactory.createSelector(selectorText);
    testPerformance(selector, assert);
});

QUnit.test("Case 6.1. :properties selector", function (assert) {

    var selectorText = 'div[id^="case6-"]:has(div[class]:properties(content:*test))';
    var selector = ExtendedSelectorFactory.createSelector(selectorText);
    testPerformance(selector, assert);
});


QUnit.test("Case 6.2. :properties selector wihout seed", function (assert) {

    var selectorText = '[id^="case6-"]:has([class]:properties(content:*test))';
    var selector = ExtendedSelectorFactory.createSelector(selectorText);

    testPerformance(selector, assert);
});

QUnit.test("Case 6.3. :properties selector with reverse search", function(assert) {
    var selectorText = 'div:properties(content:*test)';
    var selector = ExtendedSelectorFactory.createSelector(selectorText);
    testPerformance(selector, assert);
});

QUnit.test("Case 6.4. :properties selector without reverse search", function(assert) {
    var selectorText = 'div:has(:properties(content:*test))';
    var selector = ExtendedSelectorFactory.createSelector(selectorText);
    testPerformance(selector, assert);
});