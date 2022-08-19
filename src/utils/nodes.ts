import { nodeTextContentGetter } from './natives';

/**
 * Returns textContent of passed domElement
 * @param domElement
 */
export const getNodeTextContent = (domElement: Node): string => {
    return nodeTextContentGetter?.apply(domElement) || '';
};

/**
 * Returns element selector text based on it's tagName and attributes
 * @param element
 */
export const getElementSelectorDesc = (element: Element): string => {
    let selectorText = element.tagName.toLowerCase();
    selectorText += Array.from(element.attributes)
        .map((attr) => {
            return `[${attr.name}="${element.getAttribute(attr.name)}"]`;
        })
        .join('');
    return selectorText;
};

/**
 * Returns path of a DOM element as string selector
 * @param inputEl input element
 */
export const getElementSelectorPath = (inputEl: Element): string => {
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
};
