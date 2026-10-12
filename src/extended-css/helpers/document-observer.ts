import { EventTracker } from './event-tracker';
import { Context } from './types';
import { natives } from '../../common/utils/natives';
import { REGEXP_ACTION_ARG, createActionArgMatcher } from '../../common/utils/action-arg';

import {
    ASTERISK,
    CLASS_ATTRIBUTE,
    DOUBLE_QUOTE,
    EQUAL_SIGN,
    ID_ATTRIBUTE,
    MATCHES_ATTR_PSEUDO_CLASS_MARKER,
    REMOVE_ATTR_PSEUDO_MARKER,
    SINGLE_QUOTE,
    SLASH,
} from '../../common/constants';

/**
 * Matches a CSS attribute selector and captures the attribute name.
 */
const ATTRIBUTE_SELECTOR_REGEXP = /\[\s*([a-zA-Z_][\w-]*)/g;

/**
 * Matches an attribute reference inside an `:xpath()` argument, e.g. `@data-on`.
 */
const XPATH_ATTRIBUTE_REGEXP = /@([\w-]+)/g;

/**
 * Matches a `:matches-attr()` pseudo-class and captures its argument:
 * a regexp literal (which can contain parentheses) or a plain name pattern.
 */
const MATCHES_ATTR_REGEXP = new RegExp(
    `:${MATCHES_ATTR_PSEUDO_CLASS_MARKER}\\(\\s*(\\/(?:\\\\.|[^/\\\\])*\\/[a-z]*|[^)]+)\\)`,
    'gi',
);

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
     * Matchers for `:remove-attr()` arguments and regexp or wildcard
     * `:matches-attr()` names.
     */
    attributeMatchers: Array<(name: string) => boolean>;

    /**
     * Attribute names used by action rule selectors.
     */
    selectorAttributeNames: Set<string>;
};

/**
 * Collects captured values of a regexp into the names array.
 *
 * @param input Scanned string.
 * @param regexp Regexp with a capturing group.
 * @param names Array to push captured values to.
 */
const collectMatches = (input: string, regexp: RegExp, names: string[]): void => {
    regexp.lastIndex = 0;
    let match = regexp.exec(input);
    while (match !== null) {
        if (match[1]) {
            names.push(match[1]);
        }
        match = regexp.exec(input);
    }
};

/**
 * Removes surrounding quotes from a value if they are present.
 *
 * @param value Value to process.
 *
 * @returns Value without surrounding quotes.
 */
const stripQuotes = (value: string): string => {
    if (value.length > 1
        && ((value.startsWith(DOUBLE_QUOTE) && value.endsWith(DOUBLE_QUOTE))
            || (value.startsWith(SINGLE_QUOTE) && value.endsWith(SINGLE_QUOTE)))) {
        return value.slice(1, -1);
    }
    return value;
};

/**
 * Collects attribute names used in a selector, e.g. 'data-x' from '[data-x="1"]'.
 *
 * The extraction is textual and covers plain attribute names:
 * namespaced (e.g. `[xml|lang]`) or escaped names may be missed,
 * and attribute-like text inside quoted values may be collected as a name.
 * False positives only widen the observation, so they are harmless.
 *
 * @param selector Selector text.
 *
 * @returns Lower-cased attribute names found in the selector.
 */
const getSelectorAttributeNames = (selector: string): string[] => {
    const names: string[] = [];
    // CSS attribute selectors
    collectMatches(selector, ATTRIBUTE_SELECTOR_REGEXP, names);
    // attribute references inside :xpath() arguments, e.g. '@data-on'
    collectMatches(selector, XPATH_ATTRIBUTE_REGEXP, names);
    return names.map((name) => name.toLowerCase());
};

/**
 * Collects `:matches-attr()` name arguments from a selector.
 *
 * @param selector Selector text.
 *
 * @returns Name arguments of `:matches-attr()` pseudo-classes.
 */
const getMatchesAttrNames = (selector: string): string[] => {
    const args: string[] = [];
    collectMatches(selector, MATCHES_ATTR_REGEXP, args);
    return args.map((arg) => stripQuotes((arg.split(EQUAL_SIGN)[0] ?? '').trim()));
};

/**
 * Creates a matcher for a regexp or wildcard `:matches-attr()` name.
 *
 * @param pattern Name pattern: a regexp literal or a wildcard string.
 *
 * @returns Attribute name matcher.
 */
const createAttributeNameMatcher = (pattern: string): ((name: string) => boolean) => {
    if (REGEXP_ACTION_ARG.test(pattern)) {
        return createActionArgMatcher(pattern);
    }
    // escape regexp special characters except `*`, then use `*` as a wildcard
    const regexpSource = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
    const regexp = new RegExp(`^${regexpSource}$`, 'i');
    return (name: string) => regexp.test(name);
};

/**
 * Collects data needed to observe mutations which can affect applied rules.
 *
 * `id` and `class` attributes are always observed as they are used by selectors.
 * Attributes used by action rule selectors and plain `:remove-attr()` arguments
 * are observed natively; a regexp `:remove-attr()` argument or a regexp or
 * wildcard `:matches-attr()` name makes the observer watch all attributes.
 *
 * @param context ExtendedCss context.
 *
 * @returns Data for mutation observation.
 */
const createMutationObservationData = (context: Context): MutationObservationData => {
    const attributeNames = new Set<string>([ID_ATTRIBUTE, CLASS_ATTRIBUTE]);
    const attributeMatchers: Array<(name: string) => boolean> = [];
    const selectorAttributeNames = new Set<string>();
    let observeAllAttributes = false;

    context.parsedRules.forEach((rule) => {
        // only action rules need to react to changes of attributes
        // used by their selectors: actions are re-applied on mutations,
        // while regular rules react only to `id`/`class` changes as before
        if (!rule.actionStyles?.length) {
            return;
        }

        getSelectorAttributeNames(rule.selector).forEach((name) => {
            selectorAttributeNames.add(name);
            attributeNames.add(name);
        });

        getMatchesAttrNames(rule.selector).forEach((name) => {
            if (name.startsWith(SLASH) || name.includes(ASTERISK)) {
                // a regexp or wildcard name can match any attribute
                observeAllAttributes = true;
                attributeMatchers.push(createAttributeNameMatcher(name));
            } else if (name) {
                const lowerCasedName = name.toLowerCase();
                selectorAttributeNames.add(lowerCasedName);
                attributeNames.add(lowerCasedName);
            }
        });

        rule.actionStyles.forEach((actionStyle) => {
            if (actionStyle.property !== REMOVE_ATTR_PSEUDO_MARKER) {
                return;
            }
            if (REGEXP_ACTION_ARG.test(actionStyle.value)) {
                // any attribute can match a regexp argument
                observeAllAttributes = true;
            } else {
                attributeNames.add(actionStyle.value);
            }
            attributeMatchers.push(createActionArgMatcher(actionStyle.value));
        });
    });

    return {
        // if there is a regexp or wildcard argument, all attributes should be observed,
        // otherwise the native attribute filter can be used
        attributeFilter: observeAllAttributes ? undefined : [...attributeNames],
        attributeMatchers,
        selectorAttributeNames,
    };
};

/**
 * Cache of mutation observation data per context:
 * parsed rules are set only in the constructor, so the data is built once.
 */
const mutationObservationDataCache = new WeakMap<Context, MutationObservationData>();

/**
 * Returns data needed to observe mutations which can affect applied rules,
 * building it once per context.
 *
 * @param context ExtendedCss context.
 *
 * @returns Data for mutation observation.
 */
const getMutationObservationData = (context: Context): MutationObservationData => {
    let data = mutationObservationDataCache.get(context);
    if (!data) {
        data = createMutationObservationData(context);
        mutationObservationDataCache.set(context, data);
    }
    return data;
};

/**
 * Creates a checker which decides whether a DOM mutation can affect the applied rules.
 *
 * `id` and `class` attributes are always checked as they are used by selectors,
 * attributes used by action rule selectors are checked,
 * and `remove-attr()` arguments and regexp or wildcard `:matches-attr()` names
 * are checked with the corresponding matchers.
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

    const observationData = getMutationObservationData(context);
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
