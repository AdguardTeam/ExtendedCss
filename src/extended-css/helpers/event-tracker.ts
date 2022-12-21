import { isSafariBrowser } from '../../common/utils/user-agents';

const LAST_EVENT_TIMEOUT_MS = 10;

const IGNORED_EVENTS = ['mouseover', 'mouseleave', 'mouseenter', 'mouseout'];

const SUPPORTED_EVENTS = [
    // keyboard events
    'keydown', 'keypress', 'keyup',
    // mouse events
    'auxclick', 'click', 'contextmenu', 'dblclick', 'mousedown', 'mouseenter',
    'mouseleave', 'mousemove', 'mouseover', 'mouseout', 'mouseup', 'pointerlockchange',
    'pointerlockerror', 'select', 'wheel',
];

// 'wheel' event makes scrolling in Safari twitchy
// https://github.com/AdguardTeam/ExtendedCss/issues/120
const SAFARI_PROBLEMATIC_EVENTS = ['wheel'];

/**
 * We use EventTracker to track the event that is likely to cause the mutation.
 * The problem is that we cannot use `window.event` directly from the mutation observer call
 * as we're not in the event handler context anymore.
 */
export class EventTracker {
    private trackedEvents: string[];

    private lastEventType?: string;

    private lastEventTime?: number;

    /**
     * Creates new EventTracker.
     */
    constructor() {
        this.trackedEvents = isSafariBrowser
            ? SUPPORTED_EVENTS.filter((event) => !SAFARI_PROBLEMATIC_EVENTS.includes(event))
            : SUPPORTED_EVENTS;

        this.trackedEvents.forEach((eventName) => {
            document.documentElement.addEventListener(eventName, this.trackEvent, true);
        });
    }

    /**
     * Callback for event listener for events tracking.
     *
     * @param event Any event.
     */
    private trackEvent(event: Event): void {
        this.lastEventType = event.type;
        this.lastEventTime = Date.now();
    }

    private getLastEventType = (): string | undefined => this.lastEventType;

    private getTimeSinceLastEvent = (): number | null => {
        if (!this.lastEventTime) {
            return null;
        }
        return Date.now() - this.lastEventTime;
    };

    /**
     * Checks whether the last caught event should be ignored.
     *
     * @returns True if event should be ignored.
     */
    isIgnoredEventType(): boolean {
        const lastEventType = this.getLastEventType();
        const sinceLastEventTime = this.getTimeSinceLastEvent();
        return !!lastEventType
            && IGNORED_EVENTS.includes(lastEventType)
            && !!sinceLastEventTime
            && sinceLastEventTime < LAST_EVENT_TIMEOUT_MS;
    }

    /**
     * Stops event tracking by removing event listener.
     */
    stopTracking(): void {
        this.trackedEvents.forEach((eventName) => {
            document.documentElement.removeEventListener(eventName, this.trackEvent, true);
        });
    }
}
