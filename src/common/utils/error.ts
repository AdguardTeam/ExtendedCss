type ErrorWithMessage = {
    message: string
};

/**
 * Checks whether the `error` has `message` property which type is string.
 *
 * @param error Error object.
 *
 * @returns True if `error` has message.
 */
const isErrorWithMessage = (error: unknown): error is ErrorWithMessage => {
    return (
        typeof error === 'object'
        && error !== null
        && 'message' in error
        && typeof (error as Record<string, unknown>).message === 'string'
    );
};

/**
 * Converts `maybeError` to error object with message.
 *
 * @param maybeError Possible error.
 *
 * @returns Error object with defined `message` property.
 */
const toErrorWithMessage = (maybeError: unknown): ErrorWithMessage => {
    if (isErrorWithMessage(maybeError)) {
        return maybeError;
    }

    try {
        return new Error(JSON.stringify(maybeError));
    } catch {
        // fallback in case if there is an error happened during the maybeError stringifying
        // like with circular references for example
        return new Error(String(maybeError));
    }
};

/**
 * Returns error message from `error`.
 * May be helpful to handle caught errors.
 *
 * @param error Error object.
 *
 * @returns Message of `error`.
 */
export const getErrorMessage = (error: unknown): string => {
    return toErrorWithMessage(error).message;
};
