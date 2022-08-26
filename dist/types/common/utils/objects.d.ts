/**
 * Converts array of pairs to object.
 * Object.fromEntries() polyfill because it is not supported by old browsers, e.g. Chrome 55
 * https://caniuse.com/?search=Object.fromEntries
 * @param entries - array of pairs
 */
export declare const getObjectFromEntries: <T extends string>(entries: T[][]) => {
    [key: string]: T;
};
