/**
 * Checks whether passed `arg` is number type.
 *
 * @param arg Value to check.
 */
export const isNumber = <T>(arg: T): boolean => {
    return typeof arg === 'number'
        && !Number.isNaN(arg);
};
