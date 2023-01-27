/**
 * BROWSER_NAME is needed for checking whether the current browser is supported.
 *
 * IMPORTANT: it is used as 'const' instead of 'enum' to avoid side effects
 * during ExtendedCss import into other libraries.
 */
const BROWSER_NAME = {
    CHROME: 'Chrome',
    FIREFOX: 'Firefox',
    EDGE: 'Edg',
    OPERA: 'Opera',
    SAFARI: 'Safari',
    // for puppeteer headless mode
    HEADLESS_CHROME: 'HeadlessChrome',
};

const CHROMIUM_BRAND_NAME = 'Chromium';
const GOOGLE_CHROME_BRAND_NAME = 'Google Chrome';

/**
 * Simple check for Safari browser.
 */
export const isSafariBrowser = navigator.vendor === 'Apple Computer, Inc.';

type BrowserData = {
    MASK: RegExp;
    MIN_VERSION: number;
};

type SupportedBrowsersData = {
    [key: string]: BrowserData;
};

const SUPPORTED_BROWSERS_DATA: SupportedBrowsersData = {
    [BROWSER_NAME.CHROME]: {
        // avoid Chromium-based Edge browser
        // 'EdgA' for android version
        MASK: /\s(Chrome)\/(\d+)\..+\s(?!.*(Edg|EdgA)\/)/,
        MIN_VERSION: 88,
    },
    [BROWSER_NAME.FIREFOX]: {
        MASK: /\s(Firefox)\/(\d+)\./,
        MIN_VERSION: 84,
    },
    [BROWSER_NAME.EDGE]: {
        MASK: /\s(Edg)\/(\d+)\./,
        MIN_VERSION: 88,
    },
    [BROWSER_NAME.OPERA]: {
        MASK: /\s(OPR)\/(\d+)\./,
        MIN_VERSION: 80,
    },
    [BROWSER_NAME.SAFARI]: {
        MASK: /\sVersion\/(\d{2}\.\d)(.+\s|\s)(Safari)\//,
        MIN_VERSION: 14,
    },
    [BROWSER_NAME.HEADLESS_CHROME]: {
        // support headless Chrome used by puppeteer
        MASK: /\s(HeadlessChrome)\/(\d+)\..+\s(?!.*Edg\/)/,
        // version should be the same as for BrowserName.Chrome
        MIN_VERSION: 88,
    },
};

/**
 * Returns chromium brand object or null if not supported.
 * Chromium because of all browsers based on it should be supported as well
 * and it is universal way to check it.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/NavigatorUAData/brands}
 *
 * @param uaDataBrands Array of user agent brand information.
 *
 * @returns Chromium brand data object or null if it is not supported.
 */
const getChromiumBrand = (uaDataBrands: NavigatorUABrandVersion[] | undefined): NavigatorUABrandVersion | null => {
    if (!uaDataBrands) {
        return null;
    }
    // for chromium-based browsers
    const chromiumBrand = uaDataBrands.find((brandData) => {
        return brandData.brand === CHROMIUM_BRAND_NAME
            || brandData.brand === GOOGLE_CHROME_BRAND_NAME;
    });
    return chromiumBrand || null;
};

type BrowserInfo = {
    browserName: string,
    currentVersion: number,
};

/**
 * Parses userAgent string and returns the data object for supported browsers;
 * otherwise returns null.
 *
 * @param userAgent User agent to parse.
 *
 * @returns Parsed userAgent data object if browser is supported, otherwise null.
 */
const parseUserAgent = (userAgent: string): BrowserInfo | null => {
    let browserName;
    let currentVersion;
    const browserNames = Object.values(BROWSER_NAME);

    for (let i = 0; i < browserNames.length; i += 1) {
        let match = null;
        const name = browserNames[i];
        if (name) {
            match = SUPPORTED_BROWSERS_DATA[name]?.MASK.exec(userAgent);
        }
        if (match) {
            // for safari browser the order is different because of regexp
            if (match[3] === browserNames[i]) {
                browserName = match[3];
                currentVersion = Number(match[1]);
            } else {
                // for others first is name and second is version
                browserName = match[1];
                currentVersion = Number(match[2]);
            }
            if (!browserName || !currentVersion) {
                return null;
            }
            return { browserName, currentVersion };
        }
    }

    return null;
};

/**
 * Returns info about browser.
 *
 * @param userAgent User agent of browser.
 * @param uaDataBrands Array of user agent brand information if supported by browser.
 *
 * @returns Data object if browser is supported, otherwise null.
 */
const getBrowserInfoAsSupported = (
    userAgent: string,
    uaDataBrands?: NavigatorUABrandVersion[],
): BrowserInfo | null => {
    const brandData = getChromiumBrand(uaDataBrands);
    if (!brandData) {
        const uaInfo = parseUserAgent(userAgent);
        if (!uaInfo) {
            return null;
        }
        const { browserName, currentVersion } = uaInfo;
        return { browserName, currentVersion };
    }

    // if navigator.userAgentData is supported
    const { brand, version } = brandData;
    // handle chromium-based browsers
    const browserName = brand === CHROMIUM_BRAND_NAME || brand === GOOGLE_CHROME_BRAND_NAME
        ? BROWSER_NAME.CHROME
        : brand;
    return { browserName, currentVersion: Number(version) };
};

/**
 * Checks whether the browser userAgent and userAgentData.brands is supported.
 *
 * @param userAgent User agent of browser.
 * @param uaDataBrands Array of user agent brand information if supported by browser.
 *
 * @returns True if browser is supported.
 */
export const isUserAgentSupported = (
    userAgent: string,
    uaDataBrands?: NavigatorUABrandVersion[],
): boolean => {
    // do not support Internet Explorer
    if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) {
        return false;
    }

    // for local testing purposes
    if (userAgent.includes('jsdom')) {
        return true;
    }

    const browserData = getBrowserInfoAsSupported(userAgent, uaDataBrands);
    if (!browserData) {
        return false;
    }

    const { browserName, currentVersion } = browserData;
    if (!browserName || !currentVersion) {
        return false;
    }
    const minVersion = SUPPORTED_BROWSERS_DATA[browserName]?.MIN_VERSION;
    if (!minVersion) {
        return false;
    }

    return currentVersion >= minVersion;
};

/**
 * Checks whether the current browser is supported.
 *
 * @returns True if *current* browser is supported.
 */
export const isBrowserSupported = (): boolean => {
    return isUserAgentSupported(navigator.userAgent, navigator.userAgentData?.brands);
};
