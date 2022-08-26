/**
 * We use EventTracker to track the event that is likely to cause the mutation.
 * The problem is that we cannot use `window.event` directly from the mutation observer call
 * as we're not in the event handler context anymore.
 */
export declare class EventTracker {
    private trackedEvents;
    private lastEvent?;
    private lastEventType?;
    private lastEventTime?;
    constructor();
    private trackEvent;
    private getLastEventType;
    private getTimeSinceLastEvent;
    isIgnoredEventType(): boolean;
}
