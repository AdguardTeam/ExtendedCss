/**
 * Returns textContent of passed domElement
 * @param domElement
 */
export declare const getNodeTextContent: (domElement: Node) => string;
/**
 * Returns element selector text based on it's tagName and attributes
 * @param element
 */
export declare const getElementSelectorDesc: (element: Element) => string;
/**
 * Returns path of a DOM element as string selector
 * @param inputEl input element
 */
export declare const getElementSelectorPath: (inputEl: Element) => string;
/**
 * Checks whether the element is instance of HTMLElement
 * @param element
 */
export declare const isHtmlElement: (element: HTMLElement | Node | null) => element is HTMLElement;
