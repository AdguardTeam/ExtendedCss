import utils from '../utils';

import {
    matchingText,
    matchingStyle,
    matchingAttr,
    matchingProperty,
} from './matcher-utils';

import {
    getNthAncestor,
    getValidNumberAncestorArg,
    isHtmlElement,
    validateStandardSelector,
} from './finder-utils';

import {
    COLON,
    MATCHES_CSS_BEFORE_PSEUDO,
    MATCHES_CSS_AFTER_PSEUDO,
    REGULAR_PSEUDO_ELEMENTS,
} from '../constants';

export const matchPseudo = {
    /**
     * Checks whether the element satisfies condition of contains pseudo-class
     * @param domElement dom node
     * @param rawPseudoArg contains pseudo-class arg
     */
    contains: (domElement: Element, rawPseudoArg: string): boolean => {
        const elemTextContent = utils.getNodeTextContent(domElement);
        let isTextContentMatching;
        try {
            isTextContentMatching = matchingText(elemTextContent, rawPseudoArg);
        } catch (e) {
            utils.logError(e);
            throw new Error(`Error while matching text: "${elemTextContent}" by arg ${rawPseudoArg}.`);
        }
        return isTextContentMatching;
    },

    matchesCss: (domElement: Element, pseudoName: string, rawPseudoArg: string): boolean => {
        // no standard pseudo-element for :matched-css
        let regularPseudo = '';
        if (pseudoName === MATCHES_CSS_BEFORE_PSEUDO) {
            regularPseudo = `${COLON}${REGULAR_PSEUDO_ELEMENTS.BEFORE}`;
        } else if (pseudoName === MATCHES_CSS_AFTER_PSEUDO) {
            regularPseudo = `${COLON}${REGULAR_PSEUDO_ELEMENTS.AFTER}`;
        }

        let isMatchingCss;
        try {
            isMatchingCss = matchingStyle(domElement, pseudoName, rawPseudoArg, regularPseudo);
        } catch (e) {
            utils.logError(e);
            throw new Error(`Error while matching css by arg ${rawPseudoArg}.`);
        }
        return isMatchingCss;
    },

    matchesAttr: (domElement: Element, pseudoName: string, rawPseudoArg: string): boolean => {
        let isMatchingAttr;
        try {
            isMatchingAttr = matchingAttr(domElement, pseudoName, rawPseudoArg);
        } catch (e) {
            utils.logError(e);
            throw new Error(`Error while matching attributes by arg ${rawPseudoArg}.`);
        }
        return isMatchingAttr;
    },

    matchesProperty: (domElement: Element, pseudoName: string, rawPseudoArg: string): boolean => {
        let isMatchingAttr;
        try {
            isMatchingAttr = matchingProperty(domElement, pseudoName, rawPseudoArg);
        } catch (e) {
            utils.logError(e);
            throw new Error(`Error while matching properties by arg ${rawPseudoArg}.`);
        }
        return isMatchingAttr;
    },
};

export const findPseudo = {
    /**
     * Gets list of nth ancestors relative to every dom node from domElements list
     * @param domElements dom nodes
     * @param rawPseudoArg number arg of :nth-ancestor or :upward pseudo-class
     * @param pseudoName pseudo-class name
     */
    nthAncestor: (domElements: HTMLElement[], rawPseudoArg: string, pseudoName: string): HTMLElement[] => {
        const deep = getValidNumberAncestorArg(rawPseudoArg, pseudoName);
        const ancestors = domElements
            .map((domElement) => {
                let ancestor;
                try {
                    ancestor = getNthAncestor(domElement, deep, pseudoName);
                } catch (e) {
                    utils.logError(e);
                }
                return ancestor;
            })
            .filter(isHtmlElement);
        return ancestors;
    },
    /**
     * Gets list of elements by xpath expression, evaluated on every dom node from domElements list
     * @param domElements dom nodes
     * @param rawPseudoArg arg of :xpath pseudo-class
     */
    xpath: (domElements: HTMLElement[], rawPseudoArg: string): HTMLElement[] => {
        const foundElements = domElements
            .map((domElement) => {
                const result = [];
                let xpathResult;
                try {
                    xpathResult = document.evaluate(
                        rawPseudoArg,
                        domElement,
                        null,
                        XPathResult.UNORDERED_NODE_ITERATOR_TYPE,
                        null,
                    );
                } catch (e) {
                    utils.logError(e);
                    throw new Error(`Invalid argument of :xpath pseudo-class: '${rawPseudoArg}'`);
                }
                let node = xpathResult.iterateNext();
                while (node) {
                    if (isHtmlElement(node)) {
                        result.push(node);
                    }
                    node = xpathResult.iterateNext();
                }
                return result;
            })
            .flat(1);

        return foundElements;
    },
    /**
     * Gets list of closest ancestors relative to every dom node from domElements list
     * @param domElements dom nodes
     * @param rawPseudoArg standard selector arg of :upward pseudo-class
     */
    upward: (domElements: HTMLElement[], rawPseudoArg: string): HTMLElement[] => {
        if (!validateStandardSelector(rawPseudoArg)) {
            throw new Error(`Invalid argument of :upward pseudo-class: '${rawPseudoArg}'`);
        }
        const closestAncestors = domElements
            .map((domElement) => {
                // closest to parent element should be found
                // otherwise `.base:upward(.base)` will return itself too, not only ancestor
                const parent = domElement.parentElement;
                if (!parent) {
                    return null;
                }
                /**
                 * TODO: decide the way :upward should work
                 *
                 * previously it was done with node.closest(selector)
                 * that's why argument of :upward(selector) should be standard selector
                 * so I assume cases where :not() is part of arg should consider :not() as standard pseudo-class
                 */
                return parent.closest(rawPseudoArg);
            })
            .filter(isHtmlElement);

        return closestAncestors;
    },
};
