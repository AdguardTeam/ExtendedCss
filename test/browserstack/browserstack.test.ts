type TestExtCssConfig = {
    styleSheet: string;
};

type ExtendedCssInstance = {
    apply(): void;
    dispose(): void;
};

// Needed to avoid declare global error:
// Augmentations for the global scope can only be directly nested in external modules or ambient module declarations
export {};

declare global {
    const BrowserstackTest: {
        ExtendedCss: {
            new (configuration: TestExtCssConfig): ExtendedCssInstance,
        },
    };
}

/* Start with creating ExtendedCss */
const cssText = document.getElementById('extendedCss')?.innerHTML;
if (!cssText) {
    throw new Error('Missing extendedCss style on page');
}

const extCss = new BrowserstackTest.ExtendedCss({ styleSheet: cssText });
extCss.apply();

type TestExpectedStyle = {
    [key: string]: string;
};

/**
 * Asserts that specified function has specified expected styles.
 *
 * @param id ID of element to check.
 * @param expectedStyle Expected style of element selected by id.
 * @param assert Qunit assert instance.
 */
const assertElementStyle = function (id: string, expectedStyle: TestExpectedStyle, assert: Assert) {
    const element = document.getElementById(id);
    let resultOk = true;
    if (!element) {
        resultOk = false;
    }

    Object.keys(expectedStyle).forEach((prop) => {
        const left = element?.style.getPropertyValue(prop) || '';
        const right = expectedStyle[prop];

        if (left !== right) {
            resultOk = false;
        }
    });

    assert.ok(resultOk, id + (resultOk ? ' ok' : ' element either does not exist or has different style.'));
};

type RafCallback = () => void;

/**
 * We throttle MO callbacks in ExtCss with requestAnimationFrame and setTimeout.
 * Browsers postpone rAF callbacks in inactive tabs for a long time.
 * It throttles setTimeout callbacks as well, but it is called within a
 * relatively short time. (within several seconds)
 * We apply rAF in tests as well to postpone test for similar amount of time.
 *
 * @param callback Callback to postpone.
 * @param delay Time in ms.
 */
const rAF = (callback: RafCallback, delay: number) => {
    if (typeof window.requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => {
            setTimeout(callback, delay);
        });
    } else {
        setTimeout(callback, delay);
    }
};

QUnit.test('Modifier -ext-has', (assert) => {
    assertElementStyle('case1-blocked', { display: 'none' }, assert);
});

QUnit.test('Modifier -ext-has + >h3', (assert) => {
    assertElementStyle('case2-blocked', { display: 'none' }, assert);
});

QUnit.test('Append our style', (assert) => {
    assertElementStyle('case3-modified', { 'display': 'block', 'visibility': 'hidden' }, assert);
});

QUnit.test('Composite style', (assert) => {
    assertElementStyle('case4-blocked', { 'display': 'none' }, assert);
    assertElementStyle('case4-not-blocked', { 'display': '' }, assert);
});

QUnit.test('Reaction on DOM modification', (assert) => {
    const done = assert.async();
    assertElementStyle('case5-blocked', { display: 'none' }, assert);
    const el = document.getElementById('case5-blocked');
    if (!el) {
        throw new Error('No needed test element #case5-blocked on page');
    }
    document?.getElementById('container')?.appendChild(el);

    rAF(() => {
        assertElementStyle('case5-blocked', { display: '' }, assert);
        done();
    }, 200);
});

QUnit.test('Modifier -ext-matches-css -- opacity property', (assert) => {
    assertElementStyle('case6-blocked', { display: 'none' }, assert);
});

QUnit.test('Modifier -ext-matches-css with pseudo-element', (assert) => {
    assertElementStyle('case7-blocked', { display: 'none' }, assert);
});

QUnit.test('Protection from recurring style fixes', (assert) => {
    const done = assert.async();

    const testNodeId = 'case11';
    const testNode = document.getElementById(testNodeId);
    if (!testNode) {
        throw new Error('No needed test element #case11 on page');
    }

    let styleTamperCount = 0;

    const tamperStyle = () => {
        if (testNode.hasAttribute('style')) {
            testNode.removeAttribute('style');
            styleTamperCount += 1;
        }
    };

    const tamperObserver = new MutationObserver(tamperStyle);

    tamperStyle();
    tamperObserver.observe(
        testNode,
        {
            attributes: true,
            attributeFilter: ['style'],
        },
    );

    setTimeout(() => {
        tamperObserver.disconnect();
        assert.ok(
            styleTamperCount >= 50 && styleTamperCount < 60,
            `style should be protected >= 50 && < 60 times. actual: ${styleTamperCount}`,
        );
        assert.notOk(
            testNode.hasAttribute('style'),
            `'style' attribute for #${testNodeId} should not be set`,
        );
        done();
    }, 1000);
});
