/**
 * Validates number arg for :nth-ancestor and :upward pseudo-classes
 * @param rawArg
 */
export const getValidAncestorArg = (rawArg: string): number => {
    const deep = Number(rawArg);
    if (Number.isNaN(deep) || deep < 1 || deep >= 256) {
        throw new Error(`Invalid argument of :nth-ancestor pseudo-class: '${rawArg}'`);
    }
    return deep;
};

/**
 * Returns nth ancestor by 'deep' number arg OR undefined if ancestor range limit exceeded
 * @param domElement
 * @param deep
 */
export const getNthAncestor = (domElement: Element, deep: number): Element | undefined => {
    let ancestor;
    let i = 0;
    while (i < deep) {
        ancestor = domElement.parentElement;
        if (!ancestor) {
            throw new Error(`Too big :nth-ancestor arg '${deep}', out of DOM elements root.`);
        }
        domElement = ancestor;
        i += 1;
    }
    return ancestor;
};

/**
 * Checks whether the element is instance of Element
 * @param element
 */
export const isElement = (element: Element | undefined): element is Element => {
    return element instanceof Element;
};
