/**
 * Validates number arg for :nth-ancestor and :upward pseudo-classes
 * @param rawArg raw arg of pseudo-class
 * @param pseudoName pseudo-class name
 */
export declare const getValidNumberAncestorArg: (rawArg: string, pseudoName: string) => number;
/**
 * Returns nth ancestor by 'deep' number arg OR undefined if ancestor range limit exceeded
 * @param domElement
 * @param deep
 * @param pseudoName
 */
export declare const getNthAncestor: (domElement: HTMLElement, deep: number, pseudoName: string) => HTMLElement | null;
/**
 * Validates standard CSS selector
 * @param selector
 */
export declare const validateStandardSelector: (selector: string) => boolean;
