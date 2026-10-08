import { EventTracker } from './event-tracker';
import { Context } from './types';
import { natives } from '../../common/utils/natives';
import { createActionArgMatcher } from '../../common/utils/action-arg';

import {
    CLASS_ATTRIBUTE,
    ID_ATTRIBUTE,
    REMOVE_ATTR_PSEUDO_MARKER,
} from '../../common/constants';

/**
 * Creates a checker which decides whether a DOM mutation can affect the applied rules.
 *
 * `id` and `class` attributes are always checked as they are used by selectors,
 * and `remove-attr()` arguments are checked with the corresponding matchers.
 *
 * @param context ExtendedCss context.
 *
 * @returns Mutation relevance checker.
 */
function createMutationRelevanceChecker(context: Context): (mutation: MutationRecord) => boolean {
    const attributeMatchers: Array<(name: string) => boolean> = [];

    for (const rule of context.parsedRules) {
        if (!rule.actionStyles) {
            continue;
        }
        for (const actionStyle of rule.actionStyles) {
            if (actionStyle.property === REMOVE_ATTR_PSEUDO_MARKER) {
                attributeMatchers.push(createActionArgMatcher(actionStyle.value));
            }
        }
    }

    return (mutation: MutationRecord): boolean => {
        if (mutation.type !== 'attributes') {
            return true;
        }
        const attributeName = mutation.attributeName;
        if (!attributeName) {
            return true;
        }
        if (attributeName === ID_ATTRIBUTE || attributeName === CLASS_ATTRIBUTE) {
            return true;
        }
        return attributeMatchers.some((isMatch) => isMatch(attributeName));
    };
}

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
 * Adds new `context.domMutationObserver` instance and connect it to document.
 * 
 * @param context ExtendedCss context.
 */
export function observeDocument(context: Context): void {
    if (context.isDomObserved) {
        return;
    }

    // enable dynamically added elements handling
    context.isDomObserved = true;

    const isRelevantMutation = createMutationRelevanceChecker(context);

    context.domMutationObserver = new natives.MutationObserver(((mutations) => {
        if (!mutations || mutations.length === 0) {
            return;
        }
        // ignore mutations which cannot affect the applied rules
        if (!mutations.some(isRelevantMutation)) {
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
    });
}

/**
 * Disconnect from `context.domMutationObserver`.
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
