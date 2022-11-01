import { isHtmlElement } from '../../common/utils/nodes';
import { flatten } from '../../common/utils/arrays';
import { logger } from '../../common/utils/logger';

import {
    isTextMatched,
    isStyleMatched,
    isAttributeMatched,
    isPropertyMatched,
    MatcherArgsInterface,
} from './absolute-matcher';

import {
    getNthAncestor,
    getValidNumberAncestorArg,
    validateStandardSelector,
} from './absolute-finder';

import {
    MATCHES_CSS_BEFORE_PSEUDO,
    MATCHES_CSS_AFTER_PSEUDO,
    CONTAINS_PSEUDO,
    HAS_TEXT_PSEUDO,
    ABP_CONTAINS_PSEUDO,
    MATCHES_CSS_PSEUDO,
    MATCHES_ATTR_PSEUDO_CLASS_MARKER,
    MATCHES_PROPERTY_PSEUDO_CLASS_MARKER,
} from '../../common/constants';

type MatcherCallback = (a: MatcherArgsInterface) => boolean;

/**
 * Wrapper to run matcher `callback` with `args`
 * and throw error with `errorMessage` if `callback` run fails.
 *
 * @param callback Matcher callback.
 * @param argsData Args needed for matcher callback.
 * @param errorMessage Error message.
 *
 * @throws An error if `callback` fails.
 */
const matcherWrapper = (callback: MatcherCallback, argsData: MatcherArgsInterface, errorMessage: string): boolean => {
    let isMatched: boolean;
    try {
        isMatched = callback(argsData);
    } catch (e) {
        logger.error(e);
        throw new Error(errorMessage);
    }
    return isMatched;
};

/**
 * Checks whether the domElement is matched by absolute extended pseudo-class argument.
 *
 * @param domElement Page element.
 * @param pseudoName Pseudo-class name.
 * @param pseudoArg Pseudo-class arg.
 *
 * @throws An error on unknown absolute pseudo-class.
 */
export const isMatchedByAbsolutePseudo = (domElement: Element, pseudoName: string, pseudoArg: string): boolean => {
    let argsData: MatcherArgsInterface;
    let errorMessage: string;
    let callback: MatcherCallback;

    switch (pseudoName) {
        case CONTAINS_PSEUDO:
        case HAS_TEXT_PSEUDO:
        case ABP_CONTAINS_PSEUDO:
            callback = isTextMatched;
            argsData = { pseudoName, pseudoArg, domElement };
            errorMessage = `Error while matching element text content by arg '${pseudoArg}'.`;
            break;
        case MATCHES_CSS_PSEUDO:
        case MATCHES_CSS_AFTER_PSEUDO:
        case MATCHES_CSS_BEFORE_PSEUDO:
            callback = isStyleMatched;
            argsData = { pseudoName, pseudoArg, domElement };
            errorMessage = `Error while matching element style by arg '${pseudoArg}'.`;
            break;
        case MATCHES_ATTR_PSEUDO_CLASS_MARKER:
            callback = isAttributeMatched;
            argsData = { domElement, pseudoName, pseudoArg };
            errorMessage = `Error while matching element attributes by arg '${pseudoArg}'.`;
            break;
        case MATCHES_PROPERTY_PSEUDO_CLASS_MARKER:
            callback = isPropertyMatched;
            argsData = { domElement, pseudoName, pseudoArg };
            errorMessage = `Error while matching element properties by arg '${pseudoArg}'.`;
            break;
        default:
            throw new Error(`Unknown absolute pseudo-class :${pseudoName}()`);
    }

    return matcherWrapper(callback, argsData, errorMessage);
};

export const findByAbsolutePseudoPseudo = {
    /**
     * Gets list of nth ancestors relative to every dom node from domElements list.
     *
     * @param domElements DOM elements.
     * @param rawPseudoArg Number arg of :nth-ancestor() or :upward() pseudo-class.
     * @param pseudoName Pseudo-class name.
     */
    nthAncestor: (domElements: HTMLElement[], rawPseudoArg: string, pseudoName: string): HTMLElement[] => {
        const deep = getValidNumberAncestorArg(rawPseudoArg, pseudoName);
        const ancestors = domElements
            .map((domElement) => {
                let ancestor: HTMLElement | null = null;
                try {
                    ancestor = getNthAncestor(domElement, deep, pseudoName);
                } catch (e) {
                    logger.error(e);
                }
                return ancestor;
            })
            .filter(isHtmlElement);
        return ancestors;
    },

    /**
     * Gets list of elements by xpath expression, evaluated on every dom node from domElements list.
     *
     * @param domElements DOM elements.
     * @param rawPseudoArg Arg of :xpath() pseudo-class.
     */
    xpath: (domElements: HTMLElement[], rawPseudoArg: string): HTMLElement[] => {
        const foundElements = domElements
            .map((domElement) => {
                const result = [];
                let xpathResult: XPathResult;
                try {
                    xpathResult = document.evaluate(
                        rawPseudoArg,
                        domElement,
                        null,
                        XPathResult.UNORDERED_NODE_ITERATOR_TYPE,
                        null,
                    );
                } catch (e) {
                    logger.error(e);
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
            });

        return flatten(foundElements);
    },

    /**
     * Gets list of closest ancestors relative to every dom node from domElements list.
     *
     * @param domElements DOM elements.
     * @param rawPseudoArg Standard selector arg of :upward() pseudo-class.
     *
     * @throws An error if `rawPseudoArg` is not a valid standard selector.
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
                return parent.closest(rawPseudoArg);
            })
            .filter(isHtmlElement);

        return closestAncestors;
    },
};
