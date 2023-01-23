import { AnySelectorNodeInterface } from '../nodes';

import {
    getNodeName,
    getNodeValue,
    getNodeOnlyChild,
    getLastRegularChild,
    getPseudoClassNode,
    getRelativeSelectorListNode,
    isExtendedSelectorNode,
    isRegularSelectorNode,
} from './ast-node-helpers';
import { isAbsolutePseudoClass } from './common-predicates';
import { isOptimizationPseudoClass } from './parser-predicates';

import { getLast, getItemByIndex } from '../../common/utils/arrays';
import {
    ASTERISK,
    COMMA,
    SPACE,
    COLON,
    BRACKET,
} from '../../common/constants';

// limit applying of wildcard :is() and :not() pseudo-class only to html children
// e.g. ':is(.page, .main) > .banner' or '*:not(span):not(p)'
export const IS_OR_NOT_PSEUDO_SELECTING_ROOT = `html ${ASTERISK}`;

/**
 * Checks if there are any ExtendedSelector node in selector list.
 *
 * @param selectorList Ast SelectorList node.
 *
 * @returns True if `selectorList` has any inner ExtendedSelector node.
 */
const hasExtendedSelector = (selectorList: AnySelectorNodeInterface): boolean => {
    return selectorList.children.some((selectorNode) => {
        return selectorNode.children.some((selectorNodeChild) => {
            return isExtendedSelectorNode(selectorNodeChild);
        });
    });
};

/**
 * Converts selector list of RegularSelector nodes to string.
 *
 * @param selectorList Ast SelectorList node.
 *
 * @returns String representation for selector list of regular selectors.
 */
const selectorListOfRegularsToString = (selectorList: AnySelectorNodeInterface): string => {
    // if there is no ExtendedSelector in relative SelectorList
    // it means that each Selector node has single child — RegularSelector node
    // and their values should be combined to string
    const standardCssSelectors = selectorList.children.map((selectorNode) => {
        const selectorOnlyChild = getNodeOnlyChild(selectorNode, 'Ast Selector node should have RegularSelector node');
        return getNodeValue(selectorOnlyChild);
    });
    return standardCssSelectors.join(`${COMMA}${SPACE}`);
};

/**
 * Updates children of `node` replacing them with `newChildren`.
 * Important: modifies input `node` which is passed by reference.
 *
 * @param node Ast node to update.
 * @param newChildren Array of new children for ast node.
 *
 * @returns Updated ast node.
 */
const updateNodeChildren = (
    node: AnySelectorNodeInterface,
    newChildren: AnySelectorNodeInterface[],
): AnySelectorNodeInterface => {
    node.children = newChildren;
    return node;
};

/**
 * Recursively checks whether the ExtendedSelector node should be optimized.
 * It has to be recursive because RelativePseudoClass has inner SelectorList node.
 *
 * @param currExtendedSelectorNode Ast ExtendedSelector node.
 *
 * @returns True is ExtendedSelector should be optimized.
 */
const shouldOptimizeExtendedSelector = (currExtendedSelectorNode: AnySelectorNodeInterface | null): boolean => {
    if (currExtendedSelectorNode === null) {
        return false;
    }
    const extendedPseudoClassNode = getPseudoClassNode(currExtendedSelectorNode);
    const pseudoName = getNodeName(extendedPseudoClassNode);
    if (isAbsolutePseudoClass(pseudoName)) {
        return false;
    }
    const relativeSelectorList = getRelativeSelectorListNode(extendedPseudoClassNode);
    const innerSelectorNodes = relativeSelectorList.children;
    // simple checking for standard selectors in arg of :not() or :is() pseudo-class
    // e.g. 'div > *:is(div, a, span)'
    if (isOptimizationPseudoClass(pseudoName)) {
        const areAllSelectorNodeChildrenRegular = innerSelectorNodes
            .every((selectorNode) => {
                try {
                    const selectorOnlyChild = getNodeOnlyChild(
                        selectorNode,
                        'Selector node should have RegularSelector',
                    );
                    // it means that the only child is RegularSelector and it can be optimized
                    return isRegularSelectorNode(selectorOnlyChild);
                } catch (e: unknown) {
                    return false;
                }
            });
        if (areAllSelectorNodeChildrenRegular) {
            return true;
        }
    }
    // for other extended pseudo-classes than :not() and :is()
    return innerSelectorNodes.some((selectorNode) => {
        return selectorNode.children.some((selectorNodeChild) => {
            if (!isExtendedSelectorNode(selectorNodeChild)) {
                return false;
            }
            // check inner ExtendedSelector recursively
            // e.g. 'div:has(*:not(.header))'
            return shouldOptimizeExtendedSelector(selectorNodeChild);
        });
    });
};

/**
 * Returns optimized ExtendedSelector node if it can be optimized
 * or null if ExtendedSelector is fully optimized while function execution
 * which means that value of `prevRegularSelectorNode` is updated.
 *
 * @param currExtendedSelectorNode Current ExtendedSelector node to optimize.
 * @param prevRegularSelectorNode Previous RegularSelector node.
 *
 * @returns Ast node or null.
 */
const getOptimizedExtendedSelector = (
    currExtendedSelectorNode: AnySelectorNodeInterface | null,
    prevRegularSelectorNode: AnySelectorNodeInterface,
): AnySelectorNodeInterface | null => {
    if (!currExtendedSelectorNode) {
        return null;
    }
    const extendedPseudoClassNode = getPseudoClassNode(currExtendedSelectorNode);
    const relativeSelectorList = getRelativeSelectorListNode(extendedPseudoClassNode);
    const hasInnerExtendedSelector = hasExtendedSelector(relativeSelectorList);
    if (!hasInnerExtendedSelector) {
        // if there is no extended selectors for :not() or :is()
        // e.g. 'div:not(.content, .main)'
        const relativeSelectorListStr = selectorListOfRegularsToString(relativeSelectorList);
        const pseudoName = getNodeName(extendedPseudoClassNode);
        // eslint-disable-next-line max-len
        const optimizedExtendedStr = `${COLON}${pseudoName}${BRACKET.PARENTHESES.LEFT}${relativeSelectorListStr}${BRACKET.PARENTHESES.RIGHT}`;
        prevRegularSelectorNode.value = `${getNodeValue(prevRegularSelectorNode)}${optimizedExtendedStr}`;
        return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const optimizedRelativeSelectorList = optimizeSelectorListNode(relativeSelectorList);
    const optimizedExtendedPseudoClassNode = updateNodeChildren(
        extendedPseudoClassNode,
        [optimizedRelativeSelectorList],
    );
    return updateNodeChildren(
        currExtendedSelectorNode,
        [optimizedExtendedPseudoClassNode],
    );
};

/**
 * Combines values of `previous` and `current` RegularSelector nodes.
 * It may happen during the optimization when ExtendedSelector between RegularSelector node was optimized.
 *
 * @param current Current RegularSelector node.
 * @param previous Previous RegularSelector node.
 */
const optimizeCurrentRegularSelector = (
    current: AnySelectorNodeInterface,
    previous: AnySelectorNodeInterface,
): void => {
    previous.value = `${getNodeValue(previous)}${SPACE}${getNodeValue(current)}`;
};

/**
 * Optimizes ast Selector node.
 *
 * @param selectorNode Ast Selector node.
 *
 * @returns Optimized ast node.
 * @throws An error while collecting optimized nodes.
 */
const optimizeSelectorNode = (selectorNode: AnySelectorNodeInterface): AnySelectorNodeInterface => {
    // non-optimized list of SelectorNode children
    const rawSelectorNodeChildren = selectorNode.children;
    // for collecting optimized children list
    const optimizedChildrenList: AnySelectorNodeInterface[] = [];
    let currentIndex = 0;
    // iterate through all children in non-optimized ast Selector node
    while (currentIndex < rawSelectorNodeChildren.length) {
        const currentChild = getItemByIndex(rawSelectorNodeChildren, currentIndex, 'currentChild should be specified');
        // no need to optimize the very first child which is always RegularSelector node
        if (currentIndex === 0) {
            optimizedChildrenList.push(currentChild);
        } else {
            const prevRegularChild = getLastRegularChild(optimizedChildrenList);
            if (isExtendedSelectorNode(currentChild)) {
                // start checking with point is null
                let optimizedExtendedSelector = null;
                // check whether the optimization is needed
                let isOptimizationNeeded = shouldOptimizeExtendedSelector(currentChild);
                // update optimizedExtendedSelector so it can be optimized recursively
                // i.e. `getOptimizedExtendedSelector(optimizedExtendedSelector)` below
                optimizedExtendedSelector = currentChild;
                while (isOptimizationNeeded) {
                    // recursively optimize ExtendedSelector until no optimization needed
                    // e.g. div > *:is(.banner:not(.block))
                    optimizedExtendedSelector = getOptimizedExtendedSelector(
                        optimizedExtendedSelector,
                        prevRegularChild,
                    );
                    isOptimizationNeeded = shouldOptimizeExtendedSelector(optimizedExtendedSelector);
                }
                // if it was simple :not() of :is() with standard selector arg
                // e.g. 'div:not([class][id])'
                // or   '.main > *:is([data-loaded], .banner)'
                // after the optimization the ExtendedSelector node become part of RegularSelector
                // so nothing to save eventually
                // otherwise the optimized ExtendedSelector should be saved
                // e.g. 'div:has(:not([class]))'
                if (optimizedExtendedSelector !== null) {
                    optimizedChildrenList.push(optimizedExtendedSelector);
                    // if optimization is not needed
                    const optimizedPseudoClass = getPseudoClassNode(optimizedExtendedSelector);
                    const optimizedPseudoName = getNodeName(optimizedPseudoClass);
                    // parent element checking is used to apply :is() and :not() pseudo-classes as extended.
                    // as there is no parentNode for root element (html)
                    // so element selection should be limited to it's children
                    // e.g. '*:is(:has(.page))' -> 'html *:is(has(.page))'
                    // or   '*:not(:has(span))' -> 'html *:not(:has(span))'
                    if (getNodeValue(prevRegularChild) === ASTERISK
                        && isOptimizationPseudoClass(optimizedPseudoName)) {
                        prevRegularChild.value = IS_OR_NOT_PSEUDO_SELECTING_ROOT;
                    }
                }
            } else if (isRegularSelectorNode(currentChild)) {
                // in non-optimized ast, RegularSelector node may follow ExtendedSelector which should be optimized
                // for example, for 'div:not(.content) > .banner' schematically it looks like
                // non-optimized ast: [
                //   1. RegularSelector: 'div'
                //   2. ExtendedSelector: 'not(.content)'
                //   3. RegularSelector: '> .banner'
                // ]
                // which after the ExtendedSelector looks like
                // partly optimized ast: [
                //   1. RegularSelector: 'div:not(.content)'
                //   2. RegularSelector: '> .banner'
                // ]
                // so second RegularSelector value should be combined with first one
                // optimized ast: [
                //   1. RegularSelector: 'div:not(.content) > .banner'
                // ]
                // here we check **children of selectorNode** after previous optimization if it was
                const lastOptimizedChild = getLast(optimizedChildrenList) || null;
                if (isRegularSelectorNode(lastOptimizedChild)) {
                    optimizeCurrentRegularSelector(currentChild, prevRegularChild);
                }
            }
        }
        currentIndex += 1;
    }

    return updateNodeChildren(
        selectorNode,
        optimizedChildrenList,
    );
};

/**
 * Optimizes ast SelectorList node.
 *
 * @param selectorListNode SelectorList node.
 *
 * @returns Optimized ast node.
 */
const optimizeSelectorListNode = (selectorListNode: AnySelectorNodeInterface): AnySelectorNodeInterface => {
    return updateNodeChildren(
        selectorListNode,
        selectorListNode.children.map((s) => optimizeSelectorNode(s)),
    );
};

/**
 * Optimizes ast:
 * If arg of :not() and :is() pseudo-classes does not contain extended selectors,
 * native Document.querySelectorAll() can be used to query elements.
 * It means that ExtendedSelector ast nodes can be removed
 * and value of relevant RegularSelector node should be updated accordingly.
 *
 * @param ast Non-optimized ast.
 *
 * @returns Optimized ast.
 */
export const optimizeAst = (ast: AnySelectorNodeInterface): AnySelectorNodeInterface => {
    // ast is basically the selector list of selectors
    return optimizeSelectorListNode(ast);
};
