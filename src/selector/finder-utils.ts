/**
 * Validates number arg for :nth-ancestor and :upward pseudo-classes
 * @param rawArg raw arg of pseudo-class
 * @param pseudoName pseudo-class name
 */
export const getValidNumberAncestorArg = (rawArg: string, pseudoName: string): number => {
    const deep = Number(rawArg);
    if (Number.isNaN(deep) || deep < 1 || deep >= 256) {
        throw new Error(`Invalid argument of :${pseudoName} pseudo-class: '${rawArg}'`);
    }
    return deep;
};

/**
 * Returns nth ancestor by 'deep' number arg OR undefined if ancestor range limit exceeded
 * @param domElement
 * @param deep
 * @param pseudoName
 */
export const getNthAncestor = (domElement: HTMLElement, deep: number, pseudoName: string): HTMLElement | undefined => {
    let ancestor;
    let i = 0;
    while (i < deep) {
        ancestor = domElement.parentElement;
        if (!ancestor) {
            throw new Error(`Too big :${pseudoName} arg '${deep}', out of DOM elements root.`);
        }
        domElement = ancestor;
        i += 1;
    }
    return ancestor;
};

/**
 * Checks whether the element is instance of HTMLElement
 * @param element
 */
export const isHtmlElement = (element: HTMLElement | Node | null | undefined): element is HTMLElement => {
    return element instanceof HTMLElement;
};

/**
 * Validates standard CSS selector
 * @param selector
 */
export const validateStandardSelector = (selector: string): boolean => {
    let isValid;
    try {
        document.querySelectorAll(selector);
        isValid = true;
    } catch (e) {
        isValid = false;
    }
    return isValid;
};
