/**
 * Validates number arg for :nth-ancestor() and :upward() pseudo-classes.
 *
 * @param rawArg Raw arg of pseudo-class.
 * @param pseudoName Pseudo-class name.
 *
 * @returns Valid number arg for :nth-ancestor() and :upward().
 * @throws An error on invalid `rawArg`.
 */
export const getValidNumberAncestorArg = (rawArg: string, pseudoName: string): number => {
    const deep = Number(rawArg);
    if (Number.isNaN(deep) || deep < 1 || deep >= 256) {
        throw new Error(`Invalid argument of :${pseudoName} pseudo-class: '${rawArg}'`);
    }
    return deep;
};

/**
 * Returns nth ancestor by 'deep' number arg OR undefined if ancestor range limit exceeded.
 *
 * @param domElement DOM element to find ancestor for.
 * @param nth Depth up to needed ancestor.
 * @param pseudoName Pseudo-class name.
 *
 * @returns Ancestor element found in DOM, or null if not found.
 * @throws An error on invalid `nth` arg.
 */
export const getNthAncestor = (domElement: HTMLElement, nth: number, pseudoName: string): HTMLElement | null => {
    let ancestor: HTMLElement | null = null;
    let i = 0;
    while (i < nth) {
        ancestor = domElement.parentElement;
        if (!ancestor) {
            throw new Error(`Out of DOM: Argument of :${pseudoName}() pseudo-class is too big — '${nth}'.`);
        }
        domElement = ancestor;
        i += 1;
    }
    return ancestor;
};

/**
 * Validates standard CSS selector.
 *
 * @param selector Standard selector.
 *
 * @returns True if standard CSS selector is valid.
 */
export const validateStandardSelector = (selector: string): boolean => {
    let isValid: boolean;
    try {
        document.querySelectorAll(selector);
        isValid = true;
    } catch (e: unknown) {
        isValid = false;
    }
    return isValid;
};
