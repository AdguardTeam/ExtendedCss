import {
    TokenType,
    tokenize,
} from './tokenizer';

import {
    NodeType,
    AnySelectorNodeInterface,
    AnySelectorNode,
    RegularSelectorNode,
    AbsolutePseudoClassNode,
    RelativePseudoClassNode,
} from './nodes';

import {
    BRACKETS,
    COLON,
    SEMICOLON,
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
    XPATH_PSEUDO_CLASS_MARKER,
    BACKSLASH,
    SLASH,
    SINGLE_QUOTE,
    DOUBLE_QUOTE,
    CARET,
    DOLLAR_SIGN,
} from './constants';

/**
 * Checks whether the passed token is supported extended pseudo-class
 * @param token
 */
const isSupportedExtendedPseudo = (token: string): boolean => SUPPORTED_PSEUDO_CLASSES.includes(token);

/**
 * Checks whether next token is a continuation of regular selector being processed
 * @param nextTokenType
 * @param nextTokenValue
 */
const isRegularContinuousAfterSpace = (nextTokenType: string, nextTokenValue: string): boolean => {
    return COMBINATORS.includes(nextTokenValue)
        || nextTokenType === TokenType.Word
        || nextTokenValue === ID_MARKER
        || nextTokenValue === CLASS_MARKER
        || nextTokenValue === BRACKETS.SQUARE.OPEN;
};

interface Context {
    /**
     * Collected result
     */
    ast: AnySelectorNodeInterface | null,

    /**
     * Array of nodes as path to buffer node
     */
    pathToBufferNode: AnySelectorNodeInterface[],

    /**
     * Array of extended pseudo-class names;
     * needed for checking while going deep into extended selector
     */
    extendedPseudoNamesStack: string[],

    /**
     * Array of brackets for proper extended selector args collecting
     */
    extendedPseudoBracketsStack: string[],

    /**
     * Array of standard pseudo-class names
     */
    standardPseudoNamesStack: string[],

    /**
     * Array of brackets for proper standard pseudo-class handling
     */
    standardPseudoBracketsStack: string[],
}

export const parse = (selector: string) => {
    // notes:

    // For example, :valid is a regular pseudo-class, and :lang() is a functional pseudo-class.
    // https://www.w3.org/TR/selectors-4/#pseudo-classes

    // Like all CSS keywords, pseudo-class names are ASCII case-insensitive.
    // https://www.w3.org/TR/selectors-4/#pseudo-classes

    const tokens = tokenize(selector);

    const context: Context = {
        ast: null,
        pathToBufferNode: [],
        extendedPseudoNamesStack: [],
        extendedPseudoBracketsStack: [],
        standardPseudoNamesStack: [],
        standardPseudoBracketsStack: [],
    };

    const getBufferNode = (): AnySelectorNodeInterface | null => {
        if (context.pathToBufferNode.length === 0) {
            return null;
        }
        // buffer node is always the last in the path stack
        return context.pathToBufferNode[context.pathToBufferNode.length - 1];
    };

    /**
     * Updates needed buffered node property value while tokens iterating
     * @param tokenValue
     */
    const updateBufferNode = (tokenValue: string): void => {
        const bufferNode = getBufferNode();
        if (bufferNode === null) {
            throw new Error('No bufferNode to update');
        }
        if (bufferNode.type === NodeType.RegularSelector) {
            bufferNode.value += tokenValue;
        } else if (bufferNode.type === NodeType.AbsolutePseudoClass) {
            bufferNode.arg += tokenValue;
        }
    };

    /**
     * Starts context.ast with SelectorList node
     */
    const startSelectorList = () => {
        const selectorListNode = new AnySelectorNode(NodeType.SelectorList);
        context.ast = selectorListNode;
        context.pathToBufferNode.push(selectorListNode);
    };

    const addAnySelectorNode = (type: NodeType, tokenValue = ''): void => {
        const bufferNode = getBufferNode();
        if (bufferNode === null) {
            throw new Error('No buffer node');
        }
        // for SelectorList || Selector || ExtendedSelector
        let node = new AnySelectorNode(type);

        if (type === NodeType.RegularSelector) {
            node = new RegularSelectorNode(tokenValue);
        } else if (type === NodeType.AbsolutePseudoClass) {
            node = new AbsolutePseudoClassNode(tokenValue);
        } else if (type === NodeType.RelativePseudoClass) {
            node = new RelativePseudoClassNode(tokenValue);
        }

        bufferNode.addChild(node);
        context.pathToBufferNode.push(node);
    };

    const initDefaultAst = (tokenValue: string): void => {
        startSelectorList();
        addAnySelectorNode(NodeType.Selector);
        // start with regular selector node as default
        addAnySelectorNode(NodeType.RegularSelector, tokenValue);
    };

    const initRelativeSubtree = (tokenValue: string) => {
        addAnySelectorNode(NodeType.SelectorList);
        addAnySelectorNode(NodeType.Selector);
        addAnySelectorNode(NodeType.RegularSelector, tokenValue);
    };

    const upToClosest = (neededNodeType: NodeType): void => {
        for (let i = context.pathToBufferNode.length - 1; i >= 0; i -= 1) {
            if (context.pathToBufferNode[i].type === neededNodeType) {
                context.pathToBufferNode = context.pathToBufferNode.slice(0, i + 1);
                break;
            }
        }
    };

    let i = 0;
    while (i < tokens.length) {
        const token = tokens[i];
        const { type: tokenType, value: tokenValue } = token;

        // needed for SPACE and COLON tokens checking
        const nextToken = tokens[i + 1] || [];
        const { type: nextTokenType, value: nextTokenValue } = nextToken;

        let bufferNode = getBufferNode();

        switch (tokenType) {
            case TokenType.Word:
                if (bufferNode === null) {
                    // very beginning
                    initDefaultAst(tokenValue);
                } else if (bufferNode.type === NodeType.SelectorList) {
                    // add new selector to selector list
                    addAnySelectorNode(NodeType.Selector);
                    addAnySelectorNode(NodeType.RegularSelector, tokenValue);
                } else if (bufferNode.type === NodeType.RegularSelector) {
                    updateBufferNode(tokenValue);
                }

                // TODO: ditch optional chaining
                if (bufferNode?.type === NodeType.ExtendedSelector) {
                    // store for brackets balance checking
                    context.extendedPseudoNamesStack.push(tokenValue);

                    if (ABSOLUTE_PSEUDO_CLASSES.includes(tokenValue)) {
                        addAnySelectorNode(NodeType.AbsolutePseudoClass, tokenValue);
                    } else {
                        // if it is not absolute pseudo-class, it must be relative one
                        // can not be third option
                        addAnySelectorNode(NodeType.RelativePseudoClass, tokenValue);
                    }
                } else if (bufferNode?.type === NodeType.AbsolutePseudoClass) {
                    // collect absolute pseudo-class arg
                    updateBufferNode(tokenValue);
                } else if (bufferNode?.type === NodeType.RelativePseudoClass) {
                    initRelativeSubtree(tokenValue);
                }
                break;
            case TokenType.Mark:
                switch (tokenValue) {
                    case COMMA:
                        if (bufferNode?.type === NodeType.RegularSelector) {
                            // new selector should be collected
                            upToClosest(NodeType.SelectorList);
                        }
                        if (bufferNode?.type === NodeType.AbsolutePseudoClass) {
                            // e.g. div:xpath(//h3[contains(text(),"Share it!")]/..)
                            updateBufferNode(tokenValue);
                        }
                        if (bufferNode?.type === NodeType.Selector) {
                            // new selector should be collected
                            upToClosest(NodeType.SelectorList);
                        }
                        break;
                    case SPACE:
                        /**
                         * TODO: add test case for rule starting with few spaces
                         */
                        if (bufferNode?.type === NodeType.RegularSelector
                            && isRegularContinuousAfterSpace(nextTokenType, nextTokenValue)) {
                            // if regular selector collecting in process
                            // this space is part of it
                            updateBufferNode(tokenValue);
                        }
                        if (bufferNode?.type === NodeType.RegularSelector
                            && nextTokenValue === COLON) {
                            // it might be such case    div > :contains(test)
                            // should consider it as    div > *:contains(test)
                            updateBufferNode(`${tokenValue}${ASTERISK}`);
                        }
                        if (bufferNode?.type === NodeType.AbsolutePseudoClass) {
                            // e.g. div:xpath(//h3[contains(text(),"Share it!")]/..)
                            updateBufferNode(tokenValue);
                        }
                        if (bufferNode?.type === NodeType.RelativePseudoClass) {
                            initRelativeSubtree(tokenValue);
                        }
                        break;
                    case DESCENDANT_COMBINATOR:
                    case CHILD_COMBINATOR:
                    case NEXT_SIBLING_COMBINATOR:
                    case SUBSEQUENT_SIBLING_COMBINATOR:
                    case SEMICOLON:
                    case SLASH:
                    case BACKSLASH:
                    case SINGLE_QUOTE:
                    case DOUBLE_QUOTE:
                    case CARET:
                    case DOLLAR_SIGN:
                    case BRACKETS.CURLY.OPEN:
                    case BRACKETS.CURLY.CLOSE:
                    case ASTERISK:
                    case ID_MARKER:
                    case CLASS_MARKER:
                    case BRACKETS.SQUARE.OPEN:
                        /**
                         * TODO support old extended pseudo-class syntax
                         * e.g. -ext-contains, -ext-has etc
                         *
                         * '-ext-contains' is not valid attribute name so it's definitely extended pseudo
                         */
                        if (bufferNode === null) {
                            // it might be such cases:
                            // .banner > p
                            // #top > div.ad
                            // [class][style][specific_attr]
                            initDefaultAst(tokenValue);
                        } else if (bufferNode?.type === NodeType.RegularSelector
                            || bufferNode?.type === NodeType.AbsolutePseudoClass) {
                            updateBufferNode(tokenValue);
                        } else if (bufferNode?.type === NodeType.RelativePseudoClass) {
                            initRelativeSubtree(tokenValue);
                        } else if (bufferNode?.type === NodeType.SelectorList) {
                            addAnySelectorNode(NodeType.Selector);
                            addAnySelectorNode(NodeType.RegularSelector, tokenValue);
                        }
                        break;
                    case BRACKETS.SQUARE.CLOSE:
                        if (bufferNode?.type === NodeType.RegularSelector) {
                            updateBufferNode(tokenValue);
                        }
                        if (bufferNode?.type === NodeType.AbsolutePseudoClass) {
                            // e.g. div:xpath(//h3[contains(text(),"Share it!")]/..)
                            updateBufferNode(tokenValue);
                        }
                        break;
                    case COLON:
                        if (bufferNode === null) {
                            if (nextTokenValue === XPATH_PSEUDO_CLASS_MARKER) {
                                // limit applying of "naked" :xpath pseudo-class
                                // https://github.com/AdguardTeam/ExtendedCss/issues/115
                                initDefaultAst('body');
                            } else {
                                // e.g. :contains(text)
                                initDefaultAst(ASTERISK);
                            }

                            // bufferNode should be updated for following checking
                            bufferNode = getBufferNode();
                        }
                        // it supposed to be pseudo-class — regular or extended
                        if (bufferNode?.type === NodeType.RegularSelector) {
                            if (!isSupportedExtendedPseudo(nextTokenValue)) {
                                // so it is a part of regular selector
                                updateBufferNode(tokenValue);
                            } else {
                                // add ExtendedSelector to Selector children
                                upToClosest(NodeType.Selector);
                                addAnySelectorNode(NodeType.ExtendedSelector);
                            }
                        }
                        if (bufferNode?.type === NodeType.Selector) {
                            // assume there are few extended pseudos in row
                            // e.g. p:contains(PR):upward(2)
                            // and bufferNode was changed on parentheses closing
                            addAnySelectorNode(NodeType.ExtendedSelector);
                        }
                        if (bufferNode?.type === NodeType.AbsolutePseudoClass) {
                            // collecting arg for absolute pseudo-class
                            // e.g. div:matches-css(width:400px)
                            updateBufferNode(tokenValue);
                        }
                        if (bufferNode?.type === NodeType.RelativePseudoClass) {
                            initRelativeSubtree(ASTERISK);
                            if (!isSupportedExtendedPseudo(nextTokenValue)) {
                                // so it is a part of regular selector
                                // e.g. :has pseudo-class arg part in rule:  div:has(:not(.content))
                                updateBufferNode(tokenValue);
                                context.standardPseudoNamesStack.push(nextTokenValue);
                            } else {
                                // add ExtendedSelector to Selector children
                                // e.g. div:has(:contains(text))
                                upToClosest(NodeType.Selector);
                                addAnySelectorNode(NodeType.ExtendedSelector);
                            }
                        }
                        break;
                    case BRACKETS.PARENTHESES.OPEN:
                        // start of pseudo-class arg
                        if (context.extendedPseudoNamesStack.length === 0) {
                            // it might be error
                        }
                        if (bufferNode?.type === NodeType.AbsolutePseudoClass) {
                            // if previous token is escaped parentheses
                            // just update the buffer node
                            if (tokens[i - 1].value === BACKSLASH) {
                                // e.g. div:matches-css(background-image: /^url\\("data:image\\/gif;base64.+/)
                                updateBufferNode(tokenValue);
                            } else {
                                // e.g. div:xpath(//h3[contains(text(),"Share it!")]/..)
                                context.extendedPseudoBracketsStack.push(tokenValue);
                                // eslint-disable-next-line max-len
                                if (context.extendedPseudoBracketsStack.length > context.extendedPseudoNamesStack.length) {
                                    updateBufferNode(tokenValue);
                                }
                            }
                        }
                        if (bufferNode?.type === NodeType.RelativePseudoClass) {
                            // e.g. div:xpath(//h3[contains(text(),"Share it!")]/..)
                            context.extendedPseudoBracketsStack.push(tokenValue);
                        }
                        if (bufferNode?.type === NodeType.RegularSelector) {
                            // standard pseudo-classes, e.g. .banner:not(div)
                            if (context.standardPseudoNamesStack.length > 0) {
                                updateBufferNode(tokenValue);
                                context.standardPseudoBracketsStack.push(tokenValue);
                            }
                        }
                        break;
                    case BRACKETS.PARENTHESES.CLOSE:
                        if (bufferNode?.type === NodeType.AbsolutePseudoClass) {
                            // e.g. h3:contains((Ads))
                            // or   div:xpath(//h3[contains(text(),"Share it!")]/..)
                            context.extendedPseudoBracketsStack.pop();
                            context.extendedPseudoNamesStack.pop();
                            if (context.extendedPseudoBracketsStack.length > context.extendedPseudoNamesStack.length) {
                                updateBufferNode(tokenValue);
                            } else if (context.extendedPseudoBracketsStack.length === 0
                                && context.extendedPseudoNamesStack.length === 0) {
                                // assume it's combined
                                // e.g. p:contains(PR):upward(2)
                                upToClosest(NodeType.Selector);
                            }
                        }
                        if (bufferNode?.type === NodeType.RegularSelector) {
                            if (context.standardPseudoNamesStack.length > 0) {
                                // standard pseudo-classes, e.g. .banner:not(div)
                                updateBufferNode(tokenValue);
                                context.standardPseudoBracketsStack.pop();
                                context.standardPseudoNamesStack.pop();
                            } else {
                                // e.g. h3:has(div)
                                context.extendedPseudoBracketsStack.pop();
                                context.extendedPseudoNamesStack.pop();
                                upToClosest(NodeType.ExtendedSelector);
                                upToClosest(NodeType.Selector);
                            }
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

        i += 1;
    }

    return context.ast;
};
