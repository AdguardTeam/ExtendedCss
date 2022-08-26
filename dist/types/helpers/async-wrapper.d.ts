import { Context } from '../extended-css';
/**
 * Method for filtering rules applying
 */
declare type ApplyRulesCallback = (context: Context) => void;
/**
 * A helper class to throttle function calls with setTimeout and requestAnimationFrame
 */
export declare class AsyncWrapper {
    private context;
    private callback?;
    private throttle;
    private wrappedCb;
    private rAFid?;
    private timerId?;
    private lastRun?;
    constructor(context: Context, callback?: ApplyRulesCallback, throttle?: number);
    private wrappedCallback;
    /**
     * Indicates whether there is a scheduled callback.
     */
    private hasPendingCallback;
    /**
     * Schedules a function call before the next animation frame.
     */
    run(): void;
    static now(): number;
}
export {};
