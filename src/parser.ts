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
    HAS_PSEUDO_CLASS_MARKERS,
    IS_PSEUDO_CLASS_MARKER,
    REGULAR_PSEUDO_CLASSES,
    REGULAR_PSEUDO_ELEMENTS,
    NEWLINE,
    CARRIAGE_RETURN,
    FORM_FEED,
    NOT_PSEUDO_CLASS_MARKER,
    IS_OR_NOT_PSEUDO_SELECTING_ROOT,
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
const doesRegularContinueAfterSpace = (nextTokenType: string, nextTokenValue: string): boolean => {
    return COMBINATORS.includes(nextTokenValue)
        || nextTokenType === TokenType.Word
        // e.g. '#main *:has(> .ad)'
        || nextTokenValue === ASTERISK
        || nextTokenValue === ID_MARKER
        || nextTokenValue === CLASS_MARKER
        // e.g. 'div :where(.content)'
        || nextTokenValue === COLON
        // e.g. "div[class*=' ']"
        || nextTokenValue === SINGLE_QUOTE
        // e.g. 'div[class*=" "]'
        || nextTokenValue === DOUBLE_QUOTE
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

    /**
     * Flag for processing comma inside attribute value
     */
    isAttributeBracketsOpen: boolean,
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
        isAttributeBracketsOpen: false,
    };

    /**
     * Gets the node which is being collected
     * or null if there is no such one
     */
    const getBufferNode = (): AnySelectorNodeInterface | null => {
        if (context.pathToBufferNode.length === 0) {
            return null;
        }
        // buffer node is always the last in the pathToBufferNode stack
        return context.pathToBufferNode[context.pathToBufferNode.length - 1];
    };

    /**
     * Updates needed buffer node value while tokens iterating
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
     * Adds SelectorList node to context.ast at the begin of ast collecting
     */
    const addSelectorListNode = () => {
        const selectorListNode = new AnySelectorNode(NodeType.SelectorList);
        context.ast = selectorListNode;
        context.pathToBufferNode.push(selectorListNode);
    };

    /**
     * Adds new node to buffer node children.
     * New added node will be considered as buffer node after it
     * @param type type of node to add
     * @param tokenValue optional, value of processing token
     */
    const addAnySelectorNode = (type: NodeType, tokenValue = ''): void => {
        const bufferNode = getBufferNode();
        if (bufferNode === null) {
            throw new Error('No buffer node');
        }

        // SelectorList || Selector || ExtendedSelector
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

    /**
     * The very beginning of ast collecting
     * @param tokenValue value of regular selector
     */
    const initAst = (tokenValue: string): void => {
        addSelectorListNode();
        addAnySelectorNode(NodeType.Selector);
        // RegularSelector node is always the first child of Selector node
        addAnySelectorNode(NodeType.RegularSelector, tokenValue);
    };

    /**
     * Inits selector list subtree for relative extended pseudo-classes, e.g. :has(), :not()
     * @param tokenValue optional, value of inner regular selector
     */
    const initRelativeSubtree = (tokenValue = '') => {
        addAnySelectorNode(NodeType.SelectorList);
        addAnySelectorNode(NodeType.Selector);
        addAnySelectorNode(NodeType.RegularSelector, tokenValue);
    };

    /**
     * Goes to closest parent specified by type.
     * Actually updates path to buffer node for proper ast collecting of selectors while parsing
     * @param parentType
     */
    const upToClosest = (parentType: NodeType): void => {
        for (let i = context.pathToBufferNode.length - 1; i >= 0; i -= 1) {
            if (context.pathToBufferNode[i].type === parentType) {
                context.pathToBufferNode = context.pathToBufferNode.slice(0, i + 1);
                break;
            }
        }
    };

    let i = 0;
    while (i < tokens.length) {
        const token = tokens[i];

        // Token to process
        const { type: tokenType, value: tokenValue } = token;

        // needed for SPACE and COLON tokens checking
        const nextToken = tokens[i + 1] || [];
        const { type: nextTokenType, value: nextTokenValue } = nextToken;

        // needed for COLON token checking for none-specified regular selector before extended one
        // e.g. 'p, :hover'
        // or   '.banner, :contains(ads)'
        const previousToken = tokens[i - 1] || [];
        const { value: prevTokenValue } = previousToken;

        let bufferNode = getBufferNode();

        switch (tokenType) {
            case TokenType.Word:
                if (bufferNode === null) {
                    // there is no buffer node only in one case — no ast collecting has been started
                    initAst(tokenValue);
                } else if (bufferNode.type === NodeType.SelectorList) {
                    // add new selector to selector list
                    addAnySelectorNode(NodeType.Selector);
                    addAnySelectorNode(NodeType.RegularSelector, tokenValue);
                } else if (bufferNode.type === NodeType.RegularSelector) {
                    updateBufferNode(tokenValue);
                } else if (bufferNode.type === NodeType.ExtendedSelector) {
                    // save pseudo-class name for brackets balance checking
                    context.extendedPseudoNamesStack.push(tokenValue);
                    if (ABSOLUTE_PSEUDO_CLASSES.includes(tokenValue)) {
                        addAnySelectorNode(NodeType.AbsolutePseudoClass, tokenValue);
                    } else {
                        // if it is not absolute pseudo-class, it must be relative one
                        // add RelativePseudoClass with tokenValue as pseudo-class name to ExtendedSelector children
                        addAnySelectorNode(NodeType.RelativePseudoClass, tokenValue);
                    }
                } else if (bufferNode.type === NodeType.AbsolutePseudoClass) {
                    // collect absolute pseudo-class arg
                    updateBufferNode(tokenValue);
                } else if (bufferNode.type === NodeType.RelativePseudoClass) {
                    initRelativeSubtree(tokenValue);
                }
                break;
            case TokenType.Mark:
                switch (tokenValue) {
                    case COMMA:
                        if (!bufferNode || (typeof bufferNode !== 'undefined' && !nextTokenValue)) {
                            // consider the selector is invalid if there is no bufferNode yet (e.g. ', a')
                            // or there is nothing after the comma while bufferNode is defined (e.g. 'div, ')
                            throw new Error(`'${nextTokenValue}' is not a valid selector`);
                        } else if (bufferNode.type === NodeType.RegularSelector) {
                            if (context.isAttributeBracketsOpen) {
                                // the comma might be inside element attribute value
                                // e.g. 'div[data-comma="0,1"]'
                                updateBufferNode(tokenValue);
                            } else {
                                // new Selector should be collected to upper SelectorList
                                upToClosest(NodeType.SelectorList);
                            }
                        } else if (bufferNode.type === NodeType.AbsolutePseudoClass) {
                            // the comma inside arg of absolute extended pseudo
                            // e.g. 'div:xpath(//h3[contains(text(),"Share it!")]/..)'
                            updateBufferNode(tokenValue);
                        } else if (bufferNode?.type === NodeType.Selector) {
                            // new Selector should be collected to upper SelectorList
                            // if parser position is on Selector node
                            upToClosest(NodeType.SelectorList);
                        }
                        break;
                    case SPACE:
                        if (bufferNode?.type === NodeType.RegularSelector
                            && (!nextTokenValue || doesRegularContinueAfterSpace(nextTokenType, nextTokenValue))) {
                            updateBufferNode(tokenValue);
                        }
                        if (bufferNode?.type === NodeType.AbsolutePseudoClass) {
                            // e.g. 'div:xpath(//h3[contains(text(),"Share it!")]/..)'
                            updateBufferNode(tokenValue);
                        }
                        if (bufferNode?.type === NodeType.RelativePseudoClass) {
                            // init with empty value RegularSelector
                            // as the space is not needed for selector value
                            // e.g. 'p:not( .content )'
                            initRelativeSubtree();
                        }
                        if (bufferNode?.type === NodeType.Selector) {
                            /**
                             * do NOT add RegularSelector if parser position on space BEFORE the comma in selector list
                             * e.g. '.block:has(> img) , .banner)'
                             */
                            if (nextTokenValue && doesRegularContinueAfterSpace(nextTokenType, nextTokenValue)) {
                                /**
                                 * regular selector might be after the extended one.
                                 * extra space before combinator or selector should not be collected
                                 * e.g. '.banner:upward(2) .block'
                                 *      '.banner:upward(2) > .block'
                                 * so no tokenValue passed to addAnySelectorNode()
                                 */
                                addAnySelectorNode(NodeType.RegularSelector);
                            }
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
                        if (bufferNode === null) {
                            // no ast collecting has been started
                            if (tokenValue === ASTERISK
                                && nextTokenValue === COLON
                                && tokens[i + 2]
                                && (tokens[i + 2].value === IS_PSEUDO_CLASS_MARKER
                                    || tokens[i + 2].value === NOT_PSEUDO_CLASS_MARKER)) {
                                /**
                                 * TODO: mention this limitation in readme
                                 */
                                /**
                                 * limit applying of wildcard :is() and :not() pseudo-class only to html children
                                 * as we check element parent for them and there is no parent for html
                                 * e.g. '*:is(.page, .main) > .banner'
                                 * or   '*:not(span):not(p)'
                                 */
                                initAst(IS_OR_NOT_PSEUDO_SELECTING_ROOT);
                            } else {
                                // e.g. '.banner > p'
                                // or   '#top > div.ad'
                                // or   '[class][style][attr]'
                                initAst(tokenValue);
                            }
                        } else if (bufferNode.type === NodeType.RegularSelector) {
                            // collect the mark to the value of RegularSelector node
                            updateBufferNode(tokenValue);
                            if (tokenValue === BRACKETS.SQUARE.OPEN) {
                                // needed for proper handling element attribute value with comma
                                // e.g. 'div[data-comma="0,1"]'
                                context.isAttributeBracketsOpen = true;
                            }
                        } else if (bufferNode.type === NodeType.AbsolutePseudoClass) {
                            // collect the mark to the arg of AbsolutePseudoClass node
                            updateBufferNode(tokenValue);
                        } else if (bufferNode.type === NodeType.RelativePseudoClass) {
                            // add SelectorList to children of RelativePseudoClass node
                            initRelativeSubtree(tokenValue);
                        } else if (bufferNode.type === NodeType.Selector) {
                            // after the extended pseudo closing parentheses
                            // parser position is on Selector node
                            // and regular selector can be after the extended one
                            // e.g. '.banner:upward(2)> .block'
                            // or   '.inner:nth-ancestor(1)~ .banner'
                            if (COMBINATORS.includes(tokenValue)) {
                                addAnySelectorNode(NodeType.RegularSelector, tokenValue);
                            }
                        } else if (bufferNode.type === NodeType.SelectorList) {
                            // add Selector to SelectorList
                            addAnySelectorNode(NodeType.Selector);
                            // and RegularSelector as it is always the first child of Selector
                            addAnySelectorNode(NodeType.RegularSelector, tokenValue);
                        }
                        break;
                    case BRACKETS.SQUARE.CLOSE:
                        if (bufferNode?.type === NodeType.RegularSelector) {
                            // needed for proper parsing regular selectors after the attributes with comma
                            // e.g. 'div[data-comma="0,1"] > img'
                            context.isAttributeBracketsOpen = false;
                            // collect the bracket to the value of RegularSelector node
                            updateBufferNode(tokenValue);
                        }
                        if (bufferNode?.type === NodeType.AbsolutePseudoClass) {
                            // :xpath() expended pseudo-class arg might contain square bracket
                            // so it should be collected
                            // e.g. 'div:xpath(//h3[contains(text(),"Share it!")]/..)'
                            updateBufferNode(tokenValue);
                        }
                        break;
                    case COLON:
                        if (bufferNode === null) {
                            // no ast collecting has been started
                            if (nextTokenValue === XPATH_PSEUDO_CLASS_MARKER) {
                                // limit applying of "naked" :xpath pseudo-class
                                // https://github.com/AdguardTeam/ExtendedCss/issues/115
                                initAst('body');
                            } else if (nextTokenValue === IS_PSEUDO_CLASS_MARKER
                                || nextTokenValue === NOT_PSEUDO_CLASS_MARKER) {
                                /**
                                 * TODO: mention this limitation in readme
                                 */
                                /**
                                 * parent element checking is used for extended pseudo-class :is() and :not().
                                 * as there is no parentNode for root element (html)
                                 * element selection should be limited to it's children.
                                 * e.g. :is(.page, .main) > .banner
                                 * or   :not(span):not(p)
                                 */
                                initAst(IS_OR_NOT_PSEUDO_SELECTING_ROOT);
                            } else {
                                // make it more obvious if selector starts with pseudo with no tag specified
                                // e.g. ':has(a)' -> '*:has(a)'
                                // or   ':empty'  -> '*:empty'
                                initAst(ASTERISK);
                            }

                            // bufferNode should be updated for following checking
                            bufferNode = getBufferNode();
                        }

                        /**
                         * TODO: MIGHT HELP WITH OPTIONAL CHAINING
                         * BUT BREAKS PARSING
                         */
                        if (!bufferNode) {
                            throw new Error('bufferNode has to be specified by now');
                        }

                        if (bufferNode.type === NodeType.SelectorList) {
                            // bufferNode is SelectorList after comma has been parsed.
                            // parser position is on colon now:
                            // e.g. 'img,:not(.content)'
                            addAnySelectorNode(NodeType.Selector);
                            // add empty value RegularSelector anyway as any selector should start with it
                            // and check previous token on the next step
                            addAnySelectorNode(NodeType.RegularSelector);
                            // bufferNode should be updated for following checking
                            bufferNode = getBufferNode();
                        }
                        if (bufferNode?.type === NodeType.RegularSelector) {
                            // it can be extended or standard pseudo
                            // e.g. '#share, :contains(share it)'
                            // or   'div, :hover'
                            if (prevTokenValue === SPACE
                                || prevTokenValue === COMMA) {
                                // case with colon at the start of string - e.g. ':contains(text)'
                                // is covered by 'bufferNode === null' above at start of COLON checking
                                updateBufferNode(ASTERISK);
                            }
                            // Disallow :has(), :is(), :where() inside :has() argument
                            // to avoid increasing the :has() invalidation complexity
                            // https://bugs.chromium.org/p/chromium/issues/detail?id=669058#c54 [1]
                            if (context.extendedPseudoNamesStack.length > 0
                                // check the last extended pseudo-class name from context
                                && HAS_PSEUDO_CLASS_MARKERS.includes(context.extendedPseudoNamesStack[context.extendedPseudoNamesStack.length - 1]) // eslint-disable-line max-len
                                // and check the processing pseudo-class
                                && (HAS_PSEUDO_CLASS_MARKERS.includes(nextTokenValue)
                                    || nextTokenValue === IS_PSEUDO_CLASS_MARKER
                                    || nextTokenValue === REGULAR_PSEUDO_CLASSES.WHERE)) {
                                throw new Error(`Usage of :${nextTokenValue} pseudo-class is not allowed inside upper :has`); // eslint-disable-line max-len
                            }

                            if (!isSupportedExtendedPseudo(nextTokenValue)) {
                                // if following token is not an extended pseudo
                                // the colon should be collected to value of RegularSelector
                                // e.g. '.entry_text:nth-child(2)'
                                updateBufferNode(tokenValue);
                                // check the token after the pseudo and do balance parentheses later
                                // only if it is functional pseudo-class (standard with brackets, e.g. ':lang()').
                                // no brackets balance needed for such case,
                                // parser position is on first colon after the 'div':
                                // e.g. 'div:last-child:has(button.privacy-policy__btn)'
                                if (tokens[i + 2] && tokens[i + 2].value === BRACKETS.PARENTHESES.OPEN) {
                                    context.standardPseudoNamesStack.push(nextTokenValue);
                                }
                            } else {
                                // it is supported extended pseudo-class.
                                // Disallow :has() inside the pseudos accepting only compound selectors
                                // https://bugs.chromium.org/p/chromium/issues/detail?id=669058#c54 [2]
                                if (HAS_PSEUDO_CLASS_MARKERS.includes(nextTokenValue)
                                    && context.standardPseudoNamesStack.length > 0) {
                                    // eslint-disable-next-line max-len
                                    throw new Error(`Usage of :${nextTokenValue} pseudo-class is not allowed inside regular pseudo: '${context.standardPseudoNamesStack[context.standardPseudoNamesStack.length - 1]}'`);
                                } else {
                                    // stop RegularSelector value collecting
                                    upToClosest(NodeType.Selector);
                                    // add ExtendedSelector to Selector children
                                    addAnySelectorNode(NodeType.ExtendedSelector);
                                }
                            }
                        }
                        if (bufferNode?.type === NodeType.Selector) {
                            // after the extended pseudo closing parentheses
                            // parser position is on Selector node
                            // and there is might be another extended selector.
                            // parser position is on colon before 'upward':
                            // e.g. 'p:contains(PR):upward(2)'
                            if (isSupportedExtendedPseudo(nextTokenValue)) {
                                // if supported extended pseudo-class is next to colon
                                // add ExtendedSelector to Selector children
                                addAnySelectorNode(NodeType.ExtendedSelector);
                            } else {
                                // otherwise it is standard pseudo after extended pseudo-class
                                // and colon should be collected to value of RegularSelector
                                // e.g. 'body *:not(input)::selection'
                                addAnySelectorNode(NodeType.RegularSelector, tokenValue);
                            }
                        }
                        if (bufferNode?.type === NodeType.AbsolutePseudoClass) {
                            // collecting arg for absolute pseudo-class
                            // e.g. 'div:matches-css(width:400px)'
                            updateBufferNode(tokenValue);
                        }
                        if (bufferNode?.type === NodeType.RelativePseudoClass) {
                            // make it more obvious if selector starts with pseudo with no tag specified
                            // parser position is on colon inside :has() arg
                            // e.g. 'div:has(:contains(text))'
                            // or   'div:not(:empty)'
                            initRelativeSubtree(ASTERISK);
                            if (!isSupportedExtendedPseudo(nextTokenValue)) {
                                // collect the colon to value of RegularSelector
                                // e.g. 'div:not(:empty)'
                                updateBufferNode(tokenValue);
                                // parentheses should be balanced only for functional pseudo-classes
                                // e.g. '.yellow:not(:nth-child(3))'
                                if (tokens[i + 2] && tokens[i + 2].value === BRACKETS.PARENTHESES.OPEN) {
                                    context.standardPseudoNamesStack.push(nextTokenValue);
                                }
                            } else {
                                // add ExtendedSelector to Selector children
                                // e.g. 'div:has(:contains(text))'
                                upToClosest(NodeType.Selector);
                                addAnySelectorNode(NodeType.ExtendedSelector);
                            }
                        }
                        break;
                    case BRACKETS.PARENTHESES.OPEN:
                        // start of pseudo-class arg
                        if (bufferNode?.type === NodeType.AbsolutePseudoClass) {
                            if (prevTokenValue === BACKSLASH) {
                                // if the parentheses is escaped it should be part of regexp
                                // collect it to arg of AbsolutePseudoClass
                                // e.g. 'div:matches-css(background-image: /^url\\("data:image\\/gif;base64.+/)'
                                updateBufferNode(tokenValue);
                            } else {
                                // otherwise brackets should be balanced
                                // e.g. 'div:xpath(//h3[contains(text(),"Share it!")]/..)'
                                context.extendedPseudoBracketsStack.push(tokenValue);
                                // eslint-disable-next-line max-len
                                if (context.extendedPseudoBracketsStack.length > context.extendedPseudoNamesStack.length) {
                                    updateBufferNode(tokenValue);
                                }
                            }
                        }
                        if (bufferNode?.type === NodeType.RegularSelector) {
                            // continue RegularSelector value collecting for standard pseudo-classes
                            // e.g. '.banner:where(div)'
                            if (context.standardPseudoNamesStack.length > 0) {
                                updateBufferNode(tokenValue);
                                context.standardPseudoBracketsStack.push(tokenValue);
                            }
                        }
                        break;
                    case BRACKETS.PARENTHESES.CLOSE:
                        if (bufferNode?.type === NodeType.AbsolutePseudoClass) {
                            // remove stacked open parentheses for brackets balance
                            // and stacked name of extended pseudo-class
                            // e.g. 'h3:contains((Ads))'
                            // or   'div:xpath(//h3[contains(text(),"Share it!")]/..)'
                            context.extendedPseudoBracketsStack.pop();
                            context.extendedPseudoNamesStack.pop();
                            if (context.extendedPseudoBracketsStack.length > context.extendedPseudoNamesStack.length) {
                                // if brackets stack is not empty yet, save tokenValue to arg of AbsolutePseudoClass
                                // parser position on first closing bracket after 'Ads':
                                // e.g. 'h3:contains((Ads))'
                                updateBufferNode(tokenValue);
                            } else if (context.extendedPseudoBracketsStack.length >= 0
                                && context.extendedPseudoNamesStack.length >= 0) {
                                // assume it is combined extended pseudo-classes
                                // parser position on first closing bracket after 'advert':
                                // e.g. 'div:has(.banner, :contains(advert))'
                                upToClosest(NodeType.Selector);
                            }
                        }
                        if (bufferNode?.type === NodeType.RegularSelector) {
                            if (context.standardPseudoNamesStack.length > 0
                                && context.standardPseudoBracketsStack.length > 0) {
                                // standard pseudo-class was processing.
                                // collect the closing bracket to value of RegularSelector
                                // parser position is on bracket after 'class' now:
                                // e.g. 'div:where(.class)'
                                updateBufferNode(tokenValue);
                                // remove bracket and pseudo name from stacks
                                context.standardPseudoBracketsStack.pop();
                                const lastStandardPseudo = context.standardPseudoNamesStack.pop();
                                if (!lastStandardPseudo) {
                                    // standard pseudo should be in standardPseudoNamesStack
                                    // as related to standardPseudoBracketsStack
                                    throw new Error(`Parsing error. Invalid selector: ${selector}`);
                                }
                                // Disallow :has() after regular pseudo-elements
                                // https://bugs.chromium.org/p/chromium/issues/detail?id=669058#c54 [3]
                                if (Object.values(REGULAR_PSEUDO_ELEMENTS).includes(lastStandardPseudo)
                                    // check token which is next to closing parentheses and token after it
                                    // parser position is on bracket after 'foo' now:
                                    // e.g. '::part(foo):has(.a)'
                                    && nextTokenValue === COLON
                                    && tokens[i + 2]
                                    && HAS_PSEUDO_CLASS_MARKERS.includes(tokens[i + 2].value)) {
                                    // eslint-disable-next-line max-len
                                    throw new Error(`Usage of :${tokens[i + 2].value} pseudo-class is not allowed after any regular pseudo-element: '${lastStandardPseudo}'`);
                                }
                            } else {
                                // extended pseudo-class was processing.
                                // e.g. 'div:has(h3)'
                                // remove bracket and pseudo name from stacks
                                context.extendedPseudoBracketsStack.pop();
                                context.extendedPseudoNamesStack.pop();
                                upToClosest(NodeType.ExtendedSelector);
                                // go to upper selector for possible selector continuation after extended pseudo-class
                                // e.g. 'div:has(h3) > img'
                                upToClosest(NodeType.Selector);
                            }
                        }
                        if (bufferNode?.type === NodeType.Selector) {
                            // after inner extended pseudo-class bufferNode is Selector.
                            // parser position is on last bracket now:
                            // e.g. 'div:has(.banner, :contains(ads))'
                            context.extendedPseudoBracketsStack.pop();
                            context.extendedPseudoNamesStack.pop();
                            upToClosest(NodeType.ExtendedSelector);
                            upToClosest(NodeType.Selector);
                        }
                        break;
                    case NEWLINE:
                    case FORM_FEED:
                    case CARRIAGE_RETURN:
                        // such characters should be trimmed
                        // so is there is one them among tokens, it is not valid selector
                        throw new Error(`${selector} is not a valid selector`);
                }
                break;
        }

        i += 1;
    }

    if (context.ast === null) {
        throw new Error(`'${selector}' is not a valid selector`);
    }

    return context.ast;
};
