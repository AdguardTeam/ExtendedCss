/**
 * @jest-environment jsdom
 */

import ExtendedCss from '../../src';
// import utils from '../../src/utils';

/**
 * Applies extended css stylesheet
 * @param styleSheet
 */
const applyExtCss = (styleSheet: string): void => {
    const extendedCss = new ExtendedCss({ styleSheet });
    extendedCss.apply();
};

interface TestStyleMap {
    [key: string]: string;
}

/**
 * Asserts that specified function has specified expected styles
 * @param actualId actual element id
 * @param expectedStyle expected style of element
 */
const expectElementStyle = (actualId: string, expectedStyle: TestStyleMap) => {
    const element = document.getElementById(actualId);
    expect(element).toBeDefined();
    Object.keys(expectedStyle)
        .forEach((prop) => {
            const actual = element?.style.getPropertyValue(prop);
            const expected = expectedStyle[prop];
            expect(actual).toEqual(expected);
        });
};

/**
 * We throttle MO callbacks in ExtCss with requestAnimationFrame and setTimeout.
 * Browsers postpone rAF callbacks in inactive tabs for a long time.
 * It throttles setTimeout callbacks as well, but it is called within a
 * relatively short time. (within several seconds)
 * We apply rAF in tests as well to postpone test for similar amount of time.
 */
const rAF = (callback: Function, delay: number) => { // eslint-disable-line @typescript-eslint/ban-types
    if (typeof window.requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => {
            setTimeout(callback, delay);
        });
    } else {
        setTimeout(callback, delay);
    }
};

describe('extended css library', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('-ext-has', () => {
        document.body.innerHTML = `
            <div id="case1">
                <div id="case1-blocked">
                    <div class="banner"></div>
                </div>
            </div>
        `;
        const cssText = '#case1 > div[-ext-has=".banner"] { display:none !important; }';
        applyExtCss(cssText);
        expectElementStyle('case1-blocked', { display: 'none' });
    });

    it('-ext-contains', () => {
        document.body.innerHTML = `
            <div id="case2">
                <div id="case2-blocked1" class="banner">Block this</div>
                <div id="case2-blocked2" class="banner">Block this also</div>
                <div id="case2-not-blocked" class="banner">Leave it be</div>
            </div>
        `;
        const cssText = '#case2 > div[-ext-contains="Block this"] { display: none!important }';
        applyExtCss(cssText);

        expectElementStyle('case2-blocked1', { display: 'none' });
        expectElementStyle('case2-blocked2', { display: 'none' });
        expectElementStyle('case2-not-blocked', { display: '' });
    });

    it('Append our style', () => {
        document.body.innerHTML = `
            <div id="case3">
                <div id="case3-modified" style="display: block;">
                <div class="banner"></div>
                </div>
            </div>
        `;
        const cssText = '#case3>div[-ext-has=".banner"] { visibility: hidden; }';
        applyExtCss(cssText);
        expectElementStyle('case3-modified', { display: 'block', visibility: 'hidden' });
    });

    it('Composite style', () => {
        document.body.innerHTML = `
            <div id="case4">
                <div id="case4-root">
                <div id="case4-blocked">
                    <div class="banner">Banner</div>
                </div>
                <div id="case4-not-blocked">
                    <div class="banner">Another text</div>
                </div>
                </div>
            </div>
        `;
        const cssText = '#case4 div[-ext-has=".banner:contains(Banner)"] { display: none; }';
        applyExtCss(cssText);
        expectElementStyle('case4-blocked', { 'display': 'none' });
        expectElementStyle('case4-not-blocked', { 'display': '' });
    });

    it('Reaction on DOM modification', () => {
        document.body.innerHTML = `
        <div id="container">
            <div id="case5">
                <div id="case5-blocked" class="banner">Block this</div>
            </div>
        </div>
        `;
        const cssText = '#case5 > div[-ext-contains="Block this"] { display: none!important }';
        applyExtCss(cssText);
        // style should be set by rule
        expectElementStyle('case5-blocked', { display: 'none' });
        const el = document.getElementById('case5-blocked');
        if (!el) {
            throw new Error('No element selected by ExtendedCss for case5');
        }
        const container = document.getElementById('container');
        container?.appendChild(el);

        rAF(() => {
            // style is not set as target element should be direct child of `#case5` by rule
            expectElementStyle('case5-blocked', { display: '' });
        }, 200);
    });

    it('Affected elements length - simple', () => {
        document.body.innerHTML = `
            <div id="case6">
                <div id="case6-blocked"></div>
            </div>
        `;
        const styleSheet = '#case6>div[-ext-has=".banner"] { display: none; }';
        const extendedCss = new ExtendedCss({ styleSheet });
        extendedCss.apply();

        let affectedLength: number;
        const startLength = extendedCss._getAffectedElements().length;
        // no element with 'banner' class at start
        expect(startLength).toBe(0);
        const toBeBlocked = document.getElementById('case6-blocked');
        expectElementStyle('case6-blocked', { display: '' });

        const banner = document.createElement('div');
        banner.setAttribute('class', 'banner');
        toBeBlocked?.appendChild(banner);

        rAF(() => {
            expectElementStyle('case6-blocked', { display: 'none' });
            affectedLength = extendedCss._getAffectedElements().length;
            expect(affectedLength).toBe(startLength + 1);

            toBeBlocked?.removeChild(banner);
            rAF(() => {
                expectElementStyle('case6-blocked', { display: '' });
                affectedLength = extendedCss._getAffectedElements().length;
                expect(affectedLength).toBe(startLength);
            }, 300);
        }, 300);
    });

    it('Affected elements length - root element removal', () => {
        document.body.innerHTML = `
            <div id="case7">
                <div id="case7-blocked">Block this</div>
            </div>
        `;
        const styleSheet = '#case7>div[-ext-contains="Block this"] { display: none; }';
        const extendedCss = new ExtendedCss({ styleSheet });
        extendedCss.apply();

        let affectedLength: number;
        const startLength = extendedCss._getAffectedElements().length;
        expect(startLength).toBe(1);
        // one element at start
        expectElementStyle('case7-blocked', { display: 'none' });

        const root = document.getElementById('case7');
        root?.parentNode?.removeChild(root);

        rAF(() => {
            affectedLength = extendedCss._getAffectedElements().length;
            // no element after root removing
            expect(affectedLength).toBe(startLength - 1);
        }, 200);
    });

    it('has(matches-css)', () => {
        document.body.innerHTML = `
            <div id="case8">
                <div id="case8-blocked">
                    <div class="match"></div>
                </div>
            </div>

            <style type="text/css">
                #case8-blocked > .match {
                    height: 20px;
                }
            </style>
        `;
        const styleSheet = '#case8>div[-ext-has=":matches-css(height: 20px)"] { display: none; }';
        applyExtCss(styleSheet);

        expectElementStyle('case8-blocked', { display: 'none' });
    });

    it('font-size style', () => {
        document.body.innerHTML = `
            <div id="case9">
                <div id="case9-not-blocked">Another text</div>
            </div>
        `;
        const styleSheet = '#case9>div[-ext-contains="Another text"] { font-size: 16px; }';
        applyExtCss(styleSheet);

        expectElementStyle('case9-not-blocked', { display: '', 'font-size': '16px' });
    });

    it('attribute protection', () => {
        document.body.innerHTML = `
            <div id="case10">
                <div id="case10-blocked">Block this</div>
            </div>
        `;
        const styleSheet = '#case10>div[-ext-contains="Block this"] { display: none; }';
        applyExtCss(styleSheet);

        expectElementStyle('case10-blocked', { display: 'none' });

        rAF(() => {
            const node = document.getElementById('case10-blocked');
            if (!node) {
                throw new Error('No target test element selected for case10.');
            }
            node.style.cssText = 'display: block!important;';
            rAF(() => {
                node.style.cssText = 'display: block!important; visibility: visible!important;';
                rAF(() => {
                    expectElementStyle('case10-blocked', { display: 'none' });
                }, 100);
            }, 100);
        }, 100);

    });

    it('protection from recurring style fixes', () => {
        document.body.innerHTML = '<div id="case11"></div>';
        const styleSheet = '#case11 { display: none; }';
        applyExtCss(styleSheet);

        const testNode = document.getElementById('case11');
        if (!testNode) {
            throw new Error('No target test element selected for case11.');
        }

        let styleTamperCount = 0;

        const tamperStyle = (): void => {
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
            expect(styleTamperCount < 60).toBeTruthy();
            expect(styleTamperCount >= 50).toBeTruthy();
            expect(testNode.hasAttribute('style')).toBeFalsy();
        }, 1000);
    });

    it('test ExtendedCss.query', () => {
        document.body.innerHTML = `
            <div id="case12">
                <div id="case12-blocked">Block me</div>
            </div>
        `;

        /**
         * earlier it was possible to do `ExtendedCss.query(selector)`
         * but now ExtendedCss is class so we need to create an instance of it
         */
        const styleSheet = '';
        const extendedCss = new ExtendedCss({ styleSheet });
        const selector = '#case12>div:contains(Block me)';
        const elements: HTMLElement[] = extendedCss.query(selector);

        expect(elements).toBeDefined();
        expect(elements.length).toBe(1);
    });

    it('using ExtendedCss.query for selectors validation', () => {
        /**
         * TODO: consider to add method to ExtendedCss for selector validation
         */
        const isValid = (selectorText: string): boolean => {
            const styleSheet = '';
            const extendedCss = new ExtendedCss({ styleSheet });
            try {
                extendedCss.query(selectorText);
                return true;
            } catch (e) {
                return false;
            }
        };

        expect(isValid('div')).toBeTruthy();
        expect(isValid('#banner')).toBeTruthy();
        expect(isValid('#banner:has(div) > #banner:contains(test)')).toBeTruthy();
        expect(isValid('#banner:whatisthispseudo(div)')).toBeFalsy();
    });

    it('style remove pseudo-property', () => {
        document.body.innerHTML = '<div id="case-remove-property"></div>';
        const styleSheet = '#case-remove-property { remove: true }';
        applyExtCss(styleSheet);

        let targetElement = document.querySelector('#case-remove-property');
        // no such element after rule applying
        expect(targetElement).toBeNull();

        const nodeHtml = '<div id="case-remove-property"></div>';
        rAF(() => {
            document.body.insertAdjacentHTML('beforeend', nodeHtml);
            rAF(() => {
                targetElement = document.querySelector('#case-remove-property');
                // element removed again
                expect(targetElement).toBeNull();
            }, 100);
        }, 100);
    });

    it('apply different rules to the same element', () => {
        document.body.innerHTML = `
            <div id="case15">
                <div id="case15-inner">
                    <div class="banner"></div>
                </div>
            </div>
        `;
        const styleSheet = `
            #case15>div[-ext-has=".banner"] { color:red; }
            #case15>div[-ext-has=".banner"] { background:white; }
        `;
        applyExtCss(styleSheet);

        expectElementStyle('case15-inner', { color: 'red', background: 'white' });
    });

    it('protect only rule style', () => {
        document.body.innerHTML = `
            <div id="case16">
                <div id="case16-inner" style="background: white;">
                    <div class="banner"></div>
                </div>
            </div>
        `;
        const styleSheet = '#case16>div[-ext-has=".banner"] { color:red; }';
        applyExtCss(styleSheet);

        expectElementStyle('case16-inner', { color: 'red', background: 'white' });

        rAF(() => {
            const node = document.getElementById('case16-inner');
            if (!node) {
                throw new Error('No target test element selected for case16.');
            }
            node.style.cssText = 'background: green;';
            rAF(() => {
                rAF(() => {
                    expectElementStyle('case16-inner', { color: 'red', background: 'green' });
                }, 100);
            }, 100);
        }, 100);
    });

    it('protected elements are removed only 50 times', () => {
        document.body.innerHTML = `
            <div id="protect-node-inside">
                <div id="case-remove-property-repeatedly"></div>
            </div>
        `;

        const protectorNode = document.getElementById('protect-node-inside');
        if (!protectorNode) {
            throw new Error('No protectorNode selected.');
        }

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
        applyExtCss(styleSheet);

        setTimeout(() => {
            observer.disconnect();
            expect(elementAddCounter < 60).toBeTruthy();
            expect(elementAddCounter >= 50).toBeTruthy();
            expect(protectorNode.querySelector(`#${id}`)).toBeDefined();
        }, 9000);
    });

    it('strict style attribute matching', () => {
        document.body.innerHTML = `
            <div id="case17">
                <div id="case17-inner" class="test_item" style="padding-bottom: 16px;">
                <a class="banner">
                    <img atl="ad" width="50">
                </a>
                </div>
            </div>
        `;
        const selector = 'div[class="test_item"][style="padding-bottom: 16px;"]:has(> a > img[width="50"])';
        const styleSheet = `${selector} { display: none!important; }`;
        applyExtCss(styleSheet);

        expectElementStyle('case17-inner', { 'padding-bottom': '16px', display: 'none' });

        rAF(() => {
            expectElementStyle('case17-inner', { 'padding-bottom': '16px', display: 'none' });
        }, 200);
    });

    it('test removing of parent and child elements matched by style + no id attr', () => {
        document.body.innerHTML = `
            <div id="case18">
                <div>
                    <div case18-parent class="case18-test">
                        <div case18-child class="case18-test"></div>
                    </div>
                    <div left-over></div>
                </div>
                <div>
                    <div case18-target class="case18-test"></div>
                </div>
            </div>

            <style type="text/css">
                .case18-test {
                    height: 20px;
                }
            </style>
        `;
        let parentEl = document.querySelector('div[case18-parent]');
        let childEl = document.querySelector('div[case18-child]');
        let targetEl = document.querySelector('div[case18-target]');
        expect(parentEl).toBeDefined();
        expect(childEl).toBeDefined();
        expect(targetEl).toBeDefined();

        const styleSheet = '#case18 div:matches-css(height:/20px/) { remove: true; }';
        applyExtCss(styleSheet);

        parentEl = document.querySelector('div[case18-parent]');
        childEl = document.querySelector('div[case18-child]');
        targetEl = document.querySelector('div[case18-target]');

        // parentEl should be removed by rule
        expect(parentEl).toBeNull();
        // childEl no longer exists because parentNode is removed
        expect(childEl).toBeNull();
        // targetEl should be removed as well
        expect(targetEl).toBeNull();
    });

    it('matches-property -- regexp value', () => {
        document.body.innerHTML = `
            <div id="case19">
                <div id="case19-property-match"></div>
                <div id="case19-property-no-match"></div>
                <div id="case19-chain-property-match" class="match"></div>
                <div id="case19-chain-property-no-match"></div>
                <div id="case19-property-null"></div>
            </div>
        `;

        const styleSheet = '#case19 > div:matches-property("id"="/property-match/") { display: none!important; }';
        applyExtCss(styleSheet);

        rAF(() => {
            expectElementStyle('case19-property-match', { display: 'none' });
            expectElementStyle('case19-property-no-match', { display: 'block' });
        }, 100);
    });

    it('matches-property -- chain with regexp', () => {
        document.body.innerHTML = `
            <div id="case19">
                <div id="case19-chain-property-match" class="match"></div>
                <div id="case19-chain-property-no-match"></div>
            </div>
        `;

        const styleSheet = '#case19 > div:matches-property("/class/.value"="match") { display: none!important; }';
        applyExtCss(styleSheet);

        rAF(() => {
            expectElementStyle('case19-chain-property-match', { display: 'none' });
            expectElementStyle('case19-chain-property-no-match', { display: 'block' });
        }, 100);
    });

    it('matches-property -- access child prop of null prop', () => {
        document.body.innerHTML = `
            <div id="case19">
                <div id="case19-property-match"></div>
                <div id="case19-property-no-match"></div>
                <div id="case19-chain-property-match" class="match"></div>
                <div id="case19-chain-property-no-match"></div>
                <div id="case19-property-null"></div>
            </div>
        `;
        const styleSheet = '#case19 > div[class]:matches-property("firstChild.assignedSlot.test") { display: none!important; }';  // eslint-disable-line max-len
        applyExtCss(styleSheet);

        rAF(() => {
            expectElementStyle('case19-property-null', { display: 'none' });
        }, 100);
    });

    /**
     * TODO: later
     */
    // QUnit.test('Test debugging', (assert) => {
    //     assert.timeout(1000);
    //     assert.expect(2);
    //     const done = assert.async();

    //     const selectors = [
    //         '#case13:not(with-debug) { display:none; debug:"" }',
    //         '#case13:not(without-debug) { display:none; }',
    //     ];
    //     const extendedCss = new ExtendedCss({ styleSheet: selectors.join('\n') });

    //     // Spy on utils.logInfo
    //     const utilsLogInfo = utils.logInfo;
    //     utils.logInfo = function () {
    //         if (arguments.length === 3
    //                 && typeof arguments[0] === 'string' && arguments[0].indexOf('Timings for') !== -1) {
    //             const stats = arguments[2];
    //             assert.ok(stats);
    //             assert.ok(stats[0].selectorText.indexOf('with-debug') !== -1);

    //             // Cleanup
    //             utils.logInfo = utilsLogInfo;
    //             extendedCss.dispose();
    //             done();
    //         }
    //         return utilsLogInfo.apply(this, arguments);
    //     };

    //     extendedCss.apply();
    // });

    /**
     * TODO: later
     */
    // QUnit.test('Test global debugging', (assert) => {
    //     assert.timeout(1000);
    //     assert.expect(5);
    //     const done = assert.async();

    //     const selectors = [
    //         '#case14:not(without-debug-before-global) { display:none; }',
    //         '#case14:not(with-global-debug) { display:none; debug: global }',
    //         '#case14:not(without-debug-after-global) { display:none; }',
    //     ];

    //     const extendedCss = new ExtendedCss({ styleSheet: selectors.join('\n') });

    //     // Spy on utils.logInfo
    //     const utilsLogInfo = utils.logInfo;
    //     utils.logInfo = function () {
    //         if (arguments.length === 3
    //                 && typeof arguments[0] === 'string' && arguments[0].indexOf('Timings for') !== -1) {
    //             const stats = arguments[2];

    //             assert.ok(stats);
    //             assert.ok(stats.length, 3);

    /* eslint-disable max-len */
    //             assert.equal(stats.filter((item) => item.selectorText.indexOf('with-global-debug') !== -1).length, 1, JSON.stringify(stats));
    //             assert.equal(stats.filter((item) => item.selectorText.indexOf('without-debug-before-global') !== -1).length, 1, JSON.stringify(stats));
    //             assert.equal(stats.filter((item) => item.selectorText.indexOf('without-debug-after-global') !== -1).length, 1, JSON.stringify(stats));
    /* eslint-enable max-len */

    //             // Cleanup
    //             utils.logInfo = utilsLogInfo;
    //             extendedCss.dispose();
    //             done();
    //         }
    //         return utilsLogInfo.apply(this, arguments);
    //     };

    //     extendedCss.apply();
    // });
});
