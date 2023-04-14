import { EventTracker } from './event-tracker';
import { Context } from './types';
import { natives } from '../../common/utils/natives';

/**
 * We are trying to limit the number of callback calls by not calling it on all kind of "hover" events.
 * The rationale behind this is that "hover" events often cause attributes modification,
 * but re-applying extCSS rules will be useless as these attribute changes are usually transient.
 *
 * @param mutations DOM elements mutation records.
 * @returns True if all mutations are about attributes changes, otherwise false.
 */
function shouldIgnoreMutations(mutations: MutationRecord[]): boolean {
    // ignore if all mutations are about attributes changes
    return !mutations.some((m) => m.type !== 'attributes');
}

/**
 * Adds new {@link context.domMutationObserver} instance and connect it to document.
 * 
 * @param context ExtendedCss context.
 */
export function observeDocument(context: Context): void {
    if (context.isDomObserved) {
        return;
    }

    // enable dynamically added elements handling
    context.isDomObserved = true;

    context.domMutationObserver = new natives.MutationObserver(((mutations) => {
        if (!mutations || mutations.length === 0) {
            return;
        }
        const eventTracker = new EventTracker();

        if (eventTracker.isIgnoredEventType() && shouldIgnoreMutations(mutations)) {
            return;
        }
        // save instance of EventTracker to context
        // for removing its event listeners on disconnectDocument() while mainDisconnect()
        context.eventTracker = eventTracker;
        context.scheduler.run();
    }));

    context.domMutationObserver.observe(document, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['id', 'class'],
    });
}

/**
 * Disconnect from {@link context.domMutationObserver}.
 * 
 * @param context ExtendedCss context.
 */
export function disconnectDocument(context: Context): void {
    if (!context.isDomObserved) {
        return;
    }

    // disable dynamically added elements handling
    context.isDomObserved = false;

    if (context.domMutationObserver) {
        context.domMutationObserver.disconnect();
    }

    // clean up event listeners
    if (context.eventTracker) {
        context.eventTracker.stopTracking();
    }
}
