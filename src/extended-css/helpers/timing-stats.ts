import { Context } from './types';
import { CssStyleMap } from '../../css-rule';

import { logger } from '../../common/utils/logger';

import { PSEUDO_PROPERTY_POSITIVE_VALUE, REMOVE_PSEUDO_MARKER } from '../../common/constants';

const STATS_DECIMAL_DIGITS_COUNT = 4;

export interface TimingStatsInterface {
    appliesTimings: number[];
    appliesCount: number;
    timingsSum: number;
    meanTiming: number;
    standardDeviation: number;
}

/**
 * A helper class for applied rule stats.
 */
export class TimingStats implements TimingStatsInterface {
    appliesTimings: number[];

    appliesCount: number;

    timingsSum: number;

    meanTiming: number;

    private squaredSum: number;

    standardDeviation: number;

    /**
     * Creates new TimingStats.
     */
    constructor() {
        this.appliesTimings = [];
        this.appliesCount = 0;
        this.timingsSum = 0;
        this.meanTiming = 0;
        this.squaredSum = 0;
        this.standardDeviation = 0;
    }

    /**
     * Observe target element and mark observer as active.
     *
     * @param elapsedTimeMs Time in ms.
     */
    push(elapsedTimeMs: number): void {
        this.appliesTimings.push(elapsedTimeMs);
        this.appliesCount += 1;
        this.timingsSum += elapsedTimeMs;
        this.meanTiming = this.timingsSum / this.appliesCount;
        this.squaredSum += elapsedTimeMs * elapsedTimeMs;
        this.standardDeviation = Math.sqrt((this.squaredSum / this.appliesCount) - Math.pow(this.meanTiming, 2));
    }
}

type SelectorLogData = {
    selectorParsed: string;
    timings: TimingStatsInterface;
    styleApplied?: CssStyleMap | null;
    removed?: boolean;
    matchedElements?: HTMLElement[];
};

type LogStatData = {
    [key: string]: SelectorLogData;
};

/**
 * Makes the timestamps more readable.
 *
 * @param timestamp Raw timestamp.
 *
 * @returns Fine-looking timestamps.
 */
const beautifyTimingNumber = (timestamp: number): number => {
    return Number(timestamp.toFixed(STATS_DECIMAL_DIGITS_COUNT));
};

/**
 * Improves timing stats readability.
 *
 * @param rawTimings Collected timings with raw timestamp.
 *
 * @returns Fine-looking timing stats.
 */
const beautifyTimings = (rawTimings: TimingStatsInterface): TimingStatsInterface => {
    return {
        appliesTimings: rawTimings.appliesTimings.map((t) => beautifyTimingNumber(t)),
        appliesCount: beautifyTimingNumber(rawTimings.appliesCount),
        timingsSum: beautifyTimingNumber(rawTimings.timingsSum),
        meanTiming: beautifyTimingNumber(rawTimings.meanTiming),
        standardDeviation: beautifyTimingNumber(rawTimings.standardDeviation),
    };
};

/**
 * Prints timing information if debugging mode is enabled.
 *
 * @param context ExtendedCss context.
 */
export const printTimingInfo = (context: Context): void => {
    if (context.areTimingsPrinted) {
        return;
    }
    context.areTimingsPrinted = true;

    const timingsLogData: LogStatData = {};

    context.parsedRules.forEach((ruleData) => {
        if (ruleData.timingStats) {
            const { selector, style, debug, matchedElements } = ruleData;
            // style declaration for some rules is parsed to debug property and no style to apply
            // e.g. 'div:has(> a) { debug: true }'
            if (!style && !debug) {
                throw new Error(`Rule should have style declaration for selector: '${selector}'`);
            }
            const selectorData: SelectorLogData = {
                selectorParsed: selector,
                timings: beautifyTimings(ruleData.timingStats),
            };
            // `ruleData.style` may contain `remove` pseudo-property
            // and make logs look better
            if (style && style[REMOVE_PSEUDO_MARKER] === PSEUDO_PROPERTY_POSITIVE_VALUE) {
                selectorData.removed = true;
                // no matchedElements for such case as they are removed after ExtendedCss applied
            } else {
                selectorData.styleApplied = style || null;
                selectorData.matchedElements = matchedElements;
            }
            timingsLogData[selector] = selectorData;
        }
    });

    if (Object.keys(timingsLogData).length === 0) {
        return;
    }
    // add location.href to the message to distinguish frames
    logger.info('[ExtendedCss] Timings in milliseconds for %o:\n%o', window.location.href, timingsLogData);
};
