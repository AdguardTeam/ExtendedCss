var LOOP_COUNT = 10000;
var PROFILER_PSEUDO_PREFIX = "Sizzle.selectors.pseudo.";

/** 
 * Wraps some important functions in order to measure their performance.
 */
(function() {

    for (var key in Sizzle.selectors.pseudos) {
        var pseudoFunction = Sizzle.selectors.pseudos[key];

        // Using createPseudo is crucial so that Sizzle could detect that
        // it's a custom pseudo created with a "new"-style syntax
        var profilingFunction = Sizzle.selectors.createPseudo((function(pseudoFunction, pseudoName) {
            return function() {
                var pseudoMatcher = pseudoFunction.apply(this, arguments);
                return Profiler.profile(pseudoMatcher, PROFILER_PSEUDO_PREFIX + pseudoName);
            };
        })(pseudoFunction, key));

        Sizzle.selectors.pseudos[key] = profilingFunction;
    }

    utils.AsyncWrapper.prototype.runAsap = Profiler.profile(utils.AsyncWrapper.prototype.runAsap, "AsyncWrapper.prototype.runAsap");
    utils.AsyncWrapper.prototype.runImmediately = Profiler.profile(utils.AsyncWrapper.prototype.runImmediately, "AsyncWrapper.prototype.runImmediately");
})();

/**
 * Calls querySelectorAll for "LOOP_COUNT" times and returns an object
 * with the performance counters recorded by the {@link Profiler} instance.
 * 
 * @param {string} selector Selector to test
 * @param {*} assert QUnit assert object
 */
var testPerformance = function(selector, assert) {
    Profiler.clear();
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
    Profiler.print();
    assert.ok(resultOk, msg);

    return Profiler.getCounters();
};

QUnit.test("Tokenize performance", function(assert) {

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
    var counters = testPerformance(selector, assert);

    var hasPerfCounter = counters[PROFILER_PSEUDO_PREFIX + "has"];
    // TODO: Make it work
    // This is temporary commented out.
    // In v1.0.9 it worked properly, but in the master branch the ":has" perf counter it called three times more
    // assert.equal(hasPerfCounter.count, LOOP_COUNT);
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

QUnit.test("Case 6.1. :properties selector", function(assert) {

    var selectorText = 'div[id^="case6-"]:has(div[class]:properties(content:*test))';
    var selector = new ExtendedSelector(selectorText);

    // TODO: Should be initialized implicitly in the ExtendedSelector
    StyleObserver.initialize();
    testPerformance(selector, assert);
});


QUnit.test("Case 6.2. :properties selector wihout seed", function(assert) {

    var selectorText = '[id^="case6-"]:has([class]:properties(content:*test))';
    var selector = new ExtendedSelector(selectorText);

    // TODO: Should be initialized implicitly in the ExtendedSelector
    StyleObserver.initialize();
    testPerformance(selector, assert);
});