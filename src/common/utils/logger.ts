export const logger = {
    /**
     * Safe console.error version.
     */
    error: (
        typeof console !== 'undefined'
            && console.error
            && console.error.bind)
        ? console.error.bind(window.console)
        : console.error,

    /**
     * Safe console.info version.
     */
    info: (
        typeof console !== 'undefined'
            && console.info
            && console.info.bind)
        ? console.info.bind(window.console)
        : console.info,
};
