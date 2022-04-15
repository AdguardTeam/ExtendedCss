import { parse } from './parser';

import {
    matchPseudo,
    findPseudo,
} from './pseudo-processor';

import {
    NodeType,
    AnySelectorNodeInterface,
} from './nodes';

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
    NEXT_SIBLING_COMBINATOR,
    SUBSEQUENT_SIBLING_COMBINATOR,
} from './constants';

/**
 * Selects dom elements by value of RegularSelector
 * @param selectorNode
 * @param root
 */
const getByRegularSelector = (
    selectorNode: AnySelectorNodeInterface,
    root: Document | Element,
    specificity?: string,
): Element[] => {
    if (!selectorNode) {
        throw new Error('selectorNode should be specified');
    }
    if (!selectorNode.value) {
        throw new Error('RegularSelector value should be specified');
    }
    const selectorText = specificity
        ? `${specificity}${selectorNode.value}`
        : selectorNode.value;
    return Array.from(root.querySelectorAll(selectorText));
};

/**
 * Checks whether the domElement satisfies condition of extended pseudo-class
 * @param domElement dom node, i.e html element
 * @param extendedPseudo absolute extended pseudo-class node
 */
const isAbsoluteMatching = (domElement: Element, extendedPseudo: AnySelectorNodeInterface): boolean => {
    let isMatching = false;
    const { name, arg } = extendedPseudo;
    if (!name || !arg) {
        throw new Error('Pseudo-class name or arg is missing in AbsolutePseudoClass');
    }

    if (CONTAINS_PSEUDO_CLASS_MARKERS.includes(name)) {
        isMatching = matchPseudo.contains(domElement, arg);
    }

    if (MATCHES_CSS_PSEUDO_CLASS_MARKERS.includes(name)) {
        isMatching = matchPseudo.matchesCss(domElement, name, arg);
    }

    if (name === MATCHES_ATTR_PSEUDO_CLASS_MARKER) {
        isMatching = matchPseudo.matchesAttr(domElement, name, arg);
    }

    if (name === MATCHES_PROPERTY_PSEUDO_CLASS_MARKER) {
        isMatching = matchPseudo.matchesProperty(domElement, name, arg);
    }

    return isMatching;
};

/**
 *
 * @param domElement dom node
 * @param selectorNode Selector node child
 */
const isMatching = (domElement: Element, selectorNode: AnySelectorNodeInterface): boolean => {
    let match = false;
    if (selectorNode.type === NodeType.RegularSelector) {
        // TODO: regular selector part after extended pseudo-class
        // e.g. " ~ p" in rule "div:has(a) ~ p"
    } else if (selectorNode.type === NodeType.ExtendedSelector) {
        /**
         * TODO: consider to deprecate NodeTypes.ExtendedSelector
         */
        const extendedPseudo = selectorNode.children[0];
        if (extendedPseudo.type === NodeType.AbsolutePseudoClass) {
            match = isAbsoluteMatching(domElement, extendedPseudo);
        }
    } else {
        // it might be error if there is neither RegularSelector nor ExtendedSelector among Selector.children
    }
    return match;
};

const hasRelativesBySelectorList = (element: Element, selectorList: AnySelectorNodeInterface): boolean => {
    return selectorList.children
        .every((selector) => {
            // selectorList.children always starts with regular selector
            const relativeRegularSelector = selector.children[0];
            if (!relativeRegularSelector) {
                throw new Error('RegularSelector is missing.');
            }

            let specificity;
            let rootElement;
            if (relativeRegularSelector.value?.startsWith(NEXT_SIBLING_COMBINATOR)
                || relativeRegularSelector.value?.startsWith(SUBSEQUENT_SIBLING_COMBINATOR)) {
                /**
                 * For matching the element by "element:has(+ next-sibling)" and "element:has(~ sibling)"
                 * we check whether the element's parentElement has specific direct child combination
                 * e.g. 'h1:has(+ .share)' -> h1.parentElement.querySelectorAll(':scope > h1 + .share')
                 * https://www.w3.org/TR/selectors-4/#relational
                 */
                rootElement = element.parentElement;
                const elementSelectorText = element.tagName.toLowerCase();
                specificity = `${REGULAR_PSEUDO_CLASSES.SCOPE} > ${elementSelectorText}`;
            } else {
                // e.g. "a:has(> img)", ".block(div > span)"
                /**
                 * TODO: figure out something with :scope usage as IE does not support it
                 * https://developer.mozilla.org/en-US/docs/Web/CSS/:scope#browser_compatibility
                 */
                /**
                 * :scope specification is needed for proper descendants selection
                 * as native element.querySelectorAll() does not select exact element descendants
                 */
                specificity = `${REGULAR_PSEUDO_CLASSES.SCOPE} `;
                rootElement = element;
            }

            if (!rootElement) {
                throw new Error('Selection is not possible');
            }
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            const relativeElements = getElementsForSelectorNode(selector, rootElement, specificity);
            return relativeElements.length > 0;
        });
};

/**
 * Returns list of dom nodes filtered or selected by selector node
 * @param domElements dom nodes
 * @param selectorNode Selector node child
 * @returns array of dom nodes
 */
const getBySelectorNode = (domElements: Element[], selectorNode: AnySelectorNodeInterface): Element[] => {
    let foundElements: Element[] = [];

    if (selectorNode.type === NodeType.ExtendedSelector
        && selectorNode.children[0].name === NTH_ANCESTOR_PSEUDO_CLASS_MARKER) {
        if (!selectorNode.children[0].arg) {
            throw new Error(`Missing arg for :${selectorNode.children[0].name} pseudo-class`);
        }
        foundElements = findPseudo.nthAncestor(
            domElements,
            selectorNode.children[0].arg,
            selectorNode.children[0].name,
        );
    } else if (selectorNode.type === NodeType.ExtendedSelector
        && selectorNode.children[0].name === XPATH_PSEUDO_CLASS_MARKER) {
        if (!selectorNode.children[0].arg) {
            throw new Error('Missing arg for :xpath pseudo-class');
        }
        try {
            document.createExpression(selectorNode.children[0].arg, null);
        } catch (e) {
            throw new Error(`Invalid argument of :xpath pseudo-class: '${selectorNode.children[0].arg}'`);
        }
        foundElements = findPseudo.xpath(domElements, selectorNode.children[0].arg);
    } else if (selectorNode.type === NodeType.ExtendedSelector
        && selectorNode.children[0].name === UPWARD_PSEUDO_CLASS_MARKER) {
        if (!selectorNode.children[0].arg) {
            throw new Error('Missing arg for :upward pseudo-class');
        }
        if (Number.isNaN(Number(selectorNode.children[0].arg))) {
            // so arg is selector, not a number
            foundElements = findPseudo.upward(domElements, selectorNode.children[0].arg);
        } else {
            foundElements = findPseudo.nthAncestor(
                domElements,
                selectorNode.children[0].arg,
                selectorNode.children[0].name,
            );
        }
    } else if (selectorNode.type === NodeType.ExtendedSelector
        && selectorNode.children[0].name
        && HAS_PSEUDO_CLASS_MARKERS.includes(selectorNode.children[0].name)) {
        if (selectorNode.children[0].children.length === 0) {
            throw new Error('Missing arg for :has pseudo-class');
        }
        foundElements = domElements.filter((el) => {
            return hasRelativesBySelectorList(el, selectorNode.children[0].children[0]);
        });
    } else {
        foundElements = domElements.filter((el) => {
            return isMatching(el, selectorNode);
        });
    }

    return foundElements;
};

/**
 * Gets elements nodes for Selector node
 * @param selectorTree
 * @param root
 */
const getElementsForSelectorNode = (
    selectorTree: AnySelectorNodeInterface,
    root: Document | Element | HTMLElement,
    specificity?: string,
): Element[] => {
    let selectedElements: Element[] = [];
    let i = 0;
    while (i < selectorTree.children.length) {
        const selectorNode = selectorTree.children[i];
        if (i === 0) {
            // select start nodes by regular selector
            selectedElements = getByRegularSelector(selectorNode, root, specificity);
        } else {
            // filter previously selected elements by next selector nodes
            selectedElements = getBySelectorNode(selectedElements, selectorNode);
        }
        i += 1;
    }
    return selectedElements;
};

/**
 * Selects elements by selector
 * @param selector
 * @param document
 */
export const querySelectorAll = (selector: string, document: Document): Element[] => {
    const resultElementsForSelectorList: Element[] = [];

    const ast = parse(selector);

    ast?.children.forEach((selectorNode: AnySelectorNodeInterface) => {
        resultElementsForSelectorList.push(...getElementsForSelectorNode(selectorNode, document));
    });

    // since resultElements is array of arrays with elements
    // it should be flattened
    const uniqueElements = [...new Set(resultElementsForSelectorList.flat(1))];
    return uniqueElements;
};
