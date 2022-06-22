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
};

export default utils;
