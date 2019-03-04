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
}

/**
 * We throttle MO callbacks in ExtCss with requestAnimationFrame and setTimeout.
 * Browsers postpone rAF callbacks in inactive tabs for a long time.
 * It throttles setTimeout callbacks as well, but it is called within a
 * relatively short time. (within several seconds)
 * We apply rAF in tests as well to postpone test for similar amount of time.
 */
var rAF = function (fn, timeout) {
    if (window.requestAnimationFrame) {
        requestAnimationFrame(function () {
            setTimeout(fn, timeout);
        });
    } else {
        setTimeout(fn, timeout);
    }
};

QUnit.test("Modifer -ext-has", function (assert) {
    assertElementStyle("case1-blocked", { display: "none" }, assert);
});

QUnit.test("Modifer -ext-contains", function (assert) {
    assertElementStyle("case2-blocked1", { display: "none" }, assert);
    assertElementStyle("case2-blocked2", { display: "none" }, assert);
    assertElementStyle("case2-notblocked", { display: "" }, assert);
});

QUnit.test("Append our style", function (assert) {
    assertElementStyle("case3-modified", { "display": "block", "visibility": "hidden" }, assert);
});

QUnit.test("Composite style", function (assert) {
    assertElementStyle("case4-blocked", { "display": "none" }, assert);
    assertElementStyle("case4-notblocked", { "display": "" }, assert);
});

QUnit.test("Reaction on DOM modification", function (assert) {
    var done = assert.async();
    assertElementStyle("case5-blocked", { display: "none" }, assert);
    var el = document.getElementById("case5-blocked");
    document.getElementById("container").appendChild(el);

    rAF(function () {
        assertElementStyle("case5-blocked", { display: "" }, assert);
        done();
    }, 100);
});

QUnit.test("Affected elements length (simple)", function (assert) {

    var done = assert.async();

    var affectedLength;
    var startLength = extendedCss._getAffectedElements().length;
    assert.ok(1, "Start test: " + startLength + " elements affected");
    var toBeBlocked = document.getElementById("case6-blocked");
    assertElementStyle("case6-blocked", { "display": "" }, assert);

    var banner = document.createElement("div");
    banner.setAttribute("class", "banner");
    toBeBlocked.appendChild(banner);

    rAF(function () {
        assertElementStyle("case6-blocked", { "display": "none" }, assert);
        affectedLength = extendedCss._getAffectedElements().length;
        assert.equal(affectedLength, startLength + 1);
        assert.ok(1, "Element blocked: " + affectedLength + " elements affected");

        toBeBlocked.removeChild(banner);
        rAF(function () {
            assertElementStyle("case6-blocked", { "display": "" }, assert);
            affectedLength = extendedCss._getAffectedElements().length;
            assert.equal(affectedLength, startLength);
            assert.ok(1, "Element unblocked: " + affectedLength + " elements affected");
            done();
        }, 100);
    }, 100);
});

QUnit.test("Affected elements length (root element removal)", function (assert) {

    var done = assert.async();

    var affectedLength;
    var startLength = extendedCss._getAffectedElements().length;
    assert.ok(1, "Start test: " + startLength + " elements affected");
    assertElementStyle("case7-blocked", { "display": "none" }, assert);

    var root = document.getElementById("case7");
    root.parentNode.removeChild(root);

    rAF(function () {
        affectedLength = extendedCss._getAffectedElements().length
        assert.equal(affectedLength, startLength - 1);
        assert.ok(1, "Element blocked: " + affectedLength + " elements affected");
        done();
    }, 100);
});

QUnit.test("Modifer -ext-matches-css-before", function (assert) {
    assertElementStyle("case8-blocked", { "display": "none" }, assert);
});

QUnit.test("Font-size style", function (assert) {
    assertElementStyle("case9-notblocked", { "display": "", "font-size": "16px" }, assert);
});

QUnit.test("Test attribute protection", function (assert) {

    var done = assert.async();
    assertElementStyle("case10-blocked", { "display": "none" }, assert);

    rAF(function () {
        var node = document.getElementById("case10-blocked");
        node.style.cssText = "display: block!important;"
        rAF(function () {
            node.style.cssText = "display: block!important; visibility: visible!important;";
            rAF(function () {
                assertElementStyle("case10-blocked", { "display": "none" }, assert);
                done();
            }, 100);
        }, 100);

    }, 100);
});

QUnit.test("Protection from recurring style fixes", function (assert) {
    var done = assert.async();

    var testNode = document.getElementById('case11');

    var styleTamperCount = 0;

    var tamperStyle = function () {
        if (testNode.hasAttribute('style')) {
            testNode.removeAttribute('style');
            styleTamperCount++;
        }
    };

    var tamperObserver = new MutationObserver(tamperStyle);

    tamperStyle();
    tamperObserver.observe(
        testNode,
        {
            attributes: true,
            attributeFilter: ['style']
        }
    );

    setTimeout(function () {
        tamperObserver.disconnect();
        assert.ok(styleTamperCount < 60);
        assert.ok(styleTamperCount >= 50);
        assert.notOk(testNode.hasAttribute('style'));
        done();
    }, 1000);
});

QUnit.test("Test ExtendedCss.query", function (assert) {
    var elements = ExtendedCss.query("#case12>div:contains(Block me)");
    assert.ok(elements);
    assert.ok(elements.length === 1);
    assert.ok((elements instanceof Array) || (elements instanceof NodeList));
});

QUnit.test("Test using ExtendedCss.query for selectors validation", function (assert) {

    function isValid(selectorText) {
        try {
            ExtendedCss.query(selectorText, true);
            return true;
        } catch (ex) {
            return false;
        }
    }

    assert.notOk(isValid());
    assert.ok(isValid("div"));
    assert.ok(isValid("#banner"));
    assert.ok(isValid("#banner:has(div) > #banner:contains(test)"));
    assert.ok(isValid("#banner[-ext-properties='content:*test']"));
    assert.ok(isValid("#banner[-ext-has='test']"));
    assert.notOk(isValid("#banner:whatisthispseudo(div)"));
});

QUnit.test("Test debugging", function (assert) {
    assert.timeout(1000);
    var done = assert.async();

    var selectors = [
        "#case13:not(with-debug) { display:none; debug:\"\" }",
        "#case13:not(without-debug) { display:none; }"
    ];
    var extendedCss = new ExtendedCss({ styleSheet: selectors.join("\n") });

    // Spy on utils.logInfo
    var utilsLogInfo = utils.logInfo;
    utils.logInfo = function () {
        if (
            arguments.length == 3 &&
            typeof arguments[0] === 'string' &&
            arguments[0].indexOf('Timings for') !== -1
        ) {
            var stats = arguments[2];
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

QUnit.test("Test global debugging", function (assert) {
    assert.timeout(1000);
    var done = assert.async();

    var selectors = [
        "#case14:not(without-debug-before-global) { display:none; }",
        "#case14:not(with-global-debug) { display:none; debug: global }",
        "#case14:not(without-debug-after-global) { display:none; }"
    ];

    var extendedCss = new ExtendedCss({ styleSheet: selectors.join("\n") });

    // Spy on utils.logInfo
    var utilsLogInfo = utils.logInfo;
    utils.logInfo = function () {
        if (
            arguments.length == 3 &&
            typeof arguments[0] === 'string' &&
            arguments[0].indexOf('Timings for') !== -1
        ) {
            var stats = arguments[2];

            assert.ok(stats);
            assert.ok(stats.length, 3);

            assert.equal(stats.filter(function (item) {
                return item.selectorText.indexOf("with-global-debug") !== -1;
            }).length, 1, JSON.stringify(stats));
            assert.equal(stats.filter(function (item) {
                return item.selectorText.indexOf("without-debug-before-global") !== -1;
            }).length, 1, JSON.stringify(stats));
            assert.equal(stats.filter(function (item) {
                return item.selectorText.indexOf("without-debug-after-global") !== -1;
            }).length, 1, JSON.stringify(stats));

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
    const done = assert.async();

    const styleSheet = '#case-remove-property { remove: true }';
    const extendedCss = new ExtendedCss({ styleSheet });
    extendedCss.apply();
    const targetElement = document.querySelector('#case-remove-property');
    assert.notOk(targetElement);

    const nodeHtml = `<div id="case-remove-property"></div>`;
    rAF(() => {
        document.body.insertAdjacentHTML('beforeend', nodeHtml);
        rAF(function () {
            const targetElement = document.querySelector('#case-remove-property');
            assert.notOk(targetElement);
            done();
        }, 100);
    }, 100);
});

QUnit.test("protected elements are removed only 50 times", function (assert) {
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

    setTimeout(function () {
        observer.disconnect();
        assert.ok(elementAddCounter < 60);
        assert.ok(elementAddCounter >= 50);
        assert.ok(protectorNode.querySelector(`#${id}`));
        done();
    }, 3000);
});
