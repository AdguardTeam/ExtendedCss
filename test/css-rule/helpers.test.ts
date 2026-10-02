/**
 * @vitest-environment jsdom
 */

import { parseActionSelector } from '../../src/css-rule';

import {
    REMOVE_ERROR_PREFIX,
    REMOVE_ATTR_ERROR_PREFIX,
    REMOVE_CLASS_ERROR_PREFIX,
} from '../../src/common/constants';

type TestStyle = {
    property: string;
    value: string;
};

type TestSelectorData = {
    selector: string,
    stylesOfSelector: TestStyle[],
};

type SingleRuleInput = {
    // input selector to parser
    actual: string,
    // expected parsed data
    expected: TestSelectorData,
};

const expectParsedSelectorData = (input: SingleRuleInput): void => {
    const { actual, expected } = input;
    const parsed = parseActionSelector(actual);
    expect(parsed).toEqual(expected);
};

type ToThrowOnSelectorInput = {
    // selector for extCss querySelectorAll()
    selector: string,
    // error text to match
    error: string,
};

const expectToThrowOnSelector = (input: ToThrowOnSelectorInput): void => {
    const { selector, error } = input;
    expect(() => {
        parseActionSelector(selector);
    }).toThrow(error);
};

const REMOVE_PROPERTY_STYLE = {
    property: 'remove',
    value: 'true',
};

describe('parse remove selector', () => {
    describe('valid selectors without :remove()', () => {
        const testsInputs = [
            {
                actual: '.banner',
                expected: {
                    selector: '.banner',
                    stylesOfSelector: [],
                },
            },
            {
                actual: '.banner > :not(.content)',
                expected: {
                    selector: '.banner > :not(.content)',
                    stylesOfSelector: [],
                },
            },
        ];
        test.each(testsInputs)('%s', (input) => expectParsedSelectorData(input));
    });

    describe('valid selectors with :remove()', () => {
        const testsInputs = [
            {
                actual: '.banner:remove()',
                expected: {
                    selector: '.banner',
                    stylesOfSelector: [REMOVE_PROPERTY_STYLE],
                },
            },
            {
                actual: 'div[id][class][style]:remove()',
                expected: {
                    selector: 'div[id][class][style]',
                    stylesOfSelector: [REMOVE_PROPERTY_STYLE],
                },
            },
            {
                actual: '.banner > *:remove()',
                expected: {
                    selector: '.banner > *',
                    stylesOfSelector: [REMOVE_PROPERTY_STYLE],
                },
            },
            {
                actual: 'div:upward(.ads):remove()',
                expected: {
                    selector: 'div:upward(.ads)',
                    stylesOfSelector: [REMOVE_PROPERTY_STYLE],
                },
            },
            {
                actual: 'body > div:not([id]):not([class]):not([style]):empty:remove()',
                expected: {
                    selector: 'body > div:not([id]):not([class]):not([style]):empty',
                    stylesOfSelector: [REMOVE_PROPERTY_STYLE],
                },
            },
            {
                actual: '#main div[id*="_containerWrap_"]:has(img[src$="Banner/ad.jpg"]):remove()',
                expected: {
                    selector: '#main div[id*="_containerWrap_"]:has(img[src$="Banner/ad.jpg"])',
                    stylesOfSelector: [REMOVE_PROPERTY_STYLE],
                },
            },
            {
                actual: '#main > div[id*="-ad-"]:remove()',
                expected: {
                    selector: '#main > div[id*="-ad-"]',
                    stylesOfSelector: [REMOVE_PROPERTY_STYLE],
                },
            },
            {
                actual: 'div[class*="Banner"] div[data-index].swiper-slide:has(a[href^="/banners/"]):remove()',
                expected: {
                    selector: 'div[class*="Banner"] div[data-index].swiper-slide:has(a[href^="/banners/"])',
                    stylesOfSelector: [REMOVE_PROPERTY_STYLE],
                },
            },
            {
                actual: '.banner_inner li.swiper-slide:has(img[src*="example.com/ad/"]):remove()',
                expected: {
                    selector: '.banner_inner li.swiper-slide:has(img[src*="example.com/ad/"])',
                    stylesOfSelector: [REMOVE_PROPERTY_STYLE],
                },
            },
            {
                actual: '.tabs__list > li[data-adv_yn="Y"].item:remove()',
                expected: {
                    selector: '.tabs__list > li[data-adv_yn="Y"].item',
                    stylesOfSelector: [REMOVE_PROPERTY_STYLE],
                },
            },
            {
                actual: 'li.search-product__ad-badge:remove()',
                expected: {
                    selector: 'li.search-product__ad-badge',
                    stylesOfSelector: [REMOVE_PROPERTY_STYLE],
                },
            },
            {
                actual: '.container > div[id^="ad"].cont:contains(AD):remove()',
                expected: {
                    selector: '.container > div[id^="ad"].cont:contains(AD)',
                    stylesOfSelector: [REMOVE_PROPERTY_STYLE],
                },
            },

        ];
        test.each(testsInputs)('%s', (input) => expectParsedSelectorData(input));
    });

    describe('invalid selectors', () => {
        const toThrowInputs = [
            { selector: ':remove()', error: REMOVE_ERROR_PREFIX.NO_TARGET_SELECTOR },
            { selector: '.block:remove() > .banner:remove()', error: REMOVE_ERROR_PREFIX.MULTIPLE_USAGE },
            { selector: '.block:remove():upward(2)', error: REMOVE_ERROR_PREFIX.INVALID_POSITION },
            { selector: 'div:remove():contains(/test-content/)', error: REMOVE_ERROR_PREFIX.INVALID_POSITION },
            { selector: '.banner:has(> div[class]):remove():upward()', error: REMOVE_ERROR_PREFIX.INVALID_POSITION },
            { selector: 'div:remove(0)', error: REMOVE_ERROR_PREFIX.INVALID_ARG },
            { selector: 'div:not([class]):remove(invalid)', error: REMOVE_ERROR_PREFIX.INVALID_ARG },
        ];
        test.each(toThrowInputs)('%s', (input) => expectToThrowOnSelector(input));
    });
});

describe('parse action selector -- :remove-attr() and :remove-class()', () => {
    describe('valid selectors', () => {
        const testsInputs = [
            {
                actual: '.banner:remove-attr(href)',
                expected: {
                    selector: '.banner',
                    stylesOfSelector: [{ property: 'remove-attr', value: 'href' }],
                },
            },
            {
                actual: 'a[href]:remove-attr("data-ad")',
                expected: {
                    selector: 'a[href]',
                    stylesOfSelector: [{ property: 'remove-attr', value: 'data-ad' }],
                },
            },
            {
                actual: 'div:remove-attr(/^on[a-z]+/)',
                expected: {
                    selector: 'div',
                    stylesOfSelector: [{ property: 'remove-attr', value: '/^on[a-z]+/' }],
                },
            },
            {
                actual: 'div:remove-attr(/^data-(foo|bar)$/i)',
                expected: {
                    selector: 'div',
                    stylesOfSelector: [{ property: 'remove-attr', value: '/^data-(foo|bar)$/i' }],
                },
            },
            {
                actual: 'div:remove-attr(/[)]/)',
                expected: {
                    selector: 'div',
                    stylesOfSelector: [{ property: 'remove-attr', value: '/[)]/' }],
                },
            },
            {
                actual: 'div:remove-attr(/[(]/)',
                expected: {
                    selector: 'div',
                    stylesOfSelector: [{ property: 'remove-attr', value: '/[(]/' }],
                },
            },
            {
                actual: 'div:remove-class(/[/]/)',
                expected: {
                    selector: 'div',
                    stylesOfSelector: [{ property: 'remove-class', value: '/[/]/' }],
                },
            },
            {
                actual: '.banner:has(> a):remove-class(ads)',
                expected: {
                    selector: '.banner:has(> a)',
                    stylesOfSelector: [{ property: 'remove-class', value: 'ads' }],
                },
            },
            {
                actual: "div[data-x=':remove-attr(y)']",
                expected: {
                    selector: "div[data-x=':remove-attr(y)']",
                    stylesOfSelector: [],
                },
            },
            {
                actual: 'div:REMOVE-ATTR(href)',
                expected: {
                    selector: 'div',
                    stylesOfSelector: [{ property: 'remove-attr', value: 'href' }],
                },
            },
            {
                actual: 'div:Remove-Class(ads)',
                expected: {
                    selector: 'div',
                    stylesOfSelector: [{ property: 'remove-class', value: 'ads' }],
                },
            },
        ];
        test.each(testsInputs)('%s', (input) => expectParsedSelectorData(input));
    });

    describe('invalid selectors', () => {
        const toThrowInputs = [
            { selector: ':remove-attr(href)', error: REMOVE_ATTR_ERROR_PREFIX.NO_TARGET_SELECTOR },
            { selector: 'div:remove-attr(href) > a', error: REMOVE_ATTR_ERROR_PREFIX.INVALID_POSITION },
            { selector: 'div:remove-attr(href):remove-class(ads)', error: REMOVE_ATTR_ERROR_PREFIX.MULTIPLE_USAGE },
            {
                selector: 'div:remove-attr(/[)]/):remove-class(ads)',
                error: REMOVE_ATTR_ERROR_PREFIX.MULTIPLE_USAGE,
            },
            { selector: 'div:remove-attr()', error: REMOVE_ATTR_ERROR_PREFIX.INVALID_ARG },
            { selector: 'div:remove-attr(href', error: REMOVE_ATTR_ERROR_PREFIX.INVALID_ACTION },
            { selector: 'div:remove-attr(//)', error: REMOVE_ATTR_ERROR_PREFIX.INVALID_ARG },
            { selector: 'div:remove-attr(/+/)', error: REMOVE_ATTR_ERROR_PREFIX.INVALID_ARG },
            { selector: 'div:remove-attr(/[/)', error: REMOVE_ATTR_ERROR_PREFIX.INVALID_ARG },
            { selector: 'div:remove-attr(/x/ii)', error: REMOVE_ATTR_ERROR_PREFIX.INVALID_ARG },
            { selector: 'div:remove-attr("foo bar")', error: REMOVE_ATTR_ERROR_PREFIX.INVALID_ARG },
            { selector: 'div:remove-class(/+/)', error: REMOVE_CLASS_ERROR_PREFIX.INVALID_ARG },
            { selector: ':remove-class(ads)', error: REMOVE_CLASS_ERROR_PREFIX.NO_TARGET_SELECTOR },
            { selector: 'div:remove-class(ads):upward(1)', error: REMOVE_CLASS_ERROR_PREFIX.INVALID_POSITION },
            { selector: 'div:remove-class()', error: REMOVE_CLASS_ERROR_PREFIX.INVALID_ARG },
            { selector: 'div:remove-class(a) > div:remove-class(b)', error: REMOVE_CLASS_ERROR_PREFIX.MULTIPLE_USAGE },
        ];
        test.each(toThrowInputs)('%s', (input) => expectToThrowOnSelector(input));
    });

    describe('action pseudo-classes inside other pseudo-classes', () => {
        it('should not be stripped from the selector', () => {
            expect(parseActionSelector('div:has(:remove-attr(href))')).toEqual({
                selector: 'div:has(:remove-attr(href))',
                stylesOfSelector: [],
            });
        });
    });
});
