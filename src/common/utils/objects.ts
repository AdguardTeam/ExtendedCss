/**
 * Converts array of pairs to object.
 * Object.fromEntries() polyfill because it is not supported by old browsers, e.g. Chrome 55
 * https://caniuse.com/?search=Object.fromEntries
 * @param entries - array of pairs
 */
export const getObjectFromEntries = <T extends string>(entries: Array<Array<T>>): { [key: string]: T } => {
    const initAcc: { [key: string]: T } = {};
    const object = entries
        .reduce((acc, el) => {
            const key = el[0];
            const value = el[1];
            acc[key] = value;
            return acc;
        }, initAcc);
    return object;
};
