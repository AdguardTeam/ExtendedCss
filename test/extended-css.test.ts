/**
 * @vitest-environment jsdom
 */

import { ExtendedCss } from '../src';

import { TimingStats } from '../src/extended-css';

import { logger } from '../src/common/utils/logger';

const TESTS_RUN_TIMEOUT_MS = 20 * 1000;

interface TestPropElement extends Element {
    _testProp: string | object;
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
const rAF = (callback: () => void, delay: number) => {
    if (typeof window.requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => {
            setTimeout(callback, delay);
        });
    } else {
        setTimeout(callback, delay);
    }
};

vi.setConfig({ testTimeout: TESTS_RUN_TIMEOUT_MS });

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

    it('applies rules with an apostrophe after a space in :contains() argument', () => {
        document.body.innerHTML = "<div id=\"case-apostrophe\">the '90s</div>";
        applyExtCssRules([
            "#case-apostrophe:contains(the '90s) { display: none !important; }",
        ]);
        expectElementStyle('case-apostrophe', { display: 'none' });
    });

    it('applies action rules with an apostrophe after a space in :contains() argument', () => {
        document.body.innerHTML = "<div id=\"case-apostrophe-action\">the '90s</div>";
        applyExtCssRules([
            "#case-apostrophe-action:contains(the '90s):remove()",
        ]);
        expect(document.getElementById('case-apostrophe-action')).toBeNull();
    });

    it('parses stylesheets with an apostrophe after a space in :contains() argument', () => {
        document.body.innerHTML = "<div id=\"case-apostrophe-stylesheet\">the '90s</div>";
        applyExtCssStyleSheet(
            "#case-apostrophe-stylesheet:contains(the '90s) { display: none !important; }",
        );
        expectElementStyle('case-apostrophe-stylesheet', { display: 'none' });
    });

    it('applies rules with a lone double quote in :contains() argument', () => {
        document.body.innerHTML = '<div id="case-lone-quote">say "</div>';
        applyExtCssRules([
            '#case-lone-quote:contains(say ") { display: none !important; }',
        ]);
        expectElementStyle('case-lone-quote', { display: 'none' });
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

    it('Reaction on DOM modification', () => {
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

        return new Promise<void>((resolve, reject) => {
            rAF(() => {
                try {
                    // style is not set as target element should be direct child of `#case5` by rule
                    expectElementStyle('case5-blocked', { display: '' });
                    resolve();
                } catch (error) {
                    reject(error);
                }
            }, 200);
        });
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
        const startLength = extendedCss.getAffectedElements().length;
        // no element with 'banner' class at start
        expect(startLength).toBe(0);
        const toBeBlocked = document.getElementById('case6-blocked');
        expectElementStyle('case6-blocked', { display: '' });

        const banner = document.createElement('div');
        banner.setAttribute('class', 'banner');
        toBeBlocked?.appendChild(banner);

        return new Promise<void>((resolve, reject) => {
            rAF(() => {
                try {
                    expectElementStyle('case6-blocked', { display: 'none' });
                    affectedLength = extendedCss.getAffectedElements().length;
                    expect(affectedLength).toBe(startLength + 1);
                } catch (error) {
                    reject(error);
                    return;
                }

                toBeBlocked?.removeChild(banner);

                rAF(() => {
                    try {
                        expectElementStyle('case6-blocked', { display: '' });
                        affectedLength = extendedCss.getAffectedElements().length;
                        expect(affectedLength).toBe(startLength);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                }, 300);
            }, 300);
        });
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
        const startLength = extendedCss.getAffectedElements().length;
        expect(startLength).toBe(1);
        // one element at start
        expectElementStyle('case7-blocked', { display: 'none' });

        const root = document.getElementById('case7');
        root?.parentNode?.removeChild(root);

        return new Promise<void>((resolve, reject) => {
            rAF(() => {
                try {
                    affectedLength = extendedCss.getAffectedElements().length;
                    // no element after root removing
                    expect(affectedLength).toBe(startLength - 1);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            }, 200);
        });
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

    it('attribute protection', () => {
        document.body.innerHTML = `
            <div id="case10">
                <div id="case10-blocked">Block this</div>
            </div>
        `;
        const styleSheet = '#case10>div[-ext-contains="Block this"] { display: none; }';
        applyExtCssStyleSheet(styleSheet);

        expectElementStyle('case10-blocked', { display: 'none' });

        return new Promise<void>((resolve, reject) => {
            rAF(() => {
                const node = document.getElementById('case10-blocked');
                if (!node) {
                    reject(new Error('No target test element selected for case10.'));
                    return;
                }
                node.style.cssText = 'display: block!important;';
                rAF(() => {
                    node.style.cssText = 'display: block!important; visibility: visible!important;';
                    rAF(() => {
                        try {
                            expectElementStyle('case10-blocked', { display: 'none' });
                            resolve();
                        } catch (error) {
                            reject(error);
                        }
                    }, 100);
                }, 100);
            }, 100);
        });
    });

    it('protection from recurring style fixes', () => {
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

        return new Promise<void>((resolve, reject) => {
            setTimeout(() => {
                try {
                    tamperObserver.disconnect();
                    expect(styleTamperCount < 60).toBeTruthy();
                    expect(styleTamperCount >= 50).toBeTruthy();
                    expect(testNode.hasAttribute('style')).toBeFalsy();
                    resolve();
                } catch (error) {
                    reject(error);
                }
            }, 1000);
        });
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

        // These selectors contain pseudo-classes unknown to both ExtendedCss
        // and the CSS spec (e.g. :invalidpseudo, :others, :watch-attr).
        // They should be invalid, but @asamuzakjp/dom-selector (used by
        // jsdom 29) silently accepts unknown pseudo-classes instead of
        // throwing, so ExtendedCss.validate() cannot detect them as invalid.
        // In real browsers querySelectorAll would throw on these.
        const jsdomFalsePositives = [
            '#banner:invalidpseudo(div)',
            '.text-left:has-text(/share/):others()',
            '.modals.dimmer > .gdpr.visible:upward(1):watch-attr([class])',
        ];
        // TODO: unskip when jsdom's selector engine throws on unknown pseudo-classes
        test.skip.each(jsdomFalsePositives)('%s', (selector) => {
            expect(ExtendedCss.validate(selector).ok).toBeFalsy();
        });

        const invalidSelectors = [
            '#13_3623',
            '.4wNET',
            'A.jumpWrap,DIV.left-game,DIV.right-game,DIV.games-op-wrap,DIV.right-op-wrap mb10,#j-top^Box',
            '#__^HFa,DIV.box top_box',
            'DIV.panel_bottom,LI.tl_shadow tl_shadow_new ^',
            'div[id^="AS_O_LHS_"] > div:nth-child(15 + n)',
            'div[class*=" "]:has(> div[class] > a[href="/terms"]:not([rel])',
            'table[style*=border: 0px"]',
            // `*:not(<arg>)` with extended selector `arg`
            'html:not(:has(span))',
        ];
        test.each(invalidSelectors)('%s', (selector) => {
            expect(ExtendedCss.validate(selector).ok).toBeFalsy();
        });
    });

    it('style remove pseudo-property', () => {
        document.body.innerHTML = '<div id="case-remove-property"></div>';
        const styleSheet = '#case-remove-property { remove: true }';
        applyExtCssStyleSheet(styleSheet);

        let targetElement = document.querySelector('#case-remove-property');
        // no such element after rule applying
        expect(targetElement).toBeNull();

        const nodeHtml = '<div id="case-remove-property"></div>';
        return new Promise<void>((resolve, reject) => {
            rAF(() => {
                document.body.insertAdjacentHTML('beforeend', nodeHtml);
                rAF(() => {
                    try {
                        targetElement = document.querySelector('#case-remove-property');
                        // element removed again
                        expect(targetElement).toBeNull();
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                }, 100);
            }, 100);
        });
    });

    it('removes attributes with :remove-attr()', () => {
        document.body.innerHTML = `
            <a id="case-remove-attr" href="https://example.org" onclick="alert(1)"></a>
        `;
        const styleSheet = '#case-remove-attr:remove-attr(onclick)';
        applyExtCssStyleSheet(styleSheet);

        const element = document.getElementById('case-remove-attr');
        expect(element?.hasAttribute('onclick')).toBe(false);
        expect(element?.hasAttribute('href')).toBe(true);
    });

    it('removes attributes by regexp with :remove-attr()', () => {
        document.body.innerHTML = `
            <div id="case-remove-attr-regexp" data-ad="1" data-foo="2" title="t"></div>
        `;
        const styleSheet = '#case-remove-attr-regexp:remove-attr(/^data-/)';
        applyExtCssStyleSheet(styleSheet);

        const element = document.getElementById('case-remove-attr-regexp');
        expect(element?.hasAttribute('data-ad')).toBe(false);
        expect(element?.hasAttribute('data-foo')).toBe(false);
        expect(element?.hasAttribute('title')).toBe(true);
    });

    it('removes classes with :remove-class()', () => {
        document.body.innerHTML = `
            <div id="case-remove-class" class="banner ads sponsored"></div>
        `;
        const styleSheet = '#case-remove-class:remove-class(ads)';
        applyExtCssStyleSheet(styleSheet);

        const element = document.getElementById('case-remove-class');
        expect(element?.classList.contains('ads')).toBe(false);
        expect(element?.classList.contains('banner')).toBe(true);
        expect(element?.classList.contains('sponsored')).toBe(true);
    });

    it("keeps 'content' style in rule data for :remove-attr()", () => {
        document.body.innerHTML = `
            <div id="case-remove-attr-content" onclick="alert(1)"></div>
        `;
        const cssRules = [
            // eslint-disable-next-line max-len
            "#case-remove-attr-content:remove-attr(onclick) { content: 'adguardTestContentRuleText' !important }",
        ];
        const extendedCss = new ExtendedCss({ cssRules });
        extendedCss.apply();

        const affectedElements = extendedCss.getAffectedElements();
        expect(affectedElements.length).toBe(1);
        // action declarations are stored in `actionStyles` only,
        // while `content` is kept in `style` for CssHitsCounter
        expect(affectedElements[0]?.rules[0]?.actionStyles).toEqual([
            { property: 'remove-attr', value: 'onclick' },
        ]);
        expect(affectedElements[0]?.rules[0]?.style).toEqual({
            content: "'adguardTestContentRuleText' !important",
        });

        const element = document.getElementById('case-remove-attr-content');
        expect(element?.hasAttribute('onclick')).toBe(false);
        // 'content' should not be applied to the element
        expect(element?.style.getPropertyValue('content')).toBe('');
    });

    it("protects and reverts regular 'content' styles", () => {
        document.body.innerHTML = '<div id="case-content-style"></div>';
        const extendedCss = new ExtendedCss({
            cssRules: ['#case-content-style { content: "ad" !important; }'],
        });
        extendedCss.apply();

        // regular 'content' styles should be applied and protected
        expectElementStyle('case-content-style', { content: '"ad"' });
        expect(extendedCss.getAffectedElements()[0]?.protectionObserver).not.toBeNull();

        extendedCss.dispose();
        expectElementStyle('case-content-style', { content: '' });
    });

    it("does not apply action rule 'content' style on style protection", () => {
        document.body.innerHTML = `
            <div id="case-remove-attr-content-protection" onclick="alert(1)"></div>
        `;
        const actionRule = '#case-remove-attr-content-protection:remove-attr(onclick)'
            + " { content: 'plain-content' !important }";
        // a regular style rule makes the element style-protected
        const cssRules = [
            actionRule,
            '#case-remove-attr-content-protection { color: red; }',
        ];
        const extendedCss = new ExtendedCss({ cssRules });
        extendedCss.apply();

        const element = document.getElementById('case-remove-attr-content-protection');
        expect(element).not.toBeNull();
        if (!element) {
            return;
        }
        expect(element.hasAttribute('onclick')).toBe(false);

        const setPropertySpy = vi.spyOn(element.style, 'setProperty');

        return new Promise<void>((resolve, reject) => {
            rAF(() => {
                element.setAttribute('style', 'display: block');
                rAF(() => {
                    try {
                        // the protection observer should not apply 'content' of the action rule
                        const contentCalls = setPropertySpy.mock.calls
                            .filter(([prop]) => prop === 'content');
                        expect(contentCalls).toHaveLength(0);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                    setPropertySpy.mockRestore();
                }, 100);
            }, 100);
        });
    });

    it('removes re-added attributes after DOM mutations', () => {
        document.body.innerHTML = `
            <div id="case-remove-attr-mutation" onclick="alert(1)"></div>
        `;
        const styleSheet = '#case-remove-attr-mutation:remove-attr(onclick)';
        applyExtCssStyleSheet(styleSheet);

        const element = document.getElementById('case-remove-attr-mutation');
        expect(element?.hasAttribute('onclick')).toBe(false);

        element?.setAttribute('onclick', 'alert(2)');

        return new Promise<void>((resolve, reject) => {
            rAF(() => {
                try {
                    expect(element?.hasAttribute('onclick')).toBe(false);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            }, 100);
        });
    });

    it('removes attributes with case-insensitive regexp :remove-attr()', () => {
        document.body.innerHTML = `
            <div id="case-remove-attr-flags" data-ad="1"></div>
        `;
        const styleSheet = '#case-remove-attr-flags:remove-attr(/^DATA-/i)';
        applyExtCssStyleSheet(styleSheet);

        const element = document.getElementById('case-remove-attr-flags');
        expect(element?.hasAttribute('data-ad')).toBe(false);
    });

    it('removes re-added classes after DOM mutations', () => {
        document.body.innerHTML = `
            <div id="case-remove-class-mutation" class="banner ads"></div>
        `;
        const styleSheet = '#case-remove-class-mutation:remove-class(ads)';
        applyExtCssStyleSheet(styleSheet);

        const element = document.getElementById('case-remove-class-mutation');
        expect(element?.classList.contains('ads')).toBe(false);

        element?.classList.add('ads');

        return new Promise<void>((resolve, reject) => {
            rAF(() => {
                try {
                    expect(element?.classList.contains('ads')).toBe(false);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            }, 100);
        });
    });

    it('applies all action rules for the same target selector', () => {
        document.body.innerHTML = `
            <a id="case-multiple-actions" href="https://example.org" onclick="alert(1)"></a>
            <div id="case-multiple-class-actions" class="ads sponsored banner"></div>
        `;
        const cssRules = [
            '#case-multiple-actions:remove-attr(href)',
            '#case-multiple-actions:remove-attr(onclick)',
            '#case-multiple-class-actions:remove-class(ads)',
            '#case-multiple-class-actions:remove-class(sponsored)',
        ];
        const extendedCss = new ExtendedCss({ cssRules });
        extendedCss.apply();

        const element = document.getElementById('case-multiple-actions');
        expect(element?.hasAttribute('href')).toBe(false);
        expect(element?.hasAttribute('onclick')).toBe(false);

        const classElement = document.getElementById('case-multiple-class-actions');
        expect(classElement?.classList.contains('ads')).toBe(false);
        expect(classElement?.classList.contains('sponsored')).toBe(false);
        expect(classElement?.classList.contains('banner')).toBe(true);

        // all action arguments should be preserved for the same target selector
        const rules = extendedCss.getAffectedElements()[0]?.rules;
        expect(rules?.[0]?.actionStyles).toEqual([
            { property: 'remove-attr', value: 'href' },
            { property: 'remove-attr', value: 'onclick' },
        ]);
    });

    it('does not re-apply action rules to elements that no longer match', () => {
        document.body.innerHTML = `
            <div id="case-stale-action" class="eligible" onclick="alert(1)"></div>
        `;
        const cssRules = [
            '.eligible:remove-attr(onclick)',
            '#case-stale-action { color: red; }',
        ];
        const extendedCss = new ExtendedCss({ cssRules });
        extendedCss.apply();

        const element = document.getElementById('case-stale-action');
        expect(element?.hasAttribute('onclick')).toBe(false);
        expect(extendedCss.getAffectedElements()[0]?.rules.length).toBe(2);

        // the element no longer matches the action selector
        // but still matches the ordinary rule
        element?.classList.remove('eligible');
        element?.setAttribute('onclick', 'alert(2)');

        return new Promise<void>((resolve, reject) => {
            rAF(() => {
                rAF(() => {
                    try {
                        expect(element?.hasAttribute('onclick')).toBe(true);
                        expect(extendedCss.getAffectedElements()[0]?.rules.length).toBe(1);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                }, 100);
            }, 100);
        });
    });

    it('applies regular styles of other rules with the same target selector', () => {
        document.body.innerHTML = '<div id="case-action-with-styles" class="ads"></div>';
        const cssRules = [
            '#case-action-with-styles:remove-class(ads)',
            '#case-action-with-styles { display: none !important; }',
        ];
        applyExtCssRules(cssRules);

        const element = document.getElementById('case-action-with-styles');
        expect(element?.classList.contains('ads')).toBe(false);
        expectElementStyle('case-action-with-styles', { display: 'none' });
    });

    it("applies regular 'content' style of another rule with the same target selector", () => {
        document.body.innerHTML = '<div id="case-action-with-content" title="ad"></div>';
        const cssRules = [
            '#case-action-with-content:remove-attr(title)',
            '#case-action-with-content { content: "hello" !important; }',
        ];
        const extendedCss = new ExtendedCss({ cssRules });
        extendedCss.apply();

        const element = document.getElementById('case-action-with-content');
        expect(element?.hasAttribute('title')).toBe(false);
        // 'content' declared by a regular rule should be applied and protected
        expectElementStyle('case-action-with-content', { content: '"hello"' });
        expect(extendedCss.getAffectedElements()[0]?.protectionObserver).not.toBeNull();

        extendedCss.dispose();
        expectElementStyle('case-action-with-content', { content: '' });
    });

    it('does not protect or revert action-only elements', () => {
        document.body.innerHTML = `
            <div id="case-action-only" style="display: block" onclick="alert(1)"></div>
        `;
        const extendedCss = new ExtendedCss({ cssRules: ['#case-action-only:remove-attr(onclick)'] });
        extendedCss.apply();

        const element = document.getElementById('case-action-only');
        expect(element?.hasAttribute('onclick')).toBe(false);
        // action-only elements should not be style-protected
        expect(extendedCss.getAffectedElements()[0]?.protectionObserver).toBeNull();
        expect(element?.getAttribute('style')).toBe('display: block');

        extendedCss.dispose();
        // dispose should not clear styles of action-only elements
        expect(element?.getAttribute('style')).toBe('display: block');
    });

    it('does not revert styles of self-unmatching action rules', () => {
        document.body.innerHTML = `
            <div id="case-self-unmatching" style="display: block" onclick="alert(1)"></div>
        `;
        const extendedCss = new ExtendedCss({ cssRules: ['[onclick]:remove-attr(onclick)'] });
        extendedCss.apply();

        const element = document.getElementById('case-self-unmatching');
        expect(element?.hasAttribute('onclick')).toBe(false);
        expect(element?.getAttribute('style')).toBe('display: block');

        return new Promise<void>((resolve, reject) => {
            rAF(() => {
                rAF(() => {
                    try {
                        // the rule no longer matches, but the page inline style should stay
                        expect(element?.getAttribute('style')).toBe('display: block');
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                }, 100);
            }, 100);
        });
    });

    it('applies regular styles to action-only elements that start matching them later', () => {
        document.body.innerHTML = `
            <div id="case-action-then-style" data-x="1"></div>
        `;
        const cssRules = [
            'div:remove-attr(data-x)',
            '.ad { display: none !important; }',
        ];
        applyExtCssRules(cssRules);

        const element = document.getElementById('case-action-then-style');
        expect(element?.hasAttribute('data-x')).toBe(false);
        expectElementStyle('case-action-then-style', { display: '' });

        element?.classList.add('ad');

        return new Promise<void>((resolve, reject) => {
            rAF(() => {
                try {
                    // the action-only element should receive regular styles of the new rule
                    expectElementStyle('case-action-then-style', { display: 'none' });
                    resolve();
                } catch (error) {
                    reject(error);
                }
            }, 100);
        });
    });

    it('reverts styles of elements that stop matching style rules but still match action rules', () => {
        document.body.innerHTML = `
            <div id="case-sticky-styles" class="keep ad" onclick="alert(1)"></div>
        `;
        const cssRules = [
            '.keep:remove-attr(onclick)',
            '.ad { display: none !important; }',
        ];
        const extendedCss = new ExtendedCss({ cssRules });
        extendedCss.apply();

        expectElementStyle('case-sticky-styles', { display: 'none' });

        // the style rule stops matching, but the action rule keeps matching
        document.getElementById('case-sticky-styles')?.classList.remove('ad');

        return new Promise<void>((resolve, reject) => {
            rAF(() => {
                rAF(() => {
                    try {
                        const element = document.getElementById('case-sticky-styles');
                        // applied styles should stay protected even if their rule no longer matches
                        expect(element?.style.getPropertyValue('display')).toBe('none');
                        extendedCss.dispose();
                        // and should be reverted on dispose
                        expect(element?.style.getPropertyValue('display')).toBe('');
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                }, 100);
            }, 100);
        });
    });

    it('applies rules that match after an element removal in the same pass', () => {
        // no whitespace text nodes inside the parent, otherwise ':empty' does not match
        document.body.innerHTML = '<div id="case-empty-parent"><div id="case-empty-child"></div></div>';
        const cssRules = [
            '#case-empty-child:remove()',
            '#case-empty-parent:empty { display: none !important; }',
        ];
        applyExtCssRules(cssRules);

        expect(document.getElementById('case-empty-child')).toBeNull();
        // the parent becomes ':empty' after the child removal
        // and should be styled within the same apply() call
        expectElementStyle('case-empty-parent', { display: 'none' });
    });

    it('removes re-added attributes matching regexp :remove-attr() after mutations', () => {
        document.body.innerHTML = `
            <div id="case-regexp-mutation" onclick="alert(1)"></div>
        `;
        applyExtCssStyleSheet('#case-regexp-mutation:remove-attr(/^on/)');

        const element = document.getElementById('case-regexp-mutation');
        expect(element?.hasAttribute('onclick')).toBe(false);

        element?.setAttribute('onclick', 'alert(2)');

        return new Promise<void>((resolve, reject) => {
            rAF(() => {
                try {
                    expect(element?.hasAttribute('onclick')).toBe(false);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            }, 100);
        });
    });

    it('removes attributes when a selector attribute with a regexp argument is added', () => {
        document.body.innerHTML = `
            <div id="case-selector-attribute-regexp" onclick="alert(1)"></div>
        `;
        const extendedCss = new ExtendedCss({ cssRules: ['[data-enabled]:remove-attr(/^on/)'] });
        extendedCss.apply();

        const element = document.getElementById('case-selector-attribute-regexp');
        // the rule does not match yet
        expect(element?.hasAttribute('onclick')).toBe(true);

        element?.setAttribute('data-enabled', '');

        return new Promise<void>((resolve, reject) => {
            rAF(() => {
                try {
                    // the selector attribute change should trigger a pass
                    // and the element should start matching the rule
                    expect(element?.hasAttribute('onclick')).toBe(false);
                    resolve();
                } catch (error) {
                    reject(error);
                } finally {
                    extendedCss.dispose();
                }
            }, 100);
        });
    });

    it('removes attributes when a selector attribute with a plain argument is added', () => {
        document.body.innerHTML = `
            <div id="case-selector-attribute-plain" onclick="alert(1)"></div>
        `;
        const extendedCss = new ExtendedCss({ cssRules: ['[data-enabled]:remove-attr(onclick)'] });
        extendedCss.apply();

        const element = document.getElementById('case-selector-attribute-plain');
        // the rule does not match yet
        expect(element?.hasAttribute('onclick')).toBe(true);

        element?.setAttribute('data-enabled', '');

        return new Promise<void>((resolve, reject) => {
            rAF(() => {
                try {
                    // the selector attribute change should trigger a pass
                    // and the element should start matching the rule
                    expect(element?.hasAttribute('onclick')).toBe(false);
                    resolve();
                } catch (error) {
                    reject(error);
                } finally {
                    extendedCss.dispose();
                }
            }, 100);
        });
    });

    it('keeps the native attribute filter when there is no regexp action argument', () => {
        const observeSpy = vi.spyOn(MutationObserver.prototype, 'observe');

        const extendedCss = new ExtendedCss({
            cssRules: ['#case-native-filter[data-enabled]:remove-attr(onclick)'],
        });
        extendedCss.apply();

        const documentObserveCall = observeSpy.mock.calls.find(([target]) => target === document);
        expect(documentObserveCall).toBeDefined();
        expect(documentObserveCall?.[1]?.attributeFilter).toEqual(
            // selector attributes and plain action arguments are observed natively
            expect.arrayContaining(['id', 'class', 'data-enabled', 'onclick']),
        );

        extendedCss.dispose();
        observeSpy.mockRestore();
    });

    it('observes all attributes when there is a regexp action argument', () => {
        const observeSpy = vi.spyOn(MutationObserver.prototype, 'observe');

        const extendedCss = new ExtendedCss({
            cssRules: ['#case-native-filter:remove-attr(/^on/)'],
        });
        extendedCss.apply();

        const documentObserveCall = observeSpy.mock.calls.find(([target]) => target === document);
        expect(documentObserveCall).toBeDefined();
        // any attribute can match a regexp argument, so there is no native filter
        expect(documentObserveCall?.[1]?.attributeFilter).toBeUndefined();

        extendedCss.dispose();
        observeSpy.mockRestore();
    });

    it('does not observe selector attributes of regular rules', () => {
        const observeSpy = vi.spyOn(MutationObserver.prototype, 'observe');

        const extendedCss = new ExtendedCss({ cssRules: ['div[data-x] { color: red }'] });
        extendedCss.apply();

        const documentObserveCall = observeSpy.mock.calls.find(([target]) => target === document);
        expect(documentObserveCall).toBeDefined();
        // selector attributes of regular rules should not widen the native filter
        expect(documentObserveCall?.[1]?.attributeFilter).toContain('id');
        expect(documentObserveCall?.[1]?.attributeFilter).toContain('class');
        expect(documentObserveCall?.[1]?.attributeFilter).not.toContain('data-x');

        extendedCss.dispose();
        observeSpy.mockRestore();
    });

    it('observes attributes of :matches-attr() and :xpath() action rule selectors', () => {
        const observeSpy = vi.spyOn(MutationObserver.prototype, 'observe');

        const extendedCss = new ExtendedCss({
            cssRules: [
                'div:matches-attr(data-x):remove-attr(onclick)',
                ':xpath(//div[@data-on]):remove-attr(onclick)',
                '[DATA-ENABLED]:remove-attr(onclick)',
            ],
        });
        extendedCss.apply();

        const documentObserveCall = observeSpy.mock.calls.find(([target]) => target === document);
        expect(documentObserveCall).toBeDefined();
        expect(documentObserveCall?.[1]?.attributeFilter).toEqual(
            // selector attributes are observed in lower case
            expect.arrayContaining(['id', 'class', 'data-x', 'data-on', 'data-enabled', 'onclick']),
        );

        extendedCss.dispose();
        observeSpy.mockRestore();
    });

    it('observes all attributes when a :matches-attr() name is a regexp', () => {
        const observeSpy = vi.spyOn(MutationObserver.prototype, 'observe');

        const extendedCss = new ExtendedCss({
            cssRules: ['div:matches-attr(/^data-(x|y)$/):remove-attr(onclick)'],
        });
        extendedCss.apply();

        const documentObserveCall = observeSpy.mock.calls.find(([target]) => target === document);
        expect(documentObserveCall).toBeDefined();
        // any attribute can match a regexp name, so there is no native filter
        expect(documentObserveCall?.[1]?.attributeFilter).toBeUndefined();

        extendedCss.dispose();
        observeSpy.mockRestore();
    });

    it('removes attributes when a :matches-attr() wildcard name matches', () => {
        const observeSpy = vi.spyOn(MutationObserver.prototype, 'observe');

        document.body.innerHTML = `
            <div id="case-matches-attr-wildcard" onclick="alert(1)"></div>
        `;
        const extendedCss = new ExtendedCss({
            cssRules: ['div:matches-attr(data-*):remove-attr(onclick)'],
        });
        extendedCss.apply();

        const documentObserveCall = observeSpy.mock.calls.find(([target]) => target === document);
        expect(documentObserveCall).toBeDefined();
        // any attribute can match a wildcard name, so there is no native filter
        expect(documentObserveCall?.[1]?.attributeFilter).toBeUndefined();

        const element = document.getElementById('case-matches-attr-wildcard');
        // the rule does not match yet
        expect(element?.hasAttribute('onclick')).toBe(true);

        // the wildcard is not anchored, so `xdata-y` matches `data-*`
        // both at selection and relevance check time
        element?.setAttribute('xdata-y', '');

        return new Promise<void>((resolve, reject) => {
            rAF(() => {
                try {
                    // the wildcard name matcher should make the mutation relevant
                    expect(element?.hasAttribute('onclick')).toBe(false);
                    resolve();
                } catch (error) {
                    reject(error);
                } finally {
                    extendedCss.dispose();
                    observeSpy.mockRestore();
                }
            }, 100);
        });
    });

    it('removes attributes when a selector attribute in a different case is added', () => {
        document.body.innerHTML = `
            <div id="case-selector-attribute-case" onclick="alert(1)"></div>
        `;
        const extendedCss = new ExtendedCss({ cssRules: ['[DATA-ENABLED]:remove-attr(onclick)'] });
        extendedCss.apply();

        const element = document.getElementById('case-selector-attribute-case');
        // the rule does not match yet
        expect(element?.hasAttribute('onclick')).toBe(true);

        element?.setAttribute('data-enabled', '');

        return new Promise<void>((resolve, reject) => {
            rAF(() => {
                try {
                    // the selector attribute change should trigger a pass
                    expect(element?.hasAttribute('onclick')).toBe(false);
                    resolve();
                } catch (error) {
                    reject(error);
                } finally {
                    extendedCss.dispose();
                }
            }, 100);
        });
    });

    it('removes attributes when an :xpath() attribute is added', () => {
        document.body.innerHTML = `
            <div id="case-xpath-attribute" onclick="alert(1)"></div>
        `;
        const extendedCss = new ExtendedCss({
            cssRules: [':xpath(//div[@data-on]):remove-attr(onclick)'],
        });
        extendedCss.apply();

        const element = document.getElementById('case-xpath-attribute');
        // the rule does not match yet
        expect(element?.hasAttribute('onclick')).toBe(true);

        element?.setAttribute('data-on', '');

        return new Promise<void>((resolve, reject) => {
            rAF(() => {
                try {
                    // the :xpath() attribute change should trigger a pass
                    expect(element?.hasAttribute('onclick')).toBe(false);
                    resolve();
                } catch (error) {
                    reject(error);
                } finally {
                    extendedCss.dispose();
                }
            }, 100);
        });
    });

    it('observes attributes of action arguments edited by beforeStyleApplied', () => {
        document.body.innerHTML = `
            <div id="case-callback-observe" href="link" title="ad"></div>
        `;
        const extendedCss = new ExtendedCss({
            cssRules: ['#case-callback-observe:remove-attr(href)'],
            beforeStyleApplied: (el) => {
                // replace the action argument in returned rule copies
                return {
                    ...el,
                    rules: el.rules.map((rule) => ({
                        ...rule,
                        actionStyles: [{ property: 'remove-attr', value: 'title' }],
                    })),
                };
            },
        });
        extendedCss.apply();

        const element = document.getElementById('case-callback-observe');
        // the edited action should be applied
        expect(element?.hasAttribute('href')).toBe(true);
        expect(element?.hasAttribute('title')).toBe(false);

        // re-adding `title` should trigger a pass and remove it again
        element?.setAttribute('title', 'ad again');

        return new Promise<void>((resolve, reject) => {
            rAF(() => {
                try {
                    // the observer should watch the attribute from the edited argument
                    expect(element?.hasAttribute('title')).toBe(false);
                    resolve();
                } catch (error) {
                    reject(error);
                } finally {
                    extendedCss.dispose();
                }
            }, 100);
        });
    });

    it('limits action removals for self-unmatching rules', () => {
        document.body.innerHTML = '<div id="case-action-cap" class="ad"></div>';
        const extendedCss = new ExtendedCss({ cssRules: ['.ad:remove-class(ad)'] });
        extendedCss.apply();

        const element = document.getElementById('case-action-cap');
        expect(element?.classList.contains('ad')).toBe(false);

        const loggerErrorSpy = vi.spyOn(logger, 'error');

        // re-add the class more times than the removal cap allows;
        // the element stops matching the rule after each removal,
        // but the removal counter should survive it
        for (let i = 0; i < 60; i += 1) {
            element?.classList.add('ad');
            extendedCss.apply();
        }

        try {
            // the removal cap stops the action, so the class stays
            expect(element?.classList.contains('ad')).toBe(true);

            const capMessages = loggerErrorSpy.mock.calls
                .map(([message]) => String(message))
                .filter((message) => message.includes('infinite loop protection for action'));
            expect(capMessages).toHaveLength(1);
            expect(capMessages[0]).toContain('.ad');
        } finally {
            loggerErrorSpy.mockRestore();
            extendedCss.dispose();
        }
    });

    it('resets the action removals cap after dispose', () => {
        document.body.innerHTML = '<div id="case-dispose-cap" class="ad"></div>';
        const extendedCss = new ExtendedCss({ cssRules: ['.ad:remove-class(ad)'] });
        extendedCss.apply();

        const element = document.getElementById('case-dispose-cap');
        expect(element?.classList.contains('ad')).toBe(false);

        const loggerErrorSpy = vi.spyOn(logger, 'error');
        try {
            // re-add the class more times than the removal cap allows
            for (let i = 0; i < 60; i += 1) {
                element?.classList.add('ad');
                extendedCss.apply();
            }
            expect(element?.classList.contains('ad')).toBe(true);

            // the statistic is reset by dispose, so the action works again
            extendedCss.dispose();
            extendedCss.apply();
            expect(element?.classList.contains('ad')).toBe(false);
        } finally {
            loggerErrorSpy.mockRestore();
            extendedCss.dispose();
        }
    });

    it('does not loop when :remove-attr(style) conflicts with style protection', () => {
        document.body.innerHTML = '<div id="case-remove-style-attr"></div>';
        const cssRules = [
            '#case-remove-style-attr { display: none !important; }',
            '#case-remove-style-attr:remove-attr(style)',
        ];
        const extendedCss = new ExtendedCss({ cssRules });
        extendedCss.apply();

        const element = document.getElementById('case-remove-style-attr');
        expectElementStyle('case-remove-style-attr', { display: 'none' });

        return new Promise<void>((resolve, reject) => {
            rAF(() => {
                // a style mutation is relevant because of the `style` action argument
                element?.setAttribute('style', 'display: block');
                rAF(() => {
                    try {
                        // protected styles should be restored without an endless loop
                        expectElementStyle('case-remove-style-attr', { display: 'none' });
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                }, 100);
            }, 100);
        });
    });

    it("does not remove the 'style' attribute of elements with regular styles on the first pass", () => {
        document.body.innerHTML = '<div id="case-first-pass-style"></div>';
        // the regular style rule should be applied before the action rule;
        // the selectors are different, so the rules are applied separately
        applyExtCssRules([
            '#case-first-pass-style { display: none !important; }',
            'div#case-first-pass-style:remove-attr(style)',
        ]);

        // the style attribute should be kept, so the element stays hidden
        expectElementStyle('case-first-pass-style', { display: 'none' });
    });

    it('applies regular styles of rules matching later in the same pass', () => {
        document.body.innerHTML = '<div id="case-style-dependent"></div>';
        const extendedCss = new ExtendedCss({
            cssRules: [
                '#case-style-dependent { display: none !important; }',
                '#case-style-dependent:matches-css(display: none) { color: red !important; }',
            ],
        });
        extendedCss.apply();

        // the second rule depends on the style applied by the first one
        // and should match during the same pass
        expectElementStyle('case-style-dependent', { display: 'none', color: 'red' });

        extendedCss.dispose();
    });

    it('applies styles of rules which start matching on later passes', () => {
        document.body.innerHTML = '<div id="case-later-rule"></div>';
        const extendedCss = new ExtendedCss({
            cssRules: [
                '#case-later-rule { display: none !important; }',
                '#case-later-rule.active { color: red !important; }',
            ],
        });
        extendedCss.apply();
        expectElementStyle('case-later-rule', { display: 'none' });

        // the element starts matching the second rule
        document.getElementById('case-later-rule')?.classList.add('active');
        extendedCss.apply();
        expectElementStyle('case-later-rule', { display: 'none', color: 'red' });

        extendedCss.dispose();
    });

    it('removes attributes and classes from SVG elements', () => {
        document.body.innerHTML = `
            <svg id="case-svg" data-ad="1" class="ads banner"></svg>
        `;
        const cssRules = [
            '#case-svg:remove-attr(data-ad)',
            '#case-svg:remove-class(ads)',
        ];
        applyExtCssRules(cssRules);

        const element = document.getElementById('case-svg');
        expect(element?.hasAttribute('data-ad')).toBe(false);
        expect(element?.classList.contains('ads')).toBe(false);
        expect(element?.classList.contains('banner')).toBe(true);
    });

    it('ignores action properties in style blocks', () => {
        document.body.innerHTML = '<div id="case-block-action" onclick="alert(1)"></div>';
        const extendedCss = new ExtendedCss({ cssRules: ['#case-block-action { remove-attr: onclick }'] });
        extendedCss.apply();

        const element = document.getElementById('case-block-action');
        expect(element?.hasAttribute('onclick')).toBe(true);
        expect(extendedCss.getAffectedElements().length).toBe(0);
    });

    it('ignores style block styles of action rules except content', () => {
        document.body.innerHTML = '<div id="case-block-action-rule" onclick="alert(1)"></div>';
        const cssRules = [
            '#case-block-action-rule:remove-attr(onclick) { remove-class: ads; display: none; }',
        ];
        applyExtCssRules(cssRules);

        const element = document.getElementById('case-block-action-rule');
        expect(element?.hasAttribute('onclick')).toBe(false);
        // styles declared together with an action pseudo-class are ignored
        expectElementStyle('case-block-action-rule', { display: '' });
    });

    it('ignores the remove pseudo-property in action rules', () => {
        document.body.innerHTML = '<div id="case-block-remove-action" title="ad"></div>';
        applyExtCssRules([
            '#case-block-remove-action:remove-attr(title) { remove: true; }',
        ]);

        const element = document.getElementById('case-block-remove-action');
        // the attribute is removed, but the element stays in DOM
        expect(element).not.toBeNull();
        expect(element?.hasAttribute('title')).toBe(false);
    });

    it('applies action rules once per rule per pass', () => {
        document.body.innerHTML = `
            <div id="case-action-count" class="a b c" title="t" data-x="1" data-y="2"></div>
        `;
        const cssRules = [
            '.a:remove-attr(title)',
            '.b:remove-attr(data-x)',
            '.c:remove-attr(data-y)',
        ];
        const extendedCss = new ExtendedCss({ cssRules });
        const getAttributeNamesSpy = vi.spyOn(Element.prototype, 'getAttributeNames');

        // the first apply runs a second pass because the removals can reveal new matches
        extendedCss.apply();
        expect(getAttributeNamesSpy.mock.calls.length).toBe(6);

        // no removals happen anymore, so each apply runs a single pass
        extendedCss.apply();
        expect(getAttributeNamesSpy.mock.calls.length).toBe(9);

        getAttributeNamesSpy.mockRestore();
    });

    it('skips invalid action rules without aborting application', () => {
        document.body.innerHTML = `
            <div id="case-invalid-action" onclick="alert(1)"></div>
        `;
        const cssRules = [
            '#case-invalid-action:remove-attr(/+/)',
            '#case-invalid-action:upward(:remove-attr(x))',
            '#case-invalid-action:remove-attr(onclick)',
        ];
        const extendedCss = new ExtendedCss({ cssRules });

        expect(() => extendedCss.apply()).not.toThrow();

        const element = document.getElementById('case-invalid-action');
        expect(element?.hasAttribute('onclick')).toBe(false);
    });

    it('validates action pseudo-classes', () => {
        expect(ExtendedCss.validate('div:remove()').ok).toBeTruthy();
        expect(ExtendedCss.validate('div:remove-attr(href)').ok).toBeTruthy();
        expect(ExtendedCss.validate('div:remove-class(ads)').ok).toBeTruthy();
        expect(ExtendedCss.validate('div:remove-attr(/^data-/i)').ok).toBeTruthy();
        expect(ExtendedCss.validate('div:remove-attr(/+/)').ok).toBeFalsy();
        expect(ExtendedCss.validate('div:has(:remove-attr(href))').ok).toBeFalsy();
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

    it('protect only rule style', () => {
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

        return new Promise<void>((resolve, reject) => {
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
                            resolve();
                        } catch (error) {
                            reject(error);
                        }
                    }, 100);
                }, 100);
            }, 100);
        });
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
        applyExtCssStyleSheet(styleSheet);

        return new Promise<void>((resolve, reject) => {
            setTimeout(() => {
                try {
                    observer.disconnect();
                    // The throttle caps re-application to roughly one cycle
                    // per THROTTLE_DELAY_MS (150ms), so over the 9s window the
                    // count is bounded (~60 max); an unthrottled protector
                    // would far exceed that. The lower bound confirms that
                    // protection keeps re-applying across many cycles. It is
                    // intentionally below the theoretical ~60 max to tolerate
                    // the timer drift of the shared CI build VM, where each
                    // throttled cycle can run slower than the 150ms floor.
                    expect(elementAddCounter).toBeLessThan(60);
                    expect(elementAddCounter).toBeGreaterThanOrEqual(30);
                    expect(protectorNode.querySelector(`#${id}`)).toBeDefined();
                    resolve();
                } catch (error) {
                    reject(error);
                }
            }, 9000);
        });
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
        applyExtCssStyleSheet(styleSheet);

        expectElementStyle('case17-inner', { 'padding-bottom': '16px', display: 'none' });

        return new Promise<void>((resolve, reject) => {
            rAF(() => {
                try {
                    expectElementStyle('case17-inner', { 'padding-bottom': '16px', display: 'none' });
                    resolve();
                } catch (error) {
                    reject(error);
                }
            }, 200);
        });
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

    it('debugging - true', () => {
        expect.assertions(3);
        document.body.innerHTML = '<div id="case13"></div>';
        const styleSheet = `
            #case13:not(with-debug) { display:none; debug: true }
            #case13:not(without-debug) { display:none; }
        `;
        const extendedCss = new ExtendedCss({ styleSheet });

        return new Promise<void>((resolve) => {
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
                    resolve();
                }
                return loggerInfo.apply(this, args);
            };

            extendedCss.apply();
        });
    });

    it('debugging - global', () => {
        expect.assertions(5);
        document.body.innerHTML = '<div id="case14"></div>';
        const styleSheet = `
            #case14:not(without-debug-before-global) { display:none; }
            #case14:not(with-global-debug) { display:none; debug: global }
            #case14:not(without-debug-after-global) { display:none; }
        `;
        const extendedCss = new ExtendedCss({ styleSheet });

        return new Promise<void>((resolve) => {
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
                    resolve();
                }
                return loggerInfo.apply(this, args);
            };

            extendedCss.apply();
        });
    });

    it('debugging - only debug property for logging', () => {
        expect.assertions(3);
        document.body.innerHTML = '<div id="case13"></div>';
        const styleSheet = `
            #case13:not(with-debug) { debug: true }
        `;
        const extendedCss = new ExtendedCss({ styleSheet });

        return new Promise<void>((resolve) => {
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
                    resolve();
                }
                return loggerInfo.apply(this, args);
            };

            extendedCss.apply();
        });
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

    it('allows beforeStyleApplied to edit actionStyles of returned rule copies', () => {
        document.body.innerHTML = `
            <a id="case-callback-action" href="link" title="ad"></a>
        `;
        const extendedCss = new ExtendedCss({
            cssRules: ['#case-callback-action:remove-attr(href)'],
            beforeStyleApplied: (el) => {
                // replace the action argument in returned rule copies
                return {
                    ...el,
                    rules: el.rules.map((rule) => ({
                        ...rule,
                        actionStyles: [{ property: 'remove-attr', value: 'title' }],
                    })),
                };
            },
        });
        extendedCss.apply();

        const element = document.getElementById('case-callback-action');
        // the edited action should be applied instead of the original one
        expect(element?.hasAttribute('href')).toBe(true);
        expect(element?.hasAttribute('title')).toBe(false);

        // the edited action should be applied on the next passes too
        element?.setAttribute('title', 'ad again');
        extendedCss.apply();
        expect(element?.hasAttribute('href')).toBe(true);
        expect(element?.hasAttribute('title')).toBe(false);

        extendedCss.dispose();
    });

    it('allows beforeStyleApplied to cancel an action with returned rule copies', () => {
        document.body.innerHTML = `
            <div id="case-callback-cancel" title="ad"></div>
        `;
        let callbackCalls = 0;
        const extendedCss = new ExtendedCss({
            cssRules: [
                '#case-callback-cancel { color: red; }',
                '#case-callback-cancel:remove-attr(title)',
            ],
            beforeStyleApplied: (el) => {
                callbackCalls += 1;
                // cancel actions in returned rule copies
                return {
                    ...el,
                    rules: el.rules.map((rule) => ({ ...rule, actionStyles: [] })),
                };
            },
        });
        extendedCss.apply();

        const element = document.getElementById('case-callback-cancel');
        // the cancelled action should not be applied on the first pass
        expect(element?.hasAttribute('title')).toBe(true);
        expect(callbackCalls).toBe(1);

        // the cancellation should survive the next passes:
        // the callback should be called again before actions are re-applied
        extendedCss.apply();
        expect(element?.hasAttribute('title')).toBe(true);
        expect(callbackCalls).toBe(2);

        extendedCss.dispose();
    });

    it('allows beforeStyleApplied to add an action with returned rule copies', () => {
        document.body.innerHTML = `
            <div id="case-callback-add" title="ad"></div>
        `;
        const extendedCss = new ExtendedCss({
            cssRules: ['#case-callback-add { color: red; }'],
            beforeStyleApplied: (el) => {
                // add an action to returned rule copies
                return {
                    ...el,
                    rules: el.rules.map((rule) => ({
                        ...rule,
                        actionStyles: [{ property: 'remove-attr', value: 'title' }],
                    })),
                };
            },
        });
        extendedCss.apply();

        const element = document.getElementById('case-callback-add');
        // the added action should be applied
        expect(element?.hasAttribute('title')).toBe(false);

        // the added action should be applied on the next passes too
        element?.setAttribute('title', 'ad again');
        extendedCss.apply();
        expect(element?.hasAttribute('title')).toBe(false);

        extendedCss.dispose();
    });

    it('protects and reverts regular styles added by beforeStyleApplied', () => {
        document.body.innerHTML = `
            <div id="case-callback-style" href="link"></div>
        `;
        const extendedCss = new ExtendedCss({
            cssRules: ['#case-callback-style:remove-attr(href)'],
            beforeStyleApplied: (el) => {
                // add a style map to returned rule copies
                return {
                    ...el,
                    rules: el.rules.map((rule) => ({ ...rule, style: { color: 'red' } })),
                };
            },
        });
        extendedCss.apply();

        const element = document.getElementById('case-callback-style');
        expect(element?.style.color).toBe('red');
        // the element should be style-protected since its styles are applied
        expect(extendedCss.getAffectedElements()[0]?.protectionObserver).toBeTruthy();

        // the element stops matching, so the applied styles should be reverted
        element?.setAttribute('id', 'case-callback-style-renamed');
        extendedCss.apply();
        expect(element?.style.color).toBe('');

        extendedCss.dispose();
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

    it('log invalid css rule', () => {
        expect.assertions(1);
        document.body.innerHTML = '<div id="case23"></div>';
        const invalidRule = '#case23[..banner] { display: none!important; }';
        const cssRules = [invalidRule];

        return new Promise<void>((resolve) => {
            const loggerInfo = logger.info;
            logger.info = function (...args) {
                if (args.length === 1
                    && typeof args[0] === 'string'
                    && args[0].includes('Invalid rules:')
                ) {
                    expect(args[0].includes(invalidRule)).toBeTruthy();
                    // Cleanup
                    logger.info = loggerInfo;
                    resolve();
                }
                return loggerInfo.apply(this, args);
            };

            // invalid rules are skipped in ExtendedCss constructor during the rules parsing
            new ExtendedCss({ cssRules, debug: true });
        });
    });
});
