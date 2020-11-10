/* eslint-disable max-len */

const { ExtendedSelectorFactory } = exports;

QUnit.test('Test document.evaluate calls count', (assert) => {
    const selectorText = ':xpath(//div[@class=\'banner\'])';
    const selector = ExtendedSelectorFactory.createSelector(selectorText);
    const nodes = selector.querySelectorAll();

    assert.equal(nodes.length, 9);
    assert.equal(ExtendedSelectorFactory._counter, 1);
    assert.ok(selector);
});
