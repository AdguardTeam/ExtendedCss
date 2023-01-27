const SAFARI_USER_AGENT_REGEXP = /\sVersion\/(\d{2}\.\d)(.+\s|\s)(Safari)\//;

export const isSafariBrowser = SAFARI_USER_AGENT_REGEXP.test(navigator.userAgent);

/**
 * Checks whether the browser userAgent is supported.
 *
 * @param userAgent User agent of browser.
 *
 * @returns False only for Internet Explorer.
 */
export const isUserAgentSupported = (userAgent: string): boolean => {
    // do not support Internet Explorer
    if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) {
        return false;
    }
    return true;
};

/**
 * Checks whether the current browser is supported.
 *
 * @returns False for Internet Explorer, otherwise true.
 */
export const isBrowserSupported = (): boolean => {
    return isUserAgentSupported(navigator.userAgent);
};
