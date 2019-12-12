/* global QUnit, ExtendedCss */

/* Start with creating ExtendedCss */
const cssText = document.getElementById('extendedCss').innerHTML;
const extendedCss = new ExtendedCss({ styleSheet: cssText });
extendedCss.apply();

/**
 * Asserts that specified function has specified expected styles
 */
const assertElementStyle = function (id, expectedStyle, assert) {
    const element = document.getElementById(id);
    let resultOk = true;
    if (!element) {
        resultOk = false;
    }

    // eslint-disable-next-line guard-for-in
    for (const prop in expectedStyle) {
        const left = element.style.getPropertyValue(prop) || '';
        const right = expectedStyle[prop];

        if (left !== right) {
            resultOk = false;
        }
    }

    assert.ok(resultOk, id + (resultOk ? ' ok' : ' element either does not exist or has different style.'));
};

QUnit.test('Modifer -ext-has', (assert) => {
    assertElementStyle('case1-blocked', { display: 'none' }, assert);
});

QUnit.test('Append our style', (assert) => {
    assertElementStyle('case3-modified', { 'display': 'block', 'visibility': 'hidden' }, assert);
});
