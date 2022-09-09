import { Context } from './types';
import { logger } from '../../common/utils/logger';

/**
 * A helper class for applied rule stats
 */
export class TimingStats {
    private array: number[];

    length: number;

    private sum: number;

    private squaredSum: number;

    private mean?: number;

    private stddev: number;

    constructor() {
        this.array = [];
        this.length = 0;
        this.sum = 0;
        this.squaredSum = 0;
        this.stddev = 0;
    }

    /**
     * Observe target element and mark observer as active
     */
    push(dataPoint: number): void {
        this.array.push(dataPoint);
        this.length += 1;
        this.sum += dataPoint;
        this.squaredSum += dataPoint * dataPoint;
        this.mean = this.sum / this.length;
        this.stddev = Math.sqrt((this.squaredSum / this.length) - Math.pow(this.mean, 2));
    }
}

interface LoggingStat {
    selector: string,
    timings: TimingStats,
}

/**
 * Prints timing information if debugging mode is enabled
 */
export const printTimingInfo = (context: Context): void => {
    if (context.areTimingsPrinted) {
        return;
    }
    context.areTimingsPrinted = true;

    const timingsToLog: LoggingStat[] = [];

    context.parsedRules.forEach((rule) => {
        if (rule.timingStats) {
            const record = {
                selector: rule.selector,
                timings: rule.timingStats,
            };
            timingsToLog.push(record);
        }
    });

    if (timingsToLog.length === 0) {
        return;
    }
    // add location.href to the message to distinguish frames
    logger.info('[ExtendedCss] Timings in milliseconds for %o:\n%o', window.location.href, timingsToLog);
};
