/**
 * @jest-environment jsdom
 */

import { querySelectorAll } from '../../src/selector';

describe('selector', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('simple -- div', () => {
        const selector = 'div';

        document.body.innerHTML = `<div id="username"></div>`;

        const selectedElements = querySelectorAll(selector, document);

        expect(selectedElements.length).toEqual(1);
        expect(selectedElements[0].tagName.toLowerCase()).toEqual(selector);
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

        expect(selectedElements.length).toEqual(1);

        const testElem = selectedElements[0];
        expect(testElem.tagName.toLowerCase()).toEqual(targetTag);
        expect(testElem.id).toEqual(targetId);
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
        expect(selectedElements.length).toEqual(1);
        const testElem = selectedElements[0];
        expect(testElem.tagName.toLowerCase()).toEqual(targetTag);
        expect(testElem.id).toEqual(targetId);
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
        expect(selectedElements.length).toEqual(1);

        const testElem = selectedElements[0];
        expect(testElem.tagName.toLowerCase()).toEqual(targetTag);
        expect(testElem.id).toEqual(targetId);
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

        expect(selectedElements.length).toEqual(1);

        const testElem = selectedElements[0];
        expect(testElem.tagName.toLowerCase()).toEqual(targetTag);
        expect(testElem.id).toEqual(targetId);
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

        expect(selectedElements.length).toEqual(1);

        const testElem = selectedElements[0];
        expect(testElem.tagName.toLowerCase()).toEqual(targetTag);
        expect(testElem.id).toEqual(targetId);
    });
});
