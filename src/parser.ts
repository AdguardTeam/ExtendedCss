import { tokenize } from './tokenizer';

import {
    NodeTypes,
    selectorNode,
    regSelectorNode,
    extSelectorNode,
    extPseudoNode,
    pseudoClassNode,
    selectorListNode,
    getNodeWithValue,
} from './nodes';

import {
    TOKEN_TYPES,
    BRACKETS,
    COLON,
    SUPPORTED_PSEUDO_CLASSES,
    DESCENDANT_COMBINATOR,
    CHILD_COMBINATOR,
    NEXT_SIBLING_COMBINATOR,
    SUBSEQUENT_SIBLING_COMBINATOR,
    CLASS_MARKER,
    ID_MARKER,
    COMBINATORS,
    SPACE,
    ASTERISK,
    COMMA,
} from './constants';

export const parse = (selector) => {
    // notes:

    // For example, :valid is a regular pseudo-class, and :lang() is a functional pseudo-class.
    // https://www.w3.org/TR/selectors-4/#pseudo-classes

    // Like all CSS keywords, pseudo-class names are ASCII case-insensitive.
    // https://www.w3.org/TR/selectors-4/#pseudo-classes

    // double parentheses allowed since second ones are part of contains pseudo-class arg
    // express.de#?#.dm_container-300x--[-ext-has=">.dm_container_inner_wrapper>h3:contains((Anzeige))"]

    const tokens = tokenize(selector);

    const isSupportedPseudoClass = (str) => SUPPORTED_PSEUDO_CLASSES.includes(str);

    /**
     * Checks tokens whether there are colon and some supported pseudo-class next to it
     * @param {Array[]} tokens
     * @returns {boolean}
    */
    const isExtended = (tokens) => {
        return tokens.some((token, index) => {
            return token[1] === COLON
                && isSupportedPseudoClass(tokens[index + 1][1]);
        });
    };

    const context = {
        // needed for navigating through result obj
        depth: 1,
        // collected selector value on tokens iterating
        buffer: '',
        // type of buffered node
        bufferNodeType: '',
        // array of properties for reaching needed prop in result obj
        bufferPathStack: ['children'],
        // collected result
        result: selectorListNode(),
        // for grounding if token is comma so there is new selector for selector list found
        tempRootPathStack: ['children'],
        //
        // not used yet
        // stack: [],
        // currTokenIdx: 0,
        // lastTokenIdx: 0,
        //
        // for checking while going deep into extended selector
        // extendedStack: [],
    };

    /**
     * Pushes child node to needed children array
     * @param {Object} obj context.result
     * @param {string[]} pathStack path to node children array
     * @param {Object} child node
     */
    const pushToChildren = (obj, pathStack, child) => {
        let children = obj;
        for (let i = 0; i < pathStack.length; i += 1) {
            const pathPart = pathStack[i];
            children = children[pathPart];
        }
        children.push(child);
    };

    /**
     * Gets needed node children length
     * @param {Object} obj context.result
     * @param {string[]} pathStack path to node children array
     * @returns {number}
     */
    const getChildrenLength = (obj, pathStack) => {
        let children = obj;
        for (let i = 0; i < pathStack.length; i += 1) {
            const pathPart = pathStack[i];
            children = children[pathPart];
        }
        return children.length;
    };

    /**
     * Updates needed child node value.
     * Available only for RegularSelector and PseudoClassSelector
     * @param {Object} obj context.result
     * @param {string[]} pathStack path to child node
     * @param {string} value
     */
    const updateChildNodeValue = (obj, pathStack, value) => {
        let child = obj;
        for (let i = 0; i < pathStack.length; i += 1) {
            const pathPart = pathStack[i];
            child = child[pathPart];
        }
        child.value = value;
    };

    /**
     * Concatenates context.buffer and newChunk
     * @param {string} newChunk
     */
    const addToContextBuffer = (newChunk) => {
        context.buffer = `${context.buffer}${newChunk}`;
    };

    /**
     * Updates RegularSelector value while tokens iterating
     * @param {string} tokenValue
     * @param {string[]} stackPath ordered array of properties for reaching needed one in context.result
     */
    const updateRegChildNode = (tokenValue, stackPath) => {
        addToContextBuffer(tokenValue);
        const childrenLength = getChildrenLength(context.result, stackPath);
        if (childrenLength > 0) {
            stackPath.push(`${childrenLength - 1}`);
            updateChildNodeValue(
                context.result,
                stackPath,
                context.buffer,
            );
        }
    };

    let i = 0;
    while(i < tokens.length) {
        const token = tokens[i];
        const [tokenType, tokenValue] = token;

        // needed for SPACE and COLON tokens checking
        const nextToken = tokens[i + 1] || [];
        const [nextTokenType, nextTokenValue] = nextToken;

        // look tokens next to current if there are any extended selector left
        // NOT USED YET
        // const restTokens = tokens.slice(i + 1, tokens.length);
        // const isExtendedNodeType = isExtended(restTokens);

        switch (tokenType) {
            case TOKEN_TYPES.WORD:
                // lets start with regular selector node
                // and change the node type if extended pseudo-classes reached
                if (context.buffer.length === 0) {
                    pushToChildren(
                        context.result,
                        context.bufferPathStack,
                        selectorNode(),
                    );
                    addToContextBuffer(tokenValue);
                    context.bufferNodeType = NodeTypes.RegularSelector;
                    const childrenLength = getChildrenLength(context.result, context.bufferPathStack);
                    // store path to last node
                    context.bufferPathStack.push(`${childrenLength - 1}`, 'children');
                    context.depth += 2;
                    pushToChildren(
                        context.result,
                        context.bufferPathStack,
                        getNodeWithValue(context.bufferNodeType, context.buffer),
                    );
                } else if (context.bufferNodeType === NodeTypes.RegularSelector) {
                    // if buffer is not empty and regular selector is processed
                    addToContextBuffer(tokenValue);
                    updateChildNodeValue(
                        context.result,
                        context.bufferPathStack,
                        context.buffer,
                    );
                }
                break;
            case TOKEN_TYPES.MARK:
                switch (tokenValue) {
                    case COMMA:
                        // if comma found, previous buffer should be cleared
                        // as new selector should be collected
                        context.buffer = '';
                        context.bufferNodeType = '',
                        context.depth = context.tempRootPathStack.length;
                        context.bufferPathStack = context.bufferPathStack.slice(0, context.depth);
                        break;
                    case SPACE:
                        if (context.bufferNodeType === NodeTypes.RegularSelector) {
                            // if regular selector is collecting
                            // this space is part of it
                            if (COMBINATORS.includes(nextTokenValue)
                                || nextTokenType === TOKEN_TYPES.WORD) {
                                updateRegChildNode(tokenValue, context.bufferPathStack);
                            }
                        } else if (context.buffer === '') {
                            // assume that previous token was comma and this space is next to that
                            // so do nothing now
                        }
                        break;
                    case DESCENDANT_COMBINATOR:
                    case CHILD_COMBINATOR:
                    case NEXT_SIBLING_COMBINATOR:
                    case SUBSEQUENT_SIBLING_COMBINATOR:
                    case ASTERISK:
                    case ID_MARKER:
                    case CLASS_MARKER:
                    case BRACKETS.SQUARE.OPEN:
                        if (context.bufferNodeType === NodeTypes.RegularSelector) {
                            updateRegChildNode(tokenValue, context.bufferPathStack);
                        }
                        break;
                    case BRACKETS.SQUARE.CLOSE:
                        if (context.bufferNodeType === NodeTypes.RegularSelector) {
                            // get proper pathStack on closing bracket
                            const stackPath = context.bufferPathStack.slice(0, context.depth);
                            updateRegChildNode(tokenValue, stackPath);
                        }
                        break;
                    case COLON:
                        // it supposed to be pseudo-class — regular or extended
                        // console.log(nextTokenType, nextTokenValue);
                        if (!isSupportedPseudoClass(nextTokenValue)) {
                            // so it is a part of regular selector
                            updateRegChildNode(tokenValue, context.bufferPathStack);
                        } else {
                            // TODO: handle extended pseudo-class
                        }
                        break;
                }
                break;
        }

        i +=1;
    }

    return context.result;
};
