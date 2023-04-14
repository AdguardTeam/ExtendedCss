/**
 * Checks whether passed `arg` is number type.
 *
 * @param arg Value to check.
 *
 * @returns True if `arg` is number and not NaN.
 */
export const isNumber = (arg: unknown): arg is number => {
    return typeof arg === 'number'
        && !Number.isNaN(arg);
};
