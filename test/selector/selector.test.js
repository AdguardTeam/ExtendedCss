/**
 * Copyright 2016 Performix LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* eslint-disable max-len */

const { ExtendedSelectorFactory } = exports;

QUnit.test('Test ExtendedSelector', (assert) => {
    const checkElements = function (elements, selector) {
        for (let i = 0; i < elements.length; i++) {
            assert.ok(selector.matches(elements[i]));
        }
    };

    let elements;
    let selector;

    selector = ExtendedSelectorFactory.createSelector('div a[-ext-contains="adg-test"]');
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));

    selector = ExtendedSelectorFactory.createSelector('div.test-class[-ext-has="time.g-time"]');
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));

    selector = ExtendedSelectorFactory.createSelector('div#test-div[-ext-has="test"]');
    elements = selector.querySelectorAll();
    assert.equal(0, elements.length);

    elements = ExtendedSelectorFactory.createSelector('[-ext-has="div.advert"]').querySelectorAll();
    assert.equal(0, elements.length);

    selector = ExtendedSelectorFactory.createSelector('[-ext-has="div.test-class-two"]');
    elements = selector.querySelectorAll();

    assert.equal(5, elements.length);
    checkElements(elements, selector);

    selector = ExtendedSelectorFactory.createSelector('div[-ext-contains="adg-test"][-ext-has="div.test-class-two"]');
    elements = selector.querySelectorAll();
    assert.equal(3, elements.length);
    checkElements(elements, selector);

    selector = ExtendedSelectorFactory.createSelector('div[-ext-contains="adg-test"][-ext-has="div.test-class-two"][i18n]');
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    checkElements(elements, selector);

    selector = ExtendedSelectorFactory.createSelector('div[-ext-has="div.test-class-two"]');
    elements = selector.querySelectorAll();
    assert.equal(3, elements.length);
    checkElements(elements, selector);

    selector = ExtendedSelectorFactory.createSelector('div[-ext-has="div.test-class-two"] > .test-class[-ext-contains="adg-test"]');
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    checkElements(elements, selector);
});

QUnit.test('Test -ext-matches-css', (assert) => {
    let selector;
    let elements;
    // Compatible syntax + no quotes for url
    selector = ExtendedSelectorFactory.createSelector('#test-matches-css div[-ext-matches-css="background-image: url(data:*)"]');
    elements = selector.querySelectorAll();

    assert.equal(1, elements.length);
    assert.equal(elements[0], document.getElementById('test-div-background'));

    // Standard syntax + quotes for url
    selector = ExtendedSelectorFactory.createSelector('#test-matches-css div:matches-css(background-image: url("data:*"))');
    elements = selector.querySelectorAll();

    assert.equal(1, elements.length);
    assert.equal(elements[0], document.getElementById('test-div-background'));

    // regex + strict quotes for url
    selector = ExtendedSelectorFactory.createSelector('#test-matches-css div:matches-css(background-image: /^url\\("data:image\\/gif;base64.+/)');
    elements = selector.querySelectorAll();

    assert.equal(1, elements.length);
    assert.equal(elements[0], document.getElementById('test-div-background'));

    // regex + optional quotes for url
    selector = ExtendedSelectorFactory.createSelector('#test-matches-css div:matches-css(background-image: /^url\\("?data:image\/gif;base64.+/)');
    elements = selector.querySelectorAll();

    assert.equal(1, elements.length);
    assert.equal(elements[0], document.getElementById('test-div-background'));

    // regex + no quotes for url
    selector = ExtendedSelectorFactory.createSelector('#test-matches-css div:matches-css(background-image: /^url\\([a-z]{4}:[a-z]{5}/)');
    elements = selector.querySelectorAll();

    assert.equal(1, elements.length);
    assert.equal(elements[0], document.getElementById('test-div-background'));
});

QUnit.test('Test -ext-matches-css with opacity property', (assert) => {
    // Compatible syntax
    let selector = ExtendedSelectorFactory.createSelector('#test-opacity-property[-ext-matches-css="opacity: 0.9"]');
    let elements = selector.querySelectorAll();

    assert.equal(1, elements.length);
    assert.equal(elements[0], document.getElementById('test-opacity-property'));

    // Standard syntax
    selector = ExtendedSelectorFactory.createSelector('#test-opacity-property:matches-css(opacity: 0.9)');
    elements = selector.querySelectorAll();

    assert.equal(1, elements.length);
    assert.equal(elements[0], document.getElementById('test-opacity-property'));
});

QUnit.test('Test -ext-matches-css-before', (assert) => {
    // Compatible syntax
    let selector = ExtendedSelectorFactory.createSelector('#test-matches-css div[-ext-matches-css-before="content: *find me*"]');
    let elements = selector.querySelectorAll();

    assert.equal(1, elements.length);
    assert.equal(elements[0], document.getElementById('test-div-before'));

    // Standard syntax
    selector = ExtendedSelectorFactory.createSelector('#test-matches-css div:matches-css-before(content: *find me*)');
    elements = selector.querySelectorAll();

    assert.equal(1, elements.length);
    assert.equal(elements[0], document.getElementById('test-div-before'));
});

QUnit.test('Test -ext-matches-css-after', (assert) => {
    // Compatible syntax
    let selector = ExtendedSelectorFactory.createSelector('#test-matches-css div[-ext-matches-css-after="content: *find me*"]');
    let elements = selector.querySelectorAll();

    assert.equal(1, elements.length);
    assert.equal(elements[0], document.getElementById('test-div-after'));

    // Standard syntax
    selector = ExtendedSelectorFactory.createSelector('#test-matches-css div:matches-css-after(content: *find me*)');
    elements = selector.querySelectorAll();

    assert.equal(1, elements.length);
    assert.equal(elements[0], document.getElementById('test-div-after'));
});

QUnit.test('Test tokenize selector', (assert) => {
    let selectorText = '#test';
    let compiled = ExtendedSelectorFactory.createSelector(selectorText);
    assert.notOk(compiled.simple);
    assert.notOk(compiled.relation);
    assert.notOk(compiled.complex);

    selectorText = "div span.className > a[href^='http'] > #banner";
    compiled = ExtendedSelectorFactory.createSelector(selectorText);
    assert.notOk(compiled.simple);
    assert.notOk(compiled.relation);
    assert.notOk(compiled.complex);

    selectorText = "div span.className + a[href^='http'] ~ #banner";
    compiled = ExtendedSelectorFactory.createSelector(selectorText);
    assert.notOk(compiled.simple);
    assert.notOk(compiled.relation);
    assert.notOk(compiled.complex);

    selectorText = '#banner div:first-child > div:has(.banner)';
    compiled = ExtendedSelectorFactory.createSelector(selectorText);
    assert.equal(compiled.simple, '#banner div:first-child');
    assert.equal(compiled.relation, '>');
    assert.equal(compiled.complex, 'div:has(.banner)');

    selectorText = '#banner div:first-child ~ div:has(.banner)';
    compiled = ExtendedSelectorFactory.createSelector(selectorText);
    assert.equal(compiled.simple, '#banner div:first-child');
    assert.equal(compiled.relation, '~');
    assert.equal(compiled.complex, 'div:has(.banner)');

    selectorText = '#banner div:first-child > div > :has(.banner) > div';
    compiled = ExtendedSelectorFactory.createSelector(selectorText);
    assert.notEqual(compiled.constructor.name, 'SplittedSelector');
    assert.equal(compiled.selectorText, selectorText);

    selectorText = '#banner div:first-child > div + :has(.banner) > div';
    compiled = ExtendedSelectorFactory.createSelector(selectorText);
    assert.notEqual(compiled.constructor.name, 'SplittedSelector');
    assert.equal(compiled.selectorText, selectorText);

    selectorText = '#banner :not(div) div:matches-css(background: blank)';
    compiled = ExtendedSelectorFactory.createSelector(selectorText);
    assert.equal(compiled.simple, '#banner :not(div)');
    assert.equal(compiled.relation, ' ');
    assert.equal(compiled.complex, 'div:matches-css(background: blank)');
});

QUnit.test('Test regular expressions support in :contains', (assert) => {
    const selectorText = '*[-ext-contains=\'/\\s[a-t]{8}$/\'] + *:contains(/^[^\\"\\\'"]{30}quickly/)';
    const selector = ExtendedSelectorFactory.createSelector(selectorText);
    const elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
});

QUnit.test('Test regular expressions flags support in :contains', (assert) => {
    let elements;
    let selector;
    let selectorText;

    selectorText = 'p:contains(/Quickly/)';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(0, elements.length);

    selectorText = 'p:contains(/quickly/)';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);

    selectorText = 'p:contains(/Quickly/i)';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);

    selectorText = 'p:contains(/Quickly/gmi)';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
});

QUnit.test('Test regular expressions support in :matches-css', (assert) => {
    // var selectorText = ':matches-css(    background-image: /^url\\((.)[a-z]{4}:[a-z]{2}\\1nk\\)$/    ) + [-ext-matches-css-before=\'content:  /^[A-Z][a-z]{2}\\s/  \'][-ext-has=\'+:matches-css-after( content  :   /(\\d+\\s)*me/  ):contains(/^(?![\\s\\S])/)\']';
    const selectorText = ':matches-css(    background-image: /^url\\(\\"[a-z]{4}:[a-z]{5}\\/[gif;base].*\\"\\)$/    ) + [-ext-matches-css-before=\'content:  /^[A-Z][a-z]{2}\\s/  \'][-ext-has=\'+:matches-css-after( content  :   /(\\d+\\s)*me/  ):contains(/^(?![\\s\\S])/)\']';
    const selector = ExtendedSelectorFactory.createSelector(selectorText);
    const elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
});

QUnit.test('Test simple regex support in :matches-css, when ()[] characters are escaped', (assert) => {
    const selectorText = ':matches-css(background-image:url\(data:*\))';
    const selector = ExtendedSelectorFactory.createSelector(selectorText);
    const elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
});

QUnit.test('Test -abp-has and -abp-has-text', (assert) => {
    let elements;
    let selector;

    selector = ExtendedSelectorFactory.createSelector('div.test-class:-abp-has(time.g-time)');
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));

    selector = ExtendedSelectorFactory.createSelector('div:-abp-has(div.test-class-two) > .test-class:-abp-contains(adg-test)');
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));
});

QUnit.test('Pseudo -abp-contains class', (assert) => {
    const selector = ExtendedSelectorFactory.createSelector('#test-abp-pseudo div:-abp-contains(some text) div:-abp-has(div.test-class)');
    const elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));
});

QUnit.test('Test if and if-not', (assert) => {
    let elements;
    let selector;

    selector = ExtendedSelectorFactory.createSelector('div.test-class:if(time.g-time)');
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));

    selector = ExtendedSelectorFactory.createSelector('#test-if-not > *:if-not(> .test-class)');
    elements = selector.querySelectorAll();
    assert.equal(2, elements.length);
    assert.ok(selector.matches(elements[0]));
});

QUnit.test('Test :is()', (assert) => {
    let elements;
    let selector;

    selector = ExtendedSelectorFactory.createSelector('#test-is :is(.header, .body, .footer) .test-is-inner');
    elements = selector.querySelectorAll();
    assert.equal(elements.length, 3);
    assert.equal('test-is--header-inner', elements[0].id);
    assert.equal('test-is--body-inner', elements[1].id);
    assert.equal('test-is--footer-inner', elements[2].id);

    selector = ExtendedSelectorFactory.createSelector('#test-is :is(.header, .body) > .test-is-inner');
    elements = selector.querySelectorAll();
    assert.equal(elements.length, 1);
    assert.equal('test-is--header-inner', elements[0].id);

    selector = ExtendedSelectorFactory.createSelector('#test-is :is(.header, .body) > div > .test-is-inner');
    elements = selector.querySelectorAll();
    assert.equal(elements.length, 1);
    assert.equal('test-is--body-inner', elements[0].id);

    selector = ExtendedSelectorFactory.createSelector('#test-is :is(.header, .main) > div > .test-is-inner');
    elements = selector.querySelectorAll();
    assert.equal(elements.length, 0);

    selector = ExtendedSelectorFactory.createSelector('#test-is :is(.main, div[id$="footer"]) .test-is-inner');
    elements = selector.querySelectorAll();
    assert.equal(elements.length, 1);
    assert.equal('test-is--footer-inner', elements[0].id);

    selector = ExtendedSelectorFactory.createSelector(':is(.test-is-inner, .test-is-inner2):contains(isistest)');
    elements = selector.querySelectorAll();
    assert.equal(elements.length, 3);
    assert.equal('test-is--header-inner', elements[0].id);
    assert.equal('test-is--body-inner', elements[1].id);
    assert.equal('test-is--body-inner2', elements[2].id);

    selector = ExtendedSelectorFactory.createSelector(':is([id^="test-is"]) > :is(div:not([class]) > .test-is-inner)');
    elements = selector.querySelectorAll();
    assert.equal(elements.length, 1);
    assert.equal('test-is--body-inner', elements[0].id);

    // invalid selector but it should not fail, just skip
    selector = ExtendedSelectorFactory.createSelector('#test-is :is(id="123") > .test-is-inner');
    elements = selector.querySelectorAll();
    assert.equal(elements.length, 0);

    selector = ExtendedSelectorFactory.createSelector('#test-is :is(1) > .test-is-inner');
    elements = selector.querySelectorAll();
    assert.equal(elements.length, 0);
});

QUnit.test('Test :is() validation', (assert) => {
    let selectorText;

    assert.throws(() => {
        selectorText = ':is()';
        ExtendedSelectorFactory.createSelector(selectorText);
    }, 'Expected to be invalid rule -- no arg');

    assert.throws(() => {
        selectorText = 'div:is():has(> a)';
        ExtendedSelectorFactory.createSelector(selectorText);
    }, 'Expected to be invalid rule -- no arg');
});

QUnit.test('Test + and ~ combinators matching', (assert) => {
    let selectorText; let selector; let
        elements;

    selectorText = "* > p ~ #test-id-div a:contains('adg-test')";
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));

    selectorText = '* > div + style:matches-css(display:none) ~ div > *:matches-css-after(content:/y\\st/)';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));

    selectorText = "* > .lead ~ div:has(a[href^='/t'])";
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));

    selectorText = "* > .lead + div:has(a[href^='/t'])";
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));
});

QUnit.test('Test xpath / nth-ancestor / upward', (assert) => {
    let selectorText; let selector; let elements;

    selectorText = 'div:xpath(//*[@class="test-xpath-class"])';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));
    assert.equal('test-xpath-class-div', elements[0].id);

    selectorText = 'div:xpath(//*[@class="test-xpath-div-inner-class"]/../..)';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));
    assert.equal('test-xpath-div', elements[0].id);

    selectorText = ':xpath(//div[contains(text(),"test-xpath-content")]/../..)';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));
    assert.equal('test-xpath-content-div', elements[0].id);

    selectorText = '.test-xpath-div-inner-class:xpath(../../..)';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));
    assert.equal('test-xpath', elements[0].id);

    selectorText = '.test-xpath-content-class:has-text(/test-xpath-content/):xpath(../../..)';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));
    assert.equal('test-xpath', elements[0].id);

    selectorText = 'div:has-text(/test-xpath-content/):xpath(../../..)';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(5, elements.length);
    assert.ok(selector.matches(elements[0]));
    assert.ok(selector.matches(elements[1]));
    assert.ok(selector.matches(elements[2]));
    assert.equal('test-xpath', elements[4].id);

    selectorText = 'div.test-nth-ancestor-marker:nth-ancestor(4)';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(2, elements.length);
    assert.ok(selector.matches(elements[0]));
    assert.ok(selector.matches(elements[1]));
    assert.equal('test-nth-ancestor-div', elements[0].id);

    selectorText = 'div.test-upward-marker:upward(2)';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(2, elements.length);
    assert.ok(selector.matches(elements[0]));
    assert.ok(selector.matches(elements[1]));
    assert.equal('test-upward-div', elements[0].id);

    selectorText = '.test-upward-selector:upward(div[id])';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));
    assert.equal('test-upward-div', elements[0].id);

    selectorText = '.test-upward-selector:upward(div[class^="test-upward-"])';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));
    assert.equal('test-upward-marker', elements[0].className);

    selectorText = 'div:contains(upward contains):upward(div[id][class])';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));
    assert.equal('test-upward-div', elements[0].id);
});

QUnit.test('Test xpath validation', (assert) => {
    let selectorText;

    assert.throws(() => {
        selectorText = 'div:xpath()';
        ExtendedSelectorFactory.createSelector(selectorText);
    }, 'Expected to be invalid rule -- xpath should get an arg');

    assert.throws(() => {
        selectorText = 'div:xpath(../..):has-text(/test-xpath-content/)';
        ExtendedSelectorFactory.createSelector(selectorText);
    }, 'Expected to be invalid rule -- xpath should be at the end of rule');

    assert.throws(() => {
        selectorText = 'div:nth-ancestor(invalid)';
        ExtendedSelectorFactory.createSelector(selectorText);
    }, 'Expected to be invalid rule -- nth-ancestor should get a number arg');

    assert.throws(() => {
        selectorText = 'div:nth-ancestor(0)';
        ExtendedSelectorFactory.createSelector(selectorText);
    }, 'Expected to be invalid rule -- nth-ancestor arg should be more that 0 and less that 256');

    assert.throws(() => {
        selectorText = 'div:nth-ancestor(2):has-text(/test-xpath-content/)';
        ExtendedSelectorFactory.createSelector(selectorText);
    }, 'Expected to be invalid rule -- nth-ancestor should be at the end of rule');

    assert.throws(() => {
        selectorText = 'div:upward()';
        ExtendedSelectorFactory.createSelector(selectorText);
    }, 'Expected to be invalid rule -- upward should get an arg');

    assert.throws(() => {
        selectorText = 'div:upward(0)';
        ExtendedSelectorFactory.createSelector(selectorText);
    }, 'Expected to be invalid rule -- upward arg should be more that 0 and less that 256');

    assert.throws(() => {
        selectorText = 'div:upward(3):has-text(/test-xpath-content/)';
        ExtendedSelectorFactory.createSelector(selectorText);
    }, 'Expected to be invalid rule -- upward should be at the end of rule');
});

QUnit.test('Test remove pseudo-class', (assert) => {
    let selectorText; let selector; let elements;

    selectorText = 'div#test-remove #test-remove-inner-id:remove()';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));
    assert.equal('test-remove-inner-id', elements[0].id);

    selectorText = 'div[id*="remove"]:has(> div > .test-remove-inner-class):remove()';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));
    assert.equal('test-remove-div-for-has', elements[0].id);

    selectorText = '#test-remove-div-for-contains div[class]:contains(remove me):remove()';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));
    assert.equal('test-remove-inner-with-text', elements[0].className);

    selectorText = '#test-remove-inner-for-upward:upward(div[id]):remove()';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));
    assert.equal('test-remove-with-xpath-upward', elements[0].id);

    selectorText = '#test-remove-inner-for-xpath-pseudo:xpath(../../..):remove()';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));
    assert.equal('test-remove-with-xpath-upward', elements[0].id);
});

QUnit.test('Test remove validation', (assert) => {
    let selectorText;

    assert.throws(() => {
        selectorText = 'div:remove():has-text(/test-content/)';
        ExtendedSelectorFactory.createSelector(selectorText);
    }, 'Expected to be invalid rule -- remove is not in the end');

    assert.throws(() => {
        selectorText = 'div:remove(0)';
        ExtendedSelectorFactory.createSelector(selectorText);
    }, 'Expected to be invalid rule -- remove should not get arg');

    assert.throws(() => {
        selectorText = 'div:not([class]):remove(invalid)';
        ExtendedSelectorFactory.createSelector(selectorText);
    }, 'Expected to be invalid rule -- remove should not get arg');
});

QUnit.test('Test matches-attr', (assert) => {
    let selectorText; let selector; let elements;

    selectorText = '#test-matches-attr div:matches-attr("data-o")';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.equal(elements[0], document.getElementById('test-matches-attr-strict'));

    selectorText = '#test-matches-attr div:matches-attr("/data-o/")';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(3, elements.length);
    assert.equal(elements[0], document.getElementById('test-matches-attr-strict'));
    assert.equal(elements[1], document.getElementById('test-matches-attr-one'));
    assert.equal(elements[2], document.getElementById('test-matches-attr-one-test'));

    selectorText = '#test-matches-attr div:matches-attr("test-data"="no_click")';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.equal(elements[0], document.getElementById('test-matches-attr-test-data-match'));

    selectorText = '#test-matches-attr div:matches-attr("test-data"="/banner/")';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.equal(elements[0], document.getElementById('test-matches-attr-test-data'));

    selectorText = '#test-matches-attr div:matches-attr("/data-/"="/click here/")';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(5, elements.length);
    assert.equal(elements[0], document.getElementById('test-matches-attr-one'));

    selectorText = '#test-matches-attr div:matches-attr("/^data-.{4}$/"="/click here/")';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.equal(elements[0], document.getElementById('test-matches-attr-last'));

    selectorText = '#test-matches-attr div:matches-attr("data-one"="/^click\\shere.{1,}?banner.{1,}?$/")';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.equal(elements[0], document.getElementById('test-matches-attr-one'));

    selectorText = '#test-matches-attr div:has(> div:matches-attr("/id/"="/R-A-/") > div:matches-attr("/data-bem/"="/src:/"))';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.equal(elements[0], document.getElementById('test_matches-attr_has'));

    selectorText = '#test-matches-attr *[id^="unit-"][class] > *:matches-attr("/class/"="/^.{6,8}$/"):matches-attr("/.{5,}delay$/"="/^[0-9]*$/"):upward(3)';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.equal(elements[0], document.getElementById('test_matches-attr_upward'));

    selectorText = '#test-matches-attr div:matches-attr("/-link/"="/-banner_/"):contains(click here):xpath(../..)';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.equal(elements[0], document.getElementById('test_matches-attr_contains_xpath'));
});

QUnit.test('Test matches-attr validation', (assert) => {
    let selectorText;

    assert.throws(() => {
        selectorText = 'div:matches-attr()';
        ExtendedSelectorFactory.createSelector(selectorText);
    }, 'Expected to be invalid rule -- no pseudo arg');

    assert.throws(() => {
        selectorText = 'div:matches-attr(")';
        ExtendedSelectorFactory.createSelector(selectorText);
    }, 'Expected to be invalid rule -- invalid arg');

    assert.throws(() => {
        selectorText = 'div:matches-attr("")';
        ExtendedSelectorFactory.createSelector(selectorText);
    }, 'Expected to be invalid rule -- invalid arg');

    assert.throws(() => {
        selectorText = 'div:matches-attr(> [track="true"])';
        ExtendedSelectorFactory.createSelector(selectorText);
    }, 'Expected to be invalid rule -- invalid arg');

    assert.throws(() => {
        selectorText = 'div:matches-attr(".?"="/^[0-9]*$/")';
        ExtendedSelectorFactory.createSelector(selectorText);
    }, 'Expected to be invalid rule -- first is not a regexp');

    assert.throws(() => {
        selectorText = 'div:matches-attr("//"="/./")';
        ExtendedSelectorFactory.createSelector(selectorText);
    }, 'Expected to be invalid rule -- first is not a regexp');
});

QUnit.test('Test matches-property pseudo-class', (assert) => {
    let selectorText; let selector; let elements;

    const testEl = document.querySelector('#test-matches-property-div');
    const testElems = document.querySelectorAll('#test-matches-property div[id][class]');
    const testInnerElems = document.querySelectorAll('#test-matches-property div[id^="test-matches-property-inner"]');

    const testPropName = '_testProp';
    const testPropValue = '123';
    testEl[testPropName] = testPropValue;
    selectorText = `div#test-matches-property div:matches-property("${testPropName}")`;
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));
    assert.equal('test-matches-property-div', elements[0].id);

    const propFirst = 'propFirst';
    const propInner = { propInner: null };
    testEl[propFirst] = propInner;
    selectorText = 'div#test-matches-property div:matches-property("propFirst.propInner"="null")';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));
    assert.equal('test-matches-property-div', elements[0].id);

    // access child prop of null prop
    selectorText = 'div#test-matches-property div:matches-property("propFirst.propInner.test")';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(0, elements.length);

    const propNullAsStr = 'propNullStr';
    const propInnerNullStr = { propInner: 'null' };
    testEl[propNullAsStr] = propInnerNullStr;
    selectorText = 'div#test-matches-property div:matches-property("propNullStr.propInner"="null")';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));
    assert.equal('test-matches-property-div', elements[0].id);

    const propUndefAsStr = 'propNullStr';
    const propInnerUndefStr = { propInner: 'undefined' };
    testEl[propUndefAsStr] = propInnerUndefStr;
    selectorText = 'div#test-matches-property div:matches-property("propNullStr.propInner"="undefined")';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));
    assert.equal('test-matches-property-div', elements[0].id);

    const abcProp = 'abcProp';
    const propInnerOne = { propInnerOne: 111 };
    const propInnerTwo = { propInnerTwo: 222 };
    testElems[0][abcProp] = propInnerOne;
    testElems[1][abcProp] = propInnerTwo;
    selectorText = 'div#test-matches-property div[id][class]:matches-property("abcProp.propInnerOne")';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));
    assert.equal('test-matches-property-div', elements[0].id);

    const aProp = 'aProp';
    const propInnerValueOne = { val: 111 };
    const propInnerValueTwo = { val: 222 };
    testElems[0][aProp] = propInnerValueOne;
    testElems[1][aProp] = propInnerValueTwo;
    selectorText = 'div#test-matches-property div[id][class]:matches-property("aProp.val"="222")';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));
    assert.equal('test-matches-property-div-two', elements[0].id);

    const bProp = 'bProp';
    const cProp = 'cProp';
    const bPropInner = { val: 1234 };
    const cPropInner = { val: 1223 };
    testElems[0][bProp] = bPropInner;
    testElems[1][cProp] = cPropInner;
    selectorText = 'div#test-matches-property div[id][class]:matches-property("/^b[A-Z].+/.val")';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));
    assert.equal('test-matches-property-div', elements[0].id);

    selectorText = 'div#test-matches-property div[id][class]:matches-property("/^[a-z][A-Z].+/.val"="/223/")';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));
    assert.equal('test-matches-property-div-two', elements[0].id);

    selectorText = 'div#test-matches-property div:matches-property("/^[a-z]Prop$/./[\\w]+/"="1234")';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));
    assert.equal('test-matches-property-div', elements[0].id);

    const abProp = 'abProp';
    const aaInner = {
        unit123: { id: 123 },
    };
    const bbInner = {
        unit000: { id: 0 },
    };
    testInnerElems[0][abProp] = aaInner;
    testInnerElems[1][abProp] = bbInner;
    selectorText = 'div#test-matches-property div[id]:matches-property("abProp./[\\w]{4}000/.id"):upward(2)';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));
    assert.equal('test-matches-property-div-two', elements[0].id);

    selectorText = 'div#test-matches-property div[id]:has(div:matches-property("abProp.unit123./.{1,5}/"="123"))';
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));
    assert.equal('test-matches-property-div', elements[0].id);
});

QUnit.test('Test matches-property validation', (assert) => {
    let selectorText;

    assert.throws(() => {
        selectorText = 'div:matches-property()';
        ExtendedSelectorFactory.createSelector(selectorText);
    }, 'Expected to be invalid rule -- no arg');

    assert.throws(() => {
        selectorText = 'div:matches-property(.prop.id)';
        ExtendedSelectorFactory.createSelector(selectorText);
    }, 'Expected to be invalid rule -- invalid arg');

    assert.throws(() => {
        selectorText = 'div:matches-property(asadf./aa.?+./test/)';
        ExtendedSelectorFactory.createSelector(selectorText);
    }, 'Expected to be invalid rule -- invalid arg');

    assert.throws(() => {
        selectorText = 'div:matches-property(asadf..?+/.test)';
        ExtendedSelectorFactory.createSelector(selectorText);
    }, 'Expected to be invalid rule -- invalid chained arg');

    assert.throws(() => {
        selectorText = 'div:matches-property(asadf.?+/.test)';
        ExtendedSelectorFactory.createSelector(selectorText);
    }, 'Expected to be invalid rule -- invalid regex');
});
