import { SLASH } from './constants';

/**
 * As soon as possible stores native Node textContent getter to be used for contains pseudo-class
 * because elements' 'textContent' and 'innerText' properties might be mocked
 * https://github.com/AdguardTeam/ExtendedCss/issues/127
 */
const nodeTextContentGetter = (() => {
    const nativeNode = window.Node || Node;
    return Object.getOwnPropertyDescriptor(nativeNode.prototype, 'textContent')?.get;
})();

declare global {
    interface Window {
        WebKitMutationObserver: MutationObserver;
    }
}

const utils = {
    MutationObserver: window.MutationObserver || window.WebKitMutationObserver,

    isNumber: (obj: any): boolean => { // eslint-disable-line @typescript-eslint/no-explicit-any
        return typeof obj === 'number';
    },

    /**
     * Gets string without suffix
     * @param str input string
     * @param suffix needed to remove
     */
    removeSuffix: (str: string, suffix: string): string => {
        const index = str.indexOf(suffix, str.length - suffix.length);
        if (index >= 0) {
            return str.substring(0, index);
        }
        return str;
    },

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
        && console.error.bind)
        ? console.error.bind(window.console)
        : console.error,

    /**
     * Safe console.info version
     */
    logInfo: (
        typeof console !== 'undefined'
        && console.info
        && console.info.bind)
        ? console.info.bind(window.console)
        : console.info,

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

    /**
     * Converts string to regular expression
     * @param str
     */
    toRegExp: (str: string): RegExp => {
        if (str.startsWith(SLASH) && str.endsWith(SLASH)) {
            return new RegExp(str.slice(1, -1));
        }
        const escaped = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(escaped);
    },

    /**
     * Converts any instance value to string
     * @param value
     */
    convertTypeIntoStr: (value: undefined | null | boolean | number | string): string => {
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
    },

    /**
     * Converts instance of string value
     * e.g. null for 'null', true for 'true' etc.
     * @param value
     */
    convertTypeFromStr: (value: string): undefined | null | boolean | number | string => {
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
    },

    /**
     * Returns element selector text based on it's tagName and attributes
     * @param element
     */
    getElementSelectorText: (element: Element): string => {
        let selectorText = element.tagName.toLowerCase();
        selectorText += Array.from(element.attributes)
            .map((attr) => {
                return `[${attr.name}="${element.getAttribute(attr.name)}"]`;
            })
            .join('');
        return selectorText;
    },

    /**
     * Returns string selector path for element in dom
     * @param inputEl input element
     */
    getNodeSelector: (inputEl: HTMLElement): string => {
        if (!(inputEl instanceof Element)) {
            throw new Error('Function received argument with wrong type');
        }

        let el: Element | null;

        el = inputEl;
        const path = [];
        // we need to check '!!el' first because it is possible
        // that some ancestor of the inputEl was removed before it
        while (!!el && el.nodeType === Node.ELEMENT_NODE) {
            let selector = el.nodeName.toLowerCase();
            if (el.id && typeof el.id === 'string') {
                selector += `#${el.id}`;
                path.unshift(selector);
                break;
            }
            let sibling = el;
            let nth = 1;
            while (sibling.previousElementSibling) {
                sibling = sibling.previousElementSibling;
                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName.toLowerCase() === selector) {
                    nth += 1;
                }
            }
            if (nth !== 1) {
                selector += `:nth-of-type(${nth})`;
            }

            path.unshift(selector);
            el = el.parentElement;
        }
        return path.join(' > ');
    },
};

export default utils;
