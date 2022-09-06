import {
    NodeType,
    AnySelectorNodeInterface,
} from '../nodes';

import {
    findByAbsolutePseudoPseudo,
    isMatchedByAbsolutePseudo,
} from './absolute-processor';

import {
    hasRelativesBySelectorList,
    isAnyElementBySelectorList,
    Specificity,
} from './relative-predicates';

import { flatten } from '../../common/utils/arrays';
import { getElementSelectorDesc } from '../../common/utils/nodes';

import {
    DESCENDANT_COMBINATOR,
    CHILD_COMBINATOR,
    NEXT_SIBLING_COMBINATOR,
    SUBSEQUENT_SIBLING_COMBINATOR,
    REGULAR_PSEUDO_CLASSES,
    COLON,
    ABSOLUTE_PSEUDO_CLASSES,
    RELATIVE_PSEUDO_CLASSES,
    IF_NOT_PSEUDO_CLASS_MARKER,
    IS_PSEUDO_CLASS_MARKER,
    NOT_PSEUDO_CLASS_MARKER,
    NTH_ANCESTOR_PSEUDO_CLASS_MARKER,
    UPWARD_PSEUDO_CLASS_MARKER,
    XPATH_PSEUDO_CLASS_MARKER,
    HAS_PSEUDO_CLASS_MARKER,
    ABP_HAS_PSEUDO_CLASS_MARKER,
    IF_PSEUDO_CLASS_MARKER,
} from '../../common/constants';

/**
 * Selects dom elements by value of RegularSelector
 * @param regularSelectorNode RegularSelector node
 * @param root root dom element
 * @param specificity
 */
export const getByRegularSelector = (
    regularSelectorNode: AnySelectorNodeInterface,
    root: Document | Element,
    specificity?: Specificity,
): HTMLElement[] => {
    if (!regularSelectorNode.value) {
        throw new Error('RegularSelector value should be specified');
    }
    const selectorText = specificity
        ? `${specificity}${regularSelectorNode.value}`
        : regularSelectorNode.value;

    let selectedElements: HTMLElement[] = [];
    try {
        selectedElements = Array.from(root.querySelectorAll(selectorText));
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        throw new Error(`Error: unable to select by '${selectorText}' — ${e.message}`);
    }
    return selectedElements;
};

/**
 * Returns list of dom elements filtered or selected by ExtendedSelector node
 * @param domElements array of dom elements
 * @param extendedSelectorNode ExtendedSelector node
 * @returns array of dom elements
 */
export const getByExtendedSelector = (
    domElements: HTMLElement[],
    extendedSelectorNode: AnySelectorNodeInterface,
): HTMLElement[] => {
    let foundElements: HTMLElement[] = [];
    const pseudoName = extendedSelectorNode.children[0].name;
    if (!pseudoName) {
        // extended pseudo-classes should have a name
        throw new Error('Extended pseudo-class should have a name');
    }

    if (ABSOLUTE_PSEUDO_CLASSES.includes(pseudoName)) {
        const absolutePseudoArg = extendedSelectorNode.children[0].value;
        if (!absolutePseudoArg) {
            // absolute extended pseudo-classes should have an argument
            throw new Error(`Missing arg for :${pseudoName} pseudo-class`);
        }
        if (pseudoName === NTH_ANCESTOR_PSEUDO_CLASS_MARKER) {
            // :nth-ancestor()
            foundElements = findByAbsolutePseudoPseudo.nthAncestor(domElements, absolutePseudoArg, pseudoName);
        } else if (pseudoName === XPATH_PSEUDO_CLASS_MARKER) {
            // :xpath()
            try {
                document.createExpression(absolutePseudoArg, null);
            } catch (e) {
                throw new Error(`Invalid argument of :${pseudoName} pseudo-class: '${absolutePseudoArg}'`);
            }
            foundElements = findByAbsolutePseudoPseudo.xpath(domElements, absolutePseudoArg);
        } else if (pseudoName === UPWARD_PSEUDO_CLASS_MARKER) {
            // :upward()
            if (Number.isNaN(Number(absolutePseudoArg))) {
                // so arg is selector, not a number
                foundElements = findByAbsolutePseudoPseudo.upward(domElements, absolutePseudoArg);
            } else {
                foundElements = findByAbsolutePseudoPseudo.nthAncestor(domElements, absolutePseudoArg, pseudoName);
            }
        } else {
            // all other absolute extended pseudo-classes
            // e.g. contains, matches-attr, etc.
            foundElements = domElements.filter((element) => {
                return isMatchedByAbsolutePseudo(element, pseudoName, absolutePseudoArg);
            });
        }
    } else if (RELATIVE_PSEUDO_CLASSES.includes(pseudoName)) {
        const relativeSelectorNodes = extendedSelectorNode.children[0].children;
        if (relativeSelectorNodes.length === 0) {
            // extended relative pseudo-classes should have an argument as well
            throw new Error(`Missing arg for :${pseudoName} pseudo-class`);
        }
        const [relativeSelectorList] = relativeSelectorNodes;
        // needed for :not()
        let errorOnInvalidSelector = false;
        let relativePredicate: (e: HTMLElement) => boolean;
        switch (pseudoName) {
            case HAS_PSEUDO_CLASS_MARKER:
            case IF_PSEUDO_CLASS_MARKER:
            case ABP_HAS_PSEUDO_CLASS_MARKER:
                relativePredicate = (element: HTMLElement) => hasRelativesBySelectorList({
                    element,
                    relativeSelectorList,
                    pseudoName,
                });
                break;
            case IF_NOT_PSEUDO_CLASS_MARKER:
                relativePredicate = (element: HTMLElement) => !hasRelativesBySelectorList({
                    element,
                    relativeSelectorList,
                    pseudoName,
                });
                break;
            case IS_PSEUDO_CLASS_MARKER:
                relativePredicate = (element: HTMLElement) => isAnyElementBySelectorList({
                    element,
                    relativeSelectorList,
                    pseudoName,
                });
                break;
            case NOT_PSEUDO_CLASS_MARKER:
                errorOnInvalidSelector = true;
                relativePredicate = (element: HTMLElement) => !isAnyElementBySelectorList({
                    element,
                    relativeSelectorList,
                    pseudoName,
                    errorOnInvalidSelector,
                });
                break;
            default:
                throw new Error(`Unknown relative pseudo-class :${pseudoName}()`);
        }
        foundElements = domElements.filter(relativePredicate);
    } else {
        // extra check is parser missed something
        throw new Error(`Unknown extended pseudo-class: ':${pseudoName}'`);
    }
    return foundElements;
};

/**
 * Returns list of dom elements which is selected by RegularSelector value
 * @param domElements array of dom elements
 * @param regularSelectorNode RegularSelector node
 * @returns array of dom elements
 */
export const getByFollowingRegularSelector = (
    domElements: HTMLElement[],
    regularSelectorNode: AnySelectorNodeInterface,
): HTMLElement[] => {
    // array of arrays because of Array.map() later
    let foundElements: HTMLElement[][] = [];
    const { value } = regularSelectorNode;
    if (!value) {
        throw new Error('RegularSelector should have a value.');
    }

    if (value.startsWith(CHILD_COMBINATOR)) {
        // e.g. div:has(> img) > .banner
        foundElements = domElements
            .map((root) => {
                const specificity = `${COLON}${REGULAR_PSEUDO_CLASSES.SCOPE}`;
                return getByRegularSelector(regularSelectorNode, root, specificity);
            });
    } else if (value.startsWith(NEXT_SIBLING_COMBINATOR)
        || value.startsWith(SUBSEQUENT_SIBLING_COMBINATOR)) {
        // e.g. div:has(> img) + .banner
        // or   div:has(> img) ~ .banner
        foundElements = domElements
            .map((element) => {
                const rootElement = element.parentElement;
                if (!rootElement) {
                    throw new Error(`Selection by '${value}' part of selector is not possible.`);
                }
                const elementSelectorText = getElementSelectorDesc(element);
                const specificity = `${COLON}${REGULAR_PSEUDO_CLASSES.SCOPE}${CHILD_COMBINATOR}${elementSelectorText}`;
                const selected = getByRegularSelector(regularSelectorNode, rootElement, specificity);
                return selected;
            });
    } else {
        // space-separated regular selector after extended one
        // e.g. div:has(> img) .banner
        foundElements = domElements
            .map((root) => {
                const specificity = `${COLON}${REGULAR_PSEUDO_CLASSES.SCOPE}${DESCENDANT_COMBINATOR}`;
                return getByRegularSelector(regularSelectorNode, root, specificity);
            });
    }
    // foundElements should be flattened
    // as getByRegularSelector() returns elements array, and Array.map() collects them to array
    return flatten(foundElements);
};

/**
 * Gets elements nodes for Selector node.
 * As far as any selector always starts with regular part,
 * it selects by RegularSelector first and checks found elements later.
 *
 * Relative pseudo-classes has it's own subtree so getElementsForSelectorNode is called recursively.
 *
 * 'specificity' is needed for :has(), :is() and :not() pseudo-classes.
 * e.g. ':scope' specification is needed for proper descendants selection for 'div:has(> img)'
 * as native querySelectorAll() does not select exact element descendants even if it is called on 'div'.
 * so we check `divNode.querySelectorAll(':scope > img').length > 0`
 *
 * @param selectorNode Selector node
 * @param root root dom element
 * @param specificity needed element specification
 */
export const getElementsForSelectorNode = (
    selectorNode: AnySelectorNodeInterface,
    root: Document | Element | HTMLElement,
    specificity?: Specificity,
): HTMLElement[] => {
    let selectedElements: HTMLElement[] = [];
    let i = 0;
    while (i < selectorNode.children.length) {
        const selectorNodeChild = selectorNode.children[i];
        if (i === 0) {
            // any selector always starts with regular selector
            selectedElements = getByRegularSelector(selectorNodeChild, root, specificity);
        } else if (selectorNodeChild.type === NodeType.ExtendedSelector) {
            // filter previously selected elements by next selector nodes
            selectedElements = getByExtendedSelector(selectedElements, selectorNodeChild);
        } else if (selectorNodeChild.type === NodeType.RegularSelector) {
            selectedElements = getByFollowingRegularSelector(selectedElements, selectorNodeChild);
        }
        i += 1;
    }
    return selectedElements;
};
