/**
 * @jest-environment jsdom
 */

import { convert } from '../../src/selector/converter';

describe('converter', () => {
    describe('trim selectors', () => {
        const rawSelectors = [
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

        test.each(rawSelectors)('%s', (raw) => {
            expect(convert(raw)).toEqual(expected);
        });
    });

    describe('obvious scope inside has', () => {
        const testsInputs = [
            { actual: 'div:has(:scope > a > img[id])', expected: 'div:has(> a > img[id])' },
            { actual: '.block:-abp-has(:scope > .banner)', expected: '.block:-abp-has(> .banner)' },
            { actual: 'div.r-block:-abp-has(:scope > [id^=one2n-])', expected: 'div.r-block:-abp-has(> [id^=one2n-])' },
        ];
        test.each(testsInputs)('%s', ({ actual, expected }) => {
            expect(convert(actual)).toEqual(expected);
        });
    });

    describe('old matches-css pseudo-classes', () => {
        const testsInputs = [
            {
                actual: 'span:matches-css-before(content:ad*))',
                expected: 'span:matches-css(before,content:ad*))',
            },
            {
                actual: 'span:matches-css-after(content:ad*))',
                expected: 'span:matches-css(after,content:ad*))',
            },
            {
                actual: 'div:matches-css-after(color: rgb(255, 255, 255))',
                expected: 'div:matches-css(after,color: rgb(255, 255, 255))',
            },
        ];
        test.each(testsInputs)('%s', ({ actual, expected }) => {
            expect(convert(actual)).toEqual(expected);
        });
    });

    describe('old syntax', () => {
        const testsInputs = [
            // has
            {
                actual: 'div[-ext-has=".banner"]',
                expected: 'div:has(.banner)',
            },
            {
                actual: 'div.test-class[-ext-has="time.g-time"]',
                expected: 'div.test-class:has(time.g-time)',
            },
            {
                actual: 'div#test-div[-ext-has="#test"]',
                expected: 'div#test-div:has(#test)',
            },
            {
                actual: '[-ext-has="div.advert"]',
                expected: ':has(div.advert)',
            },
            {
                actual: '[-ext-has="div.test-class-two"]',
                expected: ':has(div.test-class-two)',
            },
            {
                actual:  '.block[-ext-has=\'a[href^="https://example.net/"]\']',
                expected: '.block:has(a[href^="https://example.net/"])',
            },
            {
                actual: 'div[style*="z-index:"][-ext-has=\'>div[id$="_content"]>iframe#overlay_iframe\']',
                expected: 'div[style*="z-index:"]:has(>div[id$="_content"]>iframe#overlay_iframe)',
            },
            // contains
            {
                actual: 'div a[-ext-contains="text"]',
                expected: 'div a:contains(text)',
            },
            {
                actual: 'a[-ext-contains=""extra-quotes""]',
                expected: 'a:contains("extra-quotes")',
            },
            {
                actual: 'a[target="_blank"][-ext-contains="Advertisement"]',
                expected: 'a[target="_blank"]:contains(Advertisement)',
            },
            {
                /* eslint-disable max-len */
                actual:  'div[style="text-align: center"] > b[-ext-contains="Ads:"]+a[href^="http://example.com/test.html?id="]+br',
                expected: 'div[style="text-align: center"] > b:contains(Ads:)+a[href^="http://example.com/test.html?id="]+br',
                /* eslint-enable max-len */
            },
            // matches-css
            {
                actual: '#test-matches-css div[-ext-matches-css="background-image: url(data:*)"]',
                expected: '#test-matches-css div:matches-css(background-image: url(data:*))',
            },
            {
                actual: '#test-opacity-property[-ext-matches-css="opacity: 0.9"]',
                expected: '#test-opacity-property:matches-css(opacity: 0.9)',
            },
            {
                actual: '#test-matches-css div[-ext-matches-css-before="content: *find me*"]',
                expected: '#test-matches-css div:matches-css(before,content: *find me*)',
            },
            {
                actual: '#test-matches-css div[-ext-matches-css-after="content: *find me*"]',
                expected: '#test-matches-css div:matches-css(after,content: *find me*)',
            },
            // combinations
            {
                actual: 'div[-ext-contains="adg-test"][-ext-has="div.test-class-two"]',
                expected: 'div:contains(adg-test):has(div.test-class-two)',
            },
            {
                actual: 'div[i18n][-ext-contains="adg-test"][-ext-has="div.test-class-two"]',
                expected: 'div[i18n]:contains(adg-test):has(div.test-class-two)',
            },
            {
                actual: 'div[-ext-has="div.test-class-two"] > .test-class[-ext-contains="test"]',
                expected: 'div:has(div.test-class-two) > .test-class:contains(test)',
            },
            {
                actual: '#sidebar div[class^="text-"][-ext-has=">.box-inner>h2:contains(ads)"]',
                expected: '#sidebar div[class^="text-"]:has(>.box-inner>h2:contains(ads))',
            },
            {
                actual:  '.sidebar > h3[-ext-has="a:contains(Recommended)"]',
                expected: '.sidebar > h3:has(a:contains(Recommended))',
            },
            {
                actual: '.sidebar > h3[-ext-has="a:contains(Recommended)"] + div',
                expected: '.sidebar > h3:has(a:contains(Recommended)) + div',
            },
            {
                actual: '*[-ext-contains=\'/\\s[a-t]{8}$/\'] + *:contains(/^[^\\"\\\'"]{30}quickly/)',
                expected: '*:contains(/\\s[a-t]{8}$/) + *:contains(/^[^\\"\\\'"]{30}quickly/)',
            },
            {
                actual: '[-ext-matches-css-before=\'content:  /^[A-Z][a-z]{2}\\s/  \']',
                expected: ':matches-css(before,content:  /^[A-Z][a-z]{2}\\s/  )',
            },
            {
                actual: '[-ext-has=\'+:matches-css-after( content  :   /(\\d+\\s)*me/  ):contains(/^(?![\\s\\S])/)\']',
                expected: ':has(+:matches-css(after, content  :   /(\\d+\\s)*me/  ):contains(/^(?![\\s\\S])/))',
            },
            {
                /* eslint-disable max-len */
                actual: ':matches-css(    background-image: /^url\\((.)[a-z]{4}:[a-z]{2}\\1nk\\)$/    ) + [-ext-matches-css-before=\'content:  /^[A-Z][a-z]{2}\\s/  \'][-ext-has=\'+:matches-css-after( content  :   /(\\d+\\s)*me/  ):contains(/^(?![\\s\\S])/)\']',
                expected: ':matches-css(    background-image: /^url\\((.)[a-z]{4}:[a-z]{2}\\1nk\\)$/    ) + :matches-css(before,content:  /^[A-Z][a-z]{2}\\s/  ):has(+:matches-css(after, content  :   /(\\d+\\s)*me/  ):contains(/^(?![\\s\\S])/))',
                /* eslint-enable max-len */
            },
        ];
        test.each(testsInputs)('%s', ({ actual, expected }) => {
            expect(convert(actual)).toEqual(expected);
        });
    });

    describe('invalid selectors', () => {
        const error = 'Invalid extended-css old syntax selector';
        const invalidSelectors = [
            '[-ext-matches-css-before=\'content:  /^[A-Z][a-z]',
            '[-ext-has="a[data-item^=\'{sources:\']"',
        ];
        test.each(invalidSelectors)('%s', (selector) => {
            expect(() => {
                convert(selector);
            }).toThrow(error);
        });
    });
});
