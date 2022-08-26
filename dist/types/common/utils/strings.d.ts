/**
 * Gets string without suffix
 * @param str input string
 * @param suffix needed to remove
 */
export declare const removeSuffix: (str: string, suffix: string) => string;
/**
 * Replaces all `pattern`s with `replacement` in `input` string.
 * String.replaceAll() polyfill because it is not supported by old browsers, e.g. Chrome 55
 * https://caniuse.com/?search=String.replaceAll
 * @param input
 * @param pattern
 * @param replacement
 */
export declare const replaceAll: (input: string, pattern: string, replacement: string) => string;
/**
 * Converts string pattern to regular expression
 * @param str
 */
export declare const toRegExp: (str: string) => RegExp;
/**
 * Converts any simple type value to string type
 * e.g. undefined -> 'undefined'
 * @param value
 */
export declare const convertTypeIntoString: (value: undefined | null | boolean | number | string) => string;
/**
 * Converts instance of string value into other simple types
 * e.g. 'null' -> null, 'true' -> true
 * @param value
 */
export declare const convertTypeFromString: (value: string) => undefined | null | boolean | number | string;
