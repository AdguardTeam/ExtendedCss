import { EventTracker } from './event-tracker';
import { Context } from './types';
import { natives } from '../../common/utils/natives';
import { REGEXP_ACTION_ARG, createActionArgMatcher } from '../../common/utils/action-arg';

import {
    CLASS_ATTRIBUTE,
    ID_ATTRIBUTE,
    REMOVE_ATTR_PSEUDO_MARKER,
} from '../../common/constants';

/**
 * Matches an attribute selector and captures the attribute name.
 */
const ATTRIBUTE_SELECTOR_REGEXP = /\[\s*([^\s\]~|^$*=]+)/g;

/**
 * Data needed to observe DOM mutations which can affect applied rules.
 */
type MutationObservationData = {
    /**
     * Attribute names which should be observed natively,
     * or undefined if all attributes should be observed
     * (e.g. there is a regexp `:remove-attr()` argument).
     */
    attributeFilter?: string[];

    /**
     * Matchers for `:remove-attr()` arguments.
     */
    attributeMatchers: Array<(name: string) => boolean>;

    /**
     * Attribute names used by rule selectors.
     */
    selectorAttributeNames: Set<string>;
};

/**
 * Collects attribute names used in a selector, e.g. 'data-x' from '[data-x="1"]'.
 *
 * The extraction is textual and covers plain attribute names:
 * namespaced (e.g. `[xml|lang]`) or escaped names may be missed,
 * and attribute-like text inside quoted values may be collected as a name.
 *
 * @param selector Selector text.
 *
 * @returns Attribute names found in the selector.
 */
const getSelectorAttributeNames = (selector: string): string[] => {
    const names: string[] = [];
    ATTRIBUTE_SELECTOR_REGEXP.lastIndex = 0;
    let match = ATTRIBUTE_SELECTOR_REGEXP.exec(selector);
    while (match !== null) {
        if (match[1]) {
            names.push(match[1]);
        }
        match = ATTRIBUTE_SELECTOR_REGEXP.exec(selector);
    }
    return names;
};

/**
 * Collects data needed to observe mutations which can affect applied rules.
 *
 * `id` and `class` attributes are always observed as they are used by selectors,
 * attributes used by rule selectors and plain `:remove-attr()` arguments
 * are observed natively, and a regexp `:remove-attr()` argument
 * makes the observer watch all attributes.
 *
 * @param context ExtendedCss context.
 *
 * @returns Data for mutation observation.
 */
const createMutationObservationData = (context: Context): MutationObservationData => {
    const attributeNames = new Set<string>([ID_ATTRIBUTE, CLASS_ATTRIBUTE]);
    const attributeMatchers: Array<(name: string) => boolean> = [];
    const selectorAttributeNames = new Set<string>();
    let hasRegexpActionArg = false;

    context.parsedRules.forEach((rule) => {
        getSelectorAttributeNames(rule.selector).forEach((name) => {
            selectorAttributeNames.add(name);
            attributeNames.add(name);
        });

        rule.actionStyles?.forEach((actionStyle) => {
            if (actionStyle.property !== REMOVE_ATTR_PSEUDO_MARKER) {
                return;
            }
            if (REGEXP_ACTION_ARG.test(actionStyle.value)) {
                // any attribute can match a regexp argument
                hasRegexpActionArg = true;
            } else {
                attributeNames.add(actionStyle.value);
            }
            attributeMatchers.push(createActionArgMatcher(actionStyle.value));
        });
    });

    return {
        // if there is a regexp argument, all attributes should be observed,
        // otherwise the native attribute filter can be used
        attributeFilter: hasRegexpActionArg ? undefined : [...attributeNames],
        attributeMatchers,
        selectorAttributeNames,
    };
};

/**
 * Creates a checker which decides whether a DOM mutation can affect the applied rules.
 *
 * `id` and `class` attributes are always checked as they are used by selectors,
 * attributes used by rule selectors are checked,
 * and `remove-attr()` arguments are checked with the corresponding matchers.
 *
 * @param data Mutation observation data.
 *
 * @returns Mutation relevance checker.
 */
const createMutationRelevanceChecker = (data: MutationObservationData) => (mutation: MutationRecord): boolean => {
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
    if (data.selectorAttributeNames.has(attributeName)) {
        return true;
    }
    return data.attributeMatchers.some((isMatch) => isMatch(attributeName));
};

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

    const observationData = createMutationObservationData(context);
    const isRelevantMutation = createMutationRelevanceChecker(observationData);

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
        ...(observationData.attributeFilter
            ? { attributeFilter: observationData.attributeFilter }
            : {}),
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
