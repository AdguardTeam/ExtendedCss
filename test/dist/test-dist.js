/* global QUnit, ExtendedCss */

/* Start with creating ExtendedCss */
const cssText = document.getElementById('extendedCss').innerHTML;
const extCss = new ExtendedCss({ styleSheet: cssText });
extCss.apply();

/**
 * Asserts that specified function has specified expected styles
 */
const assertElementStyle = function (id, expectedStyle, assert) {
    const element = document.getElementById(id);
    let resultOk = true;
    if (!element) {
        resultOk = false;
    }

    Object.keys(expectedStyle).forEach((prop) => {
        const left = element.style.getPropertyValue(prop) || '';
        const right = expectedStyle[prop];

        if (left !== right) {
            resultOk = false;
        }
    });

    assert.ok(resultOk, id + (resultOk ? ' ok' : ' element either does not exist or has different style.'));
};

/**
 * We throttle MO callbacks in ExtCss with requestAnimationFrame and setTimeout.
 * Browsers postpone rAF callbacks in inactive tabs for a long time.
 * It throttles setTimeout callbacks as well, but it is called within a
 * relatively short time. (within several seconds)
 * We apply rAF in tests as well to postpone test for similar amount of time.
 */
const rAF = function (fn, timeout) {
    if (window.requestAnimationFrame) {
        requestAnimationFrame(() => {
            setTimeout(fn, timeout);
        });
    } else {
        setTimeout(fn, timeout);
    }
};

QUnit.test('Modifer -ext-has', (assert) => {
    assertElementStyle('case1-blocked', { display: 'none' }, assert);
});

QUnit.test('Append our style', (assert) => {
    assertElementStyle('case3-modified', { 'display': 'block', 'visibility': 'hidden' }, assert);
});

QUnit.test('Composite style', (assert) => {
    assertElementStyle('case4-blocked', { 'display': 'none' }, assert);
    assertElementStyle('case4-notblocked', { 'display': '' }, assert);
});

QUnit.test('Reaction on DOM modification', (assert) => {
    const done = assert.async();
    assertElementStyle('case5-blocked', { display: 'none' }, assert);
    const el = document.getElementById('case5-blocked');
    document.getElementById('container').appendChild(el);

    rAF(() => {
        assertElementStyle('case5-blocked', { display: '' }, assert);
        done();
    }, 200);
});
