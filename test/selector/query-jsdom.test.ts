/**
 * @jest-environment jsdom
 */

import {
    expectSuccessInput,
    expectNoMatchInput,
    expectToThrowInput,
    TestPropElement,
} from '../helpers/selector-query-jsdom';

import { MATCHING_ELEMENT_ERROR_PREFIX } from '../../src/common/constants';

describe('regular selectors', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('simple -- div', () => {
        document.body.innerHTML = '<div id="username"></div>';
        const actual = 'div';
        const expected = 'div#username';
        expectSuccessInput({ actual, expected });
    });

    it('compound -- div#banner', () => {
        document.body.innerHTML = `
            <div id="top"></div>
            <div id="banner"></div>
        `;
        const actual = 'div#banner';
        const expected = 'div#banner';
        expectSuccessInput({ actual, expected });
    });

    it('compound -- div[style]', () => {
        document.body.innerHTML = `
            <div id="NOT_A_TARGET" styled=0></div>
            <div id="target" style="border: 1px solid black"></div>
        `;
        const actual = 'div[style]';
        const expected = 'div#target';
        expectSuccessInput({ actual, expected });
    });

    it('compound -- div[id][onclick*="redirect"]', () => {
        document.body.innerHTML = `
            <div id="NOT_A_TARGET" onclick="same_origin_url"></div>
            <div id="target" onclick="e23h-redirect__4tn"></div>
        `;
        const actual = 'div[id][onclick*="redirect"]';
        const expected = 'div#target';
        expectSuccessInput({ actual, expected });
    });

    it('complex -- div > span', () => {
        document.body.innerHTML = `
            <div>
                <a class="test"></a>
                <span id="target"></span>
            </div>
        `;
        const actual = 'div > span';
        const expected = 'span#target';
        expectSuccessInput({ actual, expected });
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
        const actual = 'div.ad > a.redirect + a';
        const expected = 'a#target';
        expectSuccessInput({ actual, expected });
    });

    it('selector list -- div, span', () => {
        document.body.innerHTML = `
            <div id="target0"></>
            <a class="test"></a>
            <span id="target1"></span>
        `;
        const actual = 'div, span';
        const expected = '#target0, #target1';
        expectSuccessInput({ actual, expected });
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
        const actual = 'p[ad] ~ span, div.banner, div > a > img';
        const expected = '#target0, #target1, #target2';
        expectSuccessInput({ actual, expected });
    });

    describe('regular selector with pseudo-class -- input:disabled', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <input id="enabled">
                <input id="disabled" disabled>
            `;
        });
        afterEach(() => {
            document.body.innerHTML = '';
        });

        const successInputs = [
            { actual: 'input:disabled', expected: '#disabled' },
            { actual: 'input:enabled', expected: '#enabled' },
            { actual: 'body > *:nth-last-child(1)', expected: '#disabled' },
            { actual: 'body > *:NTH-last-child(2)', expected: '#enabled' },
            { actual: 'body > :nth-of-type(2)', expected: '#disabled' },
        ];
        test.each(successInputs)('%s', (input) => expectSuccessInput(input));
    });

    describe('valid regular selectors - ids', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="台北Táiběi" target="id0"></div>
                <div id="台北" target="id1"></div>
                <div id="foo:bar" target="id2"></div>
                <div id="test.foo[5]bar" target="id3"></div>
                <div id="form">
                    <span id="radio" target="id4"></span>
                </div>
                <div id="foo">
                    <p id="child_p_target" target="id5"></p>
                </div>
                <div id="firstUL" class="no_children" target="none"></div>
                <div id="types_all" target="id6"></div>
                <div id="dash-id" target="id7"></div>
                <div id="name+value" target="id8"></div>
            `;
        });
        afterEach(() => {
            document.body.innerHTML = '';
        });

        const successInputs = [
            { actual: '#台北Táiběi', expected: '[target="id0"]' },
            { actual: '#台北', expected: '[target="id1"]' },
            { actual: '#foo\\:bar', expected: '[target="id2"]' },
            { actual: '#test\\.foo\\[5\\]bar', expected: '[target="id3"]' },
            { actual: '#form > #radio', expected: '[target="id4"]' },
            { actual: '#foo > *', expected: '[target="id5"]' },
            { actual: '#types_all', expected: '[target="id6"]' },
            { actual: '#dash-id', expected: '[target="id7"]' },
            { actual: '#name\\+value', expected: '[target="id8"]' },
        ];
        test.each(successInputs)('%s', (input) => expectSuccessInput(input));

        const noMatchSelectors = [
            // all children of ID with no children
            '#firstUL > *',
        ];
        test.each(noMatchSelectors)('%s', (selector) => expectNoMatchInput({ selector }));
    });

    describe('valid regular selectors - classes', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div class="台北Táiběi" target="id0"></div>
                <div class="foo:bar" target="id1"></div>
                <div class="test.foo[5]bar" target="id2"></div>
                <div class="nav" target="id3"></div>
            `;
        });
        afterEach(() => {
            document.body.innerHTML = '';
        });

        const successInputs = [
            { actual: '.台北Táiběi', expected: '[target="id0"]' },
            { actual: '.foo\\:bar', expected: '[target="id1"]' },
            { actual: '.test\\.foo\\[5\\]bar', expected: '[target="id2"]' },
            { actual: '.nav', expected: '[target="id3"]' },
        ];
        test.each(successInputs)('%s', (input) => expectSuccessInput(input));

        const noMatchSelectors = [
            // no class name case match - no selection
            '.NAV',
        ];
        test.each(noMatchSelectors)('%s', (selector) => expectNoMatchInput({ selector }));
    });

    describe('valid regular selectors - attributes', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="target0" rel="bookmark" name="action" data-comma="0,1"></div>
                <div id="target1" name="Name1"></div>
                <a id="target2" title="bookmark" href="http://www.example.com/promo"></a>
                <a id="target3" href="#paragraph"></a>
                <input id="target4" title="space separated" name="foo[bar]">
                <input id="target5" title="exact-start">
            `;
        });
        afterEach(() => {
            document.body.innerHTML = '';
        });

        const successInputs = [
            { actual: '[rel="bookmark"]', expected: '#target0' },
            { actual: '[rel=bookmark]', expected: '#target0' },
            { actual: 'div[name=action]', expected: '#target0' },
            { actual: 'div[name=\'action\']', expected: '#target0' },
            { actual: 'div[name="action"]', expected: '#target0' },
            { actual: 'div[data-comma="0,1"]', expected: '#target0' },
            { actual: 'div[data-comma=\'0,1\']', expected: '#target0' },
            // strict match for case sensitive value
            { actual: '[name=Name1]', expected: '#target1' },
            { actual: 'a[ title ]', expected: '#target2' },
            { actual: 'a[TITLE]', expected: '#target2' },
            { actual: 'a[ title = "bookmark" ]', expected: '#target2' },
            { actual: 'a[href ^= "http://www"]', expected: '#target2' },
            // #target3 - href with hash
            { actual: 'a[href^="#"]', expected: '#target3' },
            { actual: 'a[href*="#"]', expected: '#target3' },
            { actual: 'a[href *= "para"]', expected: '#target3' },
            // #target4 - value with square brackets
            { actual: 'input[name^="foo["]', expected: '#target4' },
            { actual: 'input[name^="foo[bar]"]', expected: '#target4' },
            { actual: 'input[name*="[bar]"]', expected: '#target4' },
            { actual: 'input[name*="foo[bar]"]', expected: '#target4' },
            // #target4 - separated word
            { actual: '[title^=space]', expected: '#target4' },
            { actual: '[title*=space]', expected: '#target4' },
            // specified for exact separated word
            { actual: '[title~=space]', expected: '#target4' },
            // #target5 - exact value start
            { actual: '[title|=exact]', expected: '#target5' },
            { actual: '[title*=exact]', expected: '#target5' },
            { actual: '[title^=exact]', expected: '#target5' },
        ];
        test.each(successInputs)('%s', (input) => expectSuccessInput(input));

        const noMatchSelectors = [
            // no match for case sensitive value
            '[name=name1]',
            // no match because of "=|" which needs dash separated exact start of value
            '[title|=space]',
            // no match because of "~|" which needs space separated word in value
            '[title~=exact]',

        ];
        test.each(noMatchSelectors)('%s', (selector) => expectNoMatchInput({ selector }));
    });
});

describe('extended pseudo-classes', () => {
    describe('contains', () => {
        afterEach(() => {
            document.body.innerHTML = '';
        });

        describe('simple string arg', () => {
            document.body.innerHTML = `
                <span id="target">text example (LINK)</span>
                <span id="NOT_A_TARGET">123example</span>
                <p id="NOT_A_TARGET_2">text</p>
            `;
            const actualSelectors = [
                'span:contains(text)',
                'span:contains( example)',
                'span:contains(example (LINK))',
                'span:contains((LINK))',
            ];
            const expected = 'span#target';
            test.each(actualSelectors)('%s', (actual) => expectSuccessInput({ actual, expected }));
        });

        it('regexp arg', () => {
            document.body.innerHTML = `
                <div id="container">
                    <h1 id="NOT_A_TARGET_1">Test template</h1>
                    <span id="target">text for contains pseudo checking + "quotes"</span>
                    <span id="NOT_A_TARGET_2">123456</span>
                    <p id="NOT_A_TARGET_3">text123</p>
                </div>
            `;
            let actual;
            let expected;

            actual = '#container > :contains(/^text\\s/)';
            expected = 'span#target';
            expectSuccessInput({ actual, expected });

            actual = '#container > :contains(/"quote[\\w]"/)';
            expected = 'span#target';
            expectSuccessInput({ actual, expected });
        });

        describe('regexp arg with flags', () => {
            document.body.innerHTML = `
                <div id="container">
                    <p id="target">paragraph with simple text</p>
                    <span id="NOT_A_TARGET">another simple text</span>
                </div>
            `;

            const actualMatchSelectors = [
                'p:contains(/simple/)',
                'p:contains(/Simple/i)',
                'p:contains(/Simple/gmi)',
            ];
            const expected = 'p#target';
            test.each(actualMatchSelectors)('%s', (actual) => expectSuccessInput({ actual, expected }));

            const noMatchSelectors = [
                'p:contains(/Simple/)',
            ];
            test.each(noMatchSelectors)('%s', (selector) => expectNoMatchInput({ selector }));
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
            const actual = '* > p ~ #test a:contains(adg-test)';
            const expected = 'a#target';
            expectSuccessInput({ actual, expected });
        });

        it('old syntax', () => {
            document.body.innerHTML = `
                <div id="container">
                    <span id="target">text for contains pseudo checking</span>
                    <span id="NOT_A_TARGET_2">123456</span>
                </div>
            `;
            let actual;
            let expected;

            actual = 'div[-ext-contains="text"]';
            expected = 'div#container';
            expectSuccessInput({ actual, expected });

            actual = 'div *[-ext-contains="text"]';
            expected = 'span#target';
            expectSuccessInput({ actual, expected });
        });

        describe('contains - invalid args', () => {
            const toThrowInputs = [
                { selector: 'p:contains()', error: 'Missing arg for :contains() pseudo-class' },
                { selector: 'p:contains(/ab.?+)', error: 'Unbalanced brackets for extended pseudo-class' },
            ];
            test.each(toThrowInputs)('%s', (input) => expectToThrowInput(input));
        });
    });

    describe('matches-css pseudos', () => {
        describe('matches-css - simple', () => {
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
            const actualMatchSelectors = [
                ':matches-css(width:20px)',
                ':matches-css(content: *find me*)',
                'div:matches-css(min-height:/10/):matches-css(height:/10|15|20/)',
            ];
            const expected = 'div#target';
            test.each(actualMatchSelectors)('%s', (actual) => expectSuccessInput({ actual, expected }));

            const noMatchSelectors = [
                // should NOT match because height is 15px
                'div:matches-css(min-height:/10/):matches-css(height:/10|20/)',
            ];
            test.each(noMatchSelectors)('%s', (selector) => expectNoMatchInput({ selector }));
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
            const actual = 'div:matches-css(opacity: 0.9)';
            const expected = 'div#target';
            expectSuccessInput({ actual, expected });
        });

        describe('matches-css - url', () => {
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

            const successInputs = [
                {
                    // no quotes for url
                    actual: 'div:matches-css(background-image: url(data:*))',
                    expected: 'div#divTarget',
                },
                {
                    // quotes for url
                    actual: 'div:matches-css(background-image: url("data:*"))',
                    expected: 'div#divTarget',
                },
                {
                    // regex + strict quotes for url
                    actual: 'div:matches-css(background-image: /^url\\("data:image\\/gif;base64.+/)',
                    expected: 'div#divTarget',
                },
                {
                    // regex + optional quotes for url
                    actual: 'div:matches-css(background-image: /^url\\("?data:image\\/gif;base64.+/)',
                    expected: 'div#divTarget',
                },
                {
                    // regex + no quotes for url
                    actual: 'div:matches-css(background-image: /^url\\([a-z]{4}:[a-z]{5}/)',
                    expected: 'div#divTarget',
                },
                {
                    // different target
                    actual: 'p:matches-css(background-image: /^url\\("?data:image\\/gif;base64.+/)',
                    expected: 'p#pTarget',
                },
            ];
            test.each(successInputs)('%s', (input) => expectSuccessInput(input));
        });

        describe('matches-css - invalid args', () => {
            const toThrowInputs = [
                { selector: 'div:matches-css()', error: 'Missing arg for :matches-css() pseudo-class' },

            ];
            test.each(toThrowInputs)('%s', (input) => expectToThrowInput(input));
        });

        /**
         * Matches-css-before and matches-css-after tests located in selector-playwright.test.ts
         * because jsdom does not support pseudo-elements so it does not work.
         *
         * @see {@link https://github.com/jsdom/jsdom/issues/1928}
         */
    });

    describe('matches-attr pseudo', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div
                    id="target"
                    class="match"
                    data-o="banner_240x400"
                    quoted='double"quote'
                ></div>
                <div id="NOT_A_TARGET"</div>
            `;
        });

        afterEach(() => {
            document.body.innerHTML = '';
        });

        describe('matches-attr - ok', () => {
            const actualSelectors = [
                ':matches-attr("class")',
                ':matches-attr(class)',
                ':matches-attr("data-*")',
                ':matches-attr("/data-/")',
                ':matches-attr("*-o"="banner_*")',
                ':matches-attr(data-*=*240*)',
                'div:matches-attr("class"="ma*")',
                'div:matches-attr("class"="match")',
                'div:matches-attr("class"="/[\\w]{5}/")',
                'div:matches-attr(class=/[\\w]{5}/)',
                'div:matches-attr("data-*"="/^banner_.?/")',
                'div:matches-attr(/data-/=/^banner_.?/)',
                'div:matches-attr(quoted=/double\\"quote/)',
            ];
            const expected = 'div#target';
            test.each(actualSelectors)('%s', (actual) => expectSuccessInput({ actual, expected }));
        });

        describe('no match', () => {
            const noMatchSelectors = [
                // no match by value
                'div:matches-attr("class"="target")',
                // no match by attr name
                'div:matches-attr("data")',
            ];
            test.each(noMatchSelectors)('%s', (selector) => expectNoMatchInput({ selector }));
        });

        describe('matches-attr - invalid args', () => {
            const matchAttrErrorText = `${MATCHING_ELEMENT_ERROR_PREFIX} attributes`;
            const INVALID_REGEXP_ERROR_TEXT = 'Invalid regexp pattern';
            const toThrowInputs = [
                { selector: 'div:matches-attr()', error: 'Missing arg for :matches-attr() pseudo-class' },
                { selector: 'div:matches-attr("//")', error: INVALID_REGEXP_ERROR_TEXT },
                { selector: 'div:matches-attr("//"="/./")', error: INVALID_REGEXP_ERROR_TEXT },
                { selector: 'div:matches-attr(*)', error: matchAttrErrorText },
                { selector: 'div:matches-attr(".?"="/^[0-9]*$/")', error: matchAttrErrorText },
                { selector: 'div:matches-attr(")', error: matchAttrErrorText },
                { selector: 'div:matches-attr(> [track="true"])', error: matchAttrErrorText },
                { selector: 'div:matches-attr(".?"="/^[0-9]*$/")', error: matchAttrErrorText },
            ];
            test.each(toThrowInputs)('%s', (input) => expectToThrowInput(input));
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
            const testEl = document.querySelector('#target') as TestPropElement;
            const testPropName = '_testProp';
            const testPropValue = '123';
            testEl[testPropName] = testPropValue;

            const actual = 'div:matches-property("_testProp")';
            const expected = 'div#target';
            expectSuccessInput({ actual, expected });
        });

        it('matches-property - property name with no quotes', () => {
            const testEl = document.querySelector('#target') as TestPropElement;
            const testPropName = '_testProp';
            const testPropValue = '123';
            testEl[testPropName] = testPropValue;

            const actual = 'div:matches-property(_testProp)';
            const expected = 'div#target';
            expectSuccessInput({ actual, expected });
        });

        it('matches-property - wildcard in property name pattern', () => {
            const testEl = document.querySelector('#target') as TestPropElement;
            const testPropName = '_testProp';
            const testPropValue = '123';
            testEl[testPropName] = testPropValue;

            const actual = 'div:matches-property(_t*)';
            const expected = 'div#target';
            expectSuccessInput({ actual, expected });
        });

        it('matches-property - no match by property name', () => {
            const testEl = document.querySelector('#target') as TestPropElement;
            const testPropName = '_testProp';
            const testPropValue = '123';
            testEl[testPropName] = testPropValue;

            const selector = 'div:matches-property("test")';
            expectNoMatchInput({ selector });
        });

        it('matches-property - regexp for property name pattern', () => {
            const testEl = document.querySelector('#target') as TestPropElement;
            const testPropName = '_testProp';
            const testPropValue = '123';
            testEl[testPropName] = testPropValue;

            const actual = 'div:matches-property(/_test/)';
            const expected = 'div#target';
            expectSuccessInput({ actual, expected });
        });

        it('matches-property - string name and value', () => {
            const testEl = document.querySelector('#target') as TestPropElement;
            const testPropName = '_testProp';
            const testPropValue = 'abc';
            testEl[testPropName] = testPropValue;

            const actual = 'div:matches-property("_testProp"="abc")';
            const expected = 'div#target';
            expectSuccessInput({ actual, expected });
        });

        it('matches-property - no match by value', () => {
            const testEl = document.querySelector('#target') as TestPropElement;
            const testPropName = '_testProp';
            const testPropValue = 'abc';
            testEl[testPropName] = testPropValue;

            const selector = 'div:matches-property("_testProp"="target")';
            expectNoMatchInput({ selector });
        });

        it('matches-property - string name and regexp value', () => {
            const testEl = document.querySelector('#target') as TestPropElement;
            const testPropName = '_testProp';
            const testPropValue = 'abc';
            testEl[testPropName] = testPropValue;

            let actual;
            let expected;

            actual = 'div:matches-property(_testProp=/[\\w]{3}/)';
            expected = 'div#target';
            expectSuccessInput({ actual, expected });

            actual = 'div:matches-property("id"=/tar/)';
            expected = 'div#target';
            expectSuccessInput({ actual, expected });
        });

        it('matches-property - string chain and null value', () => {
            const testEl = document.querySelector('#target') as TestPropElement;
            const propFirst = '_testProp';
            const propInner = { propInner: null };
            testEl[propFirst] = propInner;

            const actual = 'div:matches-property(_testProp.propInner=null)';
            const expected = 'div#target';
            expectSuccessInput({ actual, expected });
        });

        it('matches-property - partially regexp chain', () => {
            const testEl = document.querySelector('#target') as TestPropElement;
            const propFirst = '_testProp';
            const propInner = { propInner: null };
            testEl[propFirst] = propInner;

            const actual = 'div:matches-property(/^_test/.propInner=null)';
            const expected = 'div#target';
            expectSuccessInput({ actual, expected });
        });

        it('matches-property - access child prop of null prop', () => {
            const testEl = document.querySelector('#target') as TestPropElement;
            const propFirst = '_testProp';
            const propInner = { propInner: null };
            testEl[propFirst] = propInner;

            const selector = 'div:matches-property(_testProp.propInner.test)';
            expectNoMatchInput({ selector });
        });

        it('matches-property - string chain and null value as string', () => {
            const testEl = document.querySelector('#target') as TestPropElement;
            const propNullAsStr = '_testProp';
            const propInnerNullStr = { propInner: 'null' };
            testEl[propNullAsStr] = propInnerNullStr;

            const actual = 'div:matches-property("_testProp.propInner"="null")';
            const expected = 'div#target';
            expectSuccessInput({ actual, expected });
        });

        it('matches-property - string chain and true value', () => {
            const testEl = document.querySelector('#target') as TestPropElement;
            const propNullAsStr = '_testProp';
            const propInnerNullStr = { propInner: true };
            testEl[propNullAsStr] = propInnerNullStr;

            const actual = 'div:matches-property("_testProp.*Inner"=true)';
            const expected = 'div#target';
            expectSuccessInput({ actual, expected });
        });

        it('matches-property - string chain and undefined value as string', () => {
            const testEl = document.querySelector('#target') as TestPropElement;
            const propUndefAsStr = '_testProp';
            const propInnerUndefStr = { propInner: 'undefined' };
            testEl[propUndefAsStr] = propInnerUndefStr;

            const actual = 'div:matches-property("_testProp.propInner"="undefined")';
            const expected = 'div#target';
            expectSuccessInput({ actual, expected });
        });

        it('matches-property - property chain variants', () => {
            const testEl = document.querySelector('#target') as TestPropElement;
            const aProp = '_testProp';
            const aInner = {
                unit123: { id: 123 },
            };
            testEl[aProp] = aInner;

            let actual;
            const expected = 'div#target';

            actual = 'div:matches-property("_testProp./[\\w]{4}123/.id")';
            expectSuccessInput({ actual, expected });

            actual = 'div:matches-property(_testProp.unit123./.{1,5}/=123)';
            expectSuccessInput({ actual, expected });
        });

        describe('matches-property - invalid args', () => {
            const MISSING_ARG_ERROR_TEXT = 'Missing arg for :matches-property() pseudo-class';
            const INVALID_REGEXP_ERROR_TEXT = 'Invalid regexp pattern';
            const matchPropErrorText = `${MATCHING_ELEMENT_ERROR_PREFIX} properties`;
            const toThrowInputs = [
                { selector: 'div:matches-property()', error: MISSING_ARG_ERROR_TEXT },
                { selector: 'div:matches-property("//")', error: INVALID_REGEXP_ERROR_TEXT },
                { selector: 'div:matches-property(".?"="/^[0-9]*$/")', error: matchPropErrorText },
                { selector: 'div:matches-property(.prop.id)', error: matchPropErrorText },
                { selector: 'div:matches-property(abc./aa.?+./test/)', error: matchPropErrorText },
                { selector: 'div:matches-property(abc..?+/.test)', error: matchPropErrorText },
                { selector: 'div:matches-property(abcd.?+/.test)', error: matchPropErrorText },
            ];
            test.each(toThrowInputs)('%s', (input) => expectToThrowInput(input));
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

        describe('xpath - ok', () => {
            const successInputs = [
                { actual: 'div.base[level="2"]:xpath(../..)', expected: 'div#root' },
                { actual: ':xpath(//*[@class="baseInner"])', expected: 'div#inner' },
                { actual: ':xpath(//*[@class="base"]/..)', expected: 'div#parent' },
                { actual: ':xpath(//div[contains(text(),"test-xpath-content")])', expected: 'div#inner' },
                { actual: '*:xpath(//div[contains(text(),"test-xpath-content")])', expected: 'div#inner' },
            ];
            test.each(successInputs)('%s', (input) => expectSuccessInput(input));
        });

        it('xpath - no match', () => {
            // there is no such ancestor
            const selector = 'div#root:xpath(../../../..)';
            expectNoMatchInput({ selector });
        });

        describe('xpath - invalid args', () => {
            const invalidArgErrorText = 'Invalid argument of :xpath() pseudo-class';
            const toThrowInputs = [
                { selector: 'div:xpath()', error: 'Missing arg for :xpath() pseudo-class' },
                { selector: 'div:xpath("//")', error: invalidArgErrorText },
                { selector: 'div:xpath(2)', error: invalidArgErrorText },
                { selector: 'div:xpath(300)', error: invalidArgErrorText },
            ];
            test.each(toThrowInputs)('$selector', (input) => expectToThrowInput(input));
        });

        describe('xpath - invalid position in selector', () => {
            const invalidXpathPositionErrorText = ':xpath() pseudo-class should be the last in selector';
            const toThrowInputs = [
                {
                    selector: 'div:xpath(../../..):has-text(/test-xpath-content/)',
                    error: invalidXpathPositionErrorText,
                },
            ];
            test.each(toThrowInputs)('%s', (input) => expectToThrowInput(input));
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

        describe('nth-ancestor - ok', () => {
            const actualSelectors = [
                'div.base[level="3"]:nth-ancestor(3)',
                'div.base[level="2"]:nth-ancestor(2)',
            ];
            const expected = 'div#root';
            test.each(actualSelectors)('%s', (actual) => expectSuccessInput({ actual, expected }));
        });

        it('nth-ancestor - no match', () => {
            // there is no such ancestor
            const selector = 'div#root:nth-ancestor(5)';
            expectNoMatchInput({ selector });
        });

        describe('nth-ancestor - invalid args', () => {
            const invalidArgErrorText = 'Invalid argument of :nth-ancestor pseudo-class';
            const toThrowInputs = [
                { selector: 'div:nth-ancestor()', error: 'Missing arg for :nth-ancestor() pseudo-class' },
                { selector: 'div:nth-ancestor("//")', error: 'Invalid regexp pattern' },
                { selector: 'div:nth-ancestor(0)', error: invalidArgErrorText },
                { selector: 'div:nth-ancestor(300)', error: invalidArgErrorText },
            ];
            test.each(toThrowInputs)('%s', (input) => expectToThrowInput(input));
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


        describe('upward number - ok', () => {
            const expected = 'div#root';
            const actualSelectors = [
                'div.base[level="3"]:upward(3)',
                'div.base[level="2"]:upward(2)',
            ];
            test.each(actualSelectors)('%s', (actual) => expectSuccessInput({ actual, expected }));
        });

        it('upward number - no match', () => {
            // there is no such ancestor
            const selector = 'div#root:upward(5)';
            expectNoMatchInput({ selector });
        });

        describe('upward number - invalid args', () => {
            const invalidArgErrorText = 'Invalid argument of :upward pseudo-class';
            const selectors = [
                'div:upward(0)',
                'div:upward(300)',
            ];
            test.each(selectors)('%s', (selector) => expectToThrowInput({ selector, error: invalidArgErrorText }));
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

        describe('upward selector - ok', () => {
            const successInputs = [
                { actual: 'div.base[level="3"]:upward([level="0"])', expected: 'div#root' },
                { actual: 'div.base:upward(.base)', expected: 'div#child' },
                { actual: 'div.base[level="2"]:upward(#root > div)', expected: 'div#parent' },
                { actual: 'div.base:upward(body > [level])', expected: 'div#root' },
                { actual: 'div#inner:upward(p ~ div)', expected: 'div#child' },
            ];
            test.each(successInputs)('%s', (input) => expectSuccessInput(input));
        });

        it('upward selector - no match', () => {
            // there is no such ancestor
            const selector = 'div#root:upward(div)';
            expectNoMatchInput({ selector });
        });

        describe('upward selector - invalid args', () => {
            const toThrowInputs = [
                { selector: 'div:upward(//)', error: 'Invalid regexp pattern' },
                { selector: 'div:upward(..class)', error: 'Invalid argument of :upward pseudo-class' },
            ];
            test.each(toThrowInputs)('%s', (input) => expectToThrowInput(input));
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
                    <ul>
                        <li id="firstLi">
                            <span id="firstSpan"></span>
                            <img id="firstImg">
                        </li>
                        <li id="secondLi">
                            <div id="secondDiv">
                                <img id="secondImg">
                            </div>
                        </li>
                    </ul>
                </div>
            `;
        });

        afterEach(() => {
            document.body.innerHTML = '';
        });

        describe('has - ok', () => {
            const successInputs = [
                { actual: 'div:has(#parent)', expected: 'div#root' },
                { actual: '[level="2"]:has([href])', expected: 'div#child' },
                { actual: 'div:has(#child)', expected: '#root, #parent' },
                { actual: 'div[class]:has(div > span)', expected: 'div#child' },
                // child combinator in arg
                { actual: 'div:has(> #child)', expected: 'div#parent' },
                { actual: ':has(> div > .banner)', expected: 'div#parent' },
                { actual: ':has(> p + a + div #innerParagraph)', expected: 'div#parent' },
                { actual: ':has(> p ~ div #innerParagraph)', expected: 'div#parent' },
                { actual: 'li:has(> span):has(+ li > div > img)', expected: 'li#firstLi' },
                { actual: 'li:has(+ li > div > img) > span', expected: 'span#firstSpan' },
                { actual: 'li:has(> span) + li:has(> div > img)', expected: 'li#secondLi' },
                { actual: 'li:has(> span) + li > div:has(> img)', expected: 'div#secondDiv' },
                { actual: 'li:has(> span) + li > div > img', expected: 'img#secondImg' },
                // next sibling combinator in arg
                { actual: 'p:has(+ a)', expected: 'p#paragraph' },
                { actual: 'p:has(+ * + div#child)', expected: 'p#paragraph' },
                { actual: '.banner:has(+ div[id][class])', expected: 'a#anchor' },
                // subsequent-sibling combinator in arg
                { actual: 'p:has(~ a)', expected: 'p#paragraph' },
                { actual: 'p:has(~ div#child)', expected: 'p#paragraph' },
                { actual: '#root p:has(~ div#child)', expected: 'p#paragraph' },
                // selector list as arg
                { actual: 'div[id][class]:has(.base, p#innerParagraph)', expected: 'div#child' },
                { actual: 'div:has([id][class="base"], p)', expected: '#root, #parent, #child' },
                // complex selectors as base
                { actual: '* > #paragraph ~ div:has(a[href^="/inner"])', expected: 'div#child' },
                { actual: '* > a[href*="test"] + div:has(a[href^="/inner"])', expected: 'div#child' },
                { actual: '#root div > div:has(.banner)', expected: 'div#child' },
                // obvious :scope pseudo inside :has
                { actual: 'div:has(:scope > #child)', expected: 'div#parent' },
                // old syntax
                { actual: 'div[-ext-has="> #child"]', expected: 'div#parent' },
            ];
            test.each(successInputs)('%s', (input) => expectSuccessInput(input));
        });

        describe('has - no arg or invalid selectors', () => {
            const invalidArgErrorText = 'Invalid selector for :has() pseudo-class';
            const toThrowInputs = [
                { selector: 'div:has()', error: 'Missing arg for :has() pseudo-class' },
                { selector: 'div:has(1)', error: invalidArgErrorText },
                { selector: '#parent > :has(..banner)', error: invalidArgErrorText },
                { selector: '#parent > :has(id="123") > .test-inner', error: invalidArgErrorText },
            ];
            test.each(toThrowInputs)('%s', (input) => expectToThrowInput(input));
        });
    });

    describe('is pseudo-class', () => {
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

        describe('is - ok', () => {
            const successInputs = [
                { actual: 'div:is(#parent, #parent2, #parent3)', expected: 'div#parent' },
                { actual: '#parent > :is(.base, .target)', expected: 'div#child' },
                { actual: 'div:is(#child, #child2)', expected: '#child, #child2' },
                { actual: '*:is([id^="child2"])', expected: '#child2, #child2InnerParagraph' },
            ];
            test.each(successInputs)('%s', (input) => expectSuccessInput(input));
        });

        describe('is - invalid selector — no fail, just skip', () => {
            const invalidSelectors = [
                '#parent > :is(div:has(..banner))',
                // rest of selectors should not fail as well but there is a bug
                // https://github.com/dperini/nwsapi/issues/70
                // TODO: uncomment later
                // '#test-is :is() > .test-inner',
                // '#parent > :is(id="123") > .test-inner',
                // '#parent > :is(..banner) > .test-inner',
            ];
            test.each(invalidSelectors)('%s', (selector) => expectNoMatchInput({ selector }));
        });

        describe('is - invalid args', () => {
            const toThrowInputs = [
                { selector: 'div:is()', error: 'Missing arg for :is() pseudo-class' },
            ];
            test.each(toThrowInputs)('%s', (input) => expectToThrowInput(input));
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

        describe('not - ok', () => {
            const successInputs = [
                { actual: '.base:not([level="3"])', expected: 'div#child' },
                { actual: '#inner2 > :not(span)', expected: 'p#innerParagraph' },
                { actual: '#child *:not(a, span, p)', expected: '#inner, #inner2' },
            ];
            test.each(successInputs)('%s', (input) => expectSuccessInput(input));
        });

        describe('not - no match', () => {
            const noMatchSelectors = [
                '#inner2 > p:not(p)',
                '#inner2 > p:not( p )',
                '#inner2 > p:not([id])',
                '#inner2 > p:not(#innerParagraph)',
                '#inner2 > p:not(a,   p)',
                '#inner2 > p:not(a,p)',
                '#inner2 > :not(span, p, div)',
            ];
            test.each(noMatchSelectors)('%s', (selector) => expectNoMatchInput({ selector }));
        });

        describe('not - invalid args', () => {
            const toThrowInputs = [
                { selector: 'div:not()', error: 'Missing arg for :not() pseudo-class' },
            ];
            test.each(toThrowInputs)('$selector - $error', (input) => expectToThrowInput(input));
        });
    });
});

describe('combined pseudo-classes', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('different combinations of pseudos', () => {
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
                        <input id="disabledInput" disabled>
                    </div>

                    <footer>
                        <div id="inner3">
                            <a id="anchor" href="mailto:support@example.org">support@example.org</a>
                        </div>
                    </footer>
                </div>
            `;
        });
        afterEach(() => {
            document.body.innerHTML = '';
        });

        describe('all should be ok', () => {
            const successInputs = [
                // selector list of has duplicates
                { actual: '.base:has(> #innerSpan), .base:has(> #innerSpan)', expected: '#inner' },
                // selector list with nonexistent class
                { actual: '#nonexistent:has(*), #inner:has(*)', expected: '#inner' },
                // selector list with :not() and few regular selectors
                // eslint-disable-next-line max-len
                { actual: '#root > div:not(:contains(span2 text)),#deepDiv,:disabled', expected: '#parent, #deepDiv, #disabledInput' },
                // not(contains, regular selector)
                { actual: '#inner2 > :not(:contains(span2 text),#deepDiv)', expected: '#innerParagraph2' },
                // not not not
                { actual: '#parent2 [id]:not([class]):not([level]):not(p)', expected: 'input#disabledInput' },
                // has(not)
                { actual: '#parent div[id][class]:has(:not(div))', expected: '#child, #inner' },
                // has(contains)
                { actual: 'div[id^="inn"][class]:has(p:contains(inner))', expected: 'div#inner' },
                // has(contains) has contains
                // eslint-disable-next-line max-len
                { actual: '#root div:has(:contains(text)):has(#paragraph):contains(inner paragraph)', expected: '#parent' },
                // has(has)
                { actual: '#parent div:has(div:has(> p))', expected: '#child' },
                // has(has contains)
                { actual: '#parent div:has(div:has(> p):contains(inner span text))', expected: '#child' },
                // has(has(contains))
                { actual: '#parent div:has(div:has(> p:contains(inner)))', expected: '#child' },
                // matches-attr matches-attr upward
                // eslint-disable-next-line max-len
                { actual: '#root *[id^="p"][random] > *:matches-attr("/class/"="/base/"):matches-attr("/level$/"="/^[0-9]$/"):upward(1)', expected: '#parent' },
                // matches-attr contains xpath
                { actual: '#parent2 div:matches-attr("/random/"):contains(text):xpath(../..)', expected: '#parent2' },
                // is(has, has)
                { actual: '#parent > :is(.block:has(> #inner), .base:has(> #inner))', expected: 'div#child' },
                // is contains
                { actual: ':is(#inner, #inner2):contains(inner)', expected: 'div#inner' },
                // is(not)
                { actual: '#inner > :is(*:not([class]))', expected: '#innerParagraph' },
                // is(not) has
                { actual: '#root > :is(div:not([class])):has(#paragraph)', expected: 'div#parent' },
                // has-text xpath
                { actual: 'p:has-text(/inner/):xpath(../../..)', expected: 'div#parent' },
                // upward(number) has
                { actual: 'div[level="2"]:upward(1):has(#disabledInput)', expected: 'div#parent2' },
                // upward(selector) -abp-has
                { actual: 'div[level="2"]:upward(div[id]):-abp-has(#disabledInput)', expected: 'div#parent2' },
                // upward(not)
                { actual: '#innerParagraph:upward(div:not([class]))', expected: 'div#parent' },
                // -abp-contains upward
                { actual: 'p:-abp-contains(inner paragraph):upward(div[id])', expected: 'div#inner' },
                // -abp-contains upward not
                { actual: 'p:-abp-contains(inner paragraph):upward(div[id]:not([class]))', expected: 'div#parent' },
                // not(has)
                { actual: '#parent div.base:not(:has(> div > span))', expected: 'div#inner' },
                // not(has(not))
                { actual: 'div.base:not(:has(:not(span, p)))', expected: 'div#inner' },
            ];
            test.each(successInputs)('%s', (input) => expectSuccessInput(input));
        });

        it('matches-attr + has + matches-prop', () => {
            const setPropElement = document.querySelectorAll('#deepDiv')[0] as TestPropElement;
            const testPropName = '_testProp';
            const testPropValue = 'abc';
            setPropElement[testPropName] = testPropValue;

            const actual = 'div:matches-attr(random):has(div:matches-property(_testProp=/[\\w]{3}/))';
            const expected = 'div#inner2';
            expectSuccessInput({ actual, expected });
        });
    });

    it('is(has, has)', () => {
        document.body.innerHTML = `
            <ul>
                <li id="firstLi">
                    <span id="firstSpan"></span>
                    <img id="firstImg">
                </li>
                <li id="secondLi">
                    <div id="secondDiv">
                        <img id="secondImg">
                    </div>
                </li>
                <li id="thirdLi">
                    <span id="thirdSpan">
                        <img id="thirdImg">
                    </span>
                </li>
            </ul>
        `;
        const actual = 'li:is(:has(> img), :has(> span > img))';
        const expected = 'li#firstLi, li#thirdLi';
        expectSuccessInput({ actual, expected });
    });

    it('has(> not)', () => {
        document.body.innerHTML = `
            <ul>
                <li id="firstLi">
                    <img id="firstImg01">
                    <img id="firstImg02">
                </li>
                <li id="secondLi">
                    <div id="secondDiv">
                        <img id="secondImg">
                    </div>
                </li>
                <li id="thirdLi">
                    <span id="thirdSpan">
                        <img id="thirdImg">
                    </span>
                </li>
            </ul>
        `;
        const actual = 'li:has(> :not(img))';
        const expected = 'li#secondLi, li#thirdLi';
        expectSuccessInput({ actual, expected });
    });

    it('has(nth-child)', () => {
        document.body.innerHTML = `
            <ul>
                <li id="firstLi">
                    <span id="firstSpan"></span>
                    <img id="firstImg">
                </li>
                <li id="secondLi">
                    <div id="secondDiv">
                        <img id="secondImg">
                    </div>
                </li>
                <li id="thirdLi">
                    <span id="thirdSpan">
                        <img id="thirdImg">
                    </span>
                </li>
            </ul>
        `;
        const actual = 'li:has(img:nth-child(2))';
        const expected = 'li#firstLi';
        expectSuccessInput({ actual, expected });
    });

    it('is > is(not has)', () => {
        document.body.innerHTML = `
            <div id="parent" class="base2" level="3">
                <span id="innerSpan" class="span">text</span>
                <div id="innerDiv">
                    <input id="disabledInput" disabled>
                </div>
            </div>
        `;
        const actual = '#parent > :is(*:not([class]):has(> input))';
        const expected = 'div#innerDiv';
        expectSuccessInput({ actual, expected });
        document.body.innerHTML = '';
    });

    describe('has limitation', () => {
        const toThrowInputs = [
            // no :has inside regular pseudos
            {
                selector: '::slotted(:has(.a))',
                error: 'Usage of :has() pseudo-class is not allowed inside regular pseudo',
            },
            // no :has after pseudo-elements
            {
                selector: '::part(foo):has(.a)',
                error: 'Usage of :has() pseudo-class is not allowed after any regular pseudo-element',
            },
        ];
        test.each(toThrowInputs)('%s', (input) => expectToThrowInput(input));
    });

    describe('super stressor', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="targetDiv" class="root"></div>
                <span id="spanTarget">[test]</span>
                <p id="pTarget">[paragraph]</p>
                <div id="targetNotEmpty" class="none">
                    test!
                </div>
            `;
        });
        afterEach(() => {
            document.body.innerHTML = '';
        });

        it('multiple selectors combined', () => {
            // eslint-disable-next-line max-len
            const actual = 'div[class]:not(:has(*, :contains(!)), :contains(!)), span:contains(]), p:contains(]), body > :not(:empty)';
            const expected = '#targetDiv, #spanTarget, #pTarget, #targetNotEmpty';
            expectSuccessInput({ actual, expected });
        });
    });

    describe('complex selector with different order of compound selector in it', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <style type="text/css">
                    .off {
                        width: 20px;
                    }
                </style>
                <div id="root">
                    <input id="disabledInput" class="off" disabled>
                </div>
            `;
        });
        afterEach(() => {
            document.body.innerHTML = '';
        });
        const testsInputs = [
            { actual: 'input:disabled', expected: '#disabledInput' },
            { actual: 'input.off:disabled', expected: '#disabledInput' },
            { actual: 'input:disabled.off', expected: '#disabledInput' },
            { actual: 'input:disabled[class]', expected: '#disabledInput' },
            { actual: 'input:disabled#disabledInput', expected: '#disabledInput' },
            { actual: 'input:disabled:matches-attr(class)', expected: '#disabledInput' },
            { actual: 'input:disabled:matches-css(width: 20px)[class]', expected: '#disabledInput' },
            { actual: 'input:matches-css(width: 20px)[class]:disabled[id]', expected: '#disabledInput' },
        ];
        test.each(testsInputs)('%s', (input) => expectSuccessInput(input));
    });

    describe('regular selector AFTER extended absolute selector', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="root" level="0">
                    <div id="parent" level="1" random>
                        <p id="paragraph" class="text">text</p>
                        <div id="child" class="base" level="2">
                            <div id="inner" class="base" level="3">
                                <span id="innerSpan" class="span" level="4">inner span text</span>
                                <p id="innerParagraph" >inner paragraph</p>
                            </div>
                        </div>
                        <script class="ads"></script>
                    </div>
                    <iframe id="frameTarget" class="advert"></iframe>
                    <div id="divAfter">
                        <div class="advert"></div>
                    </div>
                </div>
            `;
        });
        afterEach(() => {
            document.body.innerHTML = '';
        });

        const testsInputs = [
            { actual: '#inner:upward(2) .text', expected: 'p#paragraph' },
            { actual: '#inner:nth-ancestor(2) > .text', expected: 'p#paragraph' },
            { actual: '[level="3"]:upward(1) > div > *', expected: '#innerSpan, #innerParagraph' },
            { actual: '.base:upward(#root [random]) .span', expected: '#innerSpan' },
            { actual: '.base:upward(#root > [random]) .span', expected: '#innerSpan' },
            { actual: '#innerParagraph:nth-ancestor(1)> .span', expected: '#innerSpan' },
            { actual: '#inner :contains(text)+ [id]', expected: 'p#innerParagraph' },
            { actual: '#inner :contains(text)~ [id]', expected: 'p#innerParagraph' },
            { actual: 'div:has(> script.ads) *.text', expected: 'p#paragraph' },
            { actual: 'div:has(> script) + *.advert', expected: 'iframe#frameTarget' },
            { actual: 'div:has(> script) ~ *:has(*.advert)', expected: '#divAfter' },
        ];
        test.each(testsInputs)('%s', (input) => expectSuccessInput(input));
    });

    describe('regular selector AFTER extended relative selector', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="root" level="0">
                    <div id="parent" level="1" random>
                        <p id="paragraph" class="text">text</p>
                        <div id="child" class="base" level="2">
                            <div id="inner" class="base" level="3">
                                <span id="innerSpan" class="span" level="4">inner span text</span>
                                <p id="innerParagraph" >inner paragraph</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        afterEach(() => {
            document.body.innerHTML = '';
        });

        const successInputs = [
            { actual: 'div[random]:has(span) .text', expected: 'p#paragraph' },
            { actual: 'div[random]:has(span)[random] .text', expected: 'p#paragraph' },
            { actual: '#root :not([class^="base"]) > p[class="text"]', expected: 'p#paragraph' },
            { actual: '#parent > p + [id]:not([random]) > div', expected: 'div#inner' },
            { actual: '#parent > p + *:not([random])[id] > div', expected: 'div#inner' },
            { actual: 'div:has(> span) > span.span', expected: 'span#innerSpan' },
            { actual: 'div[id="child"]:not([level="1"]) > div > span', expected: 'span#innerSpan' },
            { actual: 'div:has(> #innerParagraph)> .span', expected: 'span#innerSpan' },
            { actual: '*[id="paragraph"]:not([level])+ div > div', expected: 'div#inner' },
            { actual: '*:not([level])[id="paragraph"]+ div > div', expected: 'div#inner' },
            { actual: '*[id="paragraph"]:not([level])~ div > div', expected: 'div#inner' },
            { actual: '#parent :is(.block, .base) .span', expected: 'span#innerSpan' },
            { actual: '#parent :is(.block, .base) > .span', expected: 'span#innerSpan' },
            { actual: '#parent :is(.base, span) + p', expected: 'p#innerParagraph' },
            { actual: '#parent :is(.base, span) ~ p', expected: 'p#innerParagraph' },
        ];
        test.each(successInputs)('%s', (input) => expectSuccessInput(input));
    });

    describe('combined after combined with any combinator between', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <style type="text/css">
                    #child {
                        width: 20px;
                    }
                </style>
                <div id="root" level="0">
                    <div id="parent" level="1" random>
                        <p id="paragraph" class="text">text</p>
                        <div id="child" class="base" level="2">
                            <div id="inner" class="base" level="3">
                                <span id="innerSpan" class="span" level="4">inner span text</span>
                                <p id="innerParagraph">inner paragraph</p>
                            </div>
                        </div>
                        <div id="child2" class="base2" level="3">
                            <span id="innerSpan2" class="span2" level="4">s2222222</span>
                            <p id="innerParagraph2">inP2</p>
                            <div id="deep2">
                                <input id="disabledInput" disabled>
                            </div>
                        </div>
                        <p id="childParagraph">p2222</p>
                    </div>
                </div>
            `;
        });
        afterEach(() => {
            document.body.innerHTML = '';
        });

        const successInputs = [
            {
                actual: 'div:has(> div:matches-attr(/^level$/=2) > div:matches-attr("/class/"="/base/"))',
                expected: 'div#parent',
            },
            {
                actual: '* > p + div:matches-css(width:20px) ~ div > *:has(> input)',
                expected: 'div#deep2',
            },
            {
                // eslint-disable-next-line max-len
                actual: ':matches-css(width:20px) + :matches-attr(class=/2/):has(+ :matches-attr(id=/child/):contains(p2222))',
                expected: 'div#child2',
            },
            {
                actual: ':is([id^="child"]) > :is(div:not([class])) > input[id]',
                expected: 'input#disabledInput',
            },
            {
                actual: '#parent div:contains(inner span text) + .base2:contains(inP2)',
                expected: 'div#child2',
            },
            {
                actual: '#parent > *:not(p):not(.base2) > div p:contains(inner paragraph)',
                expected: 'p#innerParagraph',
            },
            {
                actual: '#root > div[random]:matches-attr("/level/") > div > div:has(> input:disabled)',
                expected: 'div#deep2',
            },
            {
                actual: '#parent > div:not(.base2)> div[class] > span[class] + p[id]:upward(2)',
                expected: 'div#child',
            },
            {
                actual: '#parent > p[id][class] ~ div +p:not([class]):not([level])',
                expected: 'p#childParagraph',
            },
            {
                actual: '#parent > .base ~ div[class*="2"]:not(.clear) > div > input:only-child:upward(2)',
                expected: 'div#child2',
            },
            {
                actual: '#child2>p[id]:not([class])~div[id]:not([class])',
                expected: 'div#deep2',
            },
        ];
        test.each(successInputs)('%s', (input) => expectSuccessInput(input));
    });

    it('un-tokenizable complex selector testcase', () => {
        document.body.innerHTML = `
            <p id="start"> as text { position: absolute; top: -2500px; } </p>
            <div>
                <div id="not-target" class="banner">
                    aaааaaаaaaaaaaаaaaааaaaаaaaa
                </div>
                <div id="case17" class="banner">
                    <div>
                        <div>
                            aaааaaаaaaaaaaаaaaааaaaаaaaa
                        </div>
                    </div>
                    <div>
                        <div>
                            aaааaaаaaaaaaaаaaaааaaaаaaaa
                        </div>
                    </div>
                    <div></div>
                </div>
            </div>
        `;
        // eslint-disable-next-line max-len
        const actual = '*:contains(/absolute[\\s\\S]*-\\d{4}/) + * > .banner:contains(/а/) ~ #case17.banner:has(> div:nth-child(100n + 2):contains(/а/))';
        const expected = 'div#case17';
        expectSuccessInput({ actual, expected });
        document.body.innerHTML = '';
    });
});

describe('check invalid selectors', () => {
    describe('not a valid selectors', () => {
        const invalidInputs = [
            'foo\nbaz',
            'foo\\\fbaz',
            'foo\\\\\rbaz',
            '[\nrel = bookmark\t]',
            ',a',
            'a,',
            'a:has(.ad),',
            '(',
            '()',
            ',',
            '{',
            '<',
            '<>',
            '{}',
            ':nth-child(2+0)',
            ':nth-child(- 1n)',
            ':first-child(n)',
            ':last-child(n)',
            ':only-child(n)',
            'input[name=foo.baz]',
            'input[name=foo[baz]]',
            "input[name=''double-quoted'']",
            "input[name='apostrophe'd']",
            ':lang(c++)',
            'div > *:not(123)',
            '#parent > :not(id="123") > .test-inner',
            '#parent > :not(..banner) > .test-inner',
        ];
        const error = 'is not a valid selector';
        test.each(invalidInputs)('%s', (selector) => expectToThrowInput({ selector, error }));
    });

    describe('not a valid attribute', () => {
        const invalidInputs = [
            'input[name=]',
            'div[="margin"]',
        ];
        const error = 'is not a valid attribute';
        test.each(invalidInputs)('%s', (selector) => expectToThrowInput({ selector, error }));
    });

    describe('unbalanced attributes brackets', () => {
        const unknownPseudoInputs = [
            '[',
            '[id=012345678901234567890123456789',
        ];
        const error = 'Unbalanced attribute brackets in selector:';
        test.each(unknownPseudoInputs)('%s', (selector) => expectToThrowInput({ selector, error }));
    });

    describe('unknown pseudo-classes', () => {
        const unknownPseudoInputs = [
            '*,:x',
            ':visble',
            ':nth-child',
            ':nth-child(2n+-0)',
            ':nth-child(-1 n)',
            ':nth-last-last-child(1)',
            ':first-last-child',
            ':last-last-child',
            ':only-last-child',
        ];
        const error = 'unknown pseudo-class selector';
        test.each(unknownPseudoInputs)('%s', (selector) => expectToThrowInput({ selector, error }));
    });
});

describe('check case-insensitive attributes selecting', () => {
    // https://github.com/AdguardTeam/ExtendedCss/issues/104
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="target" class="case" tracking="a123_ad-12345" event="banner-STiCKY-123">
                <div id="child" data-st-area="x-BackTo-main" class="PAGE"></div>
                <div id="inner" data-st-area="x-GoToSG123"></div>
                <a id="anchor" href="/example.com/promo" target="_blank"></a>
                <img id="img" alt="SLOT online AD abd1">
            </div>
        `;
    });
    afterEach(() => {
        document.body.innerHTML = '';
    });

    const successInputs = [
        // regular selectors
        { actual: 'body div[class="case" i]', expected: '#target' },
        { actual: 'div[class="case" i]', expected: '#target' },
        { actual: 'div[class=case i]', expected: '#target' },
        { actual: 'div[class="cAsE" i]', expected: '#target' },
        { actual: '.case[tracking*="ad-"][event*="-sticky" i]', expected: '#target' },
        { actual: 'div[data-st-area*="backTo" i], div[data-st-area*="goToSG" i]', expected: '#child, #inner' },
        { actual: 'img[alt^="slot online ad" i]', expected: '#img' },
        // extended selectors
        { actual: 'div:has(div[class="page" i])', expected: '#target' },
        { actual: 'div[id*="TAR" i] a[href][target="_blank"]:is([href*="example.COM" i])', expected: '#anchor' },
    ];
    test.each(successInputs)('%s', (input) => expectSuccessInput(input));

    // jsdom does not support 'I' flag by document.querySelectorAll()
    // e.g. 'div[class="cAsE" I]';
});

describe('check valid regular selectors', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('should be trimmed', () => {
        document.body.innerHTML = `
            <div id="test">
                <p>text</p>
            </div>
        `;
        const actualSelectors = [
            ' #test p',
            '   #test p',
            '\t#test p',
            '\r#test p',
            '\n#test p',
            '\f#test p',
            '#test p ',
            '#test p   ',
            '#test p\t',
            '#test p\r',
            '#test p\n',
            '#test p\f',
        ];
        const expected = '#test p';
        test.each(actualSelectors)('%s', (actual) => expectSuccessInput({ actual, expected }));
    });
});

describe('case-insensitivity for pseudo-class names', () => {
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

    const testInputs = [
        { actual: 'div.base[level="3"]:UPWARD([level="0"])', expected: 'div#root' },
        { actual: 'div.base[LEVEL="3"]:UPWARD([level="0"])', expected: 'div#root' },
        { actual: 'div:HAS(> #paragraph)', expected: 'div#parent' },
        { actual: '#root p:CONTAINS(text)', expected: 'p#paragraph' },
        { actual: '#parent *:NOT([class])', expected: 'p#paragraph' },
        { actual: '#parent *:NOT([CLASS]):CONTAINS(text)', expected: 'p#paragraph' },
    ];
    test.each(testInputs)('%s', (input) => expectSuccessInput(input));
});
