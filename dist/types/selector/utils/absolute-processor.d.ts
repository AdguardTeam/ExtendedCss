/**
 * Checks whether the domElement is matched by absolute extended pseudo-class argument
 * @param domElement
 * @param pseudoName
 * @param pseudoArg
 */
export declare const isMatchedByAbsolutePseudo: (domElement: Element, pseudoName: string, pseudoArg: string) => boolean;
export declare const findByAbsolutePseudoPseudo: {
    /**
     * Gets list of nth ancestors relative to every dom node from domElements list
     * @param domElements dom nodes
     * @param rawPseudoArg number arg of :nth-ancestor or :upward pseudo-class
     * @param pseudoName pseudo-class name
     */
    nthAncestor: (domElements: HTMLElement[], rawPseudoArg: string, pseudoName: string) => HTMLElement[];
    /**
     * Gets list of elements by xpath expression, evaluated on every dom node from domElements list
     * @param domElements dom nodes
     * @param rawPseudoArg arg of :xpath pseudo-class
     */
    xpath: (domElements: HTMLElement[], rawPseudoArg: string) => HTMLElement[];
    /**
     * Gets list of closest ancestors relative to every dom node from domElements list
     * @param domElements dom nodes
     * @param rawPseudoArg standard selector arg of :upward pseudo-class
     */
    upward: (domElements: HTMLElement[], rawPseudoArg: string) => HTMLElement[];
};
