import { isNumber } from '../../common/utils/numbers';
import { Context } from './types';

const isSupported = (typeof window.requestAnimationFrame !== 'undefined');
const rAF = isSupported ? requestAnimationFrame : window.setTimeout;
const perf = isSupported ? performance : Date;

const DEFAULT_THROTTLE_DELAY_MS = 150;

type WrappedCallback = (timestamp: number) => void;

/**
 * Method for filtering rules applying
 */
type ApplyRulesCallback = (context: Context) => void;

/**
 * The purpose of AsyncWrapper is to debounce calls of the function
 * that applies ExtendedCss rules. The reasoning here is that the function calls
 * are triggered by MutationObserver and there may be many mutations in a short period of time.
 * We do not want to apply rules on every mutation so we use this helper to make sure
 * that there is only one call in the given amount of time.
 */
export class AsyncWrapper {
    private context: Context;

    private callback?: ApplyRulesCallback;

    // number, the provided callback should be executed twice in this time frame
    private throttleDelayMs: number;

    private wrappedCb: WrappedCallback;

    private rAFid?: number;

    private timerId?: number;

    private lastRunTime?: number;

    constructor(context: Context, callback?: ApplyRulesCallback, throttleMs?: number) {
        this.context = context;
        this.callback = callback;
        this.throttleDelayMs = throttleMs || DEFAULT_THROTTLE_DELAY_MS;
        this.wrappedCb = this.wrappedCallback.bind(this);
    }

    private wrappedCallback(timestamp?: number): void {
        this.lastRunTime = isNumber(timestamp)
            ? timestamp
            : perf.now();
        delete this.rAFid;
        delete this.timerId;
        if (this.callback) {
            this.callback(this.context);
        }
    }

    /**
     * Indicates whether there is a scheduled callback.
     */
    private hasPendingCallback(): boolean {
        return isNumber(this.rAFid) || isNumber(this.timerId);
    }

    /**
     * Schedules the function which applies ExtendedCss rules before the next animation frame.
     *
     * Wraps function execution into requestAnimationFrame or setTimeout.
     * For the first time runs the function without any condition.
     * As it may be triggered by any mutation which may occur too ofter, we limit the function execution:
     * 1. If `elapsedTime` since last function execution is less then set `throttleDelayMs`,
     * next function call is hold till the end of throttle interval (subtracting `elapsed` from `throttleDelayMs`);
     * 2. Do nothing if triggered again but function call which is on hold has not yet started its execution.
     */
    run(): void {
        if (this.hasPendingCallback()) {
            // there is a pending execution scheduled
            return;
        }
        if (typeof this.lastRunTime !== 'undefined') {
            const elapsedTime = perf.now() - this.lastRunTime;
            if (elapsedTime < this.throttleDelayMs) {
                this.timerId = window.setTimeout(this.wrappedCb, this.throttleDelayMs - elapsedTime);
                return;
            }
        }
        this.rAFid = rAF(this.wrappedCb);
    }

    public static now(): number {
        return perf.now();
    }
}
