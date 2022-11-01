import {
    NodeType,
    AnySelectorNodeInterface,
} from '../nodes';

import {
    findByAbsolutePseudoPseudo,
    isMatchedByAbsolutePseudo,
} from './absolute-processor';

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
import { logger } from '../../common/utils/logger';

/**
 * Additional calculated selector part which is needed to :has(), :if-not(), :is() and :not() pseudo-classes.
 *
 * Native Document.querySelectorAll() does not select exact descendant elements
 * but match all page elements satisfying the selector,
 * so extra specification is needed for proper descendants selection
 * e.g. 'div:has(> img)'.
 *
 * Its calculation depends on extended selector.
 */
export type Specificity = string;

/**
 * Interface for relative pseudo-class helpers args.
 */
interface RelativePredicateArgsInterface {
    /**
     * Dom element to check relatives.
     */
    element: HTMLElement;

    /**
     * SelectorList node.
     */
    relativeSelectorList: AnySelectorNodeInterface;

    /**
     * Extended pseudo-class name.
     */
    pseudoName: string;

    /**
     * Flag for error throwing on invalid selector from selectorList
     * e.g. `true` for :not() pseudo-class.
     */
    errorOnInvalidSelector?: boolean;
}

/**
 * Checks whether the element has all relative elements specified by pseudo-class arg.
 * Used for :has() and :if-not() pseudo-classes.
 *
 * @param argsData Relative pseudo-class helpers args data.
 */
const hasRelativesBySelectorList = (argsData: RelativePredicateArgsInterface): boolean => {
    const { element, relativeSelectorList, pseudoName } = argsData;
    return relativeSelectorList.children
        // Array.every() is used here as each Selector node from SelectorList should exist on page
        .every((selector) => {
            // selectorList.children always starts with regular selector as any selector generally
            const [relativeRegularSelector] = selector.children;
            if (!relativeRegularSelector) {
                throw new Error(`RegularSelector is missing for :${pseudoName} pseudo-class.`);
            }

            let specificity: Specificity = '';
            let rootElement: HTMLElement | null = null;
            if (relativeRegularSelector.value?.startsWith(NEXT_SIBLING_COMBINATOR)
                || relativeRegularSelector.value?.startsWith(SUBSEQUENT_SIBLING_COMBINATOR)) {
                /**
                 * For matching the element by "element:has(+ next-sibling)" and "element:has(~ sibling)"
                 * we check whether the element's parentElement has specific direct child combination,
                 * e.g. 'h1:has(+ .share)' -> `h1Node.parentElement.querySelectorAll(':scope > h1 + .share')`.
                 *
                 * @see {@link https://www.w3.org/TR/selectors-4/#relational}
                 */
                rootElement = element.parentElement;
                const elementSelectorText = element.tagName.toLowerCase();
                specificity = `${COLON}${REGULAR_PSEUDO_CLASSES.SCOPE}${CHILD_COMBINATOR}${elementSelectorText}`;
            } else {
                /**
                 * :scope specification is needed for proper descendants selection
                 * as native element.querySelectorAll() does not select exact element descendants
                 * e.g. 'a:has(> img)' -> `aNode.querySelectorAll(':scope > img')`
                 * OR '.block(div > span)' -> `blockClassNode.querySelectorAll(':scope div > span')`.
                 */
                specificity = `${COLON}${REGULAR_PSEUDO_CLASSES.SCOPE}${DESCENDANT_COMBINATOR}`;
                rootElement = element;
            }

            if (!rootElement) {
                throw new Error(`Selection by :${pseudoName} pseudo-class is not possible.`);
            }

            let relativeElements: HTMLElement[];
            try {
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                relativeElements = getElementsForSelectorNode(selector, rootElement, specificity);
            } catch (e) {
                logger.error(e);
                // fail for invalid selector
                throw new Error(`Invalid selector for :${pseudoName} pseudo-class: '${relativeRegularSelector.value}'`);
            }
            return relativeElements.length > 0;
        });
};

/**
 * Checks whether the element is an any element specified by pseudo-class arg.
 * Used for :is() and :not() pseudo-classes.
 *
 * @param argsData Relative pseudo-class helpers args data.
 */
const isAnyElementBySelectorList = (argsData: RelativePredicateArgsInterface): boolean => {
    const { element, relativeSelectorList, pseudoName, errorOnInvalidSelector } = argsData;
    return relativeSelectorList.children
        // Array.some() is used here as any selector from selector list should exist on page
        .some((selector) => {
            // selectorList.children always starts with regular selector
            const [relativeRegularSelector] = selector.children;
            if (!relativeRegularSelector) {
                throw new Error(`RegularSelector is missing for :${pseudoName} pseudo-class.`);
            }

            /**
             * For checking the element by 'div:is(.banner)' and 'div:not([data="content"])
             * we check whether the element's parentElement has any specific direct child.
             */
            const rootElement = element.parentElement;
            if (!rootElement) {
                throw new Error(`Selection by :${pseudoName} pseudo-class is not possible.`);
            }

            /**
             * So we calculate the element "description" by it's tagname and attributes for targeting
             * and use it to specify the selection
             * e.g. `div:is(.banner)` --> `divNode.parentElement.querySelectorAll(':scope > div[class="banner"]')`.
             */
            const elementSelectorText = getElementSelectorDesc(element);
            const specificity = `${COLON}${REGULAR_PSEUDO_CLASSES.SCOPE}${CHILD_COMBINATOR}${elementSelectorText}`;

            let anyElements: HTMLElement[];
            try {
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                anyElements = getElementsForSelectorNode(selector, rootElement, specificity);
            } catch (e) {
                if (errorOnInvalidSelector) {
                    // fail on invalid selectors for :not()
                    logger.error(e);
                    throw new Error(`Invalid selector for :${pseudoName} pseudo-class: '${relativeRegularSelector.value}'`); // eslint-disable-line max-len
                } else {
                    // do not fail on invalid selectors for :is()
                    return false;
                }
            }
            return anyElements.length > 0;
        });
};

/**
 * Selects dom elements by value of RegularSelector.
 *
 * @param regularSelectorNode RegularSelector node.
 * @param root Root DOM element.
 * @param specificity @see {@link Specificity}.
 *
 * @throws An error if RegularSelector has no value
 * or RegularSelector.value is invalid selector.
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
 * Returns list of dom elements filtered or selected by ExtendedSelector node.
 *
 * @param domElements Array of DOM elements.
 * @param extendedSelectorNode ExtendedSelector node.
 *
 * @throws An error on unknown pseudo-class,
 * absent or invalid arg of extended pseudo-class, etc.
 * @returns Array of DOM elements.
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
 * Returns list of dom elements which is selected by RegularSelector value.
 *
 * @param domElements Array of DOM elements.
 * @param regularSelectorNode RegularSelector node.
 *
 * @throws An error if RegularSelector has not value.
 * @returns Array of DOM elements.
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
                    // do not throw error if there in no parent for element
                    // e.g. '*:contains(text)' selects `html` which has no parentElement
                    return [];
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
 * 'specificity' is needed for :has(), :is(), and :not() pseudo-classes
 * as native querySelectorAll() does not select exact element descendants even if it is called on 'div'
 * e.g. ':scope' specification is needed for proper descendants selection for 'div:has(> img)'.
 * So we check `divNode.querySelectorAll(':scope > img').length > 0`.
 *
 * @param selectorNode Selector node.
 * @param root Root DOM element.
 * @param specificity Needed element specification.
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
