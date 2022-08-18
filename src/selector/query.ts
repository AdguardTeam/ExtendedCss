import { parse } from './parser';

import {
    matchPseudo,
    findPseudo,
} from './pseudo-processor';

import {
    NodeType,
    AnySelectorNodeInterface,
} from './nodes';

import utils from '../utils';

import {
    CONTAINS_PSEUDO_CLASS_MARKERS,
    HAS_PSEUDO_CLASS_MARKERS,
    MATCHES_ATTR_PSEUDO_CLASS_MARKER,
    MATCHES_CSS_PSEUDO_CLASS_MARKERS,
    MATCHES_PROPERTY_PSEUDO_CLASS_MARKER,
    NTH_ANCESTOR_PSEUDO_CLASS_MARKER,
    UPWARD_PSEUDO_CLASS_MARKER,
    XPATH_PSEUDO_CLASS_MARKER,
    REGULAR_PSEUDO_CLASSES,
    DESCENDANT_COMBINATOR,
    CHILD_COMBINATOR,
    NEXT_SIBLING_COMBINATOR,
    SUBSEQUENT_SIBLING_COMBINATOR,
    IS_PSEUDO_CLASS_MARKER,
    NOT_PSEUDO_CLASS_MARKER,
    IF_NOT_PSEUDO_CLASS_MARKER,
    COLON,
    ABSOLUTE_PSEUDO_CLASSES,
    RELATIVE_PSEUDO_CLASSES,
} from '../constants';

/**
 * Selects dom elements by value of RegularSelector
 * @param regularSelectorNode RegularSelector node
 * @param root root element
 * @param specificity
 */
const getByRegularSelector = (
    regularSelectorNode: AnySelectorNodeInterface,
    root: Document | Element,
    specificity?: string,
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
 * Checks whether the domElement satisfies condition of absolute extended pseudo-class
 * @param domElement dom node, i.e html element
 * @param pseudoName pseudo-class name
 * @param pseudoArg pseudo-class arg
 */
const isAbsoluteMatching = (domElement: Element, pseudoName: string, pseudoArg: string): boolean => {
    let isMatching = false;
    if (CONTAINS_PSEUDO_CLASS_MARKERS.includes(pseudoName)) {
        isMatching = matchPseudo.contains(domElement, pseudoArg);
    } else if (MATCHES_CSS_PSEUDO_CLASS_MARKERS.includes(pseudoName)) {
        isMatching = matchPseudo.matchesCss(domElement, pseudoName, pseudoArg);
    } else if (pseudoName === MATCHES_ATTR_PSEUDO_CLASS_MARKER) {
        isMatching = matchPseudo.matchesAttr(domElement, pseudoName, pseudoArg);
    } else if (pseudoName === MATCHES_PROPERTY_PSEUDO_CLASS_MARKER) {
        isMatching = matchPseudo.matchesProperty(domElement, pseudoName, pseudoArg);
    }
    return isMatching;
};

/**
 * Checks whether the element has all relative elements specified by pseudo-class arg
 * Used for :has() and :if-not()
 * @param element dom node
 * @param selectorList SelectorList node
 * @param pseudoName relative pseudo-class name
 */
const hasRelativesBySelectorList = (
    element: Element,
    selectorList: AnySelectorNodeInterface,
    pseudoName: string | undefined,
): boolean => {
    return selectorList.children
        // "every" is used here as each Selector node from SelectorList should exist on page
        .every((selector) => {
            // selectorList.children always starts with regular selector as any selector generally
            const relativeRegularSelector = selector.children[0];
            if (!relativeRegularSelector) {
                throw new Error(`RegularSelector is missing for :${pseudoName} pseudo-class.`);
            }

            let specificity;
            let rootElement;
            if (relativeRegularSelector.value?.startsWith(NEXT_SIBLING_COMBINATOR)
                || relativeRegularSelector.value?.startsWith(SUBSEQUENT_SIBLING_COMBINATOR)) {
                /**
                 * For matching the element by "element:has(+ next-sibling)" and "element:has(~ sibling)"
                 * we check whether the element's parentElement has specific direct child combination
                 * e.g. 'h1:has(+ .share)' -> `h1Node.parentElement.querySelectorAll(':scope > h1 + .share')`
                 * https://www.w3.org/TR/selectors-4/#relational
                 */
                rootElement = element.parentElement;
                const elementSelectorText = element.tagName.toLowerCase();
                specificity = `${COLON}${REGULAR_PSEUDO_CLASSES.SCOPE}${CHILD_COMBINATOR}${elementSelectorText}`;
            } else {
                /**
                 * TODO: figure out something with :scope usage as IE does not support it
                 * https://developer.mozilla.org/en-US/docs/Web/CSS/:scope#browser_compatibility
                 */
                /**
                 * :scope specification is needed for proper descendants selection
                 * as native element.querySelectorAll() does not select exact element descendants
                 * e.g. 'a:has(> img)' -> `aNode.querySelectorAll(':scope > img')`
                 * OR '.block(div > span)' -> `blockClassNode.querySelectorAll(':scope div > span')`
                 */
                specificity = `${COLON}${REGULAR_PSEUDO_CLASSES.SCOPE}${DESCENDANT_COMBINATOR}`;
                rootElement = element;
            }

            if (!rootElement) {
                throw new Error(`Selection by :${pseudoName} pseudo-class is not possible.`);
            }

            let relativeElements;
            try {
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                relativeElements = getElementsForSelectorNode(selector, rootElement, specificity);
            } catch (e) {
                utils.logError(e);
                // fail for invalid selector
                throw new Error(`Invalid selector for :${pseudoName} pseudo-class: '${relativeRegularSelector.value}'`);
            }
            return relativeElements.length > 0;
        });
};

/**
 * Checks whether the element is an any element specified by pseudo-class arg.
 * Used for :is() and :not()
 * @param element dom node
 * @param selectorList SelectorList node
 * @param pseudoName relative pseudo-class name
 */
const isAnyElementBySelectorList = (
    element: Element,
    selectorList: AnySelectorNodeInterface,
    pseudoName: string | undefined,
    errorOnInvalidSelector?: boolean,
): boolean => {
    return selectorList.children
        // "some" is used here as any selector from selector list should exist on page
        .some((selector) => {
            // selectorList.children always starts with regular selector
            const relativeRegularSelector = selector.children[0];
            if (!relativeRegularSelector) {
                throw new Error(`RegularSelector is missing for :${pseudoName} pseudo-class.`);
            }

            /**
             * For checking the element by 'div:is(.banner)' and 'div:not([data="content"])
             * we check whether the element's parentElement has any specific direct child
             */
            const rootElement = element.parentElement;
            if (!rootElement) {
                throw new Error(`Selection by :${pseudoName} pseudo-class is not possible.`);
            }

            /**
             * So we calculate the element "description" by it's tagname and attributes for targeting
             * and use it to specify the selection
             * e.g. 'div:is(.banner)' -> `divNode.parentElement.querySelectorAll(':scope > div[class="banner"]')`
             */
            const elementSelectorText = utils.getElementSelectorText(element);
            const specificity = `${COLON}${REGULAR_PSEUDO_CLASSES.SCOPE}${CHILD_COMBINATOR}${elementSelectorText}`;

            let anyElements;
            try {
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                anyElements = getElementsForSelectorNode(selector, rootElement, specificity);
            } catch (e) {
                if (errorOnInvalidSelector) {
                    // fail on invalid selectors for :not()
                    utils.logError(e);
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
 * Returns list of dom nodes filtered or selected by ExtendedSelector node
 * @param domElements array of dom nodes
 * @param extendedSelectorNode ExtendedSelector node
 * @returns array of dom nodes
 */
const getByExtendedSelector = (
    domElements: HTMLElement[],
    extendedSelectorNode: AnySelectorNodeInterface,
): HTMLElement[] => {
    let foundElements: HTMLElement[] = [];
    const extPseudoName = extendedSelectorNode.children[0].name;
    if (!extPseudoName) {
        // extended pseudo-classes should have a name
        throw new Error('Extended pseudo-class should have a name');
    }

    /**
     * TODO: refactor later
     */
    if (ABSOLUTE_PSEUDO_CLASSES.includes(extPseudoName)) {
        const absolutePseudoArg = extendedSelectorNode.children[0].arg;
        if (!absolutePseudoArg) {
            // absolute extended pseudo-classes should have an argument
            throw new Error(`Missing arg for :${extPseudoName} pseudo-class`);
        }

        if (extPseudoName === NTH_ANCESTOR_PSEUDO_CLASS_MARKER) {
            // :nth-ancestor()
            foundElements = findPseudo.nthAncestor(domElements, absolutePseudoArg, extPseudoName);
        } else if (extPseudoName === XPATH_PSEUDO_CLASS_MARKER) {
            // :xpath()
            try {
                document.createExpression(absolutePseudoArg, null);
            } catch (e) {
                throw new Error(`Invalid argument of :${extPseudoName} pseudo-class: '${absolutePseudoArg}'`);
            }
            foundElements = findPseudo.xpath(domElements, absolutePseudoArg);
        } else if (extPseudoName === UPWARD_PSEUDO_CLASS_MARKER) {
            // :upward()
            if (Number.isNaN(Number(absolutePseudoArg))) {
                // so arg is selector, not a number
                foundElements = findPseudo.upward(domElements, absolutePseudoArg);
            } else {
                foundElements = findPseudo.nthAncestor(domElements, absolutePseudoArg, extPseudoName);
            }
        } else {
            // all other absolute extended pseudo-classes
            // e.g. contains, matches-attr, etc.
            foundElements = domElements.filter((element) => {
                return isAbsoluteMatching(element, extPseudoName, absolutePseudoArg);
            });
        }
    } else if (RELATIVE_PSEUDO_CLASSES.includes(extPseudoName)) {
        const relativeSelectorNodes = extendedSelectorNode.children[0].children;
        if (relativeSelectorNodes.length === 0) {
            // extended relative pseudo-classes should have an argument as well
            throw new Error(`Missing arg for :${extPseudoName} pseudo-class`);
        }

        if (HAS_PSEUDO_CLASS_MARKERS.includes(extPseudoName)) {
            // :has(), :if(), :-abp-has()
            foundElements = domElements.filter((element) => {
                return hasRelativesBySelectorList(
                    element,
                    relativeSelectorNodes[0],
                    extPseudoName,
                );
            });
        } else if (extPseudoName === IF_NOT_PSEUDO_CLASS_MARKER) {
            // :if-not()
            foundElements = domElements.filter((element) => {
                return !hasRelativesBySelectorList(
                    element,
                    relativeSelectorNodes[0],
                    extPseudoName,
                );
            });
        } else if (extPseudoName === IS_PSEUDO_CLASS_MARKER) {
            // :is()
            foundElements = domElements.filter((element) => {
                return isAnyElementBySelectorList(
                    element,
                    relativeSelectorNodes[0],
                    extPseudoName,
                );
            });
        } else if (extPseudoName === NOT_PSEUDO_CLASS_MARKER) {
            // :not()
            foundElements = domElements.filter((element) => {
                return !isAnyElementBySelectorList(
                    element,
                    relativeSelectorNodes[0],
                    extPseudoName,
                    // 'true' for error throwing on invalid selector
                    true,
                );
            });
        }
    } else {
        // extra check is parser missed something
        throw new Error(`Unknown extended pseudo-class: ':${extPseudoName}'`);
    }

    return foundElements;
};

/**
 * Returns list of dom nodes which is selected by RegularSelector value
 * @param domElements array of dom nodes
 * @param regularSelectorNode RegularSelector node
 * @returns array of dom nodes
 */
const getByFollowingRegularSelector = (
    domElements: HTMLElement[],
    regularSelectorNode: AnySelectorNodeInterface,
): HTMLElement[] => {
    let foundElements = [];
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
                const elementSelectorText = utils.getElementSelectorText(element);
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
    // as getByRegularSelector() returns elements array, and map() collects them to array
    return foundElements.flat(1);
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
 * @param root root element
 * @param specificity needed element specification
 */
const getElementsForSelectorNode = (
    selectorNode: AnySelectorNodeInterface,
    root: Document | Element | HTMLElement,
    specificity?: string,
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

/**
 * Selects elements by ast
 * @param ast ast of parsed selector
 * @param doc document
 */
export const selectElementsByAst = (ast: AnySelectorNodeInterface, doc = document): HTMLElement[] => {
    const selectedElements: HTMLElement[] = [];
    // ast root is SelectorList node;
    // it has Selector nodes as children which should be processed separately
    ast.children.forEach((selectorNode: AnySelectorNodeInterface) => {
        selectedElements.push(...getElementsForSelectorNode(selectorNode, doc));
    });
    // selectedElements should be flattened as it is array of arrays with elements
    const uniqueElements = [...new Set(utils.flatten(selectedElements))];
    return uniqueElements;
};

/**
 * Selects elements by selector
 * @param selector
 */
export const querySelectorAll = (selector: string): HTMLElement[] => {
    const ast = parse(selector);
    return selectElementsByAst(ast);
};

/**
 * Class of ExtCssDocument is needed for caching.
 * For making cache related to each new instance of class, not global
 */
export class ExtCssDocument {
    /**
     * Cache with selectors and their AST parsing results
     */
    private readonly astCache: Map<string, AnySelectorNodeInterface>;

    constructor() {
        this.astCache = new Map<string, AnySelectorNodeInterface>();
    }

    /**
     * Saves selector and it's ast to cache
     * @param selector
     * @param ast
     */
    private saveAstToCache(selector: string, ast: AnySelectorNodeInterface): void {
        this.astCache.set(selector, ast);
    }

    /**
     * Gets ast from cache for given selector
     * @param selector
     */
    private getAstFromCache(selector: string): AnySelectorNodeInterface | null {
        const cachedAst = this.astCache.get(selector) || null;
        return cachedAst;
    }

    /**
     * Gets selector ast:
     * - if cached ast exists — returns it
     * - if no cached ast — saves newly parsed ast to cache and returns it
     * @param selector
     */
    private getSelectorAst(selector: string): AnySelectorNodeInterface {
        let ast = this.getAstFromCache(selector);
        if (!ast) {
            ast = parse(selector);
        }
        this.saveAstToCache(selector, ast);
        return ast;
    }

    /**
     * Selects elements by selector
     * @param selector
     */
    querySelectorAll(selector: string): HTMLElement[] {
        const ast = this.getSelectorAst(selector);
        return selectElementsByAst(ast);
    }
}
