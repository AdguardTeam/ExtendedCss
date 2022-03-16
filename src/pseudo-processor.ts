import utils from './utils';

import {
    matchingText,
    matchingStyle,
    matchingAttr,
    matchingProperty,
} from './matcher-utils';

import {
    getNthAncestor,
    getValidAncestorArg,
    isElement,
} from './finder-utils';

import {
    MATCHES_CSS_BEFORE_PSEUDO,
    MATCHES_CSS_AFTER_PSEUDO,
    REGULAR_PSEUDO_CLASSES,
} from './constants';

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
        // no standard pseudo-class for :matched-css
        let regularPseudo = '';
        if (pseudoName === MATCHES_CSS_BEFORE_PSEUDO) {
            regularPseudo = REGULAR_PSEUDO_CLASSES.BEFORE;
        } else if (pseudoName === MATCHES_CSS_AFTER_PSEUDO) {
            regularPseudo = REGULAR_PSEUDO_CLASSES.AFTER;
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
     * @param rawPseudoArg arg of :nth-ancestor or :upward pseudo-class
     * @param pseudoName pseudo-class name
     */
    nthAncestor: (domElements: Element[], rawPseudoArg: string, pseudoName: string): Element[] => {
        const deep = getValidAncestorArg(rawPseudoArg, pseudoName);
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
            .filter(isElement);
        return ancestors;
    },
    /**
     * Gets list of elements by xpath expression, evaluated on every dom node from domElements list
     * @param domElements dom nodes
     * @param rawPseudoArg arg of :xpath pseudo-class
     */
    xpath: (domElements: Element[], rawPseudoArg: string): Element[] => {
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
                    if (isElement(node)) {
                        result.push(node);
                    }
                    node = xpathResult.iterateNext();
                }
                return result;
            })
            .flat(1);

        return foundElements;
    },
};
