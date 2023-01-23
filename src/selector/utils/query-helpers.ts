import { AnySelectorNodeInterface } from '../nodes';

import {
    getNodeName,
    getNodeValue,
    getPseudoClassNode,
    getFirstRegularChild,
    getRelativeSelectorListNode,
    isRegularSelectorNode,
    isExtendedSelectorNode,
} from './ast-node-helpers';
import { findByAbsolutePseudoPseudo, isMatchedByAbsolutePseudo } from './absolute-processor';
import { isAbsolutePseudoClass, isRelativePseudoClass } from './common-predicates';

import { getElementSelectorDesc, getParent } from '../../common/utils/nodes';
import { flatten, getItemByIndex } from '../../common/utils/arrays';
import { getErrorMessage } from '../../common/utils/error';
import { logger } from '../../common/utils/logger';

import {
    DESCENDANT_COMBINATOR,
    CHILD_COMBINATOR,
    NEXT_SIBLING_COMBINATOR,
    SUBSEQUENT_SIBLING_COMBINATOR,
    SCOPE_CSS_PSEUDO_CLASS,
    ASTERISK,
    IS_PSEUDO_CLASS_MARKER,
    NOT_PSEUDO_CLASS_MARKER,
    NTH_ANCESTOR_PSEUDO_CLASS_MARKER,
    UPWARD_PSEUDO_CLASS_MARKER,
    XPATH_PSEUDO_CLASS_MARKER,
    HAS_PSEUDO_CLASS_MARKER,
    ABP_HAS_PSEUDO_CLASS_MARKER,
} from '../../common/constants';

/**
 * Calculated selector text which is needed to :has(), :is() and :not() pseudo-classes.
 * Contains calculated part (depends on the processed element)
 * and value of RegularSelector which is next to selector by.
 *
 * Native Document.querySelectorAll() does not select exact descendant elements
 * but match all page elements satisfying the selector,
 * so extra specification is needed for proper descendants selection
 * e.g. 'div:has(> img)'.
 *
 * Its calculation depends on extended selector.
 */
export type SpecifiedSelector = string;

/**
 * Combined `:scope` pseudo-class and **child** combinator — `:scope>`.
 */
const scopeDirectChildren = `${SCOPE_CSS_PSEUDO_CLASS}${CHILD_COMBINATOR}`;

/**
 * Combined `:scope` pseudo-class and **descendant** combinator — `:scope `.
 */
const scopeAnyChildren = `${SCOPE_CSS_PSEUDO_CLASS}${DESCENDANT_COMBINATOR}`;

/**
 * Type for relative pseudo-class helpers args.
 */
type RelativePredicateArgsData = {
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
};

/**
 * Returns the first of RegularSelector child node for `selectorNode`.
 *
 * @param selectorNode Ast Selector node.
 * @param pseudoName Name of relative pseudo-class.
 *
 * @returns Ast RegularSelector node.
 */
const getFirstInnerRegularChild = (
    selectorNode: AnySelectorNodeInterface,
    pseudoName: string,
): AnySelectorNodeInterface => {
    return getFirstRegularChild(
        selectorNode.children,
        `RegularSelector is missing for :${pseudoName}() pseudo-class`,
    );
};

// TODO: fix for <forgiving-relative-selector-list>
// https://github.com/AdguardTeam/ExtendedCss/issues/154
/**
 * Checks whether the element has all relative elements specified by pseudo-class arg.
 * Used for :has() pseudo-class.
 *
 * @param argsData Relative pseudo-class helpers args data.
 *
 * @returns True if **all selectors** from argsData.relativeSelectorList is **matched** for argsData.element.
 */
const hasRelativesBySelectorList = (argsData: RelativePredicateArgsData): boolean => {
    const { element, relativeSelectorList, pseudoName } = argsData;
    return relativeSelectorList.children
        // Array.every() is used here as each Selector node from SelectorList should exist on page
        .every((selectorNode) => {
            // selectorList.children always starts with regular selector as any selector generally
            const relativeRegularSelector = getFirstInnerRegularChild(selectorNode, pseudoName);

            let specifiedSelector: SpecifiedSelector = '';
            let rootElement: HTMLElement | null = null;
            const regularSelector = getNodeValue(relativeRegularSelector);
            if (regularSelector.startsWith(NEXT_SIBLING_COMBINATOR)
                || regularSelector.startsWith(SUBSEQUENT_SIBLING_COMBINATOR)) {
                /**
                 * For matching the element by "element:has(+ next-sibling)" and "element:has(~ sibling)"
                 * we check whether the element's parentElement has specific direct child combination,
                 * e.g. 'h1:has(+ .share)' -> `h1Node.parentElement.querySelectorAll(':scope > h1 + .share')`.
                 *
                 * @see {@link https://www.w3.org/TR/selectors-4/#relational}
                 */
                rootElement = element.parentElement;
                const elementSelectorText = getElementSelectorDesc(element);
                specifiedSelector = `${scopeDirectChildren}${elementSelectorText}${regularSelector}`;
            } else if (regularSelector === ASTERISK) {
                /**
                 * :scope specification is needed for proper descendants selection
                 * as native element.querySelectorAll() does not select exact element descendants
                 * e.g. 'a:has(> img)' -> `aNode.querySelectorAll(':scope > img')`.
                 *
                 * For 'any selector' as arg of relative simplicity should be set for all inner elements
                 * e.g. 'div:has(*)' -> `divNode.querySelectorAll(':scope *')`
                 * which means empty div with no child element.
                 */
                rootElement = element;
                specifiedSelector = `${scopeAnyChildren}${ASTERISK}`;
            } else {
                /**
                 * As it described above, inner elements should be found using `:scope` pseudo-class
                 * e.g. 'a:has(> img)' -> `aNode.querySelectorAll(':scope > img')`
                 * OR '.block(div > span)' -> `blockClassNode.querySelectorAll(':scope div > span')`.
                 */
                specifiedSelector = `${scopeAnyChildren}${regularSelector}`;
                rootElement = element;
            }

            if (!rootElement) {
                throw new Error(`Selection by :${pseudoName}() pseudo-class is not possible`);
            }

            let relativeElements: HTMLElement[];
            try {
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                relativeElements = getElementsForSelectorNode(selectorNode, rootElement, specifiedSelector);
            } catch (e: unknown) {
                logger.error(getErrorMessage(e));
                // fail for invalid selector
                throw new Error(`Invalid selector for :${pseudoName}() pseudo-class: '${regularSelector}'`);
            }
            return relativeElements.length > 0;
        });
};

/**
 * Checks whether the element is an any element specified by pseudo-class arg.
 * Used for :is() pseudo-class.
 *
 * @param argsData Relative pseudo-class helpers args data.
 *
 * @returns True if **any selector** from argsData.relativeSelectorList is **matched** for argsData.element.
 */
const isAnyElementBySelectorList = (argsData: RelativePredicateArgsData): boolean => {
    const { element, relativeSelectorList, pseudoName } = argsData;
    return relativeSelectorList.children
        // Array.some() is used here as any selector from selector list should exist on page
        .some((selectorNode) => {
            // selectorList.children always starts with regular selector
            const relativeRegularSelector = getFirstInnerRegularChild(selectorNode, pseudoName);

            /**
             * For checking the element by 'div:is(.banner)'
             * we check whether the element's parentElement has any specific direct child.
             */
            const rootElement = getParent(element, `Selection by :${pseudoName}() pseudo-class is not possible`);

            /**
             * So we calculate the element "description" by it's tagname and attributes for targeting
             * and use it to specify the selection
             * e.g. `div:is(.banner)` --> `divNode.parentElement.querySelectorAll(':scope > .banner')`.
             */
            const specifiedSelector = `${scopeDirectChildren}${getNodeValue(relativeRegularSelector)}`;

            let anyElements: HTMLElement[];
            try {
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                anyElements = getElementsForSelectorNode(selectorNode, rootElement, specifiedSelector);
            } catch (e: unknown) {
                // do not fail on invalid selectors for :is()
                return false;
            }

            // TODO: figure out how to handle complex selectors with extended pseudo-classes
            // (check readme - extended-css-is-limitations)
            // because `element` and `anyElements` may be from different DOM levels
            return anyElements.includes(element);
        });
};

/**
 * Checks whether the element is not an element specified by pseudo-class arg.
 * Used for :not() pseudo-class.
 *
 * @param argsData Relative pseudo-class helpers args data.
 *
 * @returns True if **any selector** from argsData.relativeSelectorList is **not matched** for argsData.element.
 */
const notElementBySelectorList = (argsData: RelativePredicateArgsData): boolean => {
    const { element, relativeSelectorList, pseudoName } = argsData;
    return relativeSelectorList.children
        // Array.every() is used here as element should not be selected by any selector from selector list
        .every((selectorNode) => {
            // selectorList.children always starts with regular selector
            const relativeRegularSelector = getFirstInnerRegularChild(selectorNode, pseudoName);

            /**
             * For checking the element by 'div:not([data="content"])
             * we check whether the element's parentElement has any specific direct child.
             */
            const rootElement = getParent(element, `Selection by :${pseudoName}() pseudo-class is not possible`);

            /**
             * So we calculate the element "description" by it's tagname and attributes for targeting
             * and use it to specify the selection
             * e.g. `div:not(.banner)` --> `divNode.parentElement.querySelectorAll(':scope > .banner')`.
             */
            const specifiedSelector = `${scopeDirectChildren}${getNodeValue(relativeRegularSelector)}`;

            let anyElements: HTMLElement[];
            try {
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                anyElements = getElementsForSelectorNode(selectorNode, rootElement, specifiedSelector);
            } catch (e: unknown) {
                // fail on invalid selectors for :not()
                logger.error(getErrorMessage(e));
                // eslint-disable-next-line max-len
                throw new Error(`Invalid selector for :${pseudoName}() pseudo-class: '${getNodeValue(relativeRegularSelector)}'`);
            }

            // TODO: figure out how to handle up-looking pseudo-classes inside :not()
            // (check readme - extended-css-not-limitations)
            // because `element` and `anyElements` may be from different DOM levels
            return !anyElements.includes(element);
        });
};

/**
 * Selects dom elements by value of RegularSelector.
 *
 * @param regularSelectorNode RegularSelector node.
 * @param root Root DOM element.
 * @param specifiedSelector @see {@link SpecifiedSelector}.
 *
 * @returns Array of DOM elements.
 * @throws An error if RegularSelector node value is an invalid selector.
 */
export const getByRegularSelector = (
    regularSelectorNode: AnySelectorNodeInterface,
    root: Document | Element,
    specifiedSelector?: SpecifiedSelector,
): HTMLElement[] => {
    const selectorText = specifiedSelector
        ? specifiedSelector
        : getNodeValue(regularSelectorNode);

    let selectedElements: HTMLElement[] = [];
    try {
        selectedElements = Array.from(root.querySelectorAll(selectorText));
    } catch (e: unknown) {
        throw new Error(`Error: unable to select by '${selectorText}' — ${getErrorMessage(e)}`);
    }
    return selectedElements;
};

/**
 * Returns list of dom elements filtered or selected by ExtendedSelector node.
 *
 * @param domElements Array of DOM elements.
 * @param extendedSelectorNode ExtendedSelector node.
 *
 * @returns Array of DOM elements.
 * @throws An error on unknown pseudo-class,
 * absent or invalid arg of extended pseudo-class, etc.
 */
export const getByExtendedSelector = (
    domElements: HTMLElement[],
    extendedSelectorNode: AnySelectorNodeInterface,
): HTMLElement[] => {
    let foundElements: HTMLElement[] = [];
    const extendedPseudoClassNode = getPseudoClassNode(extendedSelectorNode);
    const pseudoName = getNodeName(extendedPseudoClassNode);
    if (isAbsolutePseudoClass(pseudoName)) {
        // absolute extended pseudo-classes should have an argument
        const absolutePseudoArg = getNodeValue(
            extendedPseudoClassNode,
            `Missing arg for :${pseudoName}() pseudo-class`,
        );
        if (pseudoName === NTH_ANCESTOR_PSEUDO_CLASS_MARKER) {
            // :nth-ancestor()
            foundElements = findByAbsolutePseudoPseudo.nthAncestor(domElements, absolutePseudoArg, pseudoName);
        } else if (pseudoName === XPATH_PSEUDO_CLASS_MARKER) {
            // :xpath()
            try {
                document.createExpression(absolutePseudoArg, null);
            } catch (e: unknown) {
                throw new Error(`Invalid argument of :${pseudoName}() pseudo-class: '${absolutePseudoArg}'`);
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
    } else if (isRelativePseudoClass(pseudoName)) {
        const relativeSelectorList = getRelativeSelectorListNode(extendedPseudoClassNode);
        let relativePredicate: (e: HTMLElement) => boolean;
        switch (pseudoName) {
            case HAS_PSEUDO_CLASS_MARKER:
            case ABP_HAS_PSEUDO_CLASS_MARKER:
                relativePredicate = (element: HTMLElement) => hasRelativesBySelectorList({
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
                relativePredicate = (element: HTMLElement) => notElementBySelectorList({
                    element,
                    relativeSelectorList,
                    pseudoName,
                });
                break;
            default:
                throw new Error(`Unknown relative pseudo-class: '${pseudoName}'`);
        }
        foundElements = domElements.filter(relativePredicate);
    } else {
        // extra check is parser missed something
        throw new Error(`Unknown extended pseudo-class: '${pseudoName}'`);
    }
    return foundElements;
};

/**
 * Returns list of dom elements which is selected by RegularSelector value.
 *
 * @param domElements Array of DOM elements.
 * @param regularSelectorNode RegularSelector node.
 *
 * @returns Array of DOM elements.
 * @throws An error if RegularSelector has not value.
 */
export const getByFollowingRegularSelector = (
    domElements: HTMLElement[],
    regularSelectorNode: AnySelectorNodeInterface,
): HTMLElement[] => {
    // array of arrays because of Array.map() later
    let foundElements: HTMLElement[][] = [];
    const value = getNodeValue(regularSelectorNode);
    if (value.startsWith(CHILD_COMBINATOR)) {
        // e.g. div:has(> img) > .banner
        foundElements = domElements
            .map((root) => {
                const specifiedSelector = `${SCOPE_CSS_PSEUDO_CLASS}${value}`;
                return getByRegularSelector(regularSelectorNode, root, specifiedSelector);
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
                const specifiedSelector = `${scopeDirectChildren}${elementSelectorText}${value}`;
                const selected = getByRegularSelector(regularSelectorNode, rootElement, specifiedSelector);
                return selected;
            });
    } else {
        // space-separated regular selector after extended one
        // e.g. div:has(> img) .banner
        foundElements = domElements
            .map((root) => {
                const specifiedSelector = `${scopeAnyChildren}${getNodeValue(regularSelectorNode)}`;
                return getByRegularSelector(regularSelectorNode, root, specifiedSelector);
            });
    }
    // foundElements should be flattened
    // as getByRegularSelector() returns elements array, and Array.map() collects them to array
    return flatten(foundElements);
};

/**
 * Returns elements nodes for Selector node.
 * As far as any selector always starts with regular part,
 * it selects by RegularSelector first and checks found elements later.
 *
 * Relative pseudo-classes has it's own subtree so getElementsForSelectorNode is called recursively.
 *
 * 'specifiedSelector' is needed for :has(), :is(), and :not() pseudo-classes
 * as native querySelectorAll() does not select exact element descendants even if it is called on 'div'
 * e.g. ':scope' specification is needed for proper descendants selection for 'div:has(> img)'.
 * So we check `divNode.querySelectorAll(':scope > img').length > 0`.
 *
 * @param selectorNode Selector node.
 * @param root Root DOM element.
 * @param specifiedSelector Needed element specification.
 *
 * @returns Array of DOM elements.
 * @throws An error if there is no selectorNodeChild.
 */
export const getElementsForSelectorNode = (
    selectorNode: AnySelectorNodeInterface,
    root: Document | Element | HTMLElement,
    specifiedSelector?: SpecifiedSelector,
): HTMLElement[] => {
    let selectedElements: HTMLElement[] = [];
    let i = 0;
    while (i < selectorNode.children.length) {
        const selectorNodeChild = getItemByIndex(selectorNode.children, i, 'selectorNodeChild should be specified');
        if (i === 0) {
            // any selector always starts with regular selector
            selectedElements = getByRegularSelector(selectorNodeChild, root, specifiedSelector);
        } else if (isExtendedSelectorNode(selectorNodeChild)) {
            // filter previously selected elements by next selector nodes
            selectedElements = getByExtendedSelector(selectedElements, selectorNodeChild);
        } else if (isRegularSelectorNode(selectorNodeChild)) {
            selectedElements = getByFollowingRegularSelector(selectedElements, selectorNodeChild);
        }
        i += 1;
    }
    return selectedElements;
};
