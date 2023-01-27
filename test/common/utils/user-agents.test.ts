/**
 * @jest-environment jsdom
 */

import { isUserAgentSupported } from '../../../src/common/utils/user-agents';

/* eslint-disable max-len */
describe('check user-agents', () => {
    describe('check user-agents', () => {
        const supportedUserAgents = [
            // chrome 88
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 12_1_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.96 Safari/537.36',
            // firefox 84
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:84.0) Gecko/20100101 Firefox/84.0',
            // edge 88
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.96 Safari/537.36 Edg/88.0.705.50',
            // opera 80
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36 OPR/80.0.4170.63',
            // safari 14
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/608.33 (KHTML, like Gecko) Version/14.5 Safari/608.33',
            // user-agent of jsdom
            'Mozilla/5.0 (darwin) AppleWebKit/537.36 (KHTML, like Gecko) jsdom/20.0.3',
            // headless chrome 88
            // corelibs-test-runner uses puppeteer which uses "headless chrome", not just "chrome"
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_0) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/88.0.4298.0 Safari/537.36',
        ];
        test.each(supportedUserAgents)('%s', (userAgent) => {
            expect(isUserAgentSupported(userAgent)).toBeTruthy();
        });
    });

    describe('not supported', () => {
        const unsupportedUserAgents = [
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
