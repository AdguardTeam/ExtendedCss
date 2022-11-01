import { isNumber } from '../../common/utils/numbers';
import { Context } from './types';

const isSupported = (typeof window.requestAnimationFrame !== 'undefined');
const timeout = isSupported ? requestAnimationFrame : window.setTimeout;
const deleteTimeout = isSupported ? cancelAnimationFrame : clearTimeout;
const perf = isSupported ? performance : Date;

const DEFAULT_THROTTLE_DELAY_MS = 150;

type WrappedCallback = (timestamp?: number) => void;

/**
 * Method for filtering rules applying.
 */
type ApplyRulesCallback = (context: Context) => void;

/**
 * The purpose of ThrottleWrapper is to throttle calls of the function
 * that applies ExtendedCss rules. The reasoning here is that the function calls
 * are triggered by MutationObserver and there may be many mutations in a short period of time.
 * We do not want to apply rules on every mutation so we use this helper to make sure
 * that there is only one call in the given amount of time.
 */
export class ThrottleWrapper {
    private context: Context;

    private callback?: ApplyRulesCallback;

    /**
     * The provided callback should be executed twice in this time frame:
     * very first time and not more often than throttleDelayMs for further executions.
     *
     * @see {@link ThrottleWrapper.run}
     */
    private throttleDelayMs: number;

    private wrappedCb: WrappedCallback;

    private timeoutId?: number;

    private timerId?: number;

    private lastRunTime?: number;

    /**
     * Creates new ThrottleWrapper.
     *
     * @param context ExtendedCss context.
     * @param callback The callback.
     * @param throttleMs Throttle delay in ms.
     */
    constructor(context: Context, callback?: ApplyRulesCallback, throttleMs?: number) {
        this.context = context;
        this.callback = callback;
        this.throttleDelayMs = throttleMs || DEFAULT_THROTTLE_DELAY_MS;
        this.wrappedCb = this.wrappedCallback.bind(this);
    }

    /**
     * Wraps the callback (which supposed to be `applyRules`),
     * needed to update `lastRunTime` and clean previous timeouts for proper execution of the callback.
     *
     * @param timestamp Timestamp.
     */
    private wrappedCallback(timestamp?: number): void {
        this.lastRunTime = isNumber(timestamp)
            ? timestamp
            : perf.now();
        // `timeoutId` can be requestAnimationFrame-related
        // so cancelAnimationFrame() as deleteTimeout() needs the arg to be defined
        if (this.timeoutId) {
            deleteTimeout(this.timeoutId);
            delete this.timeoutId;
        }
        clearTimeout(this.timerId);
        delete this.timerId;
        if (this.callback) {
            this.callback(this.context);
        }
    }

    /**
     * Indicates whether there is a scheduled callback.
     */
    private hasPendingCallback(): boolean {
        return isNumber(this.timeoutId) || isNumber(this.timerId);
    }

    /**
     * Schedules the function which applies ExtendedCss rules before the next animation frame.
     *
     * Wraps function execution into `timeout` — requestAnimationFrame or setTimeout.
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
        this.timeoutId = timeout(this.wrappedCb);
    }

    /**
     * Returns timestamp for 'now'.
     */
    public static now(): number {
        return perf.now();
    }
}
