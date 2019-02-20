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

/* global QUnit */
/* global ExtendedSelector */

QUnit.test( "Test ExtendedSelector", function( assert ) {
    var checkElements = function (elements, selector) {
        for (var i = 0; i < elements.length; i++) {
            assert.ok(selector.matches(elements[i]));
        }
    };

    var elements;
    var selector;

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

QUnit.test( "Test -ext-matches-css", function(assert) {
    // Compatible syntax
    var selector = ExtendedSelectorFactory.createSelector('#test-matches-css div[-ext-matches-css="background-image: url(data:*)"]');
    var elements = selector.querySelectorAll();

    assert.equal(1, elements.length);
    assert.equal(elements[0], document.getElementById("test-div-background"));

    // Standard syntax
    selector = ExtendedSelectorFactory.createSelector('#test-matches-css div:matches-css(background-image: url(data:*))');
    elements = selector.querySelectorAll();

    assert.equal(1, elements.length);
    assert.equal(elements[0], document.getElementById("test-div-background"));
});

QUnit.test( "Test -ext-matches-css with opacity property", function(assert) {
    // Compatible syntax
    var selector = ExtendedSelectorFactory.createSelector('#test-opacity-property[-ext-matches-css="opacity: 0.9"]');
    var elements = selector.querySelectorAll();

    assert.equal(1, elements.length);
    assert.equal(elements[0], document.getElementById("test-opacity-property"));

    // Standard syntax
    selector = ExtendedSelectorFactory.createSelector('#test-opacity-property:matches-css(opacity: 0.9)');
    elements = selector.querySelectorAll();

    assert.equal(1, elements.length);
    assert.equal(elements[0], document.getElementById("test-opacity-property"));
});

QUnit.test( "Test -ext-matches-css-before", function(assert) {
    // Compatible syntax
    var selector = ExtendedSelectorFactory.createSelector('#test-matches-css div[-ext-matches-css-before="content: *find me*"]');
    var elements = selector.querySelectorAll();

    assert.equal(1, elements.length);
    assert.equal(elements[0], document.getElementById("test-div-before"));

    // Standard syntax
    selector = ExtendedSelectorFactory.createSelector('#test-matches-css div:matches-css-before(content: *find me*)');
    elements = selector.querySelectorAll();

    assert.equal(1, elements.length);
    assert.equal(elements[0], document.getElementById("test-div-before"));
});

QUnit.test( "Test -ext-matches-css-after", function(assert) {
    // Compatible syntax
    var selector = ExtendedSelectorFactory.createSelector('#test-matches-css div[-ext-matches-css-after="content: *find me*"]');
    var elements = selector.querySelectorAll();

    assert.equal(1, elements.length);
    assert.equal(elements[0], document.getElementById("test-div-after"));

    // Standard syntax
    selector = ExtendedSelectorFactory.createSelector('#test-matches-css div:matches-css-after(content: *find me*)');
    elements = selector.querySelectorAll();

    assert.equal(1, elements.length);
    assert.equal(elements[0], document.getElementById("test-div-after"));
});

QUnit.test( "Test tokenize selector", function(assert) {
    var selectorText = "#test";
    var compiled = ExtendedSelectorFactory.createSelector(selectorText);
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

    selectorText = "#banner div:first-child > div:has(.banner)";
    compiled = ExtendedSelectorFactory.createSelector(selectorText);
    assert.equal(compiled.simple, "#banner div:first-child");
    assert.equal(compiled.relation, ">");
    assert.equal(compiled.complex, "div:has(.banner)");

    selectorText = "#banner div:first-child ~ div:has(.banner)";
    compiled = ExtendedSelectorFactory.createSelector(selectorText);
    assert.equal(compiled.simple, "#banner div:first-child");
    assert.equal(compiled.relation, '~');
    assert.equal(compiled.complex, 'div:has(.banner)');

    selectorText = "#banner div:first-child > div > :has(.banner) > div";
    compiled = ExtendedSelectorFactory.createSelector(selectorText);
    assert.notEqual(compiled.constructor.name, "SplittedSelector");
    assert.equal(compiled.selectorText, selectorText);

    selectorText = "#banner div:first-child > div + :has(.banner) > div";
    compiled = ExtendedSelectorFactory.createSelector(selectorText);
    assert.notEqual(compiled.constructor.name, "SplittedSelector");
    assert.equal(compiled.selectorText, selectorText);

    selectorText = "#banner :not(div) div:matches-css(background: blank)";
    compiled = ExtendedSelectorFactory.createSelector(selectorText);
    assert.equal(compiled.simple, "#banner :not(div)");
    assert.equal(compiled.relation, " ");
    assert.equal(compiled.complex, "div:matches-css(background: blank)");

    selectorText = "#banner span[-abp-properties='*']";
    compiled = ExtendedSelectorFactory.createSelector(selectorText);
    assert.equal(compiled.constructor.name, "PropertiesHeavySelector");

    selectorText = "[-abp-properties='data']";
    compiled = ExtendedSelectorFactory.createSelector(selectorText);
    assert.equal(compiled.constructor.name, "PropertiesHeavySelector");

    selectorText = "#right .widget:properties(margin-top:*)";
    compiled = ExtendedSelectorFactory.createSelector(selectorText);
    assert.notEqual(compiled.constructor.name, "PropertiesHeavySelector");
});

QUnit.test( "Test regular expressions support in :contains", function(assert) {
    var selectorText = '*[-ext-contains=\'/\\s[a-t]{8}$/\'] + *:contains(/^[^\\"\\\'"]{30}quickly/)';
    var selector = ExtendedSelectorFactory.createSelector(selectorText);
    var elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
});

QUnit.test( "Test regular expressions support in :matches-css", function(assert) {
    // var selectorText = ':matches-css(    background-image: /^url\\((.)[a-z]{4}:[a-z]{2}\\1nk\\)$/    ) + [-ext-matches-css-before=\'content:  /^[A-Z][a-z]{2}\\s/  \'][-ext-has=\'+:matches-css-after( content  :   /(\\d+\\s)*me/  ):contains(/^(?![\\s\\S])/)\']';
    var selectorText = ':matches-css(    background-image: /^url\\([a-z]{4}:[a-z]{5}\\/[gif;base].*\\)$/    ) + [-ext-matches-css-before=\'content:  /^[A-Z][a-z]{2}\\s/  \'][-ext-has=\'+:matches-css-after( content  :   /(\\d+\\s)*me/  ):contains(/^(?![\\s\\S])/)\']';
    var selector = ExtendedSelectorFactory.createSelector(selectorText);
    var elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
});

QUnit.test( "Test simple regex support in :matches-css, when ()[] characters are escaped", function(assert) {
    var selectorText = ':matches-css(background-image:url\(data:*\))';
    var selector = ExtendedSelectorFactory.createSelector(selectorText);
    var elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
});

QUnit.test( "Test -abp-has and -abp-has-text", function(assert) {
    var elements;
    var selector;

    selector = ExtendedSelectorFactory.createSelector('div.test-class:-abp-has(time.g-time)');
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));

    selector = ExtendedSelectorFactory.createSelector('div:-abp-has(div.test-class-two) > .test-class:-abp-contains(adg-test)');
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));
});

QUnit.test( "Test if and if-not", function(assert) {
    var elements;
    var selector;

    selector = ExtendedSelectorFactory.createSelector('div.test-class:if(time.g-time)');
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));

    selector = ExtendedSelectorFactory.createSelector('#test-if-not > *:if-not(> .test-class)');
    elements = selector.querySelectorAll();
    assert.equal(2, elements.length);
    assert.ok(selector.matches(elements[0]));
});

QUnit.test( "Test + and ~ combinators matching", function(assert) {
    var selectorText, selector, elements;

    selectorText = "* > p ~ #test-id-div a:contains('adg-test')";
    selector = ExtendedSelectorFactory.createSelector(selectorText);
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));

    selectorText = "* > div + style:matches-css(display:none) ~ div > *:matches-css-after(content:/y\\st/)"
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

QUnit.test( "Test :properties", function(assert) {
    var done = assert.async();

    var selectorTexts = [
        ':properties(background-color: rgb\(17, 17, 17\))',
        'div:has(> :properties(background-color: rgb\(17, 17, 17\)))',
        '#test-properties :properties(content:*publicite) + div',
        '#test-properties :properties(content:*publicite)',
        '#test-properties :properties(content:*publicite)'
    ];

    var selectors = selectorTexts.map(function(selectorText) {
        return ExtendedSelectorFactory.createSelector(selectorText);
    });
    window.selectors = selectors;

    var elements, tempStyle;

    elements = selectors[0].querySelectorAll();
    assert.ok(containsElement(
        window['test-properties-background'],
        elements
    ));

    elements = selectors[1].querySelectorAll();
    assert.ok(containsElement(
        window['test-properties-has'],
        elements
    ));

    elements = selectors[2].querySelectorAll();
    assert.notOk(containsElement(
        window['test-properties-dynamic-next'],
        elements
    ));

    tempStyle = addStyle('#test-properties-dynamic::after { content: "publicite" }');

    rAF(function() {
        elements = selectors[2].querySelectorAll();
        assert.ok(containsElement(
            window['test-properties-dynamic-next'],
            elements
        ));
        tempStyle.parentNode.removeChild(tempStyle);
    });

    elements = selectors[3].querySelectorAll();
    assert.notOk(containsElement(
        window['test-properties-dynamic-2'],
        elements
    ));

    window['dynamic-style-2'].innerHTML =
        '#test-properties-dynamic-2::before { content: "publicite" }';

    rAF(function() {
        elements = selectors[3].querySelectorAll();
        assert.ok(containsElement(window['test-properties-dynamic-2'], elements));
    });

    elements = selectors[4].querySelectorAll();
    assert.notOk(containsElement(
        window['test-properties-dynamic-3'],
        elements
    ));

    window['dynamic-style-3'].firstChild.nodeValue =
        '#test-properties-dynamic-3::before { content: "publicite" }';

    rAF(function() {
        elements = selectors[4].querySelectorAll();
        assert.ok(containsElement(window['test-properties-dynamic-3'], elements));
    });

    rAF(done);
});

QUnit.test( "Test :properties with ignored stylesheets", function(assert) {

    var selector = ExtendedSelectorFactory.createSelector(':properties(background-color: rgb\(51, 51, 51\))');

    // First test the regular selector
    var elements = selector.querySelectorAll();
    assert.equal(elements.length, 1);
    assert.equal(elements[0], window['test-properties-ignored-stylesheets-background']);

    // Now set the ignored stylsheets and re-test
    var ignoredStyleNodes = document.querySelectorAll("#ignored-stylesheet");
    assert.ok(ignoredStyleNodes.length);
    StyleObserver.setIgnoredStyleNodes(ignoredStyleNodes);

    // The matching style was in the ignored stylesheet so nothing is selected
    elements = selector.querySelectorAll();
    assert.equal(elements.length, 0);
});

function containsElement(element, list) {
    return Array.prototype.indexOf.call(list, element) !== -1;
}

function addStyle(cssText) {
    var style = document.createElement('style');
    style.appendChild(document.createTextNode(cssText));
    return document.body.appendChild(style);
}

/**
 * We throttle MO callbacks in ExtCss with requestAnimationFrame and setTimeout.
 * Browsers postpone rAF callbacks in inactive tabs for a long time.
 * It throttles setTimeout callbacks as well, but it is called within a
 * relatively short time. (within several seconds)
 * We apply rAF in tests as well to postpone test for similar amount of time.
 */
var rAF = function(fn, timeout) {
    if (window.requestAnimationFrame) {
        requestAnimationFrame(fn);
    } else {
        setTimeout(fn, 100);
    }
};
