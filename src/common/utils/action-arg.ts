import {
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
        // eslint-disable-next-line no-new
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
            matcher = (value: string): boolean => regexp.test(value);
        } catch (e: unknown) {
            matcher = (): boolean => false;
        }
    } else {
        matcher = (value: string): boolean => value === arg;
    }

    actionArgMatchers.set(arg, matcher);

    return matcher;
};
