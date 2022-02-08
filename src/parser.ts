import { tokenize } from './tokenizer';

import {
    NodeTypes,
    selectorListNode,
    selectorNode,
    regularSelectorNode,
    extendedSelectorNode,
    absolutePseudoClassNode,
    relativePseudoClassNode,
} from './nodes';

import {
    TOKEN_TYPES,
    BRACKETS,
    COLON,
    SEMICOLON,
    SINGLE_QUOTE,
    DOUBLE_QUOTE,
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
    SUPPORTED_PSEUDO_CLASSES,
    ABSOLUTE_PSEUDO_CLASSES,
    RELATIVE_PSEUDO_CLASSES,
    UPWARD_PSEUDO_CLASS_MARKER,
} from './constants';

export const parse = (selector) => {
    // notes:

    // For example, :valid is a regular pseudo-class, and :lang() is a functional pseudo-class.
    // https://www.w3.org/TR/selectors-4/#pseudo-classes

    // Like all CSS keywords, pseudo-class names are ASCII case-insensitive.
    // https://www.w3.org/TR/selectors-4/#pseudo-classes

    const tokens = tokenize(selector);

    const isSupportedExtendedPseudo = (str) => SUPPORTED_PSEUDO_CLASSES.includes(str);

    /**
     * Checks tokens whether there are colon and some supported pseudo-class next to it
     * @param {Array[]} tokens
     * @returns {boolean}
    */
    const isExtended = (tokens) => {
        return tokens.some((token, index) => {
            return token[1] === COLON
                && isSupportedExtendedPseudo(tokens[index + 1][1]);
        });
    };

    const context = {
        // needed for navigating through result obj
        depth: 0,
        // collected selector value on tokens iterating
        buffer: '',
        // type of buffered node
        bufferNodeType: '',
        // array of properties for reaching needed prop in result obj
        // bufferPathStack: ['children'],
        bufferPathStack: [],
        // collected result
        result: null,
        // for grounding if token is comma so there is new selector for selector list found
        tempRootPathStack: [],
        //

        // rootListPaths: [
        //     ['children'],
        // ],
        // level: 0,
        //
        // not used yet
        // stack: [],
        // currTokenIdx: 0,
        // lastTokenIdx: 0,
        //
        // for checking while going deep into extended selector
        extendedStack: [],
        // for extended selector args
        extendedBracketsStack: [],
    };

    // few more variables for navigating
    let contextRootListPaths = [
        ['children'],
    ];
    let contextLevel = 0;


    /**
     * Concatenates context.buffer and newChunk
     * @param {string} newChunk
     */
    const addToContextBuffer = (newChunk) => {
        context.buffer = `${context.buffer}${newChunk}`;
    };

    /**
     * Saves child node in result by specified path
     * @param {string[]} pathStack path to node children array
     * @param {Object} child node
     */
    const saveToResult = (child) => {
        let { result } = context;
        if (!result) {
            context.result = selectorListNode();
        } else {
            for (let i = 0; i < context.bufferPathStack.length; i += 1) {
                const pathPart = context.bufferPathStack[i];
                result = result[pathPart];
            }
            result.push(child);
        }
    };

    /**
     * Gets needed node children length
     * @param {Object} obj context.result
     * @param {string[]} pathStack path to node children array
     * @returns {number}
     */
    const getChildrenLength = (pathStack) => {
        let { result } = context;
        for (let i = 0; i < pathStack.length; i += 1) {
            const pathPart = pathStack[i];
            result = result[pathPart];
        }
        return result.length;
    };

    /**
     * Updates property of needed node
     * @param {string[]} pathStack path to the node
     * @param {string} propertyName node property to update, i.e. 'value' for RegularSelector OR 'arg' for AbsolutePseudoClass
     * @param {string} valueToSet new value
     */
    const updateNodeProperty = (pathStack, propertyName, valueToSet) => {
        let { result } = context;
        for (let i = 0; i < pathStack.length; i += 1) {
            const pathPart = pathStack[i];
            result = result[pathPart];
        }
        result[propertyName] = valueToSet;
    };

    /**
     * Updates needed node property by buffered node type
     * i.e. 'value' for RegularSelector and 'arg' for AbsolutePseudoClass
     * @param {string} tokenValue
     */
    const updateInProcessNode = (tokenValue) => {
        let propertyToUpdate;
        if (context.bufferNodeType === NodeTypes.RegularSelector) {
            propertyToUpdate = 'value';
        } else if (context.bufferNodeType === NodeTypes.AbsolutePseudoClass) {
            propertyToUpdate = 'arg';
        }
        addToContextBuffer(tokenValue);
        let pathStack = context.bufferPathStack.slice(0, context.depth);
        const childrenLength = getChildrenLength(pathStack);
        // check if children nodes exist
        if (childrenLength > 0) {
            pathStack = [...pathStack, `${childrenLength - 1}`];
            // update last node in children array
            updateNodeProperty(
                pathStack,
                propertyToUpdate,
                context.buffer,
            );
        }
    };

    /**
     * Checks whether next token is a continuation of regular selector being processed
     * @param {string} nextTokenType
     * @param {string} nextTokenValue
     * @returns {boolean}
     */
    const isRegularContinuousAfterSpace = (nextTokenType, nextTokenValue) => {
        return COMBINATORS.includes(nextTokenValue)
            || nextTokenType === TOKEN_TYPES.WORD
            || nextTokenValue === ID_MARKER
            || nextTokenValue === CLASS_MARKER
            || nextTokenValue === BRACKETS.SQUARE.OPEN;
    };

    /**
     * Returns node depending on context.bufferNodeType
     * @returns {Object}
     */
    const getBufferedNode = () => {
        if (context.bufferNodeType === NodeTypes.RegularSelector) {
            return regularSelectorNode(context.buffer);
        }
    };

    /**
     *
     * @param tokenValue
     */
    const initStart = (tokenValue) => {
        if (context.bufferPathStack.length === 0) {
            saveToResult(selectorListNode());
            context.bufferPathStack.push('children');
            context.tempRootPathStack = context.bufferPathStack;
            context.depth += 1;
        }

        saveToResult(selectorNode());
        addToContextBuffer(tokenValue);
        // any selector always starts with RegularSelector
        context.bufferNodeType = NodeTypes.RegularSelector;
        const childrenLength = getChildrenLength(context.bufferPathStack);
        // store path to last node children
        context.bufferPathStack.push(`${childrenLength - 1}`, 'children');
        //
        if (context.extendedStack.length === 0) {
            contextRootListPaths.push(context.bufferPathStack);
            contextLevel += 1;
        }
        //
        // TODO: figure out why tempRootPathStack updates after bufferPathStack.push
        context.tempRootPathStack = context.bufferPathStack.slice(0, context.depth);
        context.depth += 2;
        saveToResult(getBufferedNode());
    };

    const initRelativeSubtree = (tokenValue) => {
        saveToResult(selectorListNode());
        const childrenLength = getChildrenLength(context.bufferPathStack);
        // store path to last node children
        context.bufferPathStack.push(`${childrenLength - 1}`, 'children');
        // TODO: figure out why tempRootPathStack updates after bufferPathStack.push
        context.tempRootPathStack = context.bufferPathStack.slice(0, context.depth);
        context.depth += 2;
        initStart(tokenValue);
    };

    /**
     * Checks whether next processed node is extended selector type
     * @param {Array[]} tokens
     * @param {number} i
     * @returns {boolean}
     */
    // NOT USED YET
    // const checkRestSelectorTokens = (tokens, i) => {
    //     const restTokens = tokens.slice(i + 1, tokens.length);

    //     let restSelectorTokens = restTokens;

    //     // check if there comma left among tokens so it might be selector list
    //     const selectorListDividerIndex = restTokens
    //         .findIndex((token) => token[1] === COMMA);

    //     if (selectorListDividerIndex) {
    //         restSelectorTokens = restTokens.slice(0, selectorListDividerIndex - 1);
    //     }

    //     return isExtended(restSelectorTokens);
    // };

    let i = 0;
    while(i < tokens.length) {
        const token = tokens[i];
        const [tokenType, tokenValue] = token;

        // needed for SPACE and COLON tokens checking
        const nextToken = tokens[i + 1] || [];
        const [nextTokenType, nextTokenValue] = nextToken;

        // look tokens next to current if there are any extended selector left
        // NOT USED YET
        // const isExtendedNodeType = checkRestSelectorTokens(tokens, i);

        switch (tokenType) {
            case TOKEN_TYPES.WORD:
                // lets start with regular selector node
                // and change the node type if extended pseudo-classes reached
                if (context.buffer.length === 0 && context.bufferNodeType.length === 0) {
                    initStart(tokenValue);
                } else if (context.bufferNodeType === NodeTypes.RegularSelector) {
                    // TODO: check later:  && context.extendedStack.length === 0) {

                    // if buffer is not empty and regular selector is processed
                    updateInProcessNode(tokenValue);
                }

                if (context.bufferNodeType === NodeTypes.ExtendedSelector) {
                    // store for brackets balance checking
                    context.extendedStack.push(tokenValue);

                    const isAbsoluteUpward = (() => {
                       // check token next to nextToken, i.e 'i + 2'
                       const argValue = tokens[i + 2][1];
                       const isNaNArg = Number.isNaN(parseInt(argValue, 10));
                       return tokenValue === UPWARD_PSEUDO_CLASS_MARKER && !isNaNArg;
                    })();

                    if (ABSOLUTE_PSEUDO_CLASSES.includes(tokenValue)
                        || isAbsoluteUpward) {
                        context.bufferNodeType = NodeTypes.AbsolutePseudoClass;
                        saveToResult(absolutePseudoClassNode(tokenValue));
                    } else {
                        // if it is not absolute pseudo-class, it must be relative one
                        // can not be third option
                        context.bufferNodeType = NodeTypes.RelativePseudoClass;
                        saveToResult(relativePseudoClassNode(tokenValue));
                        // prepare for children collecting
                        context.bufferPathStack.push('0', 'children');
                        context.depth += 2;
                    }
                } else if (context.bufferNodeType === NodeTypes.AbsolutePseudoClass) {
                    // collect absolute pseudo-class arg
                    updateInProcessNode(tokenValue);
                } else if (context.bufferNodeType === NodeTypes.RelativePseudoClass) {
                    // collect relative pseudo-class selector children
                    if (context.buffer.length === 0) {
                        // means relative subtree has to be initiated
                        initRelativeSubtree(tokenValue);
                    }
                }
                break;
            case TOKEN_TYPES.MARK:
                switch (tokenValue) {
                    case COMMA:
                        // if comma found, previous buffer should be cleared
                        // as new selector should be collected
                        if (context.bufferNodeType === NodeTypes.RegularSelector) {
                            context.buffer = '';
                            context.bufferNodeType = '',
                            context.depth = context.tempRootPathStack.length;
                            context.bufferPathStack = context.bufferPathStack.slice(0, context.depth);
                        }

                        if (context.bufferNodeType === NodeTypes.AbsolutePseudoClass) {
                            // e.g. div:xpath(//h3[contains(text(),"Share it!")]/..)
                            updateInProcessNode(tokenValue);
                        }
                        break;
                    case SPACE:
                        if (context.bufferNodeType === NodeTypes.RegularSelector
                            && isRegularContinuousAfterSpace(nextTokenType, nextTokenValue)) {
                            // if regular selector collecting in process
                            // this space is part of it
                            updateInProcessNode(tokenValue);
                        }
                        if (context.bufferNodeType === NodeTypes.RegularSelector
                            && nextTokenValue === COLON) {
                            // it might be such case    div > :contains(test)
                            // should consider it as    div > *:contains(test)
                            updateInProcessNode(`${tokenValue}${ASTERISK}`);
                        } else if (context.buffer === '') {
                        // assume that previous token was comma and this space is next to that
                        // so do nothing now
                        }
                        if (context.bufferNodeType === NodeTypes.AbsolutePseudoClass) {
                            // e.g. div:xpath(//h3[contains(text(),"Share it!")]/..)
                            updateInProcessNode(tokenValue);
                        }
                        if (context.bufferNodeType === NodeTypes.RelativePseudoClass) {
                            // collect relative pseudo-class selector children
                            if (context.buffer.length === 0) {
                                // means relative subtree has to be initiated
                                initRelativeSubtree(tokenValue);
                            }
                        }
                        break;
                    case DESCENDANT_COMBINATOR:
                    case CHILD_COMBINATOR:
                    case NEXT_SIBLING_COMBINATOR:
                    case SUBSEQUENT_SIBLING_COMBINATOR:
                    case SEMICOLON:
                    case ASTERISK:
                    case ID_MARKER:
                    case CLASS_MARKER:
                    case BRACKETS.SQUARE.OPEN:
                        if (context.buffer.length === 0 && context.bufferNodeType.length === 0) {
                            // it might be such cases:
                            // .banner > p
                            // #top > div.ad
                            // [class][style][specific_attr]
                            initStart(tokenValue);
                        } else if (context.bufferNodeType === NodeTypes.RegularSelector) {
                            updateInProcessNode(tokenValue);
                        } else if (context.bufferNodeType === NodeTypes.AbsolutePseudoClass) {
                            // e.g. div:xpath(//h3[contains(text(),"Share it!")]/..)
                            updateInProcessNode(tokenValue);
                        } else if (context.bufferNodeType === NodeTypes.RelativePseudoClass) {
                            // collect relative pseudo-class selector children
                            if (context.buffer.length === 0) {
                                // means relative subtree has to be initiated
                                initRelativeSubtree(tokenValue);
                            }
                        }
                        break;
                    case BRACKETS.SQUARE.CLOSE:
                        if (context.bufferNodeType === NodeTypes.RegularSelector) {
                            // get proper pathStack on closing bracket
                            updateInProcessNode(tokenValue);
                        }
                        if (context.bufferNodeType === NodeTypes.AbsolutePseudoClass) {
                            // e.g. div:xpath(//h3[contains(text(),"Share it!")]/..)
                            updateInProcessNode(tokenValue);
                        }
                        break;
                    case COLON:
                        if (context.buffer.length === 0 && context.bufferNodeType.length === 0) {
                            // it might be such rule:
                            // :contains(text)
                            initStart(ASTERISK);
                        }
                        // it supposed to be pseudo-class — regular or extended
                        if (context.bufferNodeType === NodeTypes.RegularSelector) {
                            if (!isSupportedExtendedPseudo(nextTokenValue)) {
                                // so it is a part of regular selector
                                updateInProcessNode(tokenValue);
                            } else {
                                // add ExtendedSelector to Selector children
                                saveToResult(extendedSelectorNode());
                                context.bufferNodeType = NodeTypes.ExtendedSelector;
                                // save pathStack for relative extended pseudo-classes
                                context.tempRootPathStack = context.bufferPathStack;
                                const childrenLength = getChildrenLength(context.bufferPathStack);
                                // store last node path
                                context.bufferPathStack = [...context.bufferPathStack, `${childrenLength - 1}`, 'children'];
                                context.depth += 2;
                                // clean buffer for collecting pseudo-class argument
                                context.buffer = '';
                            }
                        }
                        if (context.bufferNodeType === NodeTypes.AbsolutePseudoClass) {
                            // collecting arg for absolute pseudo-class
                            // div:matches-css(width:400px)
                            updateInProcessNode(tokenValue);
                        }
                        break;
                    case BRACKETS.PARENTHESES.OPEN:
                        // start of pseudo-class arg
                        if (context.extendedStack.length === 0) {
                            // it might be error
                        }
                        if (context.bufferNodeType === NodeTypes.AbsolutePseudoClass) {
                            // e.g. div:xpath(//h3[contains(text(),"Share it!")]/..)
                            context.extendedBracketsStack.push(tokenValue);
                            if (context.extendedBracketsStack.length > context.extendedStack.length) {
                                updateInProcessNode(tokenValue);
                            }
                        }

                        if (context.bufferNodeType === NodeTypes.RelativePseudoClass) {
                            // e.g. div:xpath(//h3[contains(text(),"Share it!")]/..)
                            context.extendedBracketsStack.push(tokenValue);
                        }

                        // TODO: handle standard pseudo-classes parentheses
                        break;
                    case BRACKETS.PARENTHESES.CLOSE:
                        if (context.bufferNodeType === NodeTypes.AbsolutePseudoClass) {
                            // e.g. h3:contains((Ads))
                            // or   div:xpath(//h3[contains(text(),"Share it!")]/..)
                            context.extendedBracketsStack.pop();
                            context.extendedStack.pop();
                            if (context.extendedBracketsStack.length > context.extendedStack.length) {
                                updateInProcessNode(tokenValue);
                            } else if (context.extendedBracketsStack.length === 0
                                && context.extendedStack.length === 0) {
                                context.buffer = '';
                                // assume it's combined
                                // e.g. p:contains(PR):upward(2)
                                // set to "default" value
                                context.bufferNodeType = NodeTypes.RegularSelector;
                            }
                        }

                        if (context.bufferNodeType === NodeTypes.RegularSelector) {
                            // e.g. h3:has(div)
                            context.extendedBracketsStack.pop();
                            context.extendedStack.pop();
                            context.bufferPathStack = contextRootListPaths[contextLevel];
                        }

                        break;
                    // TODO:
                    // case SINGLE_QUOTE:
                    // case DOUBLE_QUOTE:
                    //     //
                    //     break;
                }
                break;
        }

        i +=1;
    }

    return context.result;
};
