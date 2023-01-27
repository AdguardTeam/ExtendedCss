import { Context } from './parser-types';
import {
    getLastRegularChild,
    isSelectorListNode,
    isSelectorNode,
    isRegularSelectorNode,
    isExtendedSelectorNode,
    isAbsolutePseudoClassNode,
    isRelativePseudoClassNode,
} from './ast-node-helpers';
import { isSupportedPseudoClass } from './parser-predicates';
import { isAbsolutePseudoClass, isRelativePseudoClass } from './common-predicates';

import {
    NODE,
    AnySelectorNode,
    AbsolutePseudoClassNode,
    AnySelectorNodeInterface,
    RegularSelectorNode,
    RelativePseudoClassNode,
    NodeType,
} from '../nodes';

import {
    getFirst,
    getLast,
    getPrevToLast,
} from '../../common/utils/arrays';
import {
    BRACKET,
    HAS_PSEUDO_CLASS_MARKERS,
    REMOVE_PSEUDO_MARKER,
    REMOVE_ERROR_PREFIX,
} from '../../common/constants';

/**
 * Returns the node which is being collected
 * or null if there is no such one.
 *
 * @param context Selector parser context.
 *
 * @returns Buffer node or null.
 */
export const getBufferNode = (context: Context): AnySelectorNodeInterface | null => {
    if (context.pathToBufferNode.length === 0) {
        return null;
    }
    // buffer node is always the last in the pathToBufferNode stack
    return getLast(context.pathToBufferNode) || null;
};

/**
 * Returns the parent node to the 'buffer node' — which is the one being collected —
 * or null if there is no such one.
 *
 * @param context Selector parser context.
 *
 * @returns Parent node of buffer node or null.
 */
export const getBufferNodeParent = (context: Context): AnySelectorNodeInterface | null => {
    // at least two nodes should exist — the buffer node and its parent
    // otherwise return null
    if (context.pathToBufferNode.length < 2) {
        return null;
    }
    // since the buffer node is always the last in the pathToBufferNode stack
    // its parent is previous to it in the stack
    return getPrevToLast(context.pathToBufferNode) || null;
};

/**
 * Returns last RegularSelector ast node.
 * Needed for parsing of the complex selector with extended pseudo-class inside it.
 *
 * @param context Selector parser context.
 *
 * @returns Ast RegularSelector node.
 * @throws An error if:
 * - bufferNode is absent;
 * - type of bufferNode is unsupported;
 * - no RegularSelector in bufferNode.
 */
export const getContextLastRegularSelectorNode = (context: Context): AnySelectorNodeInterface => {
    const bufferNode = getBufferNode(context);
    if (!bufferNode) {
        throw new Error('No bufferNode found');
    }
    if (!isSelectorNode(bufferNode)) {
        throw new Error('Unsupported bufferNode type');
    }
    const lastRegularSelectorNode = getLastRegularChild(bufferNode.children);
    context.pathToBufferNode.push(lastRegularSelectorNode);
    return lastRegularSelectorNode;
};

/**
 * Updates needed buffer node value while tokens iterating.
 * For RegularSelector also collects token values to context.attributeBuffer
 * for proper attribute parsing.
 *
 * @param context Selector parser context.
 * @param tokenValue Value of current token.
 *
 * @throws An error if:
 * - no bufferNode;
 * - bufferNode.type is not RegularSelector or AbsolutePseudoClass.
 */
export const updateBufferNode = (context: Context, tokenValue: string): void => {
    const bufferNode = getBufferNode(context);
    if (bufferNode === null) {
        throw new Error('No bufferNode to update');
    }
    if (isAbsolutePseudoClassNode(bufferNode)) {
        bufferNode.value += tokenValue;
    } else if (isRegularSelectorNode(bufferNode)) {
        bufferNode.value += tokenValue;
        if (context.isAttributeBracketsOpen) {
            context.attributeBuffer += tokenValue;
        }
    } else {
        // eslint-disable-next-line max-len
        throw new Error(`${bufferNode.type} node cannot be updated. Only RegularSelector and AbsolutePseudoClass are supported`);
    }
};

/**
 * Adds SelectorList node to context.ast at the start of ast collecting.
 *
 * @param context Selector parser context.
 */
export const addSelectorListNode = (context: Context): void => {
    const selectorListNode = new AnySelectorNode(NODE.SELECTOR_LIST);
    context.ast = selectorListNode;
    context.pathToBufferNode.push(selectorListNode);
};

/**
 * Adds new node to buffer node children.
 * New added node will be considered as buffer node after it.
 *
 * @param context Selector parser context.
 * @param type Type of node to add.
 * @param tokenValue Optional, defaults to `''`, value of processing token.
 *
 * @throws An error if no bufferNode.
 */
export const addAstNodeByType = (context: Context, type: NodeType, tokenValue = ''): void => {
    const bufferNode = getBufferNode(context);
    if (bufferNode === null) {
        throw new Error('No buffer node');
    }

    let node: AnySelectorNodeInterface;
    if (type === NODE.REGULAR_SELECTOR) {
        node = new RegularSelectorNode(tokenValue);
    } else if (type === NODE.ABSOLUTE_PSEUDO_CLASS) {
        node = new AbsolutePseudoClassNode(tokenValue);
    } else if (type === NODE.RELATIVE_PSEUDO_CLASS) {
        node = new RelativePseudoClassNode(tokenValue);
    } else {
        // SelectorList || Selector || ExtendedSelector
        node = new AnySelectorNode(type);
    }

    bufferNode.addChild(node);
    context.pathToBufferNode.push(node);
};

/**
 * The very beginning of ast collecting.
 *
 * @param context Selector parser context.
 * @param tokenValue Value of regular selector.
 */
export const initAst = (context: Context, tokenValue: string): void => {
    addSelectorListNode(context);
    addAstNodeByType(context, NODE.SELECTOR);
    // RegularSelector node is always the first child of Selector node
    addAstNodeByType(context, NODE.REGULAR_SELECTOR, tokenValue);
};

/**
 * Inits selector list subtree for relative extended pseudo-classes, e.g. :has(), :not().
 *
 * @param context Selector parser context.
 * @param tokenValue Optional, defaults to `''`, value of inner regular selector.
 */
export const initRelativeSubtree = (context: Context, tokenValue = ''): void => {
    addAstNodeByType(context, NODE.SELECTOR_LIST);
    addAstNodeByType(context, NODE.SELECTOR);
    addAstNodeByType(context, NODE.REGULAR_SELECTOR, tokenValue);
};

/**
 * Goes to closest parent specified by type.
 * Actually updates path to buffer node for proper ast collecting of selectors while parsing.
 *
 * @param context Selector parser context.
 * @param parentType Type of needed parent node in ast.
 */
export const upToClosest = (context: Context, parentType: NodeType): void => {
    for (let i = context.pathToBufferNode.length - 1; i >= 0; i -= 1) {
        if (context.pathToBufferNode[i]?.type === parentType) {
            context.pathToBufferNode = context.pathToBufferNode.slice(0, i + 1);
            break;
        }
    }
};

/**
 * Returns needed buffer node updated due to complex selector parsing.
 *
 * @param context Selector parser context.
 *
 * @returns Ast node for following selector parsing.
 * @throws An error if there is no upper SelectorNode is ast.
 */
export const getUpdatedBufferNode = (context: Context): AnySelectorNodeInterface => {
    // it may happen during the parsing of selector list
    // which is an argument of relative pseudo-class
    // e.g. '.banner:has(~span, ~p)'
    // parser position is here  ↑
    // so if after the comma the buffer node type is SelectorList and parent type is RelativePseudoClass
    // we should simply return the current buffer node
    const bufferNode = getBufferNode(context);
    if (bufferNode
        && isSelectorListNode(bufferNode)
        && isRelativePseudoClassNode(getBufferNodeParent(context))) {
        return bufferNode;
    }

    upToClosest(context, NODE.SELECTOR);
    const selectorNode = getBufferNode(context);
    if (!selectorNode) {
        throw new Error('No SelectorNode, impossible to continue selector parsing by ExtendedCss');
    }
    const lastSelectorNodeChild = getLast(selectorNode.children);
    const hasExtended = lastSelectorNodeChild
        && isExtendedSelectorNode(lastSelectorNodeChild)
        // parser position might be inside standard pseudo-class brackets which has space
        // e.g. 'div:contains(/а/):nth-child(100n + 2)'
        && context.standardPseudoBracketsStack.length === 0;

    const supposedPseudoClassNode = hasExtended && getFirst(lastSelectorNodeChild.children);

    let newNeededBufferNode = selectorNode;
    if (supposedPseudoClassNode) {
        // name of pseudo-class for last extended-node child for Selector node
        const lastExtendedPseudoName = hasExtended
            && supposedPseudoClassNode.name;
        const isLastExtendedNameRelative = lastExtendedPseudoName
            && isRelativePseudoClass(lastExtendedPseudoName);
        const isLastExtendedNameAbsolute = lastExtendedPseudoName
            && isAbsolutePseudoClass(lastExtendedPseudoName);
        const hasRelativeExtended = isLastExtendedNameRelative
            && context.extendedPseudoBracketsStack.length > 0
            && context.extendedPseudoBracketsStack.length === context.extendedPseudoNamesStack.length;
        const hasAbsoluteExtended = isLastExtendedNameAbsolute
            && lastExtendedPseudoName === getLast(context.extendedPseudoNamesStack);
        if (hasRelativeExtended) {
            // return relative selector node to update later
            context.pathToBufferNode.push(lastSelectorNodeChild);
            newNeededBufferNode = supposedPseudoClassNode;
        } else if (hasAbsoluteExtended) {
            // return absolute selector node to update later
            context.pathToBufferNode.push(lastSelectorNodeChild);
            newNeededBufferNode = supposedPseudoClassNode;
        }
    } else if (hasExtended) {
        // return selector node to add new regular selector node later
        newNeededBufferNode = selectorNode;
    } else {
        // otherwise return last regular selector node to update later
        newNeededBufferNode = getContextLastRegularSelectorNode(context);
    }
    // update the path to buffer node properly
    context.pathToBufferNode.push(newNeededBufferNode);
    return newNeededBufferNode;
};

/**
 * Checks values of few next tokens on colon token `:` and:
 *  - updates buffer node for following standard pseudo-class;
 *  - adds extended selector ast node for following extended pseudo-class;
 *  - validates some cases of `:remove()` and `:has()` usage.
 *
 * @param context Selector parser context.
 * @param selector Selector.
 * @param tokenValue Value of current token.
 * @param nextTokenValue Value of token next to current one.
 * @param nextToNextTokenValue Value of token next to next to current one.
 *
 * @throws An error on :remove() pseudo-class in selector
 * or :has() inside regular pseudo limitation.
 */
export const handleNextTokenOnColon = (
    context: Context,
    selector: string,
    tokenValue: string,
    nextTokenValue: string | undefined,
    nextToNextTokenValue: string | undefined,
) => {
    if (!nextTokenValue) {
        throw new Error(`Invalid colon ':' at the end of selector: '${selector}'`);
    }
    if (!isSupportedPseudoClass(nextTokenValue.toLowerCase())) {
        if (nextTokenValue.toLowerCase() === REMOVE_PSEUDO_MARKER) {
            // :remove() pseudo-class should be handled before
            // as it is not about element selecting but actions with elements
            // e.g. 'body > div:empty:remove()'
            throw new Error(`${REMOVE_ERROR_PREFIX.INVALID_REMOVE}: '${selector}'`);
        }
        // if following token is not an extended pseudo
        // the colon should be collected to value of RegularSelector
        // e.g. '.entry_text:nth-child(2)'
        updateBufferNode(context, tokenValue);
        // check the token after the pseudo and do balance parentheses later
        // only if it is functional pseudo-class (standard with brackets, e.g. ':lang()').
        // no brackets balance needed for such case,
        // parser position is on first colon after the 'div':
        // e.g. 'div:last-child:has(button.privacy-policy__btn)'
        if (nextToNextTokenValue
            && nextToNextTokenValue === BRACKET.PARENTHESES.LEFT
            // no brackets balance needed for parentheses inside attribute value
            // e.g. 'a[href="javascript:void(0)"]'   <-- parser position is on colon `:`
            // before `void`           ↑
            && !context.isAttributeBracketsOpen) {
            context.standardPseudoNamesStack.push(nextTokenValue);
        }
    } else {
        // it is supported extended pseudo-class.
        // Disallow :has() inside the pseudos accepting only compound selectors
        // https://bugs.chromium.org/p/chromium/issues/detail?id=669058#c54 [2]
        if (HAS_PSEUDO_CLASS_MARKERS.includes(nextTokenValue)
            && context.standardPseudoNamesStack.length > 0) {
            // eslint-disable-next-line max-len
            throw new Error(`Usage of :${nextTokenValue}() pseudo-class is not allowed inside regular pseudo: '${getLast(context.standardPseudoNamesStack)}'`);
        } else {
            // stop RegularSelector value collecting
            upToClosest(context, NODE.SELECTOR);
            // add ExtendedSelector to Selector children
            addAstNodeByType(context, NODE.EXTENDED_SELECTOR);
        }
    }
};
