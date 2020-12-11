/* eslint-disable max-len,prefer-rest-params */

const { ExtendedCss } = exports;
const { utils } = exports;

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

    Object.keys(expectedStyle)
        .forEach((prop) => {
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

QUnit.test('Modifer -ext-contains', (assert) => {
    assertElementStyle('case2-blocked1', { display: 'none' }, assert);
    assertElementStyle('case2-blocked2', { display: 'none' }, assert);
    assertElementStyle('case2-notblocked', { display: '' }, assert);
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

QUnit.test('Affected elements length (simple)', (assert) => {
    const done = assert.async();

    let affectedLength;
    const startLength = extendedCss._getAffectedElements().length;
    assert.ok(1, `Start test: ${startLength} elements affected`);
    const toBeBlocked = document.getElementById('case6-blocked');
    assertElementStyle('case6-blocked', { 'display': '' }, assert);

    const banner = document.createElement('div');
    banner.setAttribute('class', 'banner');
    toBeBlocked.appendChild(banner);

    rAF(() => {
        assertElementStyle('case6-blocked', { 'display': 'none' }, assert);
        affectedLength = extendedCss._getAffectedElements().length;
        assert.equal(affectedLength, startLength + 1);
        assert.ok(1, `Element blocked: ${affectedLength} elements affected`);

        toBeBlocked.removeChild(banner);
        rAF(() => {
            assertElementStyle('case6-blocked', { 'display': '' }, assert);
            affectedLength = extendedCss._getAffectedElements().length;
            assert.equal(affectedLength, startLength);
            assert.ok(1, `Element unblocked: ${affectedLength} elements affected`);
            done();
        }, 300);
    }, 300);
});

QUnit.test('Affected elements length (root element removal)', (assert) => {
    const done = assert.async();

    let affectedLength;
    const startLength = extendedCss._getAffectedElements().length;
    assert.ok(1, `Start test: ${startLength} elements affected`);
    assertElementStyle('case7-blocked', { 'display': 'none' }, assert);

    const root = document.getElementById('case7');
    root.parentNode.removeChild(root);

    rAF(() => {
        affectedLength = extendedCss._getAffectedElements().length;
        assert.equal(affectedLength, startLength - 1);
        assert.ok(1, `Element blocked: ${affectedLength} elements affected`);
        done();
    }, 200);
});

QUnit.test('Modifer -ext-matches-css-before', (assert) => {
    assertElementStyle('case8-blocked', { 'display': 'none' }, assert);
});

QUnit.test('Font-size style', (assert) => {
    assertElementStyle('case9-notblocked', { 'display': '', 'font-size': '16px' }, assert);
});

QUnit.test('Test attribute protection', (assert) => {
    const done = assert.async();
    assertElementStyle('case10-blocked', { 'display': 'none' }, assert);

    rAF(() => {
        const node = document.getElementById('case10-blocked');
        node.style.cssText = 'display: block!important;';
        rAF(() => {
            node.style.cssText = 'display: block!important; visibility: visible!important;';
            rAF(() => {
                assertElementStyle('case10-blocked', { 'display': 'none' }, assert);
                done();
            }, 100);
        }, 100);
    }, 100);
});

QUnit.test('Protection from recurring style fixes', (assert) => {
    assert.expect(3);
    const done = assert.async();

    const testNode = document.getElementById('case11');

    let styleTamperCount = 0;

    const tamperStyle = function () {
        if (testNode.hasAttribute('style')) {
            testNode.removeAttribute('style');
            styleTamperCount++;
        }
    };

    const tamperObserver = new MutationObserver(tamperStyle);

    tamperStyle();
    tamperObserver.observe(
        testNode,
        {
            attributes: true,
            attributeFilter: ['style'],
        }
    );

    setTimeout(() => {
        tamperObserver.disconnect();
        assert.ok(styleTamperCount < 60);
        assert.ok(styleTamperCount >= 50);
        assert.notOk(testNode.hasAttribute('style'));
        done();
    }, 1000);
});

QUnit.test('Test ExtendedCss.query', (assert) => {
    const elements = ExtendedCss.query('#case12>div:contains(Block me)');
    assert.ok(elements);
    assert.ok(elements.length === 1);
    assert.ok((elements instanceof Array) || (elements instanceof NodeList));
});

QUnit.test('Test using ExtendedCss.query for selectors validation', (assert) => {
    function isValid(selectorText) {
        try {
            ExtendedCss.query(selectorText, true);
            return true;
        } catch (ex) {
            return false;
        }
    }

    assert.notOk(isValid());
    assert.ok(isValid('div'));
    assert.ok(isValid('#banner'));
    assert.ok(isValid('#banner:has(div) > #banner:contains(test)'));
    assert.ok(isValid("#banner[-ext-has='test']"));
    assert.notOk(isValid('#banner:whatisthispseudo(div)'));
});

QUnit.test('Test debugging', (assert) => {
    assert.timeout(1000);
    assert.expect(2);
    const done = assert.async();

    const selectors = [
        '#case13:not(with-debug) { display:none; debug:"" }',
        '#case13:not(without-debug) { display:none; }',
    ];
    const extendedCss = new ExtendedCss({ styleSheet: selectors.join('\n') });

    // Spy on utils.logInfo
    const utilsLogInfo = utils.logInfo;
    utils.logInfo = function () {
        if (arguments.length === 3
                && typeof arguments[0] === 'string' && arguments[0].indexOf('Timings for') !== -1) {
            const stats = arguments[2];
            assert.ok(stats);
            assert.ok(stats[0].selectorText.indexOf('with-debug') !== -1);

            // Cleanup
            utils.logInfo = utilsLogInfo;
            extendedCss.dispose();
            done();
        }
        return utilsLogInfo.apply(this, arguments);
    };

    extendedCss.apply();
});

QUnit.test('Test global debugging', (assert) => {
    assert.timeout(1000);
    assert.expect(5);
    const done = assert.async();

    const selectors = [
        '#case14:not(without-debug-before-global) { display:none; }',
        '#case14:not(with-global-debug) { display:none; debug: global }',
        '#case14:not(without-debug-after-global) { display:none; }',
    ];

    const extendedCss = new ExtendedCss({ styleSheet: selectors.join('\n') });

    // Spy on utils.logInfo
    const utilsLogInfo = utils.logInfo;
    utils.logInfo = function () {
        if (arguments.length === 3
                && typeof arguments[0] === 'string' && arguments[0].indexOf('Timings for') !== -1) {
            const stats = arguments[2];

            assert.ok(stats);
            assert.ok(stats.length, 3);

            assert.equal(stats.filter((item) => item.selectorText.indexOf('with-global-debug') !== -1).length, 1, JSON.stringify(stats));
            assert.equal(stats.filter((item) => item.selectorText.indexOf('without-debug-before-global') !== -1).length, 1, JSON.stringify(stats));
            assert.equal(stats.filter((item) => item.selectorText.indexOf('without-debug-after-global') !== -1).length, 1, JSON.stringify(stats));

            // Cleanup
            utils.logInfo = utilsLogInfo;
            extendedCss.dispose();
            done();
        }
        return utilsLogInfo.apply(this, arguments);
    };

    extendedCss.apply();
});

QUnit.test('Test style remove property', (assert) => {
    assert.timeout(1000);
    assert.expect(2);
    const done = assert.async();

    const styleSheet = '#case-remove-property { remove: true }';
    const extendedCss = new ExtendedCss({ styleSheet });
    extendedCss.apply();
    const targetElement = document.querySelector('#case-remove-property');
    assert.notOk(targetElement);

    const nodeHtml = '<div id="case-remove-property"></div>';
    rAF(() => {
        document.body.insertAdjacentHTML('beforeend', nodeHtml);
        rAF(() => {
            const targetElement = document.querySelector('#case-remove-property');
            assert.notOk(targetElement);
            done();
        }, 100);
    }, 100);
});

QUnit.test('Apply different rules to the same element', (assert) => {
    assertElementStyle('case15-inner', { 'color': 'red', 'background': 'white' }, assert);
});

QUnit.test('Protect only rule style', (assert) => {
    assert.expect(2);
    const done = assert.async();
    assertElementStyle('case16-inner', { 'color': 'red', 'background': 'white' }, assert);

    rAF(() => {
        const node = document.getElementById('case16-inner');
        node.style.cssText = 'background: green;';
        rAF(() => {
            rAF(() => {
                assertElementStyle('case16-inner', { 'color': 'red', 'background': 'green' }, assert);
                done();
            }, 100);
        }, 100);
    }, 100);
});

QUnit.test('Protected elements are removed only 50 times', (assert) => {
    assert.expect(3);
    const done = assert.async();
    const protectorNode = document.getElementById('protect-node-inside');
    const id = 'case-remove-property-repeatedly';
    const testNodeElement = document.createElement('div');
    testNodeElement.id = id;

    let elementAddCounter = 0;

    const protectElement = () => {
        const testNode = protectorNode.querySelector(`#${id}`);
        if (!testNode) {
            protectorNode.appendChild(testNodeElement);
            elementAddCounter += 1;
        }
    };

    const observer = new MutationObserver(protectElement);
    observer.observe(protectorNode, { childList: true });

    const styleSheet = `#${id} { remove: true }`;
    const extendedCss = new ExtendedCss({ styleSheet });
    extendedCss.apply();

    setTimeout(() => {
        observer.disconnect();
        assert.ok(elementAddCounter < 60);
        assert.ok(elementAddCounter >= 50);
        assert.ok(protectorNode.querySelector(`#${id}`));
        done();
    }, 9000);
});

QUnit.test('Strict style attribute matching', (assert) => {
    const selector = 'div[class="test_item"][style="padding-bottom: 16px;"]:has(> a > img[width="50"])';
    const styleSheet = `${selector} { display: none!important; }`;
    const extendedCss = new ExtendedCss({ styleSheet });
    extendedCss.apply();

    assert.expect(4);
    const done = assert.async();
    const testNode = document.getElementById('case17-inner');
    const testNodeStyleProps = window.getComputedStyle(testNode);
    assert.strictEqual(testNodeStyleProps['padding-bottom'], '16px');
    assert.strictEqual(testNodeStyleProps.display, 'none');

    rAF(() => {
        assert.strictEqual(testNodeStyleProps['padding-bottom'], '16px');
        assert.strictEqual(testNodeStyleProps.display, 'none');
        done();
    }, 200);
});

QUnit.test('Test removing of parent and child elements matched by style + no id attr', (assert) => {
    let parentEl = document.querySelector('div[case18-parent]');
    assert.ok(parentEl, 'parentEl is present at test start');
    let childEl = document.querySelector('div[case18-child]');
    assert.ok(childEl, 'childEl is present at test start');
    let targetEl = document.querySelector('div[case18-target]');
    assert.ok(targetEl, 'targetEl is present at test start');

    const styleSheet = '#case18 div:matches-css(height:/20px/) { remove: true; }';
    const extendedCss = new ExtendedCss({ styleSheet });
    extendedCss.apply();

    parentEl = document.querySelector('div[case18-parent]');
    assert.notOk(parentEl, 'parentEl should be removed by rule');
    childEl = document.querySelector('div[case18-child]');
    assert.notOk(childEl, 'childEl no longer exists because parentNode is removed');
    targetEl = document.querySelector('div[case18-target]');
    assert.notOk(targetEl, 'targetEl should be removed as well');
});

QUnit.test('matches-property -- regexp value', (assert) => {
    const selector = '#case19 > div:matches-property("id"="/property-match/")';
    const styleSheet = `${selector} { display: none!important; }`;
    const extendedCss = new ExtendedCss({ styleSheet });
    extendedCss.apply();

    const matchEl = document.getElementById('case19-property-match');
    const matchElStyleProps = window.getComputedStyle(matchEl);
    assert.strictEqual(matchElStyleProps.display, 'none');

    const noMatchEl = document.getElementById('case19-property-no-match');
    const noMatchElStyleProps = window.getComputedStyle(noMatchEl);
    assert.strictEqual(noMatchElStyleProps.display, 'block');
});

QUnit.test('matches-property -- chain with regexp', (assert) => {
    const selector = '#case19 > div:matches-property("/class/.value"="match")';
    const styleSheet = `${selector} { display: none!important; }`;
    const extendedCss = new ExtendedCss({ styleSheet });
    extendedCss.apply();

    const matchEl = document.getElementById('case19-chain-property-match');
    const matchElStyleProps = window.getComputedStyle(matchEl);
    assert.strictEqual(matchElStyleProps.display, 'none');

    const noMatchEl = document.getElementById('case19-chain-property-no-match');
    const noMatchElStyleProps = window.getComputedStyle(noMatchEl);
    assert.strictEqual(noMatchElStyleProps.display, 'block');
});

QUnit.test('matches-property -- access child prop of null prop', (assert) => {
    const selector = '#case19 > div[class]:matches-property("firstChild.assignedSlot.test")';
    const styleSheet = `${selector} { display: none!important; }`;
    const extendedCss = new ExtendedCss({ styleSheet });
    extendedCss.apply();

    const matchEl = document.getElementById('case19-property-null');
    const matchElStyleProps = window.getComputedStyle(matchEl);
    assert.strictEqual(matchElStyleProps.display, 'block');
});
