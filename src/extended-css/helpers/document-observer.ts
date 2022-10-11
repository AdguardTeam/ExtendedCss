import { EventTracker } from './event-tracker';
import { Context, MainCallback } from './types';
import { natives } from '../../common/utils/natives';

const isEventListenerSupported = typeof window.addEventListener !== 'undefined';

const observeDocument = (context: Context, callback: MainCallback): void => {
    // We are trying to limit the number of callback calls by not calling it on all kind of "hover" events.
    // The rationale behind this is that "hover" events often cause attributes modification,
    // but re-applying extCSS rules will be useless as these attribute changes are usually transient.
    const shouldIgnoreMutations = (mutations: MutationRecord[]) => {
        // ignore if all mutations are about attributes changes
        return mutations.every((m) => m.type === 'attributes');
    };

    if (natives.MutationObserver) {
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
            callback();
        }));
        context.domMutationObserver.observe(document, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['id', 'class'],
        });
    } else if (isEventListenerSupported) {
        document.addEventListener('DOMNodeInserted', callback, false);
        document.addEventListener('DOMNodeRemoved', callback, false);
        document.addEventListener('DOMAttrModified', callback, false);
    }
};

const disconnectDocument = (context: Context, callback: MainCallback): void => {
    if (context.domMutationObserver) {
        context.domMutationObserver.disconnect();
    } else if (isEventListenerSupported) {
        document.removeEventListener('DOMNodeInserted', callback, false);
        document.removeEventListener('DOMNodeRemoved', callback, false);
        document.removeEventListener('DOMAttrModified', callback, false);
    }
    // clean up event listeners
    context.eventTracker?.stopTracking();
};

export const mainObserve = (context: Context, mainCallback: MainCallback): void => {
    if (context.isDomObserved) {
        return;
    }
    // handle dynamically added elements
    context.isDomObserved = true;
    observeDocument(context, mainCallback);
};

export const mainDisconnect = (context: Context, mainCallback: MainCallback): void => {
    if (!context.isDomObserved) {
        return;
    }
    context.isDomObserved = false;
    disconnectDocument(context, mainCallback);
};
