/**
 * As soon as possible stores native Node textContent getter to be used for contains pseudo-class
 * because elements' 'textContent' and 'innerText' properties might be mocked
 * https://github.com/AdguardTeam/ExtendedCss/issues/127
 */
const nodeTextContentGetter = (() => {
    const nativeNode = window.Node || Node;
    return Object.getOwnPropertyDescriptor(nativeNode.prototype, 'textContent')?.get;
})();

const utils = {
    /**
     * Returns textContent of passed domElement
     * @param domElement
     */
    getNodeTextContent: (domElement: Node): string => {
        return nodeTextContentGetter?.apply(domElement) || '';
    },

    /**
     * Safe console.error version
     */
    logError: (typeof console !== 'undefined'
        && console.error
        && Function.prototype.bind
        && console.error.bind)
        ? console.error.bind(window.console)
        : console.error,

    isSafariBrowser: navigator.vendor === 'Apple Computer, Inc.',

    /**
     * Replaces all 'find' with 'replace' in 'str' string
     * @param str
     * @param find
     * @param replace
     */
    replaceAll: (str: string, find: string, replace: string): string => {
        if (!str) {
            return str;
        }
        return str.split(find).join(replace);
    },
};

export default utils;
