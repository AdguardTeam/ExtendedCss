var LOOP_COUNT = 10000;

var testPerformance = function(selector, assert) {
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

QUnit.test("Test simple selector", function(assert) {
    var selector = {
        querySelectorAll: function() {
            return document.querySelectorAll(".container #case1 div div");
        }
    }
    testPerformance(selector, assert);
});

QUnit.test("Case 1. :has performance", function(assert) {
    var selectorText = ".container #case1 div div:has(.banner)";
    var selector = new ExtendedSelector(selectorText);
    testPerformance(selector, assert);
});

QUnit.test("Case 2. :contains performance", function(assert) {
    var selectorText = ".container #case2 div div:contains(Block this)";
    var selector = new ExtendedSelector(selectorText);
    testPerformance(selector, assert);
});

QUnit.test("Case 3. :matches-css performance", function(assert) {
    var selectorText = ".container #case3 div div:matches-css(background-image: about:blank)";
    var selector = new ExtendedSelector(selectorText);
    testPerformance(selector, assert);
});

QUnit.test("Case 4. :has and :contains composite performance", function(assert) {
    var selectorText = ".container #case4 div div:has(.banner:contains(Block this))";
    var selector = new ExtendedSelector(selectorText);
    testPerformance(selector, assert);
});

QUnit.test("Case 5. complicated selector", function(assert) {
    // https://github.com/AdguardTeam/ExtendedCss/issues/25
    
    var selectorText = "#case5 > div:not([style^=\"min-height:\"]) > div[id][data-uniqid^=\"toolkit-\"]:not([data-bem]):not([data-mnemo])[-ext-has='a[href^=\"https://an.yandex.\"]>img']";
    var selector = new ExtendedSelector(selectorText);
    testPerformance(selector, assert);
});

QUnit.test("Case 6. :properties selector", function(assert) {

    var selectorText = ':has(:properties(content:*test)div[class])div[id^="case6-"]';
    var selector = new ExtendedSelector(selectorText);

    // TODO: Should be initialized implicitly in the ExtendedSelector
    StyleObserver.initialize();
    testPerformance(selector, assert);
});