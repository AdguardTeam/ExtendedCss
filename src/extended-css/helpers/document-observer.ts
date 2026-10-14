import { EventTracker } from './event-tracker';
import { Context } from './types';
import { natives } from '../../common/utils/natives';
import { REGEXP_ACTION_ARG, createActionArgMatcher } from '../../common/utils/action-arg';
import { getValidMatcherArg } from '../../selector';
import type { ExtCssRuleData } from '../../css-rule';

import {
    CLASS_ATTRIBUTE,
    DOUBLE_QUOTE,
    EQUAL_SIGN,
    ID_ATTRIBUTE,
    MATCHES_ATTR_PSEUDO_CLASS_MARKER,
    REMOVE_ATTR_PSEUDO_MARKER,
    SINGLE_QUOTE,
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
     * Attribute names which should be observed natively.
     */
    attributeNames: Set<string>;

    /**
     * Matchers for regexp and wildcard `:remove-attr()` arguments
     * and `:matches-attr()` name patterns.
     */
    attributeMatchers: Array<(name: string) => boolean>;

    /**
     * Arguments and name patterns already reflected in the data.
     */
    mergedArgs: Set<string>;

    /**
     * Attribute names used by action rule selectors.
     */
    selectorAttributeNames: Set<string>;

    /**
     * Flag for observing all attributes: set when a regexp or wildcard
     * argument can match any attribute.
     */
    observeAllAttributes: boolean;
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
 * Both the original and the lower-cased spelling are returned:
 * HTML attribute names are lower-cased in mutation records,
 * while SVG ones preserve their case.
 *
 * @param selector Selector text.
 *
 * @returns Attribute names found in the selector.
 */
const getSelectorAttributeNames = (selector: string): string[] => {
    const names: string[] = [];
    // CSS attribute selectors
    collectMatches(selector, ATTRIBUTE_SELECTOR_REGEXP, names);
    // attribute references inside :xpath() arguments, e.g. '@data-on'
    collectMatches(selector, XPATH_ATTRIBUTE_REGEXP, names);

    const result: string[] = [];
    names.forEach((name) => {
        result.push(name);
        const lowerCasedName = name.toLowerCase();
        if (lowerCasedName !== name) {
            result.push(lowerCasedName);
        }
    });
    return result;
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
 * Adds a `:remove-attr()` argument to the observation data.
 *
 * Plain arguments are observed natively by name, while a regexp argument
 * can match any attribute, so the observer watches all attributes
 * and checks them with a matcher.
 *
 * Both the original and the lower-cased spelling of a plain argument
 * are observed: HTML attribute names are lower-cased in mutation records,
 * while SVG ones preserve their case.
 *
 * @param data Mutation observation data.
 * @param arg `:remove-attr()` argument.
 */
const addActionArg = (data: MutationObservationData, arg: string): void => {
    if (!arg || data.mergedArgs.has(arg)) {
        return;
    }
    data.mergedArgs.add(arg);

    if (REGEXP_ACTION_ARG.test(arg)) {
        // any attribute can match a regexp argument
        data.observeAllAttributes = true;
        data.attributeMatchers.push(createActionArgMatcher(arg));
        return;
    }

    data.attributeNames.add(arg);
    data.selectorAttributeNames.add(arg);
    const lowerCasedArg = arg.toLowerCase();
    if (lowerCasedArg !== arg) {
        data.attributeNames.add(lowerCasedArg);
        data.selectorAttributeNames.add(lowerCasedArg);
    }
};

/**
 * Adds a `:matches-attr()` name argument to the observation data.
 *
 * The argument is converted with the same helper as in the selector engine,
 * so the mutation relevance check matches the runtime behavior:
 * plain names are observed natively by name, while regexp and wildcard
 * patterns make the observer watch all attributes.
 *
 * @param data Mutation observation data.
 * @param arg `:matches-attr()` name argument.
 */
const addSelectorNameArg = (data: MutationObservationData, arg: string): void => {
    if (!arg || data.mergedArgs.has(arg)) {
        return;
    }
    data.mergedArgs.add(arg);

    let nameMatch: string | RegExp;
    try {
        nameMatch = getValidMatcherArg(arg);
    } catch (e: unknown) {
        // invalid arguments are rejected by the selector engine at query time
        return;
    }

    if (typeof nameMatch === 'string') {
        // both spellings are observed: HTML attribute names are lower-cased
        // in mutation records, while SVG ones preserve their case
        data.attributeNames.add(nameMatch);
        data.selectorAttributeNames.add(nameMatch);
        const lowerCasedName = nameMatch.toLowerCase();
        if (lowerCasedName !== nameMatch) {
            data.attributeNames.add(lowerCasedName);
            data.selectorAttributeNames.add(lowerCasedName);
        }
        return;
    }

    // a regexp or wildcard name can match any attribute
    data.observeAllAttributes = true;
    data.attributeMatchers.push((name: string) => nameMatch.test(name));
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
    const data: MutationObservationData = {
        attributeNames: new Set<string>([ID_ATTRIBUTE, CLASS_ATTRIBUTE]),
        attributeMatchers: [],
        mergedArgs: new Set<string>(),
        selectorAttributeNames: new Set<string>(),
        observeAllAttributes: false,
    };

    context.parsedRules.forEach((rule) => {
        // only action rules need to react to changes of attributes
        // used by their selectors: actions are re-applied on mutations,
        // while regular rules react only to `id`/`class` changes as before
        if (!rule.actionStyles?.length) {
            return;
        }

        getSelectorAttributeNames(rule.selector).forEach((name) => {
            data.selectorAttributeNames.add(name);
            data.attributeNames.add(name);
        });

        getMatchesAttrNames(rule.selector).forEach((name) => {
            addSelectorNameArg(data, name);
        });

        rule.actionStyles.forEach((actionStyle) => {
            if (actionStyle.property !== REMOVE_ATTR_PSEUDO_MARKER) {
                return;
            }
            addActionArg(data, actionStyle.value);
        });
    });

    return data;
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
 * Adds attributes used by action styles of the given rules
 * to the mutation observation data.
 *
 * Needed because the data is built from parsed rules, while the
 * `beforeStyleApplied` callback can edit or add action arguments:
 * without the merge, mutations of attributes from edited arguments
 * would not be observed and actions would not be re-applied.
 *
 * @param context ExtendedCss context.
 * @param rules Rules data to merge.
 */
export const addRulesToMutationObservation = (context: Context, rules: ExtCssRuleData[]): void => {
    const data = getMutationObservationData(context);

    rules.forEach((rule) => {
        rule.actionStyles?.forEach((actionStyle) => {
            if (actionStyle.property !== REMOVE_ATTR_PSEUDO_MARKER) {
                return;
            }
            addActionArg(data, actionStyle.value);
        });
    });
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
        // if a regexp or wildcard argument can match any attribute,
        // all attributes should be observed
        ...(observationData.observeAllAttributes
            ? {}
            : { attributeFilter: [...observationData.attributeNames] }),
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
