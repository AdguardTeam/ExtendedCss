import utils from './utils';

import {
    matchingText,
    matchingStyle,
} from './matcher-utils';

import {
    MATCHES_CSS_BEFORE_PSEUDO,
    MATCHES_CSS_AFTER_PSEUDO,
    REGULAR_PSEUDO_CLASSES,
} from './constants';

const matchPseudo = {
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
        } catch (error) {
            isTextContentMatching = false;
            throw error;
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
        } catch (error) {
            isMatchingCss = false;
            throw error;
        }
        return isMatchingCss;
    },

};

export default matchPseudo;
