import { SLASH } from '../constants';

/**
 * Returns string without suffix.
 *
 * @param str Input string.
 * @param suffix Needed to remove.
 *
 * @returns String without suffix.
 */
export const removeSuffix = (str: string, suffix: string): string => {
    const index = str.indexOf(suffix, str.length - suffix.length);
    if (index >= 0) {
        return str.substring(0, index);
    }
    return str;
};

/**
 * Replaces all `pattern`s with `replacement` in `input` string.
 * String.replaceAll() polyfill because it is not supported by old browsers, e.g. Chrome 55.
 *
 * @see {@link https://caniuse.com/?search=String.replaceAll}
 *
 * @param input Input string to process.
 * @param pattern Find in the input string.
 * @param replacement Replace the pattern with.
 *
 * @returns Modified string.
 */
export const replaceAll = (input: string, pattern: string, replacement: string): string => {
    if (!input) {
        return input;
    }
    return input.split(pattern).join(replacement);
};

/**
 * Converts string pattern to regular expression.
 *
 * @param str String to convert.
 *
 * @returns Regular expression converted from pattern `str`.
 */
export const toRegExp = (str: string): RegExp => {
    if (str.startsWith(SLASH) && str.endsWith(SLASH)) {
        return new RegExp(str.slice(1, -1));
    }
    const escaped = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escaped);
};

/**
 * Converts any simple type value to string type,
 * e.g. `undefined` -> `'undefined'`.
 *
 * @param value Any type value.
 *
 * @returns String representation of `value`.
 */
export const convertTypeIntoString = (value?: Element[keyof Element]): string => {
    let output;
    switch (value) {
        case undefined:
            output = 'undefined';
            break;
        case null:
            output = 'null';
            break;
        default:
            output = value.toString();
    }
    return output;
};

/**
 * Converts instance of string value into other simple types,
 * e.g. `'null'` -> `null`, `'true'` -> `true`.
 *
 * @param value String-type value.
 *
 * @returns Its own type representation of string-type `value`.
 */
export const convertTypeFromString = (value: string): undefined | null | boolean | number | string => {
    const numValue = Number(value);
    let output;
    if (!Number.isNaN(numValue)) {
        output = numValue;
    } else {
        switch (value) {
            case 'undefined':
                output = undefined;
                break;
            case 'null':
                output = null;
                break;
            case 'true':
                output = true;
                break;
            case 'false':
                output = false;
                break;
            default:
                output = value;
        }
    }
    return output;
};
