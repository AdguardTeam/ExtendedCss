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

    selector = new ExtendedSelector('div a[-ext-contains="adg-test"]');
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));

    selector = new ExtendedSelector('div.test-class[-ext-has="time.g-time"]');
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    assert.ok(selector.matches(elements[0]));

    selector = new ExtendedSelector('div#test-div[-ext-has="test"]');
    elements = selector.querySelectorAll();
    assert.equal(0, elements.length);

    elements = new ExtendedSelector('[-ext-has="div.advert"]').querySelectorAll();
    assert.equal(0, elements.length);

    selector = new ExtendedSelector('[-ext-has="div.test-class-two"]');
    elements = selector.querySelectorAll();
    assert.equal(5, elements.length);
    checkElements(elements, selector);

    selector = new ExtendedSelector('div[-ext-contains="adg-test"][-ext-has="div.test-class-two"]');
    elements = selector.querySelectorAll();
    assert.equal(3, elements.length);
    checkElements(elements, selector);

    selector = new ExtendedSelector('div[-ext-contains="adg-test"][-ext-has="div.test-class-two"][i18n]');
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    checkElements(elements, selector);

    selector = new ExtendedSelector('div[-ext-has="div.test-class-two"]');
    elements = selector.querySelectorAll();
    assert.equal(3, elements.length);
    checkElements(elements, selector);

    selector = new ExtendedSelector('div[-ext-has="div.test-class-two"] > .test-class[-ext-contains="adg-test"]');
    elements = selector.querySelectorAll();
    assert.equal(1, elements.length);
    checkElements(elements, selector);
});