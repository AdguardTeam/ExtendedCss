import {
    ACTION_ERROR_PREFIXES,
    ACTION_PSEUDO_MARKERS,
    ACTION_STYLE_MARKERS,
    ActionErrorPrefix,
    ActionPseudoMarker,
    ActionStyleMarker,
    DOUBLE_QUOTE,
    SINGLE_QUOTE,
    SLASH,
} from '../constants';

/**
 * Regexp literal action argument, e.g. `/^data-/i`.
 * The second capture group contains the regexp flags.
 */
export const REGEXP_ACTION_ARG = /^\/(.+)\/([imu]*)$/;

/**
 * Plain action argument: no whitespace, parentheses, quotes or commas.
 */
export const PLAIN_ACTION_ARG = /^[^\s()'",]+$/;

/**
 * Checks whether the string is an action pseudo-class marker.
 *
 * @param marker Marker to check.
 *
 * @returns True if the string is an action pseudo-class marker.
 */
export const isActionPseudoMarker = (marker: string): marker is ActionPseudoMarker => {
    return (ACTION_PSEUDO_MARKERS as readonly string[]).includes(marker);
};

/**
 * Checks whether the string is an action pseudo-class marker stored in styles.
 *
 * @param marker Marker to check.
 *
 * @returns True if the string is an action style marker.
 */
export const isActionStyleMarker = (marker: string): marker is ActionStyleMarker => {
    return (ACTION_STYLE_MARKERS as readonly string[]).includes(marker);
};

/**
 * Throws an error for invalid action pseudo-class usage.
 *
 * @param marker Action pseudo-class marker.
 * @param messageKey Key of the error message.
 * @param selector Selector which caused the error.
 *
 * @throws An error with the message for the action pseudo-class.
 */
export const throwActionError = (
    marker: ActionPseudoMarker,
    messageKey: keyof ActionErrorPrefix,
    selector: string,
): never => {
    throw new Error(`${ACTION_ERROR_PREFIXES[marker][messageKey]}: '${selector}'`);
};

/**
 * Cache of compiled action argument matchers.
 */
const actionArgMatchers = new Map<string, (value: string) => boolean>();

/**
 * Checks whether a regexp literal argument compiles.
 *
 * @param arg Regexp literal argument.
 *
 * @returns True if the regexp is valid.
 */
const isValidRegexpArg = (arg: string): boolean => {
    const match = arg.match(REGEXP_ACTION_ARG);
    if (!match) {
        return false;
    }
    try {
        new RegExp(match[1] as string, match[2]);
        return true;
    } catch (e: unknown) {
        return false;
    }
};

/**
 * Normalizes an action argument: strips quotes, validates plain args
 * and compiles regexp literals.
 *
 * @param rawArg Raw action argument.
 *
 * @returns Normalized argument or an empty string if the argument is invalid.
 */
export const normalizeActionArg = (rawArg: string): string => {
    const arg = rawArg.trim();

    if (!arg) {
        return '';
    }
    if (arg.startsWith(SLASH)) {
        return isValidRegexpArg(arg) ? arg : '';
    }
    if (arg.length > 1
        && ((arg.startsWith(SINGLE_QUOTE) && arg.endsWith(SINGLE_QUOTE))
            || (arg.startsWith(DOUBLE_QUOTE) && arg.endsWith(DOUBLE_QUOTE)))) {
        const unquoted = arg.slice(1, -1);
        return PLAIN_ACTION_ARG.test(unquoted) ? unquoted : '';
    }

    return PLAIN_ACTION_ARG.test(arg) ? arg : '';
};

/**
 * Creates a matcher for an action argument.
 *
 * Plain arguments match exactly; regexp literal arguments match as regexps.
 * Invalid regexp arguments produce a matcher which never matches.
 *
 * @param arg Normalized action argument.
 *
 * @returns Matcher function for attribute or class names.
 */
export const createActionArgMatcher = (arg: string): ((value: string) => boolean) => {
    const cached = actionArgMatchers.get(arg);
    if (cached) {
        return cached;
    }

    let matcher: (value: string) => boolean;
    const match = arg.match(REGEXP_ACTION_ARG);

    if (match) {
        try {
            const regexp = new RegExp(match[1] as string, match[2]);
            matcher = (value: string): boolean => {
                return regexp.test(value);
            };
        } catch (e: unknown) {
            matcher = (): boolean => {
                return false;
            };
        }
    } else {
        matcher = (value: string): boolean => {
            return value === arg;
        };
    }

    actionArgMatchers.set(arg, matcher);

    return matcher;
};
