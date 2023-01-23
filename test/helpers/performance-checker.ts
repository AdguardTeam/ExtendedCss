declare global {
    const extCssV1: {
        query(selector: string, noTiming: boolean): Element[];
    };

    const extCssV2: {
        ExtendedCss: {
            query(selector: string): Element[];
        }
    };
}

export type PerformanceResult = {
    selector: string,
    status: boolean,
    elapsed: number,
    count: number,
    average: number,
    result?: string,
};

const LOOP_COUNT = 10 * 1000;
const MAX_ELAPSED_VALUE = 15 * 1000;

/**
 * Runs ExtendedCSS v2 query for selector.
 *
 * @param selector Css selector - standard or extended.
 *
 * @returns Performance result data.
 */
const checkPerformanceV2 = (selector: string): PerformanceResult  => {
    const startTime = new Date().getTime();
    let iCount = LOOP_COUNT;
    let resultOk = true;
    while (iCount--) {
        const nodes = extCssV2.ExtendedCss.query(selector);
        if (!nodes || !nodes.length) {
            resultOk = false;
        }
    }
    const elapsed = new Date().getTime() - startTime;
    if (elapsed > MAX_ELAPSED_VALUE) {
        resultOk = false;
    }
    const resData = {
        selector: selector,
        status: resultOk,
        elapsed: elapsed,
        count: LOOP_COUNT,
        average: elapsed / LOOP_COUNT,
    };
    return resData;
};

/**
 * Runs ExtendedCSS v1 query for selector.
 *
 * @param selector Css selector - standard or extended.
 *
 * @returns Performance result data.
 */
const checkPerformanceV1 = (selector: string): PerformanceResult => {
    const startTime = new Date().getTime();
    let iCount = LOOP_COUNT;
    let resultOk = true;
    while (iCount--) {
        const nodes = extCssV1.query(selector, true);
        if (!nodes || !nodes.length) {
            resultOk = false;
        }
    }
    const elapsed = new Date().getTime() - startTime;
    if (elapsed > MAX_ELAPSED_VALUE) {
        resultOk = false;
    }
    const resData = {
        selector: selector,
        status: resultOk,
        elapsed: elapsed,
        count: LOOP_COUNT,
        average: elapsed / LOOP_COUNT,
    };
    return resData;
};

export const checkPerformance = {
    v1: checkPerformanceV1,
    v2: checkPerformanceV2,
};
