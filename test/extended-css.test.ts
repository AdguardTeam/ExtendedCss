/**
 * @jest-environment jsdom
 */

import { ExtendedCss } from '../src';

import { TimingStats } from '../src/extended-css';

import { logger } from '../src/common/utils/logger';

const TESTS_RUN_TIMEOUT_MS = 20 * 1000;

interface TestPropElement extends Element {
    // eslint-disable-next-line @typescript-eslint/ban-types
    _testProp: string | Object;
}

/**
 * Applies extended CSS stylesheet.
 *
 * @param styleSheet Extended CSS stylesheet.
 */
const applyExtCssStyleSheet = (styleSheet: string): void => {
    const extendedCss = new ExtendedCss({ styleSheet });
    extendedCss.apply();
};

/**
 * Applies extended CSS rules.
 *
 * @param cssRules Array of extended CSS rules.
 */
const applyExtCssRules = (cssRules: string[]): void => {
    const extendedCss = new ExtendedCss({ cssRules });
    extendedCss.apply();
};

type TestStyleMap = {
    [key: string]: string;
};

type TestLoggedStats = {
    selectorParsed: string,
    timings: TimingStats,
};

/**
 * Asserts that specified function has specified expected styles.
 *
 * @param actualId Actual element id.
 * @param expectedStyle Expected style of element.
 */
export const expectElementStyle = (actualId: string, expectedStyle: TestStyleMap) => {
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
 *
 * @param callback Callback to postpone.
 * @param delay Time in ms.
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

jest.setTimeout(TESTS_RUN_TIMEOUT_MS);

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
        const styleSheet = '#case1 > div[-ext-has=".banner"] { display:none !important; }';
        applyExtCssStyleSheet(styleSheet);
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
        const styleSheet = '#case2 > div[-ext-contains="Block this"] { display: none!important }';
        applyExtCssStyleSheet(styleSheet);

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
        const styleSheet = '#case3>div[-ext-has=".banner"] { visibility: hidden; }';
        applyExtCssStyleSheet(styleSheet);
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
        const styleSheet = '#case4 div[-ext-has=".banner:contains(Banner)"] { display: none; }';
        applyExtCssStyleSheet(styleSheet);
        expectElementStyle('case4-blocked', { 'display': 'none' });
        expectElementStyle('case4-not-blocked', { 'display': '' });
    });

    it('Reaction on DOM modification', (done) => {
        document.body.innerHTML = `
            <div id="container">
                <div id="case5">
                    <div id="case5-blocked" class="banner">Block this</div>
                </div>
            </div>
        `;
        const styleSheet = '#case5 > div[-ext-contains="Block this"] { display: none!important }';
        applyExtCssStyleSheet(styleSheet);
        // style should be set by rule
        expectElementStyle('case5-blocked', { display: 'none' });
        const el = document.getElementById('case5-blocked');
        if (!el) {
            throw new Error('No element selected by ExtendedCss for case5');
        }
        const container = document.getElementById('container');
        container?.appendChild(el);

        rAF(() => {
            try {
                // style is not set as target element should be direct child of `#case5` by rule
                expectElementStyle('case5-blocked', { display: '' });
                done();
            } catch (error) {
                done(error);
            }
        }, 200);
    });

    it('Affected elements length - simple', (done) => {
        document.body.innerHTML = `
            <div id="case6">
                <div id="case6-blocked"></div>
            </div>
        `;
        const styleSheet = '#case6>div[-ext-has=".banner"] { display: none; }';
        const extendedCss = new ExtendedCss({ styleSheet });
        extendedCss.apply();

        let affectedLength: number;
        const startLength = extendedCss.getAffectedElements().length;
        // no element with 'banner' class at start
        expect(startLength).toBe(0);
        const toBeBlocked = document.getElementById('case6-blocked');
        expectElementStyle('case6-blocked', { display: '' });

        const banner = document.createElement('div');
        banner.setAttribute('class', 'banner');
        toBeBlocked?.appendChild(banner);

        rAF(() => {
            try {
                expectElementStyle('case6-blocked', { display: 'none' });
                affectedLength = extendedCss.getAffectedElements().length;
                expect(affectedLength).toBe(startLength + 1);
            } catch (error) {
                done(error);
            }

            toBeBlocked?.removeChild(banner);

            rAF(() => {
                try {
                    expectElementStyle('case6-blocked', { display: '' });
                    affectedLength = extendedCss.getAffectedElements().length;
                    expect(affectedLength).toBe(startLength);
                    done();
                } catch (error) {
                    done(error);
                }
            }, 300);
        }, 300);
    });

    it('Affected elements length - root element removal', (done) => {
        document.body.innerHTML = `
            <div id="case7">
                <div id="case7-blocked">Block this</div>
            </div>
        `;
        const styleSheet = '#case7>div[-ext-contains="Block this"] { display: none; }';
        const extendedCss = new ExtendedCss({ styleSheet });
        extendedCss.apply();

        let affectedLength: number;
        const startLength = extendedCss.getAffectedElements().length;
        expect(startLength).toBe(1);
        // one element at start
        expectElementStyle('case7-blocked', { display: 'none' });

        const root = document.getElementById('case7');
        root?.parentNode?.removeChild(root);

        rAF(() => {
            try {
                affectedLength = extendedCss.getAffectedElements().length;
                // no element after root removing
                expect(affectedLength).toBe(startLength - 1);
                done();
            } catch (error) {
                done(error);
            }
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
        applyExtCssStyleSheet(styleSheet);

        expectElementStyle('case8-blocked', { display: 'none' });
    });

    it('font-size style', () => {
        document.body.innerHTML = `
            <div id="case9">
                <div id="case9-not-blocked">Another text</div>
            </div>
        `;
        const styleSheet = '#case9>div[-ext-contains="Another text"] { font-size: 16px; }';
        applyExtCssStyleSheet(styleSheet);

        expectElementStyle('case9-not-blocked', { display: '', 'font-size': '16px' });
    });

    it('attribute protection', (done) => {
        document.body.innerHTML = `
            <div id="case10">
                <div id="case10-blocked">Block this</div>
            </div>
        `;
        const styleSheet = '#case10>div[-ext-contains="Block this"] { display: none; }';
        applyExtCssStyleSheet(styleSheet);

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
                    try {
                        expectElementStyle('case10-blocked', { display: 'none' });
                        done();
                    } catch (error) {
                        done(error);
                    }
                }, 100);
            }, 100);
        }, 100);

    });

    it('protection from recurring style fixes', (done) => {
        document.body.innerHTML = '<div id="case11"></div>';
        const styleSheet = '#case11 { display: none; }';
        applyExtCssStyleSheet(styleSheet);

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
            try {
                tamperObserver.disconnect();
                expect(styleTamperCount < 60).toBeTruthy();
                expect(styleTamperCount >= 50).toBeTruthy();
                expect(testNode.hasAttribute('style')).toBeFalsy();
                done();
            } catch (error) {
                done(error);
            }
        }, 1000);
    });

    it('test ExtendedCss.query', () => {
        document.body.innerHTML = `
            <div id="case12">
                <div id="case12-blocked">Block me</div>
            </div>
        `;

        const selector = '#case12>div:contains(Block me)';
        const elements: HTMLElement[] = ExtendedCss.query(selector);

        expect(elements).toBeDefined();
        expect(elements.length).toBe(1);
    });

    describe('test ExtendedCss.validate', () => {
        const validSelectors = [
            'div',
            '#banner',
            '[style*="border-bottom: none;"]',
            'div[style^=" margin-right: auto; margin-left: auto;	text-align: left;	padding-bottom: 10px;"]',
            '#banner:has(div) > #banner:contains(test)',
            'div[id*="-ad-"]:remove()',
            '#main div[id*="_containerWrap_"]:has(img[src$="Banner/ad.jpg"]):remove()',
            'div[class*=" "]:matches-css(background-image: /^url\\(data:image/png;base64,iVBOR/)',
            'div[class*=" "]:matches-css(background-image: /^url\\(https:\\/\\/example\\.org\\//)',
            // should be valid but there is an issue with `nwsapi` which is used in `jsdom`
            // https://github.com/dperini/nwsapi/issues/34
            // TODO: check later is it fixed
            // 'a[href^="/watch?v="][onclick^="return test.onEvent(arguments[0]||window.event,\'"]',
            // escaped colon in attribute name
            'div[\\:data-service-slot][data-ac]',
            '#main-container > div[\\:class^="$test.ad.RenderedDesktop"]',
            'div[class\\"ads-article\\"]',
            "[class\\'ads-article\\']",
            // `*:not(<arg>)` with standard selector `arg`
            'html:not([class*="block"]) .container',
            '.banner:has(~ .right_bx, ~ div[class^="aside"])',
        ];
        test.each(validSelectors)('%s', (selector) => {
            expect(ExtendedCss.validate(selector).ok).toBeTruthy();
        });

        const invalidSelectors = [
            '#13_3623',
            '.4wNET',
            'A.jumpWrap,DIV.left-game,DIV.right-game,DIV.games-op-wrap,DIV.right-op-wrap mb10,#j-top^Box',
            '#__^HFa,DIV.box top_box',
            'DIV.panel_bottom,LI.tl_shadow tl_shadow_new ^',
            'div[id^="AS_O_LHS_"] > div:nth-child(15 + n)',
            '#banner:invalidpseudo(div)',
            '.text-left:has-text(/share/):others()',
            '.modals.dimmer > .gdpr.visible:upward(1):watch-attr([class])',
            'div[class*=" "]:has(> div[class] > a[href="/terms"]:not([rel])',
            'table[style*=border: 0px"]',
            // `*:not(<arg>)` with extended selector `arg`
            'html:not(:has(span))',
        ];
        test.each(invalidSelectors)('%s', (selector) => {
            expect(ExtendedCss.validate(selector).ok).toBeFalsy();
        });
    });

    it('style remove pseudo-property', (done) => {
        document.body.innerHTML = '<div id="case-remove-property"></div>';
        const styleSheet = '#case-remove-property { remove: true }';
        applyExtCssStyleSheet(styleSheet);

        let targetElement = document.querySelector('#case-remove-property');
        // no such element after rule applying
        expect(targetElement).toBeNull();

        const nodeHtml = '<div id="case-remove-property"></div>';
        rAF(() => {
            document.body.insertAdjacentHTML('beforeend', nodeHtml);
            rAF(() => {
                try {
                    targetElement = document.querySelector('#case-remove-property');
                    // element removed again
                    expect(targetElement).toBeNull();
                    done();
                } catch (error) {
                    done(error);
                }
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
        applyExtCssStyleSheet(styleSheet);

        expectElementStyle('case15-inner', { color: 'red', background: 'white' });
    });

    it('protect only rule style', (done) => {
        document.body.innerHTML = `
            <div id="case16">
                <div id="case16-inner" style="background: white;">
                    <div class="banner"></div>
                </div>
            </div>
        `;
        const styleSheet = '#case16>div[-ext-has=".banner"] { color:red; }';
        applyExtCssStyleSheet(styleSheet);

        expectElementStyle('case16-inner', { color: 'red', background: 'white' });

        rAF(() => {
            const node = document.getElementById('case16-inner');
            if (!node) {
                throw new Error('No target test element selected for case16.');
            }
            node.style.cssText = 'background: green;';
            rAF(() => {
                rAF(() => {
                    try {
                        expectElementStyle('case16-inner', { color: 'red', background: 'green' });
                        done();
                    } catch (error) {
                        done(error);
                    }
                }, 100);
            }, 100);
        }, 100);
    });

    it('protected elements are removed only 50 times', (done) => {
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
        applyExtCssStyleSheet(styleSheet);

        setTimeout(() => {
            try {
                observer.disconnect();
                expect(elementAddCounter < 60).toBeTruthy();
                expect(elementAddCounter >= 50).toBeTruthy();
                expect(protectorNode.querySelector(`#${id}`)).toBeDefined();
                done();
            } catch (error) {
                done(error);
            }
        }, 9000);
    });

    it('strict style attribute matching', (done) => {
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
        applyExtCssStyleSheet(styleSheet);

        expectElementStyle('case17-inner', { 'padding-bottom': '16px', display: 'none' });

        rAF(() => {
            try {
                expectElementStyle('case17-inner', { 'padding-bottom': '16px', display: 'none' });
                done();
            } catch (error) {
                done(error);
            }
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
        applyExtCssStyleSheet(styleSheet);

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

    it('matches-property - regexp value', () => {
        document.body.innerHTML = `
            <div id="case19">
                <div id="case19-property-match" style="display: block;"></div>
                <div id="case19-property-no-match" style="display: block;"></div>
            </div>
        `;

        const testEl = document.querySelector('#case19-property-match') as TestPropElement;
        const testPropName = '_testProp';
        testEl[testPropName] = 'abc';

        const styleSheet = '#case19 > div:matches-property(_testProp=/[\\w]{3}/) { display: none!important; }';
        applyExtCssStyleSheet(styleSheet);

        expectElementStyle('case19-property-match', { display: 'none' });
        expectElementStyle('case19-property-no-match', { display: 'block' });
    });

    it('matches-property - chain with regexp', () => {
        document.body.innerHTML = `
            <div id="case19">
                <div id="case19-chain-property-match" style="display: block;"></div>
                <div id="case19-chain-property-no-match" style="display: block;"></div>
            </div>
        `;

        const testEl = document.querySelector('#case19-chain-property-match') as TestPropElement;
        const propFirst = '_testProp';
        const propInner = { inner: null };
        testEl[propFirst] = propInner;

        const styleSheet = '#case19 > div:matches-property(/_test/.inner=null) { display: none!important; }';
        applyExtCssStyleSheet(styleSheet);

        expectElementStyle('case19-chain-property-match', { display: 'none' });
        expectElementStyle('case19-chain-property-no-match', { display: 'block' });
    });

    it('matches-property - access child prop of null prop - no match and no fail', () => {
        document.body.innerHTML = `
            <div id="case19">
                <div id="case19-property-null" style="display: block;"></div>
            </div>
        `;
        const styleSheet = '#case19 > div:matches-property("firstChild.slot.test") { display: none!important; }';
        applyExtCssStyleSheet(styleSheet);

        expectElementStyle('case19-property-null', { display: 'block' });
    });

    it('debugging - true', (done) => {
        expect.assertions(3);
        document.body.innerHTML = '<div id="case13"></div>';
        const styleSheet = `
            #case13:not(with-debug) { display:none; debug: true }
            #case13:not(without-debug) { display:none; }
        `;
        const extendedCss = new ExtendedCss({ styleSheet });

        const loggerInfo = logger.info;
        logger.info = function (...args) {
            if (args.length === 3
                    && typeof args[0] === 'string' && args[0].indexOf('Timings') !== -1) {
                const loggedData = args[2];
                expect(loggedData).toBeDefined();

                const selectors = Object.keys(loggedData);
                expect(selectors.length).toEqual(1);
                expect(selectors[0] && selectors[0].includes('with-debug')).toBeTruthy();

                // Cleanup
                logger.info = loggerInfo;
                extendedCss.dispose();
                done();
            }
            return loggerInfo.apply(this, args);
        };

        extendedCss.apply();
    });

    it('debugging - global', (done) => {
        expect.assertions(5);
        document.body.innerHTML = '<div id="case14"></div>';
        const styleSheet = `
            #case14:not(without-debug-before-global) { display:none; }
            #case14:not(with-global-debug) { display:none; debug: global }
            #case14:not(without-debug-after-global) { display:none; }
        `;
        const extendedCss = new ExtendedCss({ styleSheet });

        // Spy on utils.logInfo
        const loggerInfo = logger.info;
        logger.info = function (...args) {
            if (args.length === 3
                    && typeof args[0] === 'string' && args[0].indexOf('Timings') !== -1) {
                const loggedData: TestLoggedStats[] = args[2];
                expect(loggedData).toBeDefined();

                const selectors = Object.keys(loggedData);
                expect(selectors.length).toEqual(3);

                expect(selectors.filter((s) => s.includes('with-global-debug')).length).toEqual(1);
                expect(selectors.filter((s) => s.includes('without-debug-before-global')).length).toEqual(1);
                expect(selectors.filter((s) => s.includes('without-debug-after-global')).length).toEqual(1);

                // Cleanup
                logger.info = loggerInfo;
                extendedCss.dispose();
                done();
            }
            return loggerInfo.apply(this, args);
        };

        extendedCss.apply();
    });

    it('debugging - only debug property for logging', (done) => {
        expect.assertions(3);
        document.body.innerHTML = '<div id="case13"></div>';
        const styleSheet = `
            #case13:not(with-debug) { debug: true }
        `;
        const extendedCss = new ExtendedCss({ styleSheet });

        const loggerInfo = logger.info;
        logger.info = function (...args) {
            if (args.length === 3
                    && typeof args[0] === 'string' && args[0].indexOf('Timings') !== -1) {
                const loggedData = args[2];
                expect(loggedData).toBeDefined();

                const selectors = Object.keys(loggedData);
                expect(selectors.length).toEqual(1);
                expect(selectors[0] && selectors[0].includes('with-debug')).toBeTruthy();

                // Cleanup
                logger.info = loggerInfo;
                extendedCss.dispose();
                done();
            }
            return loggerInfo.apply(this, args);
        };

        extendedCss.apply();
    });

    it("do not apply CssHitsCounter's 'content' style to selected element", () => {
        document.body.innerHTML = `
            <div id="case14">
                <div id="case14-hidden-no-content"></div>
            </div>
        `;
        const styleSheet = '#case14>div { display: none; content: "adguardTestContentRuleText" !important }';
        const extendedCss = new ExtendedCss({ styleSheet });
        extendedCss.apply();

        const affectedElements = extendedCss.getAffectedElements();
        // one element matched
        expect(affectedElements.length).toBe(1);
        if (!affectedElements[0]) {
            throw new Error('One affectedElements should be present for case14');
        }
        // one rule applied
        expect(affectedElements[0].rules.length).toBe(1);

        const expectRuleStyle = {
            display: 'none',
            content: '"adguardTestContentRuleText" !important',
        };

        if (!affectedElements[0].rules[0]) {
            throw new Error('One rule for affected elements should be present for case14');
        }
        // 'content' in affectedElement is needed for CssHitsCounter
        expect(affectedElements[0].rules[0].style).toEqual(expectRuleStyle);

        // but it should not be set in matched element style
        expectElementStyle('case14-hidden-no-content', { display: 'none', content: '' });
    });

    it('do fail on beforeStyleApplied as entity callback', () => {
        document.body.innerHTML = `
            <div id="case15">
                <div id="case15-entity-callback"></div>
            </div>
        `;
        const cssRules = ['#case15>div { display: none !important; }'];
        const extendedCss = new ExtendedCss({
            cssRules,
            beforeStyleApplied: (el) => el,
        });
        // rule without 'content' style property is applied successfully, no error thrown
        extendedCss.apply();

        const affectedElements = extendedCss.getAffectedElements();
        // one element matched
        expect(affectedElements.length).toBe(1);
        if (!affectedElements[0]) {
            throw new Error('One affectedElements should be present for case15');
        }
        // one rule applied
        expect(affectedElements[0].rules.length).toBe(1);

        if (!affectedElements[0].rules[0]) {
            throw new Error('One rule for affected elements should be present for case15');
        }

        const expectRuleStyle = {
            display: 'none !important',
        };
        expect(affectedElements[0].rules[0].style).toEqual(expectRuleStyle);

        // but it should not be set in matched element style
        expectElementStyle('case15-entity-callback', { display: 'none' });
    });

    describe('some invalid selector are passed to apply', () => {
        it('stylesheet -- fail', () => {
            document.body.innerHTML = `
                <div id="case20">
                    <div id="case201" random="12345" style="display: block;"></div>
                    <div id="case202" class="banner" style="display: block;"></div>
                    <div id="case203" style="display: block;">inner text</div>
                </div>
            `;

            const stylesheet = `#case20 > div:matches-attr(random=/[0-9]{5}/) { display: none!important; }
                #case20 > div[..banner] { content: "";  display: none!important; }
                #case20 > div:contains(text) { display: none!important; }`;
            const error = 'Pass the rules as configuration.cssRules since configuration.styleSheet cannot be parsed';

            expect(() => {
                applyExtCssStyleSheet(stylesheet);
            }).toThrow(error);

            // styles have not been applied
            expectElementStyle('case201', { display: 'block' });
            expectElementStyle('case202', { display: 'block' });
            expectElementStyle('case203', { display: 'block' });
        });

        it('separated css rules - ok', () => {
            document.body.innerHTML = `
                <div id="case21">
                    <div id="case211" random="12345" style="display: block;"></div>
                    <div id="case212" class="banner" style="display: block;"></div>
                    <div id="case213" style="display: block;">inner text</div>
                </div>
            `;

            const cssRules = [
                '#case21 > div:matches-attr(random=/[0-9]{5}/) { display: none!important; }',
                '#case21 > div[..banner] { content: "";  display: none!important; }',
                '#case21 > div:contains(text) { display: none!important; }',
            ];
            applyExtCssRules(cssRules);

            // invalid selector style should not be applied - #case212 -
            // but all others should be applied
            expectElementStyle('case211', { display: 'none' });
            expectElementStyle('case212', { display: 'block' });
            expectElementStyle('case213', { display: 'none' });
        });
    });

    it('both styleSheet and cssRules are set in configuration', () => {
        document.body.innerHTML = `
            <div id="case22">
                <div id="case221" random="12345" style="display: block;"></div>
                <div id="case222" style="display: block;">inner text</div>
            </div>
        `;

        const styleSheet = '#case22 > div:matches-attr(random=/[0-9]{5}/) { display: none!important; }';
        const cssRules = ['#case22 > div:contains(text) { display: none!important; }'];

        const extendedCss = new ExtendedCss({ styleSheet, cssRules });
        extendedCss.apply();

        // styles have been applied
        expectElementStyle('case221', { display: 'none' });
        expectElementStyle('case222', { display: 'none' });
    });

    it('log invalid css rule', (done) => {
        expect.assertions(1);
        document.body.innerHTML = '<div id="case23"></div>';
        const invalidRule = '#case23[..banner] { display: none!important; }';
        const cssRules = [invalidRule];

        const loggerInfo = logger.info;
        logger.info = function (...args) {
            if (args.length === 1
                && typeof args[0] === 'string'
                && args[0].includes('Invalid rules:')
            ) {
                expect(args[0].includes(invalidRule)).toBeTruthy();
                // Cleanup
                logger.info = loggerInfo;
                done();
            }
            return loggerInfo.apply(this, args);
        };

        // invalid rules are skipped in ExtendedCss constructor during the rules parsing
        new ExtendedCss({ cssRules, debug: true });
    });
});
