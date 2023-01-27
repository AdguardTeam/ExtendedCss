import { nativeTextContent } from './natives';

/**
 * Returns textContent of passed domElement.
 *
 * @param domElement DOM element.
 *
 * @returns DOM element textContent.
 */
export const getNodeTextContent = (domElement: Node): string => {
    if (nativeTextContent.getter) {
        return nativeTextContent.getter.apply(domElement);
    }
    // if ExtendedCss.init() has not been executed and there is no nodeTextContentGetter,
    // use simple approach, especially when init() is not really needed, e.g. local tests
    return domElement.textContent || '';
};

/**
 * Returns element selector text based on it's tagName and attributes.
 *
 * @param element DOM element.
 *
 * @returns String representation of `element`.
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
 * Returns path to a DOM element as a selector string.
 *
 * @param inputEl Input element.
 *
 * @returns String path to a DOM element.
 * @throws An error if `inputEl` in not instance of `Element`.
 */
export const getElementSelectorPath = (inputEl: Element): string => {
    if (!(inputEl instanceof Element)) {
        throw new Error('Function received argument with wrong type');
    }

    let el: Element | null;

    el = inputEl;
    const path: string[] = [];
    // we need to check '!!el' first because it is possible
    // that some ancestor of the inputEl was removed before it
    while (!!el && el.nodeType === Node.ELEMENT_NODE) {
        let selector: string = el.nodeName.toLowerCase();
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

/**
 * Checks whether the element is instance of HTMLElement.
 *
 * @param element Element to check.
 *
 * @returns True if `element` is HTMLElement.
 */
export const isHtmlElement = (element: HTMLElement | Node | null): element is HTMLElement => {
    return element instanceof HTMLElement;
};

/**
 * Takes `element` and returns its parent element.
 *
 * @param element Element.
 * @param errorMessage Optional error message to throw.
 *
 * @returns Parent of `element`.
 * @throws An error if element has no parent element.
 */
export const getParent = (element: HTMLElement, errorMessage?: string): HTMLElement => {
    const { parentElement } = element;
    if (!parentElement) {
        throw new Error(errorMessage || 'Element does no have parent element');
    }
    return parentElement;
};
