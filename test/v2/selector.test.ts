/**
 * @jest-environment jsdom
 */

import { querySelectorAll } from '../../src/selector';

/**
 * Checks whether there is only one item among selectedElements
 * and that element tag and ID the same as expected
 * @param selectedElements
 * @param targetTag
 * @param targetId
 */
const expectSingleElement = (selectedElements: Element[], targetTag: string, targetId: string) => {
    expect(selectedElements.length).toEqual(1);

    const testElem = selectedElements[0];
    expect(testElem.tagName.toLowerCase()).toEqual(targetTag);
    expect(testElem.id).toEqual(targetId);
};

/**
 * Checks whether there is no element selected
 * @param selectedElements
 */
const expectNoMatch = (selectedElements: Element[]) => {
    expect(selectedElements.length).toEqual(0);
};

describe('selector', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('simple -- div', () => {
        const targetTag = 'div';
        const targetId = 'username';
        const selector = 'div';

        document.body.innerHTML = '<div id="username"></div>';

        const selectedElements = querySelectorAll(selector, document);
        expectSingleElement(selectedElements, targetTag, targetId);
    });

    it('compound -- div#banner', () => {
        const targetTag = 'div';
        const targetId = 'banner';
        const selector = 'div#banner';

        document.body.innerHTML = `
            <div id="top"></div>
            <div id="banner"></div>
        `;

        const selectedElements = querySelectorAll(selector, document);
        expectSingleElement(selectedElements, targetTag, targetId);
    });

    it('compound -- div[style]', () => {
        const targetTag = 'div';
        const targetId = 'target';
        const selector = 'div[style]';

        document.body.innerHTML = `
            <div id="NOT_A_TARGET" styled=0></div>
            <div id="target" style="border: 1px solid black"></div>
        `;

        const selectedElements = querySelectorAll(selector, document);
        expectSingleElement(selectedElements, targetTag, targetId);
    });

    it('compound -- div[id][onclick*="redirect"]', () => {
        const targetTag = 'div';
        const targetId = 'target';
        const selector = 'div[id][onclick*="redirect"]';

        document.body.innerHTML = `
            <div id="NOT_A_TARGET" onclick="same_origin_url"></div>
            <div id="target" onclick="e23h-redirect__4tn"></div>
        `;

        const selectedElements = querySelectorAll(selector, document);
        expectSingleElement(selectedElements, targetTag, targetId);
    });

    it('complex -- div > span', () => {
        const targetTag = 'span';
        const targetId = 'target';
        const selector = 'div > span';

        document.body.innerHTML = `
            <div>
                <a class="test"></a>
                <span id="target"></span>
            </div>
        `;

        const selectedElements = querySelectorAll(selector, document);
        expectSingleElement(selectedElements, targetTag, targetId);
    });

    it('complex -- div.ad > a.redirect + a', () => {
        const targetTag = 'a';
        const targetId = 'target';
        const selector = 'div.ad > a.redirect + a';

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

        const selectedElements = querySelectorAll(selector, document);

        expect(selectedElements.length).toEqual(1);

        const testElem = selectedElements[0];
        expect(testElem.tagName.toLowerCase()).toEqual(targetTag);
        expect(testElem.id).toEqual(targetId);
    });

    it('selector list -- div, span', () => {
        const targetTag0 = 'div';
        const targetId0 = 'target0';
        const targetTag1 = 'span';
        const targetId1 = 'target1';
        const selector = 'div, span';

        document.body.innerHTML = `
            <div id="target0"></>
            <a class="test"></a>
            <span id="target1"></span>
        `;

        const selectedElements = querySelectorAll(selector, document);

        expect(selectedElements.length).toEqual(2);

        const testElem0 = selectedElements[0];
        expect(testElem0.tagName.toLowerCase()).toEqual(targetTag0);
        expect(testElem0.id).toEqual(targetId0);

        const testElem1 = selectedElements[1];
        expect(testElem1.tagName.toLowerCase()).toEqual(targetTag1);
        expect(testElem1.id).toEqual(targetId1);
    });

    it('selector list -- div.banner, p[ad] ~ span, div > a > img', () => {
        const targetTag0 = 'div';
        const targetId0 = 'target0';
        const targetTag1 = 'span';
        const targetId1 = 'target1';
        const targetTag2 = 'img';
        const targetId2 = 'target2';
        const selector = 'div.banner, p[ad] ~ span, div > a > img';

        document.body.innerHTML = `
            <div class="NOT_A_TARGET">
                <p class="text" ad=true></p>
                <a class="NOT_A_TARGET"></a>
                <span id="target1"></span>
            </div>
            <div class="ad">
                <div class="banner" id="target0"></div>
            </div>
            <div class="ad">
                <a>
                    <img id="target2">
                </a>
            </div>
        `;

        const selectedElements = querySelectorAll(selector, document);

        expect(selectedElements.length).toEqual(3);

        const testElem0 = selectedElements[0];
        expect(testElem0.tagName.toLowerCase()).toEqual(targetTag0);
        expect(testElem0.id).toEqual(targetId0);

        const testElem1 = selectedElements[1];
        expect(testElem1.tagName.toLowerCase()).toEqual(targetTag1);
        expect(testElem1.id).toEqual(targetId1);

        const testElem2 = selectedElements[2];
        expect(testElem2.tagName.toLowerCase()).toEqual(targetTag2);
        expect(testElem2.id).toEqual(targetId2);
    });

    it('regular selector with pseudo-class -- input:disabled', () => {
        const targetTag = 'input';
        const targetId = 'target';
        const selector = 'input:disabled';

        document.body.innerHTML = `
            <input class="NOT_A_TARGET">
            <input id="target" disabled>
        `;

        const selectedElements = querySelectorAll(selector, document);
        expectSingleElement(selectedElements, targetTag, targetId);
    });
});

describe('extended pseudo-classes', () => {
    describe('contains', () => {
        afterEach(() => {
            document.body.innerHTML = '';
        });

        it('simple string arg', () => {
            const targetTag = 'span';
            const targetId = 'target';

            document.body.innerHTML = `
                <span id="target">text example</span>
                <span id="NOT_A_TARGET">123example</span>
                <p id="NOT_A_TARGET_2">text</p>
            `;

            let selector = 'span:contains(text)';
            let selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);

            // regexp + extra space
            selector = 'span:contains(/\\sexample/)';
            selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);

            // string + extra space
            selector = 'span:contains( example)';
            selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);
        });

        it('regexp arg', () => {
            const targetTag = 'span';
            const targetId = 'target';

            document.body.innerHTML = `
                <div id="container">
                    <h1 id="NOT_A_TARGET_1">Test template</h1>
                    <span id="target">text for contains pseudo checking</span>
                    <span id="NOT_A_TARGET_2">123456</span>
                    <p id="NOT_A_TARGET_3">text123</p>
                </div>
            `;

            const selector = '#container > :contains(/^text\\s/)';
            const selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);

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
            const targetTag = 'p';
            const targetId = 'target';

            document.body.innerHTML = `
                <div id="container">
                    <p id="target">paragraph with simple text</p>
                    <span id="NOT_A_TARGET">another simple text</span>
                </div>
            `;

            let selector;
            let selectedElements;

            selector = 'p:contains(/Simple/)';
            selectedElements = querySelectorAll(selector, document);
            expectNoMatch(selectedElements);

            selector = 'p:contains(/simple/)';
            selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);

            selector = 'p:contains(/Simple/i)';
            selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);

            selector = 'p:contains(/Simple/gmi)';
            selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);
        });

        it('few different standard combinators + contains', () => {
            const targetTag = 'a';
            const targetId = 'target';

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

            const selector = '* > p ~ #test a:contains(adg-test)';
            const selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);
        });

        /**
         * TODO:
         * div:contains(base) + .paragraph:contains(text)
         */
    });

    describe('matches-css pseudos', () => {
        it('matches-css - simple', () => {
            const targetTag = 'div';
            const targetId = 'target';

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

            let selector = ':matches-css(width:20px)';
            let selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);

            selector = ':matches-css(content: *find me*)';
            selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);

            selector = 'div:matches-css(min-height:/10/):matches-css(height:/10|15|20/)';
            selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);

            // should NOT match because height is 15px
            selector = 'div:matches-css(min-height:/10/):matches-css(height:/10|20/)';
            selectedElements = querySelectorAll(selector, document);
            expectNoMatch(selectedElements);
        });

        it('matches-css - opacity', () => {
            const targetTag = 'div';
            const targetId = 'target';
            const selector = 'div:matches-css(opacity: 0.9)';

            document.body.innerHTML = `
                <style>
                    #target { opacity: 0.9; }
                    #NOT_A_TARGET { opacity: 0.7; }
                </style>

                <div id="target"></div>
                <div id="NOT_A_TARGET"></div>
            `;

            const selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);
        });

        it('matches-css - url', () => {
            let targetTag = 'div';
            let targetId = 'divTarget';

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

            let selector;
            let selectedElements;

            // no quotes for url
            selector = 'div:matches-css(background-image: url(data:*))';
            selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);

            // quotes for url
            selector = 'div:matches-css(background-image: url("data:*"))';
            selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);

            // regex + strict quotes for url
            selector = 'div:matches-css(background-image: /^url\\("data:image\\/gif;base64.+/)';
            selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);

            // regex + optional quotes for url
            selector = 'div:matches-css(background-image: /^url\\("?data:image\\/gif;base64.+/)';
            selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);

            // regex + no quotes for url
            selector = 'div:matches-css(background-image: /^url\\([a-z]{4}:[a-z]{5}/)';
            selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);

            // another style declaration
            targetTag = 'p';
            targetId = 'pTarget';
            selector = 'p:matches-css(background-image: /^url\\("?data:image\\/gif;base64.+/)';
            selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);
        });

        /**
         * TODO: try after puppeteer or playwright usage.
         * jsdom does not support pseudo-element so it does not work
         * https://github.com/jsdom/jsdom/issues/1928
         */
        // it('matches-css-before', () => {
        //     const targetTag = 'div';
        //     const targetId = 'target';

        //     document.body.innerHTML = `
        //         <div id="target">
        //             <style>
        //                 #target::before {
        //                     content: "Advertisement";
        //                     color: rgb(255, 255, 255);
        //                 }

        //                 #target {
        //                     width: 20px;
        //                 }
        //             </style>
        //         </div>
        //     `;

        //     let selector = 'div:matches-css-before(color: rgb(255, 255, 255))';
        //     let selectedElements = querySelectorAll(selector, document);
        //     expectSingleElement(selectedElements, targetTag, targetId);

        //     selector = 'div:matches-css-before(content: /^Advertisement$/)';
        //     selectedElements = querySelectorAll(selector, document);
        //     expectSingleElement(selectedElements, targetTag, targetId);
        // });

        /**
         * TODO: try after puppeteer or playwright usage.
         * jsdom does not support pseudo-element so it does not work
         * https://github.com/jsdom/jsdom/issues/1928
         */
        // it('matches-css-after', () => {
        //     const targetTag = 'div';
        //     const targetId = 'target';

        //     document.body.innerHTML = `
        //         <style>
        //             #target {
        //                 content: "empty";
        //                 color: #000;
        //             }

        //             #target::before {
        //                 content: "Advertisement";
        //                 color: #fff;
        //             }
        //         </style>

        //         <div id="target"></div>
        //     `;

        //     let selector = 'div:matches-css-after(color: rgb(255, 255, 255))';
        //     let selectedElements = querySelectorAll(selector, document);
        //     expectSingleElement(selectedElements, targetTag, targetId);

        //     selector = 'div:matches-css-before(content: /^Advertisement$/)';
        //     selectedElements = querySelectorAll(selector, document);
        //     expectSingleElement(selectedElements, targetTag, targetId);
        // });
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
            const targetTag = 'div';
            const targetId = 'target';
            const selector = ':matches-attr("class")';
            const selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);
        });

        it('matches-attr - attr name without quotes', () => {
            const targetTag = 'div';
            const targetId = 'target';
            const selector = ':matches-attr(class)';
            const selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);
        });

        it('matches-attr - wildcard in attr name pattern', () => {
            const targetTag = 'div';
            const targetId = 'target';
            const selector = ':matches-attr("data-*")';
            const selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);
        });

        it('matches-attr - no match by attr name', () => {
            const selector = 'div:matches-attr("data")';
            const selectedElements = querySelectorAll(selector, document);
            expectNoMatch(selectedElements);
        });

        it('matches-attr - regexp for attr name pattern', () => {
            const targetTag = 'div';
            const targetId = 'target';
            const selector = ':matches-attr("/data-/")';
            const selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);
        });

        it('matches-attr - string name and value', () => {
            const targetTag = 'div';
            const targetId = 'target';
            const selector = 'div:matches-attr("class"="match")';
            const selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);
        });

        it('matches-attr - no match by value', () => {
            const selector = 'div:matches-attr("class"="target")';
            const selectedElements = querySelectorAll(selector, document);
            expectNoMatch(selectedElements);
        });

        it('matches-attr - string name and regexp value', () => {
            const targetTag = 'div';
            const targetId = 'target';
            const selector = 'div:matches-attr("class"="/[\\w]{5}/")';
            const selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);
        });

        it('matches-attr - name with wildcard and regexp value', () => {
            const targetTag = 'div';
            const targetId = 'target';
            const selector = 'div:matches-attr("data-*"="/^banner_.?/")';
            const selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);
        });

        it('matches-attr - invalid args', () => {
            let selector;

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
            const targetTag = 'div';
            const targetId = 'target';

            const testEl = document.querySelector(`#${targetId}`);
            const testPropName = '_testProp';
            const testPropValue = '123';
            testEl[testPropName] = testPropValue;

            const selector = 'div:matches-property("_testProp")';
            const selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);
        });

        it('matches-property - property name with no quotes', () => {
            const targetTag = 'div';
            const targetId = 'target';

            const testEl = document.querySelector(`#${targetId}`);
            const testPropName = '_testProp';
            const testPropValue = '123';
            testEl[testPropName] = testPropValue;

            const selector = 'div:matches-property(_testProp)';
            const selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);
        });

        it('matches-property - wildcard in property name pattern', () => {
            const targetTag = 'div';
            const targetId = 'target';

            const testEl = document.querySelector(`#${targetId}`);
            const testPropName = '_testProp';
            const testPropValue = '123';
            testEl[testPropName] = testPropValue;

            const selector = 'div:matches-property(_t*)';
            const selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);
        });

        it('matches-property - no match by property name', () => {
            const testEl = document.querySelector('#target');
            const testPropName = '_testProp';
            const testPropValue = '123';
            testEl[testPropName] = testPropValue;

            const selector = 'div:matches-property("test")';
            const selectedElements = querySelectorAll(selector, document);
            expectNoMatch(selectedElements);
        });

        it('matches-property - regexp for property name pattern', () => {
            const targetTag = 'div';
            const targetId = 'target';

            const testEl = document.querySelector(`#${targetId}`);
            const testPropName = '_testProp';
            const testPropValue = '123';
            testEl[testPropName] = testPropValue;

            const selector = 'div:matches-property(/_test/)';
            const selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);
        });

        it('matches-property - string name and value', () => {
            const targetTag = 'div';
            const targetId = 'target';

            const testEl = document.querySelector(`#${targetId}`);
            const testPropName = '_testProp';
            const testPropValue = 'abc';
            testEl[testPropName] = testPropValue;

            const selector = 'div:matches-property("_testProp"="abc")';
            const selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);
        });

        it('matches-property - no match by value', () => {
            const targetId = 'target';

            const testEl = document.querySelector(`#${targetId}`);
            const testPropName = '_testProp';
            const testPropValue = 'abc';
            testEl[testPropName] = testPropValue;

            const selector = 'div:matches-property("_testProp"="target")';
            const selectedElements = querySelectorAll(selector, document);
            expectNoMatch(selectedElements);
        });

        it('matches-property - string name and regexp value', () => {
            const targetTag = 'div';
            const targetId = 'target';

            const testEl = document.querySelector(`#${targetId}`);
            const testPropName = '_testProp';
            const testPropValue = 'abc';
            testEl[testPropName] = testPropValue;

            const selector = 'div:matches-property(_testProp=/[\\w]{3}/)';
            const selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);
        });

        it('matches-property - string chain and null value', () => {
            const targetTag = 'div';
            const targetId = 'target';

            const testEl = document.querySelector(`#${targetId}`);
            const propFirst = 'propFirst';
            const propInner = { propInner: null };
            testEl[propFirst] = propInner;

            const selector = 'div:matches-property(propFirst.propInner=null)';
            const selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);
        });

        it('matches-property - access child prop of null prop', () => {
            const testEl = document.querySelector('#target');
            const propFirst = 'propFirst';
            const propInner = { propInner: null };
            testEl[propFirst] = propInner;

            const selector = 'div:matches-property(propFirst.propInner.test)';
            const selectedElements = querySelectorAll(selector, document);
            expectNoMatch(selectedElements);
        });

        it('matches-property - string chain and null value as string', () => {
            const targetTag = 'div';
            const targetId = 'target';

            const testEl = document.querySelector(`#${targetId}`);
            const propNullAsStr = 'propNullStr';
            const propInnerNullStr = { propInner: 'null' };
            testEl[propNullAsStr] = propInnerNullStr;

            const selector = 'div:matches-property("propNullStr.propInner"="null")';
            const selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);
        });

        it('matches-property - string chain and undefined value as string', () => {
            const targetTag = 'div';
            const targetId = 'target';

            const testEl = document.querySelector(`#${targetId}`);
            const propUndefAsStr = 'propNullStr';
            const propInnerUndefStr = { propInner: 'undefined' };
            testEl[propUndefAsStr] = propInnerUndefStr;

            const selector = 'div:matches-property("propNullStr.propInner"="undefined")';
            const selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);
        });

        it('matches-property - property chain variants', () => {
            const targetTag = 'div';
            const targetId = 'target';

            const testEl = document.querySelector(`#${targetId}`);
            const aProp = 'aProp';
            const aInner = {
                unit123: { id: 123 },
            };
            testEl[aProp] = aInner;

            let selector = 'div:matches-property("aProp./[\\w]{4}123/.id")';
            let selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);

            selector = 'div:matches-property(aProp.unit123./.{1,5}/=123)';
            selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);
        });

        it('matches-property - invalid args', () => {
            let selector;

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
            const targetTag = 'div';
            let targetId;
            let selector;
            let selectedElements;

            targetId = 'root';
            selector = 'div.base[level="2"]:xpath(../..)';
            selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);

            targetId = 'inner';
            selector = ':xpath(//*[@class="baseInner"])';
            selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);

            targetId = 'parent';
            selector = ':xpath(//*[@class="base"]/..)';
            selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);

            targetId = 'inner';
            selector = ':xpath(//div[contains(text(),"test-xpath-content")]';
            selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);
        });

        it('xpath - no match', () => {
            // there is no such ancestor
            const selector = 'div#root:xpath(../../../..)';
            const selectedElements = querySelectorAll(selector, document);
            expectNoMatch(selectedElements);
        });

        it('xpath - invalid args', () => {
            let selector;

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
            const targetTag = 'div';
            const targetId = 'root';

            let selector = 'div.base[level="3"]:nth-ancestor(3)';
            let selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);

            selector = 'div.base[level="2"]:nth-ancestor(2)';
            selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);
        });

        it('nth-ancestor - no match', () => {
            // there is no such ancestor
            const selector = 'div#root:nth-ancestor(5)';
            const selectedElements = querySelectorAll(selector, document);
            expectNoMatch(selectedElements);
        });

        it('nth-ancestor - invalid args', () => {
            let selector;

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
            const targetTag = 'div';
            const targetId = 'root';

            let selector = 'div.base[level="3"]:upward(3)';
            let selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);

            selector = 'div.base[level="2"]:upward(2)';
            selectedElements = querySelectorAll(selector, document);
            expectSingleElement(selectedElements, targetTag, targetId);
        });

        it('upward - no match', () => {
            // there is no such ancestor
            const selector = 'div#root:upward(5)';
            const selectedElements = querySelectorAll(selector, document);
            expectNoMatch(selectedElements);
        });

        it('upward - invalid args', () => {
            let selector;

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

    /**
     * TODO: add tests for other extended selectors
     */

    // describe('has', () => {
    //     afterEach(() => {
    //         document.body.innerHTML = '';
    //     });

    //     it('div:has(a)', () => {
    //         const selector = 'div:has(a)';

    //         document.body.innerHTML = `<div id="username"></div>`;

    //         const selectedElements = querySelectorAll(selector, document);

    //         expect(selectedElements.length).toEqual(1);
    //         expect(selectedElements[0].tagName.toLowerCase()).toEqual(selector);
    //     });
    // });

});
