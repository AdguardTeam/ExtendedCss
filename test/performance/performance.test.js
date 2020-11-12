/* eslint-disable max-len */

const { ExtendedSelectorFactory } = exports;
const { initializeSizzle } = exports;

const Sizzle = initializeSizzle();

const LOOP_COUNT = 10000;
const MAX_ELAPSED_VALUE = 15000;

const performanceTest = function (selector, assert) {
    const startTime = new Date().getTime();
    let iCount = LOOP_COUNT;
    let resultOk = true;
    while (iCount--) {
        const nodes = selector.querySelectorAll();
        if (!nodes || !nodes.length) {
            resultOk = false;
        }
    }
    const elapsed = new Date().getTime() - startTime;
    let msg = `Elapsed: ${elapsed} ms `;
    msg += `Count: ${LOOP_COUNT} `;
    msg += `Average: ${elapsed / LOOP_COUNT} ms`;
    console.log(msg, assert.test.testName); // eslint-disable-line no-console
    if (elapsed > MAX_ELAPSED_VALUE) {
        resultOk = false;
    }
    assert.ok(resultOk, msg);
};

QUnit.test('Tokenize performance', (assert) => {
    initializeSizzle();

    const selectorText = "#case5 > div:not([style^=\"min-height:\"]) > div[id][data-uniqid^=\"toolkit-\"]:not([data-bem]):not([data-mnemo])[-ext-has='a[href^=\"https://an.yandex.\"]>img']";
    const startTime = new Date().getTime();

    let resultOk = true;
    let iCount = LOOP_COUNT;
    while (iCount--) {
        const tokens = Sizzle.tokenize(selectorText, false, { returnUnsorted: true });
        if (!tokens || !tokens.length) {
            resultOk = false;
        }
    }
    const elapsed = new Date().getTime() - startTime;
    let msg = `Elapsed: ${elapsed} ms\n`;
    msg += `Count: ${LOOP_COUNT}\n`;
    msg += `Average: ${elapsed / LOOP_COUNT} ms`;
    assert.ok(resultOk, msg);
});

QUnit.test('Test simple selector', (assert) => {
    const selector = {
        querySelectorAll() {
            return document.querySelectorAll('.container #case1 div div');
        },
    };
    performanceTest(selector, assert);
});

QUnit.test('Case 1. :has performance', (assert) => {
    const selectorText = '.container #case1 div div:has(.banner)';
    const selector = ExtendedSelectorFactory.createSelector(selectorText);
    performanceTest(selector, assert);
});

QUnit.test('Case 2. :contains performance', (assert) => {
    const selectorText = '.container #case2 div div:contains(Block this)';
    const selector = ExtendedSelectorFactory.createSelector(selectorText);
    performanceTest(selector, assert);
});

QUnit.test('Case 3. :matches-css performance', (assert) => {
    const selectorText = '.container #case3 div div:matches-css(background-image: data:*)';
    const selector = ExtendedSelectorFactory.createSelector(selectorText);
    performanceTest(selector, assert);
});

QUnit.test('Case 4. :has and :contains composite performance', (assert) => {
    const selectorText = '.container #case4 div div:has(.banner:contains(Block this))';
    const selector = ExtendedSelectorFactory.createSelector(selectorText);
    performanceTest(selector, assert);
});

QUnit.test('Case 5.1 complicated selector', (assert) => {
    // https://github.com/AdguardTeam/ExtendedCss/issues/25

    const selectorText = "#case5 > div:not([style^=\"min-height:\"]) > div[id][data-uniqid^=\"toolkit-\"]:not([data-bem]):not([data-mnemo])[-ext-has='a[href^=\"https://an.yandex.\"]>img']";
    const selector = ExtendedSelectorFactory.createSelector(selectorText);
    performanceTest(selector, assert);
});

// Previous test results: Average: 0.0665 ms -> Last test results Average: 0.0409 ms
QUnit.test('Case 5.2 split selectors with a lot of children', (assert) => {
    const selectorText = '#case5 div > div:has(.target-banner)';
    const selector = ExtendedSelectorFactory.createSelector(selectorText);
    performanceTest(selector, assert);
});

// Prev test results: Average: 0.1101 ms -> Last test results Average: 0.0601 ms
QUnit.test('Case 5.3 split selectors with a lot of children and matches-css', (assert) => {
    const selectorText = '#case5 div > div:matches-css(background-image: data:*)';
    const selector = ExtendedSelectorFactory.createSelector(selectorText);
    performanceTest(selector, assert);
});

QUnit.test('Case 6.1 :xpath performance', (assert) => {
    const selectorText = ':xpath(//div[@class=\'target-banner\'])';
    const selector = ExtendedSelectorFactory.createSelector(selectorText);
    performanceTest(selector, assert);
});

QUnit.test('Case 6.2 document.evaluate calls count', (assert) => {
    let counter = 0;
    const nativeEvaluate = Document.prototype.evaluate;

    Document.prototype.evaluate = (...args) => {
        counter += 1;
        return nativeEvaluate.apply(document, args);
    };

    const selectorText = ':xpath(//div[@class=\'banner\'])';
    const selector = ExtendedSelectorFactory.createSelector(selectorText);
    const nodes = selector.querySelectorAll();

    assert.equal(nodes.length, 12);
    assert.equal(counter, 1);

    Document.prototype.evaluate = nativeEvaluate;
});
