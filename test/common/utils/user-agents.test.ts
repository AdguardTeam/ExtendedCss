/**
 * @jest-environment jsdom
 */

import { isUserAgentSupported } from '../../../src/common/utils/user-agents';

/* eslint-disable max-len */
describe('check user-agents', () => {
    describe('check user-agents', () => {
        const supportedUserAgents = [
            // chrome 55
            'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
            // firefox 52
            'Mozilla/5.0 (Windows NT 5.1; rv:52.0) Gecko/20100101 Firefox/52.0',
            // edge 80
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3971.0 Safari/537.36 Edg/80.0.341.0',
            // opera 80
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36 OPR/80.0.4170.63',
            // safari 11.1
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/11.1 Safari/605.1.15',
            // user-agent of jsdom
            'Mozilla/5.0 (darwin) AppleWebKit/537.36 (KHTML, like Gecko) jsdom/20.0.3',
            // headless chrome which is used in puppeteer (for corelibs-test-runner)
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_16_0) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/80.0.3987.0 Safari/537.36',
        ];
        test.each(supportedUserAgents)('%s', (userAgent) => {
            expect(isUserAgentSupported(userAgent)).toBeTruthy();
        });
    });

    describe('not supported', () => {
        const unsupportedUserAgents = [
            // chrome 54
            'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36',
            // firefox 51
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:51.0) Gecko/20100101 Firefox/51.0',
            // edge 79
            'Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.74 Safari/537.36 Edg/79.0.309.43',
            // safari 11.0
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 11.0) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/11.0 Safari/602.1.50',
            // internet explorer
            // https://www.whatismybrowser.com/guides/the-latest-user-agent/internet-explorer
            'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 5.1; Trident/4.0)',
            'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0)',
            'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0)',
            'Mozilla/4.0 (compatible; MSIE 9.0; Windows NT 6.0; Trident/5.0)',
            'Mozilla/4.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)',
            'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)',
            'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0)',
            'Mozilla/5.0 (Windows NT 6.1; Trident/7.0; rv:11.0) like Gecko',
            'Mozilla/5.0 (Windows NT 6.2; Trident/7.0; rv:11.0) like Gecko',
            'Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko',
            'Mozilla/5.0 (Windows NT 10.0; Trident/7.0; rv:11.0) like Gecko',
            // opera is supported since version 80 as it is the oldest version
            // which can be tested in browserstack and we can be sure about it
        ];
        test.each(unsupportedUserAgents)('%s', (userAgent) => {
            expect(isUserAgentSupported(userAgent)).toBeFalsy();
        });
    });
});
/* eslint-enable max-len */
