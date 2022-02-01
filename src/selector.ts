import { parse } from './parser';
import { NodeTypes } from './nodes';

/**
 * Collects elements nodes for Selector node
 * @param {Object} selectorNode
 * @param {Object} document
 * @returns {Node[]} array of elements
 */
const getElementsForSelectorNode = (selectorNode, document) => {
    const selectedElements = selectorNode.children.map((node) => {
        if (node.type === NodeTypes.RegularSelector) {
            // select by standard method
            return Array.from(document.querySelectorAll(node.value));
        } else if (node.type === NodeTypes.ExtendedSelector) {
            // TODO: handle extended selectors after they implemented in parser
        } else {
            // it might be error if there is neither RegularSelector nor ExtendedSelector among Selector.children
        }
    });
    return selectedElements;
};

/**
 * Selects elements by selector
 * @param {string} selector
 * @param {Object} document
 * @returns {Node[]}
 */
export const querySelectorAll = (selector, document) => {
    const resultElements = [];

    const ast = parse(selector);

    ast.children.forEach((selectorNode) => {
        resultElements.push(...getElementsForSelectorNode(selectorNode, document));
    });

    // since resultElements is array of arrays with elements
    // if should be flattered
    return resultElements.flat(1);
};
