/**
 * @jest-environment jsdom
 */

import { querySelectorAll } from '../../src/selector';

/**
 * Checks whether selectedElements and targetElements are the same
 * @param targetElements
 * @param selectedElements
 */
const expectTheSameElements = (targetElements: NodeListOf<Element>, selectedElements: Element[]) => {
    expect(selectedElements.length).toEqual(targetElements.length);
    targetElements.forEach((targetEl, index) => {
        expect(selectedElements[index]).toEqual(targetEl);
    });
};

/**
 * Checks whether there is no element selected
 * @param selectedElements
 */
const expectNoMatch = (selectedElements: Element[]) => {
    expect(selectedElements.length).toEqual(0);
};

interface TestPropElement extends Element {
    // eslint-disable-next-line @typescript-eslint/ban-types
    _testProp: string | Object,
}

describe('selector', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('simple -- div', () => {
        document.body.innerHTML = '<div id="username"></div>';

        const selector = 'div';
        const selectedElements = querySelectorAll(selector, document);

        const targetElements = document.querySelectorAll('div#username');
        expectTheSameElements(targetElements, selectedElements);
    });

    it('compound -- div#banner', () => {
        document.body.innerHTML = `
            <div id="top"></div>
            <div id="banner"></div>
        `;

        const selector = 'div#banner';
        const selectedElements = querySelectorAll(selector, document);

        const targetElements = document.querySelectorAll('div#banner');
        expectTheSameElements(targetElements, selectedElements);
    });

    it('compound -- div[style]', () => {
        document.body.innerHTML = `
            <div id="NOT_A_TARGET" styled=0></div>
            <div id="target" style="border: 1px solid black"></div>
        `;

        const selector = 'div[style]';
        const selectedElements = querySelectorAll(selector, document);

        const targetElements = document.querySelectorAll('div#target');
        expectTheSameElements(targetElements, selectedElements);
    });

    it('compound -- div[id][onclick*="redirect"]', () => {
        document.body.innerHTML = `
            <div id="NOT_A_TARGET" onclick="same_origin_url"></div>
            <div id="target" onclick="e23h-redirect__4tn"></div>
        `;

        const selector = 'div[id][onclick*="redirect"]';
        const selectedElements = querySelectorAll(selector, document);

        const targetElements = document.querySelectorAll('div#target');
        expectTheSameElements(targetElements, selectedElements);
    });

    it('complex -- div > span', () => {
        document.body.innerHTML = `
            <div>
                <a class="test"></a>
                <span id="target"></span>
            </div>
        `;

        const selector = 'div > span';
        const selectedElements = querySelectorAll(selector, document);

        const targetElements = document.querySelectorAll('span#target');
        expectTheSameElements(targetElements, selectedElements);
    });

    it('complex -- div.ad > a.redirect + a', () => {
        document.body.innerHTML = `
            <div class="useful">
                <a class="redirect"></a>
                <a id="not_a_target"></a>
            </div>
            <div class="ad">
                <a class="redirect"></a>
                <a id="target"></a>
            </div>
        `;

        const selector = 'div.ad > a.redirect + a';
        const selectedElements = querySelectorAll(selector, document);

        const targetElements = document.querySelectorAll('a#target');
        expectTheSameElements(targetElements, selectedElements);
    });

    it('selector list -- div, span', () => {
        document.body.innerHTML = `
            <div id="target0"></>
            <a class="test"></a>
            <span id="target1"></span>
        `;

        const selector = 'div, span';
        const selectedElements = querySelectorAll(selector, document);

        const targetElements = document.querySelectorAll('div, span');
        expectTheSameElements(targetElements, selectedElements);
    });

    it('selector list -- div.banner, p[ad] ~ span, div > a > img', () => {
        document.body.innerHTML = `
            <div class="NOT_A_TARGET">
                <p class="text" ad=true></p>
                <a class="NOT_A_TARGET"></a>
                <span id="target0"></span>
            </div>
            <div class="ad">
                <div class="banner" id="target1"></div>
            </div>
            <div class="ad">
                <a>
                    <img id="target2">
                </a>
            </div>
        `;

        const selector = 'p[ad] ~ span, div.banner, div > a > img';
        const selectedElements = querySelectorAll(selector, document);

        const targetElements = document.querySelectorAll('#target0, #target1, #target2');
        expectTheSameElements(targetElements, selectedElements);
    });

    it('regular selector with pseudo-class -- input:disabled', () => {
        document.body.innerHTML = `
            <input class="NOT_A_TARGET">
            <input id="target" disabled>
        `;

        const selector = 'input:disabled';
        const selectedElements = querySelectorAll(selector, document);

        const targetElements = document.querySelectorAll('input#target');
        expectTheSameElements(targetElements, selectedElements);
    });
});

describe('extended pseudo-classes', () => {
    describe('contains', () => {
        afterEach(() => {
            document.body.innerHTML = '';
        });

        it('simple string arg', () => {
            document.body.innerHTML = `
                <span id="target">text example</span>
                <span id="NOT_A_TARGET">123example</span>
                <p id="NOT_A_TARGET_2">text</p>
            `;
            const targetElements = document.querySelectorAll('span#target');

            let selector;
            let selectedElements;

            selector = 'span:contains(text)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            // regexp + extra space
            selector = 'span:contains(/\\sexample/)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            // string + extra space
            selector = 'span:contains( example)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('regexp arg', () => {
            document.body.innerHTML = `
                <div id="container">
                    <h1 id="NOT_A_TARGET_1">Test template</h1>
                    <span id="target">text for contains pseudo checking</span>
                    <span id="NOT_A_TARGET_2">123456</span>
                    <p id="NOT_A_TARGET_3">text123</p>
                </div>
            `;
            const targetElements = document.querySelectorAll('span#target');

            const selector = '#container > :contains(/^text\\s/)';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            /**
             * TODO: after old syntax support by parser
             * and another regular selector after first extended :contains
             */
            // selector = '*[-ext-contains=\'/\\s[a-t]{8}$/\'] + *:contains(/checking/)';
            // selectedElements = querySelectorAll(selector, document);
            // expect(selectedElements.length).toEqual(1);
            // testElem = selectedElements[0];
            // expect(testElem.tagName.toLowerCase()).toEqual(targetTag);
            // expect(testElem.id).toEqual(targetId);
        });

        it('regexp arg with flags', () => {
            document.body.innerHTML = `
                <div id="container">
                    <p id="target">paragraph with simple text</p>
                    <span id="NOT_A_TARGET">another simple text</span>
                </div>
            `;
            const targetElements = document.querySelectorAll('p#target');

            let selector;
            let selectedElements;

            selector = 'p:contains(/Simple/)';
            selectedElements = querySelectorAll(selector, document);
            expectNoMatch(selectedElements);

            selector = 'p:contains(/simple/)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            selector = 'p:contains(/Simple/i)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            selector = 'p:contains(/Simple/gmi)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('few different standard combinators + contains', () => {
            document.body.innerHTML = `
                <div id="container">
                    <h1 class="NOT_A_TARGET">Test template</h1>
                    <p class="NOT_A_TARGET">text for contains pseudo checking</p>
                    <div id="test">
                        <div id="inner">
                            <a id="target">adg-test</a>
                        </div>
                    </div>
                </div>
            `;
            const targetElements = document.querySelectorAll('a#target');

            const selector = '* > p ~ #test a:contains(adg-test)';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        /**
         * TODO:
         * div:contains(base) + .paragraph:contains(text)
         */
    });

    describe('matches-css pseudos', () => {
        it('matches-css - simple', () => {
            document.body.innerHTML = `
                <style type="text/css">
                    div {
                        height: 15px;
                    }
                    #target {
                        width: 20px;
                    }
                    .find {
                        content: "Try to find me";
                        min-height: 10px;
                    }
                </style>

                <div id="target" class="find"></div>
            `;
            const targetElements = document.querySelectorAll('div#target');

            let selector;
            let selectedElements;

            selector = ':matches-css(width:20px)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            selector = ':matches-css(content: *find me*)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            selector = 'div:matches-css(min-height:/10/):matches-css(height:/10|15|20/)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            // should NOT match because height is 15px
            selector = 'div:matches-css(min-height:/10/):matches-css(height:/10|20/)';
            selectedElements = querySelectorAll(selector, document);
            expectNoMatch(selectedElements);
        });

        it('matches-css - opacity', () => {
            document.body.innerHTML = `
                <style>
                    #target { opacity: 0.9; }
                    #NOT_A_TARGET { opacity: 0.7; }
                </style>

                <div id="target"></div>
                <div id="NOT_A_TARGET"></div>
            `;
            const targetElements = document.querySelectorAll('div#target');

            const selector = 'div:matches-css(opacity: 0.9)';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('matches-css - url', () => {
            /* eslint-disable max-len */
            document.body.innerHTML = `
                <style type="text/css">
                    #divTarget {
                        background: url(data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7);
                    }
                    #pTarget {
                        background:
                            url(data:image/gif;base64,R0lGODlhEAAQAMQAAORHHOVSKudfOulrSOp3WOyDZu6QdvCchPGolfO0o/XBs/fNwfjZ0frl3/zy7////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAkAABAALAAAAAAQABAAAAVVICSOZGlCQAosJ6mu7fiyZeKqNKToQGDsM8hBADgUXoGAiqhSvp5QAnQKGIgUhwFUYLCVDFCrKUE1lBavAViFIDlTImbKC5Gm2hB0SlBCBMQiB0UjIQA7)
                            no-repeat
                            left center;
                        padding: 5px 0 5px 25px;
                    }
                </style>

                <div id="divTarget"></div>
                <p id="pTarget"></p>
            `;
            /* eslint-enable max-len */

            let targetElements;
            let selector;
            let selectedElements;

            targetElements = document.querySelectorAll('div#divTarget');

            // no quotes for url
            selector = 'div:matches-css(background-image: url(data:*))';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            // quotes for url
            selector = 'div:matches-css(background-image: url("data:*"))';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            // regex + strict quotes for url
            selector = 'div:matches-css(background-image: /^url\\("data:image\\/gif;base64.+/)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            // regex + optional quotes for url
            selector = 'div:matches-css(background-image: /^url\\("?data:image\\/gif;base64.+/)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            // regex + no quotes for url
            selector = 'div:matches-css(background-image: /^url\\([a-z]{4}:[a-z]{5}/)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            // another style declaration
            targetElements = document.querySelectorAll('p#pTarget');

            selector = 'p:matches-css(background-image: /^url\\("?data:image\\/gif;base64.+/)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        /**
         * matches-css-before and matches-css-after tests located in selector-playwright.test.ts
         * because jsdom does not support pseudo-elements so it does not work
         * https://github.com/jsdom/jsdom/issues/1928
         */
    });

    describe('matches-attr pseudo', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div
                    id="target"
                    class="match"
                    data-o="banner_240x400"
                ></div>
                <div id="NOT_A_TARGET"</div>
            `;
        });

        afterEach(() => {
            document.body.innerHTML = '';
        });

        it('matches-attr - simple attr name without quotes', () => {
            const targetElements = document.querySelectorAll('div#target');
            const selector = ':matches-attr("class")';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('matches-attr - attr name without quotes', () => {
            const targetElements = document.querySelectorAll('div#target');
            const selector = ':matches-attr(class)';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('matches-attr - wildcard in attr name pattern', () => {
            const targetElements = document.querySelectorAll('div#target');
            const selector = ':matches-attr("data-*")';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('matches-attr - no match by attr name', () => {
            const selector = 'div:matches-attr("data")';
            const selectedElements = querySelectorAll(selector, document);
            expectNoMatch(selectedElements);
        });

        it('matches-attr - regexp for attr name pattern', () => {
            const targetElements = document.querySelectorAll('div#target');
            const selector = ':matches-attr("/data-/")';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('matches-attr - string name and value', () => {
            const targetElements = document.querySelectorAll('div#target');
            const selector = 'div:matches-attr("class"="match")';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('matches-attr - no match by value', () => {
            const selector = 'div:matches-attr("class"="target")';
            const selectedElements = querySelectorAll(selector, document);
            expectNoMatch(selectedElements);
        });

        it('matches-attr - string name and regexp value', () => {
            const targetElements = document.querySelectorAll('div#target');
            const selector = 'div:matches-attr("class"="/[\\w]{5}/")';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('matches-attr - name with wildcard and regexp value', () => {
            const targetElements = document.querySelectorAll('div#target');
            const selector = 'div:matches-attr("data-*"="/^banner_.?/")';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('matches-attr - invalid args', () => {
            let selector: string;

            selector = 'div:matches-attr("//")';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Error while matching attributes by arg');

            selector = 'div:matches-attr(*)';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Error while matching attributes by arg');

            // invalid attr name pattern
            selector = 'div:matches-attr(".?"="/^[0-9]*$/")';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Error while matching attributes by arg');

            selector = 'div:matches-attr()';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('name or arg is missing in AbsolutePseudoClass');
        });
    });

    describe('matches-property pseudo', () => {
        beforeEach(() => {
            document.body.innerHTML = '<div id="target" class="match"></div>';
        });

        afterEach(() => {
            document.body.innerHTML = '';
        });

        it('matches-property - property name with quotes', () => {
            const targetElements = document.querySelectorAll('div#target');

            const testEl = document.querySelector('#target') as TestPropElement;
            const testPropName = '_testProp';
            const testPropValue = '123';
            testEl[testPropName] = testPropValue;

            const selector = 'div:matches-property("_testProp")';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('matches-property - property name with no quotes', () => {
            const targetElements = document.querySelectorAll('div#target');

            const testEl = document.querySelector('#target') as TestPropElement;
            const testPropName = '_testProp';
            const testPropValue = '123';
            testEl[testPropName] = testPropValue;

            const selector = 'div:matches-property(_testProp)';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('matches-property - wildcard in property name pattern', () => {
            const targetElements = document.querySelectorAll('div#target');

            const testEl = document.querySelector('#target') as TestPropElement;
            const testPropName = '_testProp';
            const testPropValue = '123';
            testEl[testPropName] = testPropValue;

            const selector = 'div:matches-property(_t*)';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('matches-property - no match by property name', () => {
            const testEl = document.querySelector('#target') as TestPropElement;
            const testPropName = '_testProp';
            const testPropValue = '123';
            testEl[testPropName] = testPropValue;

            const selector = 'div:matches-property("test")';
            const selectedElements = querySelectorAll(selector, document);
            expectNoMatch(selectedElements);
        });

        it('matches-property - regexp for property name pattern', () => {
            const targetElements = document.querySelectorAll('div#target');

            const testEl = document.querySelector('#target') as TestPropElement;
            const testPropName = '_testProp';
            const testPropValue = '123';
            testEl[testPropName] = testPropValue;

            const selector = 'div:matches-property(/_test/)';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('matches-property - string name and value', () => {
            const targetElements = document.querySelectorAll('div#target');

            const testEl = document.querySelector('#target') as TestPropElement;
            const testPropName = '_testProp';
            const testPropValue = 'abc';
            testEl[testPropName] = testPropValue;

            const selector = 'div:matches-property("_testProp"="abc")';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('matches-property - no match by value', () => {
            const testEl = document.querySelector('#target') as TestPropElement;
            const testPropName = '_testProp';
            const testPropValue = 'abc';
            testEl[testPropName] = testPropValue;

            const selector = 'div:matches-property("_testProp"="target")';
            const selectedElements = querySelectorAll(selector, document);
            expectNoMatch(selectedElements);
        });

        it('matches-property - string name and regexp value', () => {
            const targetElements = document.querySelectorAll('div#target');

            const testEl = document.querySelector('#target') as TestPropElement;
            const testPropName = '_testProp';
            const testPropValue = 'abc';
            testEl[testPropName] = testPropValue;

            const selector = 'div:matches-property(_testProp=/[\\w]{3}/)';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('matches-property - string chain and null value', () => {
            const targetElements = document.querySelectorAll('div#target');

            const testEl = document.querySelector('#target') as TestPropElement;
            const propFirst = '_testProp';
            const propInner = { propInner: null };
            testEl[propFirst] = propInner;

            const selector = 'div:matches-property(_testProp.propInner=null)';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('matches-property - access child prop of null prop', () => {
            const testEl = document.querySelector('#target') as TestPropElement;
            const propFirst = '_testProp';
            const propInner = { propInner: null };
            testEl[propFirst] = propInner;

            const selector = 'div:matches-property(_testProp.propInner.test)';
            const selectedElements = querySelectorAll(selector, document);
            expectNoMatch(selectedElements);
        });

        it('matches-property - string chain and null value as string', () => {
            const targetElements = document.querySelectorAll('div#target');

            const testEl = document.querySelector('#target') as TestPropElement;
            const propNullAsStr = '_testProp';
            const propInnerNullStr = { propInner: 'null' };
            testEl[propNullAsStr] = propInnerNullStr;

            const selector = 'div:matches-property("_testProp.propInner"="null")';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('matches-property - string chain and undefined value as string', () => {
            const targetElements = document.querySelectorAll('div#target');

            const testEl = document.querySelector('#target') as TestPropElement;
            const propUndefAsStr = '_testProp';
            const propInnerUndefStr = { propInner: 'undefined' };
            testEl[propUndefAsStr] = propInnerUndefStr;

            const selector = 'div:matches-property("_testProp.propInner"="undefined")';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('matches-property - property chain variants', () => {
            const targetElements = document.querySelectorAll('div#target');

            const testEl = document.querySelector('#target') as TestPropElement;
            const aProp = '_testProp';
            const aInner = {
                unit123: { id: 123 },
            };
            testEl[aProp] = aInner;

            let selector = 'div:matches-property("_testProp./[\\w]{4}123/.id")';
            let selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            selector = 'div:matches-property(_testProp.unit123./.{1,5}/=123)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('matches-property - invalid args', () => {
            let selector: string;

            selector = 'div:matches-property("//")';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Error while matching properties by arg');

            // invalid property name pattern
            selector = 'div:matches-property(".?"="/^[0-9]*$/")';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Error while matching properties by arg');

            selector = 'div:matches-property()';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('name or arg is missing in AbsolutePseudoClass');
        });
    });

    describe('xpath pseudo', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="root" level="0">
                    <div id="parent" level="1">
                        <div id="child" class="base" level="2">
                            <div id="inner" class="baseInner" level="3">
                                test-xpath-content
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        afterEach(() => {
            document.body.innerHTML = '';
        });

        it('xpath - one target', () => {
            let targetElements;
            let selector;
            let selectedElements;

            targetElements = document.querySelectorAll('div#root');
            selector = 'div.base[level="2"]:xpath(../..)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            targetElements = document.querySelectorAll('div#inner');
            selector = ':xpath(//*[@class="baseInner"])';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            targetElements = document.querySelectorAll('div#parent');
            selector = ':xpath(//*[@class="base"]/..)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            targetElements = document.querySelectorAll('div#inner');
            selector = ':xpath(//div[contains(text(),"test-xpath-content")]';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('xpath - no match', () => {
            // there is no such ancestor
            const selector = 'div#root:xpath(../../../..)';
            const selectedElements = querySelectorAll(selector, document);
            expectNoMatch(selectedElements);
        });

        it('xpath - invalid args', () => {
            let selector: string;

            selector = 'div:xpath("//")';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Invalid argument of :xpath pseudo-class');

            selector = 'div:xpath()';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Missing arg for :xpath pseudo-class');

            selector = 'div:xpath(2)';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Invalid argument of :xpath pseudo-class');

            selector = 'div:xpath(300)';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Invalid argument of :xpath pseudo-class');
        });
    });

    describe('nth-ancestor pseudo', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="root" level="0">
                    <div id="parent" level="1">
                        <div id="child" class="base" level="2">
                            <div id="inner" class="base" level="3"></div>
                        </div>
                    </div>
                </div>
            `;
        });

        afterEach(() => {
            document.body.innerHTML = '';
        });

        it('nth-ancestor - one target', () => {
            const targetElements = document.querySelectorAll('div#root');

            let selector = 'div.base[level="3"]:nth-ancestor(3)';
            let selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            selector = 'div.base[level="2"]:nth-ancestor(2)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('nth-ancestor - no match', () => {
            // there is no such ancestor
            const selector = 'div#root:nth-ancestor(5)';
            const selectedElements = querySelectorAll(selector, document);
            expectNoMatch(selectedElements);
        });

        it('nth-ancestor - invalid args', () => {
            let selector: string;

            selector = 'div:nth-ancestor("//")';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Invalid argument of :nth-ancestor pseudo-class');

            selector = 'div:nth-ancestor()';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Missing arg for :nth-ancestor pseudo-class');

            selector = 'div:nth-ancestor(0)';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Invalid argument of :nth-ancestor pseudo-class');

            selector = 'div:nth-ancestor(300)';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Invalid argument of :nth-ancestor pseudo-class');
        });
    });

    describe('upward pseudo - number', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="root" level="0">
                    <div id="parent" level="1">
                        <div id="child" class="base" level="2">
                            <div id="inner" class="base" level="3"></div>
                        </div>
                    </div>
                </div>
            `;
        });

        afterEach(() => {
            document.body.innerHTML = '';
        });

        it('upward - one target', () => {
            const targetElements = document.querySelectorAll('div#root');

            let selector = 'div.base[level="3"]:upward(3)';
            let selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            selector = 'div.base[level="2"]:upward(2)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('upward - no match', () => {
            // there is no such ancestor
            const selector = 'div#root:upward(5)';
            const selectedElements = querySelectorAll(selector, document);
            expectNoMatch(selectedElements);
        });

        it('upward - invalid args', () => {
            let selector: string;

            selector = 'div:upward(0)';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Invalid argument of :upward pseudo-class');

            selector = 'div:upward(300)';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Invalid argument of :upward pseudo-class');
        });
    });

    describe('upward pseudo - selector', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="root" level="0">
                    <div id="parent" level="1">
                        <p id="paragraph">text</p>
                        <div id="child" class="base" level="2">
                            <div id="inner" class="base" level="3"></div>
                        </div>
                    </div>
                </div>
            `;
        });

        afterEach(() => {
            document.body.innerHTML = '';
        });

        it('upward - one target', () => {
            let targetElements;
            let selector;
            let selectedElements;

            targetElements = document.querySelectorAll('div#root');
            selector = 'div.base[level="3"]:upward([level="0"])';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            targetElements = document.querySelectorAll('div#child');
            selector = 'div.base:upward(.base)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            targetElements = document.querySelectorAll('div#parent');
            selector = 'div.base[level="2"]:upward(#root > div)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            targetElements = document.querySelectorAll('div#root');
            selector = 'div.base:upward(body > [level])';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            targetElements = document.querySelectorAll('div#child');
            selector = 'div#inner:upward(p ~ div)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('upward - no match', () => {
            // there is no such ancestor
            const selector = 'div#root:upward(div)';
            const selectedElements = querySelectorAll(selector, document);
            expectNoMatch(selectedElements);
        });

        it('upward - invalid args', () => {
            let selector: string;

            selector = 'div:upward(//)';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Invalid argument of :upward pseudo-class');

            selector = 'div:upward(..class)';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Invalid argument of :upward pseudo-class');
        });
    });

    describe('has', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="root" level="0">
                    <div id="parent" level="1">
                        <p id="paragraph">text</p>
                        <a href="test_url"></a>
                        <div id="child" class="base" level="2">
                            <a href="/inner_url" id="anchor" class="banner"></a>
                            <div id="inner" class="base" level="3"></div>
                            <div id="inner2" class="base" level="3">
                                <span id="innerSpan" class="span" level="4"></span>
                                <p id="innerParagraph">text</p>
                            </div>
                        </div>
                        <div id="child2" class="base2" level="2">
                            <div class="base" level="3">
                                <p id="child2InnerParagraph">text</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        afterEach(() => {
            document.body.innerHTML = '';
        });

        it('any descendant, one simple target', () => {
            const targetElements = document.querySelectorAll('div#root');
            const selector = 'div:has(#parent)';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('simple has, any descendant, two targets', () => {
            const targetElements = document.querySelectorAll('#root, #parent');
            const selector = 'div:has(#child)';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('one target - some descendant, no child combinator', () => {
            const targetElements = document.querySelectorAll('div#child');
            const selector = 'div[class]:has(div > span)';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('direct child element, one target', () => {
            const targetElements = document.querySelectorAll('div#parent');

            let selector;
            let selectedElements;

            selector = 'div:has(> #child)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            selector = ':has(> div > .banner)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            selector = ':has(> p + a + div #innerParagraph)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            selector = ':has(> p ~ div #innerParagraph)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('next sibling combinator, one target', () => {
            let targetElements;
            let selector;
            let selectedElements;

            targetElements = document.querySelectorAll('p#paragraph');
            selector = 'p:has(+ a)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            selector = 'p:has(+ * + div#child)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            targetElements = document.querySelectorAll('a#anchor');
            selector = '.banner:has(+ div[id][class])';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('subsequent-sibling combinator, one target', () => {
            const targetElements = document.querySelectorAll('p#paragraph');

            let selector;
            let selectedElements;

            selector = 'p:has(~ a)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            selector = 'p:has(~ div#child)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('selector list, one simple target', () => {
            const targetElements = document.querySelectorAll('div#child');
            const selector = 'div[id][class]:has(.base, p#innerParagraph)';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('selector list, few targets', () => {
            const targetElements = document.querySelectorAll('#root, #parent, #child');
            const selector = 'div:has([id][class="base"], p)';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('has, complex selectors', () => {
            const targetElements = document.querySelectorAll('div#child');

            let selector;
            let selectedElements;

            selector = '* > #paragraph ~ div:has(a[href^="/inner"])';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            selector = '* > a[href*="test"] + div:has(a[href^="/inner"])';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            selector = '#root div > div:has(.banner)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            /**
             * TODO: filter by last "> div" regular selector part
             */
            // targetId = 'inner';
            // selector = '#root div > div:has(.banner) > div';
            // selectedElements = querySelectorAll(selector, document);
            // expectSingleElement(selectedElements, targetTag, targetId);
        });

        it('has - no arg or invalid selectors', () => {
            let selector: string;

            // no arg specified
            selector = 'div:has()';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Missing arg for :has pseudo-class');

            // invalid selector
            selector = 'div:has(1)';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Invalid selector for :has pseudo-class:');

            selector = '#parent > :has(..banner)';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Invalid selector for :has pseudo-class:');

            selector = '#parent > :has(id="123") > .test-inner';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Invalid selector for :has pseudo-class:');
        });
    });

    describe('if-not', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="root" level="0">
                    <div id="parent" level="1">
                        <p id="paragraph">text</p>
                        <a href="test_url"></a>
                        <div id="child" class="base" level="2">
                            <a href="/inner_url" id="anchor" class="banner"></a>
                            <div id="inner" class="base" level="3"></div>
                            <div id="inner2" class="base" level="3">
                                <span id="innerSpan" class="span" level="4"></span>
                                <p id="innerParagraph">text</p>
                            </div>
                        </div>
                        <div id="child2" class="base2" level="2">
                            <div class="base" level="3">
                                <p id="child2InnerParagraph">text</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        afterEach(() => {
            document.body.innerHTML = '';
        });

        it('if-not - any descendant, one simple target', () => {
            const targetElements = document.querySelectorAll('div#child2');
            const selector = '#parent > div:if-not(#innerParagraph)';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('if-not - some descendant, no child combinator', () => {
            const targetElements = document.querySelectorAll('div#child2');
            const selector = '#parent > div:if-not(div > span)';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('if-not - direct child element, one target', () => {
            let targetElements;
            let selector;
            let selectedElements;

            targetElements = document.querySelectorAll('div#inner');
            selector = '#child div:if-not(> span)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            targetElements = document.querySelectorAll('div#child2');

            selector = '#parent > div:if-not(> a + div + div)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            selector = '#parent > div:if-not(> a ~ div[level="3"])';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('if-not - * and child combinator, few targets', () => {
            const targetElements = document.querySelectorAll('#anchor, #inner');
            const selector = '#child > :if-not(> span)';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('if-not - next sibling combinator, one target', () => {
            const targetElements = document.querySelectorAll('a#anchor');

            let selector;
            let selectedElements;

            selector = 'a:if-not(+ [level="2"])';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            selector = 'a:if-not(+ [level="2"] + [level="2"])';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('if-not - subsequent-sibling combinator, one target', () => {
            const targetElements = document.querySelectorAll('a#anchor');

            let selector;
            let selectedElements;

            selector = 'a:if-not(~ .base2)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            selector = 'a:if-not(~ * + div[id][class] > [level="3"])';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('if-not - selector list, one simple target', () => {
            const targetElements = document.querySelectorAll('div#child2');
            const selector = '#parent > div[id][class]:if-not(a, span)';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('if-not - complex selectors', () => {
            let targetElements;
            let selector;
            let selectedElements;

            targetElements = document.querySelectorAll('div#inner');
            selector = '#root div > div:if-not(*)';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);

            targetElements = document.querySelectorAll('div#child2');
            selector = '#root > * > #paragraph ~ div:if-not(a[href^="/inner"])';
            selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('if-not - no arg or invalid selectors', () => {
            let selector: string;

            // no arg specified
            selector = 'div:if-not()';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Missing arg for :if-not pseudo-class');

            // invalid selector
            selector = 'div:if-not(1)';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Invalid selector for :if-not pseudo-class:');

            selector = '#parent > :if-not(..banner)';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Invalid selector for :if-not pseudo-class:');

            selector = '#parent > :if-not(id="123") > .test-inner';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Invalid selector for :if-not pseudo-class:');
        });
    });

    describe('is', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="root" level="0">
                    <div id="parent" level="1">
                        <p id="paragraph">text</p>
                        <a href="test_url"></a>
                        <div id="child" class="base" level="2">
                            <a href="/inner_url" id="anchor" class="banner"></a>
                            <div id="inner" class="base" level="3"></div>
                            <div id="inner2" class="base" level="3">
                                <span id="innerSpan" class="span" level="4"></span>
                                <p id="innerParagraph">text</p>
                            </div>
                        </div>
                        <div id="child2" class="base2" level="2">
                            <div class="base" level="3">
                                <p id="child2InnerParagraph">text</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        afterEach(() => {
            document.body.innerHTML = '';
        });

        it('is: one simple target', () => {
            const targetElements = document.querySelectorAll('div#parent');
            const selector = 'div:is(#parent, #parent2, #parent3)';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('is: child combinator, one target', () => {
            const targetElements = document.querySelectorAll('div#child');
            const selector = '#parent > :is(.base, .target)';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('is: two simple targets', () => {
            const targetElements = document.querySelectorAll('#child, #child2');
            const selector = 'div:is(#child, #child2)';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('is: invalid selector — no fail, just skip', () => {
            let selector;
            let selectedElements;

            selector = '#test-is :is(1) > .test-inner';
            selectedElements = querySelectorAll(selector, document);
            expectNoMatch(selectedElements);

            selector = '#parent > :is(id="123") > .test-inner';
            selectedElements = querySelectorAll(selector, document);
            expectNoMatch(selectedElements);

            selector = '#parent > :is(..banner) > .test-inner';
            selectedElements = querySelectorAll(selector, document);
            expectNoMatch(selectedElements);
        });

        it('is - invalid args', () => {
            let selector: string;

            // no selector specified
            selector = 'div:is()';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Missing arg for :is pseudo-class');

            // there is no parentElement for html-node
            selector = 'html:is(.modal-active)';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Selection by :is pseudo-class is not possible');
        });
    });

    describe('not', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="root" level="0">
                    <div id="parent" level="1">
                        <p id="paragraph">text</p>
                        <a href="test_url"></a>
                        <div id="child" class="base" level="2">
                            <a href="/inner_url" id="anchor" class="banner"></a>
                            <div id="inner" class="base" level="3"></div>
                            <div id="inner2" class="base" level="3">
                                <span id="innerSpan" class="span" level="4"></span>
                                <p id="innerParagraph">text</p>
                            </div>
                        </div>
                        <div id="child2" class="base2" level="2">
                            <div class="base" level="3">
                                <p id="child2InnerParagraph">text</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        afterEach(() => {
            document.body.innerHTML = '';
        });

        it('not: one simple target', () => {
            const targetElements = document.querySelectorAll('div#child');
            const selector = '.base:not([level="3"])';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('not: child combinator, one target', () => {
            const targetElements = document.querySelectorAll('p#innerParagraph');
            const selector = '#inner2 > :not(span)';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('not: two simple targets', () => {
            const targetElements = document.querySelectorAll('#inner, #inner2');
            const selector = '#child *:not(a, span, p)';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('not - invalid args', () => {
            let selector: string;

            // no selector specified
            selector = 'div:not()';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Missing arg for :not pseudo-class');

            selector = 'div:not(1)';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Invalid selector for :not pseudo-class:');

            selector = '#parent > :not(id="123") > .test-inner';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Invalid selector for :not pseudo-class:');

            selector = '#parent > :not(..banner) > .test-inner';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Invalid selector for :not pseudo-class:');

            // there is no parentElement for html-node
            selector = 'html:not(.modal-active)';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Selection by :not pseudo-class is not possible');
        });
    });

    /**
     * TODO: add tests for other extended selectors
     */
});

describe('combined pseudo-classes', () => {
    describe('has + ...', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="root" level="0">
                    <div id="parent" level="1" random>
                        <p id="paragraph">text</p>
                        <div id="child" class="base" level="2">
                            <div id="inner" class="base" level="3">
                                <span id="innerSpan" class="span" level="4">inner span text</span>
                                <p id="innerParagraph">inner paragraph</p>
                            </div>
                        </div>
                    </div>

                    <div id="parent2" level="1">
                        <p id="paragraph2">second test</p>
                        <div id="child2" class="base" level="2">
                            <div id="inner2" class="base" level="3" random>
                                <span id="innerSpan2" class="span" level="4">span2 text</span>
                                <p id="innerParagraph2"></p>
                                <div id="deepDiv" level="4"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        afterEach(() => {
            document.body.innerHTML = '';
        });

        it('has + not, few targets', () => {
            // #child as ancestor, because :has arg is not specified as direct child
            // #inner2 as parent
            const targetElements = document.querySelectorAll('#child, #inner');
            const selector = '#parent div[id][class]:has(:not(div))';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('has + contains', () => {
            const targetElements = document.querySelectorAll('div#inner');
            const selector = 'div[id^="inn"][class]:has(p:contains(inner))';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('matches-attr + has + matches-prop', () => {
            const setPropElement = document.querySelectorAll('#deepDiv')[0] as TestPropElement;
            const testPropName = '_testProp';
            const testPropValue = 'abc';
            setPropElement[testPropName] = testPropValue;

            const targetElements = document.querySelectorAll('div#inner2');
            const selector = 'div:matches-attr(random):has(div:matches-property(_testProp=/[\\w]{3}/))';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });

        it('is(:has, :has)', () => {
            const targetElements = document.querySelectorAll('div#child');
            const selector = '#parent > :is(.block:has(> #inner), .base:has(> #inner))';
            const selectedElements = querySelectorAll(selector, document);
            expectTheSameElements(targetElements, selectedElements);
        });
    });

    describe('has limitation', () => {
        it('no :has, :is, :where inside :has', () => {
            let selector: string;

            selector = 'banner:has(> div:has(> img))';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Usage of :has pseudo-class is not allowed inside upper :has');

            selector = 'banner:has(> div:is(> img))';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Usage of :is pseudo-class is not allowed inside upper :has');

            selector = 'banner:has(> div:where(> img))';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Usage of :where pseudo-class is not allowed inside upper :has');
        });

        it('no :has inside regular pseudos', () => {
            const selector = '::slotted(:has(.a))';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Usage of :has pseudo-class is not allowed inside regular pseudo');
        });

        it('no :has after pseudo-elements', () => {
            const selector = '::part(foo):has(.a)';
            expect(() => {
                querySelectorAll(selector, document);
            }).toThrow('Usage of :has pseudo-class is not allowed after any regular pseudo-element');
        });
    });
});
