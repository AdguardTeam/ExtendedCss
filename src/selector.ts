import { parse } from './parser';
import matchPseudo from './matcher';

import {
    NodeType,
    AnySelectorNodeInterface,
} from './nodes';

import {
    CONTAINS_PSEUDO_CLASS_MARKERS,
} from './constants';

/**
 * Selects dom elements by value of RegularSelector
 * @param selectorNode
 * @param document
 */
const getByRegularSelector = (selectorNode: AnySelectorNodeInterface, document: Document): Element[] => {
    if (!selectorNode) {
        throw new Error('selectorNode should be specified');
    }
    if (!selectorNode.value) {
        throw new Error('RegularSelector value should be specified');
    }
    return Array.from(document.querySelectorAll(selectorNode.value));
};

/**
 * Checks whether the domElement satisfies condition of extended pseudo-class
 * @param domElement dom node, i.e html element
 * @param extendedPseudo absolute extended pseudo-class node
 */
const isAbsoluteMatched = (domElement: Node, extendedPseudo: AnySelectorNodeInterface): boolean => {
    let isMatched = false;
    const { name, arg } = extendedPseudo;

    if (name && arg && CONTAINS_PSEUDO_CLASS_MARKERS.includes(name)) {
        isMatched = matchPseudo.contains(domElement, arg);
    }

    return isMatched;
};

/**
 *
 * @param domElement dom node
 * @param selectorNode Selector node child
 */
const isMatched = (domElement: Element, selectorNode: AnySelectorNodeInterface): boolean => {
    let match = false;
    if (selectorNode.type === NodeType.RegularSelector) {
        // TODO:
        // e.g. div:has(a) ~ p
    } else if (selectorNode.type === NodeType.ExtendedSelector) {
        /**
         * TODO: consider to deprecate NodeTypes.ExtendedSelector
         */
        const extendedPseudo = selectorNode.children[0];
        if (extendedPseudo.type === NodeType.AbsolutePseudoClass) {
            match = isAbsoluteMatched(domElement, extendedPseudo);
        }

        if (extendedPseudo.type === NodeType.RelativePseudoClass) {
            // TODO: handle relative pseudo-class
            // return isRelativeMatched(domElement, extendedNode);
        }
    } else {
        // it might be error if there is neither RegularSelector nor ExtendedSelector among Selector.children
    }
    return match;
};

/**
 * Filters previously selected elements by selector
 * @param domElements dom nodes
 * @param selectorNode Selector node child
 * @returns array of dom nodes
 */
const filterBySelector = (domElements: Element[], selectorNode: AnySelectorNodeInterface): Element[] => {
    const filteredElements = domElements.filter((el) => {
        return isMatched(el, selectorNode);
    });

    return filteredElements;
};

/**
 * Gets elements nodes for Selector node
 * @param selectorTree
 * @param document
 */
const getElementsForSelectorNode = (selectorTree: AnySelectorNodeInterface, document: Document): Element[] => {
    let selectedElements: Element[] = [];
    let i = 0;
    while (i < selectorTree.children.length) {
        const selectorNode = selectorTree.children[i];
        if (i === 0) {
            // select start nodes by regular selector
            selectedElements = getByRegularSelector(selectorNode, document);
        } else {
            // filter previously selected elements by next selector nodes
            selectedElements = filterBySelector(selectedElements, selectorNode);
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
    // it should be flattered
    return resultElementsForSelectorList.flat(1);
};
