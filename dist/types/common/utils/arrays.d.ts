/**
 * Some browsers do not support Array.prototype.flat()
 * for example, Opera 42 which is used for browserstack tests
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat
 * @param input
 */
export declare const flatten: <T>(input: (T | T[])[]) => T[];
/**
 * Returns last item from array
 * @param array
 */
export declare const getLast: <T>(array: T[]) => T;
