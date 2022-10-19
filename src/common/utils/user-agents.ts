enum BrowserName {
    Chrome = 'Chrome',
    Firefox = 'Firefox',
    Edge = 'Edg',
    Opera = 'Opera',
    Safari = 'Safari',
}

const CHROMIUM_BRAND_NAME = 'Chromium';
const GOOGLE_CHROME_BRAND_NAME = 'Google Chrome';

/**
 * Simple check for Safari browser.
 */
export const isSafariBrowser = navigator.vendor === 'Apple Computer, Inc.';

interface BrowserData {
    MASK: RegExp;
    MIN_VERSION: number;
}

type SupportedBrowsersData = {
    [key: string]: BrowserData;
};

const SUPPORTED_BROWSERS_DATA: SupportedBrowsersData = {
    [BrowserName.Chrome]: {
        // avoid Chromium-based Edge browser
        MASK: /\s(Chrome)\/(\d+)\..+\s(?!.*Edg\/)/,
        MIN_VERSION: 55,
    },
    [BrowserName.Firefox]: {
        MASK: /\s(Firefox)\/(\d+)\./,
        MIN_VERSION: 52,
    },
    [BrowserName.Edge]: {
        MASK: /\s(Edg)\/(\d+)\./,
        MIN_VERSION: 80,
    },
    [BrowserName.Opera]: {
        MASK: /\s(OPR)\/(\d+)\./,
        MIN_VERSION: 80,
    },
    [BrowserName.Safari]: {
        MASK: /\sVersion\/(\d+)\..+\s(Safari)\//,
        MIN_VERSION: 10,
    },
};

/**
 * Returns chromium brand object from navigator.userAgentData.brands or null if not supported.
 * Chromium because of all browsers based on it should be supported as well
 * and it is universal way to check it.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/NavigatorUAData/brands}
 */
const getChromiumBrand = (): NavigatorUABrandVersion | null => {
    const brandsData = navigator.userAgentData?.brands;
    if (!brandsData) {
        return null;
    }
    // for chromium-based browsers
    const chromiumBrand = brandsData.find((brandData) => {
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
 */
const parseUserAgent = (): BrowserInfo | null => {
    let browserName;
    let currentVersion;
    const browserNames = Object.values(BrowserName);

    for (let i = 0; i < browserNames.length; i += 1) {
        const match = SUPPORTED_BROWSERS_DATA[browserNames[i]].MASK.exec(navigator.userAgent);
        if (match) {
            // for safari order is different because of regexp
            if (match[2] === browserNames[i]) {
                browserName = match[2];
                currentVersion = Number(match[1]);
            } else {
                // for others first is name and second is version
                browserName = match[1];
                currentVersion = Number(match[2]);
            }
            return { browserName, currentVersion };
        }
    }

    return null;
};

/**
 * Gets info about current browser.
 */
const getCurrentBrowserInfoAsSupported = (): BrowserInfo | null => {
    const brandData = getChromiumBrand();
    if (!brandData) {
        const uaInfo = parseUserAgent();
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
        ? BrowserName.Chrome
        : brand;
    return { browserName, currentVersion: Number(version) };
};

/**
 * Checks whether the current browser is supported.
 */
export const isBrowserSupported = (): boolean => {
    const ua = navigator.userAgent;
    // do not support Internet Explorer
    if (ua.includes('MSIE') || ua.includes('Trident/')) {
        return false;
    }

    // for local testing purposes
    if (ua.includes('jsdom')) {
        return true;
    }

    const currentBrowserData = getCurrentBrowserInfoAsSupported();
    if (!currentBrowserData) {
        return false;
    }

    const { browserName, currentVersion } = currentBrowserData;

    return currentVersion >= SUPPORTED_BROWSERS_DATA[browserName].MIN_VERSION;
};
