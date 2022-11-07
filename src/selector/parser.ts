import { TokenType, tokenize } from './tokenizer';

import {
    NodeType,
    AnySelectorNodeInterface,
    AnySelectorNode,
    RegularSelectorNode,
    AbsolutePseudoClassNode,
    RelativePseudoClassNode,
} from './nodes';

import { getLast } from '../common/utils/arrays';

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
    BACKSLASH,
    SLASH,
    SINGLE_QUOTE,
    DOUBLE_QUOTE,
    CARET,
    DOLLAR_SIGN,
    TAB,
    LINE_FEED,
    CARRIAGE_RETURN,
    FORM_FEED,
    WHITE_SPACE_CHARACTERS,
    SUPPORTED_PSEUDO_CLASSES,
    ABSOLUTE_PSEUDO_CLASSES,
    RELATIVE_PSEUDO_CLASSES,
    XPATH_PSEUDO_CLASS_MARKER,
    HAS_PSEUDO_CLASS_MARKERS,
    IS_PSEUDO_CLASS_MARKER,
    NOT_PSEUDO_CLASS_MARKER,
    REMOVE_PSEUDO_MARKER,
    REGULAR_PSEUDO_ELEMENTS,
    UPWARD_PSEUDO_CLASS_MARKER,
    NTH_ANCESTOR_PSEUDO_CLASS_MARKER,
} from '../common/constants';

// limit applying of wildcard :is() and :not() pseudo-class only to html children
// e.g. ':is(.page, .main) > .banner' or '*:not(span):not(p)'
const IS_OR_NOT_PSEUDO_SELECTING_ROOT = `html ${ASTERISK}`;

// limit applying of :xpath() pseudo-class to 'any' element
// https://github.com/AdguardTeam/ExtendedCss/issues/115
const XPATH_PSEUDO_SELECTING_ROOT = 'body';

/**
 * Checks whether the passed token is supported extended pseudo-class.
 *
 * @param tokenValue Token value to check.
 */
const isSupportedExtendedPseudo = (tokenValue: string): boolean => SUPPORTED_PSEUDO_CLASSES.includes(tokenValue);

/**
 * Checks whether next token is a continuation of regular selector being processed.
 *
 * @param nextTokenType Type of token next to current one.
 * @param nextTokenValue Value of token next to current one.
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
        || nextTokenValue === BRACKETS.SQUARE.LEFT;
};

/**
 * Interface for selector parser context.
 */
interface Context {
    /**
     * Collected result.
     */
    ast: AnySelectorNodeInterface | null;

    /**
     * Array of nodes as path to buffer node.
     */
    pathToBufferNode: AnySelectorNodeInterface[];

    /**
     * Array of extended pseudo-class names;
     * needed for checking while going deep into extended selector.
     */
    extendedPseudoNamesStack: string[];

    /**
     * Array of brackets for proper extended selector args collecting.
     */
    extendedPseudoBracketsStack: string[];

    /**
     * Array of standard pseudo-class names.
     */
    standardPseudoNamesStack: string[];

    /**
     * Array of brackets for proper standard pseudo-class handling.
     */
    standardPseudoBracketsStack: string[];

    /**
     * Flag for processing comma inside attribute value.
     */
    isAttributeBracketsOpen: boolean;

    /**
     * Flag for extended pseudo-class arg regexp values.
     */
    isRegexpOpen: boolean;
}

/**
 * Gets the node which is being collected
 * or null if there is no such one.
 *
 * @param context Selector parser context.
 */
const getBufferNode = (context: Context): AnySelectorNodeInterface | null => {
    if (context.pathToBufferNode.length === 0) {
        return null;
    }
    // buffer node is always the last in the pathToBufferNode stack
    return getLast(context.pathToBufferNode);
};

/**
 * Gets last RegularSelector ast node.
 * Needed for parsing of the complex selector with extended pseudo-class inside it.
 *
 * @param context Selector parser context.
 *
 * @throws An error if:
 * - bufferNode is absent;
 * - type of bufferNode is unsupported;
 * - no RegularSelector in bufferNode.
 */
const getLastRegularSelectorNode = (context: Context): AnySelectorNodeInterface => {
    const bufferNode = getBufferNode(context);
    if (!bufferNode) {
        throw new Error('No bufferNode found');
    }
    if (bufferNode.type !== NodeType.Selector) {
        throw new Error('Unsupported bufferNode type');
    }
    const selectorRegularChildren = bufferNode.children.filter((node) => node.type === NodeType.RegularSelector);
    if (selectorRegularChildren.length === 0) {
        throw new Error('No RegularSelector node found');
    }
    const lastRegularSelectorNode = getLast(selectorRegularChildren);
    context.pathToBufferNode.push(lastRegularSelectorNode);
    return lastRegularSelectorNode;
};

/**
 * Updates needed buffer node value while tokens iterating.
 *
 * @param context Selector parser context.
 * @param tokenValue Value of current token.
 *
 * @throws An error if:
 * - no bufferNode;
 * - bufferNode.type is not RegularSelector or AbsolutePseudoClass.
 */
const updateBufferNode = (context: Context, tokenValue: string): void => {
    const bufferNode = getBufferNode(context);
    if (bufferNode === null) {
        throw new Error('No bufferNode to update');
    }
    const { type } = bufferNode;
    if (type === NodeType.RegularSelector
        || type === NodeType.AbsolutePseudoClass) {
        bufferNode.value += tokenValue;
    } else {
        throw new Error(`${bufferNode.type} node can not be updated. Only RegularSelector and AbsolutePseudoClass are supported.`); // eslint-disable-line max-len
    }
};

/**
 * Adds SelectorList node to context.ast at the start of ast collecting.
 *
 * @param context Selector parser context.
 */
const addSelectorListNode = (context: Context): void => {
    const selectorListNode = new AnySelectorNode(NodeType.SelectorList);
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
const addAstNodeByType = (context: Context, type: NodeType, tokenValue = ''): void => {
    const bufferNode = getBufferNode(context);
    if (bufferNode === null) {
        throw new Error('No buffer node');
    }

    let node: AnySelectorNodeInterface;
    if (type === NodeType.RegularSelector) {
        node = new RegularSelectorNode(tokenValue);
    } else if (type === NodeType.AbsolutePseudoClass) {
        node = new AbsolutePseudoClassNode(tokenValue);
    } else if (type === NodeType.RelativePseudoClass) {
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
const initAst = (context: Context, tokenValue: string): void => {
    addSelectorListNode(context);
    addAstNodeByType(context, NodeType.Selector);
    // RegularSelector node is always the first child of Selector node
    addAstNodeByType(context, NodeType.RegularSelector, tokenValue);
};

/**
 * Inits selector list subtree for relative extended pseudo-classes, e.g. :has(), :not().
 *
 * @param context Selector parser context.
 * @param tokenValue Optional, defaults to `''`, value of inner regular selector.
 */
const initRelativeSubtree = (context: Context, tokenValue = ''): void => {
    addAstNodeByType(context, NodeType.SelectorList);
    addAstNodeByType(context, NodeType.Selector);
    addAstNodeByType(context, NodeType.RegularSelector, tokenValue);
};

/**
 * Goes to closest parent specified by type.
 * Actually updates path to buffer node for proper ast collecting of selectors while parsing.
 *
 * @param context Selector parser context.
 * @param parentType Type of needed parent node in ast.
 */
const upToClosest = (context: Context, parentType: NodeType): void => {
    for (let i = context.pathToBufferNode.length - 1; i >= 0; i -= 1) {
        if (context.pathToBufferNode[i].type === parentType) {
            context.pathToBufferNode = context.pathToBufferNode.slice(0, i + 1);
            break;
        }
    }
};

/**
 * Gets needed buffer node updated due to complex selector parsing.
 *
 * @param context Selector parser context.
 *
 * @throws An error if there is no upper SelectorNode is ast.
 */
const getUpdatedBufferNode = (context: Context): AnySelectorNodeInterface | null => {
    upToClosest(context, NodeType.Selector);
    const selectorNode = getBufferNode(context);
    if (!selectorNode) {
        throw new Error('No SelectorNode, impossible to continue selector parsing');
    }
    const lastSelectorNodeChild = getLast(selectorNode.children);
    const hasExtended = lastSelectorNodeChild.type === NodeType.ExtendedSelector
        // parser position might be inside standard pseudo-class brackets which has space
        // e.g. 'div:contains(/а/):nth-child(100n + 2)'
        && context.standardPseudoBracketsStack.length === 0;
    const lastExtendedPseudoName = hasExtended
        && lastSelectorNodeChild.children[0].name;

    const isLastExtendedNameRelative = lastExtendedPseudoName
        && RELATIVE_PSEUDO_CLASSES.includes(lastExtendedPseudoName);
    const isLastExtendedNameAbsolute = lastExtendedPseudoName
        && ABSOLUTE_PSEUDO_CLASSES.includes(lastExtendedPseudoName);

    const hasRelativeExtended = isLastExtendedNameRelative
        && context.extendedPseudoBracketsStack.length > 0
        && context.extendedPseudoBracketsStack.length === context.extendedPseudoNamesStack.length;
    const hasAbsoluteExtended = isLastExtendedNameAbsolute
        && lastExtendedPseudoName === getLast(context.extendedPseudoNamesStack);

    let newNeededBufferNode = selectorNode;
    if (hasRelativeExtended) {
        // return relative selector node to update later
        context.pathToBufferNode.push(lastSelectorNodeChild);
        newNeededBufferNode = lastSelectorNodeChild.children[0];
    } else if (hasAbsoluteExtended) {
        // return absolute selector node to update later
        context.pathToBufferNode.push(lastSelectorNodeChild);
        newNeededBufferNode = lastSelectorNodeChild.children[0];
    } else if (hasExtended) {
        // return selector node to add new regular selector node later
        newNeededBufferNode = selectorNode;
    } else {
        // otherwise return last regular selector node to update later
        newNeededBufferNode = getLastRegularSelectorNode(context);
    }
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
const handleNextTokenOnColon = (
    context: Context,
    selector: string,
    tokenValue: string,
    nextTokenValue: string,
    nextToNextTokenValue: string,
) => {
    if (!isSupportedExtendedPseudo(nextTokenValue.toLowerCase())) {
        if (nextTokenValue.toLowerCase() === REMOVE_PSEUDO_MARKER) {
            // :remove() pseudo-class should be handled before
            // as it is not about element selecting but actions with elements
            // e.g. 'body > div:empty:remove()'
            throw new Error(`Selector parser error: invalid :remove() pseudo-class in selector: '${selector}'`); // eslint-disable-line max-len
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
        if (nextToNextTokenValue === BRACKETS.PARENTHESES.LEFT
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
            upToClosest(context, NodeType.Selector);
            // add ExtendedSelector to Selector children
            addAstNodeByType(context, NodeType.ExtendedSelector);
        }
    }
};

/**
 * Parses selector into ast for following element selection.
 *
 * @param selector Selector to parse.
 *
 * @throws An error on invalid selector.
 */
export const parse = (selector: string): AnySelectorNodeInterface => {
    const tokens = tokenize(selector);

    const context: Context = {
        ast: null,
        pathToBufferNode: [],
        extendedPseudoNamesStack: [],
        extendedPseudoBracketsStack: [],
        standardPseudoNamesStack: [],
        standardPseudoBracketsStack: [],
        isAttributeBracketsOpen: false,
        isRegexpOpen: false,
    };

    let i = 0;
    while (i < tokens.length) {
        const token = tokens[i];

        // Token to process
        const { type: tokenType, value: tokenValue } = token;

        // needed for SPACE and COLON tokens checking
        const nextToken = tokens[i + 1] || [];
        const { type: nextTokenType, value: nextTokenValue } = nextToken;

        // needed for limitations
        // - :not() and :is() root element
        // - :has() usage
        // - white space before and after pseudo-class name
        const nextToNextToken = tokens[i + 2] || [];
        const { value: nextToNextTokenValue } = nextToNextToken;

        // needed for COLON token checking for none-specified regular selector before extended one
        // e.g. 'p, :hover'
        // or   '.banner, :contains(ads)'
        const previousToken = tokens[i - 1] || [];
        const { type: prevTokenType, value: prevTokenValue } = previousToken;

        let bufferNode = getBufferNode(context);

        switch (tokenType) {
            case TokenType.Word:
                if (bufferNode === null) {
                    // there is no buffer node only in one case — no ast collecting has been started
                    initAst(context, tokenValue);
                } else if (bufferNode.type === NodeType.SelectorList) {
                    // add new selector to selector list
                    addAstNodeByType(context, NodeType.Selector);
                    addAstNodeByType(context, NodeType.RegularSelector, tokenValue);
                } else if (bufferNode.type === NodeType.RegularSelector) {
                    updateBufferNode(context, tokenValue);
                } else if (bufferNode.type === NodeType.ExtendedSelector) {
                    // No white space is allowed between the name of extended pseudo-class
                    // and its opening parenthesis
                    // https://www.w3.org/TR/selectors-4/#pseudo-classes
                    // e.g. 'span:contains (text)'
                    if (WHITE_SPACE_CHARACTERS.includes(nextTokenValue)
                        && nextToNextTokenValue === BRACKETS.PARENTHESES.LEFT) {
                        throw new Error(`No white space is allowed before or after extended pseudo-class name in selector: '${selector}'`); // eslint-disable-line max-len
                    }
                    // save pseudo-class name for brackets balance checking
                    context.extendedPseudoNamesStack.push(tokenValue.toLowerCase());
                    // extended pseudo-class name are parsed in lower case
                    // as they should be case-insensitive
                    // https://www.w3.org/TR/selectors-4/#pseudo-classes
                    if (ABSOLUTE_PSEUDO_CLASSES.includes(tokenValue.toLowerCase())) {
                        addAstNodeByType(context, NodeType.AbsolutePseudoClass, tokenValue.toLowerCase());
                    } else {
                        // if it is not absolute pseudo-class, it must be relative one
                        // add RelativePseudoClass with tokenValue as pseudo-class name to ExtendedSelector children
                        addAstNodeByType(context, NodeType.RelativePseudoClass, tokenValue.toLowerCase());
                    }
                } else if (bufferNode.type === NodeType.AbsolutePseudoClass) {
                    // collect absolute pseudo-class arg
                    updateBufferNode(context, tokenValue);
                } else if (bufferNode.type === NodeType.RelativePseudoClass) {
                    initRelativeSubtree(context, tokenValue);
                }
                break;
            case TokenType.Mark:
                switch (tokenValue) {
                    case COMMA:
                        if (!bufferNode || (typeof bufferNode !== 'undefined' && !nextTokenValue)) {
                            // consider the selector is invalid if there is no bufferNode yet (e.g. ', a')
                            // or there is nothing after the comma while bufferNode is defined (e.g. 'div, ')
                            throw new Error(`'${selector}' is not a valid selector`);
                        } else if (bufferNode.type === NodeType.RegularSelector) {
                            if (context.isAttributeBracketsOpen) {
                                // the comma might be inside element attribute value
                                // e.g. 'div[data-comma="0,1"]'
                                updateBufferNode(context, tokenValue);
                            } else {
                                // new Selector should be collected to upper SelectorList
                                upToClosest(context, NodeType.SelectorList);
                            }
                        } else if (bufferNode.type === NodeType.AbsolutePseudoClass) {
                            // the comma inside arg of absolute extended pseudo
                            // e.g. 'div:xpath(//h3[contains(text(),"Share it!")]/..)'
                            updateBufferNode(context, tokenValue);
                        } else if (bufferNode?.type === NodeType.Selector) {
                            // new Selector should be collected to upper SelectorList
                            // if parser position is on Selector node
                            upToClosest(context, NodeType.SelectorList);
                        }
                        break;
                    case SPACE:
                        // it might be complex selector with extended pseudo-class inside it
                        // and the space is between that complex selector and following regular selector
                        // parser position is on ` ` before `span` now:
                        // e.g. 'div:has(img).banner span'
                        // so we need to check whether the new ast node should be added (example above)
                        // or previous regular selector node should be updated
                        if (bufferNode?.type === NodeType.RegularSelector) {
                            bufferNode = getUpdatedBufferNode(context);
                        }
                        if (bufferNode?.type === NodeType.RegularSelector) {
                            // standard selectors with white space between colon and name of pseudo
                            // are invalid for native document.querySelectorAll() anyway,
                            // so throwing the error here is better
                            // than proper parsing of invalid selector and passing it further.
                            // first of all do not check attributes
                            // e.g. div[style="text-align: center"]
                            if (!context.isAttributeBracketsOpen
                                // check the space after the colon and before the pseudo
                                // e.g. '.block: nth-child(2)
                                && ((prevTokenValue === COLON && nextTokenType === TokenType.Word)
                                    // or after the pseudo and before the opening parenthesis
                                    // e.g. '.block:nth-child (2)
                                    || (prevTokenType === TokenType.Word
                                        && nextTokenValue === BRACKETS.PARENTHESES.LEFT))
                            ) {
                                throw new Error(`'${selector}' is not a valid selector.`);
                            }
                            // collect current tokenValue to value of RegularSelector
                            // if it is the last token or standard selector continues after the space.
                            // otherwise it will be skipped
                            if (!nextTokenValue || doesRegularContinueAfterSpace(nextTokenType, nextTokenValue)) {
                                updateBufferNode(context, tokenValue);
                            }
                        }
                        if (bufferNode?.type === NodeType.AbsolutePseudoClass) {
                            // space inside extended pseudo-class arg
                            // e.g. 'span:contains(some text)'
                            updateBufferNode(context, tokenValue);
                        }
                        if (bufferNode?.type === NodeType.RelativePseudoClass) {
                            // init with empty value RegularSelector
                            // as the space is not needed for selector value
                            // e.g. 'p:not( .content )'
                            initRelativeSubtree(context);
                        }
                        if (bufferNode?.type === NodeType.Selector) {
                            // do NOT add RegularSelector if parser position on space BEFORE the comma in selector list
                            // e.g. '.block:has(> img) , .banner)'
                            if (nextTokenValue && doesRegularContinueAfterSpace(nextTokenType, nextTokenValue)) {
                                // regular selector might be after the extended one.
                                // extra space before combinator or selector should not be collected
                                // e.g. '.banner:upward(2) .block'
                                //      '.banner:upward(2) > .block'
                                // so no tokenValue passed to addAnySelectorNode()
                                addAstNodeByType(context, NodeType.RegularSelector);
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
                    case BRACKETS.CURLY.LEFT:
                    case BRACKETS.CURLY.RIGHT:
                    case ASTERISK:
                    case ID_MARKER:
                    case CLASS_MARKER:
                    case BRACKETS.SQUARE.LEFT:
                        // it might be complex selector with extended pseudo-class inside it
                        // and the space is between that complex selector and following regular selector
                        // e.g. 'div:has(img).banner'   // parser position is on `.` before `banner` now
                        //      'div:has(img)[attr]'    // parser position is on `[` before `attr` now
                        // so we need to check whether the new ast node should be added (example above)
                        // or previous regular selector node should be updated
                        if (COMBINATORS.includes(tokenValue)) {
                            bufferNode = getUpdatedBufferNode(context);
                        }
                        if (bufferNode === null) {
                            // no ast collecting has been started
                            if (tokenValue === ASTERISK
                                && nextTokenValue === COLON
                                && (nextToNextTokenValue === IS_PSEUDO_CLASS_MARKER
                                    || nextToNextTokenValue === NOT_PSEUDO_CLASS_MARKER)) {
                                // limit applying of wildcard :is() and :not() pseudo-class only to html children
                                // as we check element parent for them and there is no parent for html,
                                // e.g. '*:is(.page, .main) > .banner'
                                // or   '*:not(span):not(p)'
                                initAst(context, IS_OR_NOT_PSEUDO_SELECTING_ROOT);
                            } else {
                                // e.g. '.banner > p'
                                // or   '#top > div.ad'
                                // or   '[class][style][attr]'
                                initAst(context, tokenValue);
                            }
                        } else if (bufferNode.type === NodeType.RegularSelector) {
                            // collect the mark to the value of RegularSelector node
                            updateBufferNode(context, tokenValue);
                            if (tokenValue === BRACKETS.SQUARE.LEFT) {
                                // needed for proper handling element attribute value with comma
                                // e.g. 'div[data-comma="0,1"]'
                                context.isAttributeBracketsOpen = true;
                            }
                        } else if (bufferNode.type === NodeType.AbsolutePseudoClass) {
                            // collect the mark to the arg of AbsolutePseudoClass node
                            updateBufferNode(context, tokenValue);
                            // 'isRegexpOpen' flag is needed for brackets balancing inside extended pseudo-class arg
                            if (tokenValue === SLASH && prevTokenValue !== BACKSLASH) {
                                context.isRegexpOpen = context.extendedPseudoNamesStack.length > 0
                                    && !context.isRegexpOpen;
                            }
                        } else if (bufferNode.type === NodeType.RelativePseudoClass) {
                            // add SelectorList to children of RelativePseudoClass node
                            initRelativeSubtree(context, tokenValue);
                            if (tokenValue === BRACKETS.SQUARE.LEFT) {
                                // besides of creating the relative subtree
                                // opening square bracket means start of attribute
                                // e.g. 'div:not([class="content"])'
                                //      'div:not([href*="window.print()"])'
                                context.isAttributeBracketsOpen = true;
                            }
                        } else if (bufferNode.type === NodeType.Selector) {
                            // after the extended pseudo closing parentheses
                            // parser position is on Selector node
                            // and regular selector can be after the extended one
                            // e.g. '.banner:upward(2)> .block'
                            // or   '.inner:nth-ancestor(1)~ .banner'
                            if (COMBINATORS.includes(tokenValue)) {
                                addAstNodeByType(context, NodeType.RegularSelector, tokenValue);
                            } else if (!context.isRegexpOpen) {
                                // it might be complex selector with extended pseudo-class inside it.
                                // parser position is on `.` now:
                                // e.g. 'div:has(img).banner'
                                // so we need to get last regular selector node and update its value
                                bufferNode = getLastRegularSelectorNode(context);
                                updateBufferNode(context, tokenValue);
                            }
                        } else if (bufferNode.type === NodeType.SelectorList) {
                            // add Selector to SelectorList
                            addAstNodeByType(context, NodeType.Selector);
                            // and RegularSelector as it is always the first child of Selector
                            addAstNodeByType(context, NodeType.RegularSelector, tokenValue);
                        }
                        break;
                    case BRACKETS.SQUARE.RIGHT:
                        if (bufferNode?.type === NodeType.RegularSelector) {
                            // needed for proper parsing regular selectors after the attributes with comma
                            // e.g. 'div[data-comma="0,1"] > img'
                            context.isAttributeBracketsOpen = false;
                            // collect the bracket to the value of RegularSelector node
                            updateBufferNode(context, tokenValue);
                        }
                        if (bufferNode?.type === NodeType.AbsolutePseudoClass) {
                            // :xpath() expended pseudo-class arg might contain square bracket
                            // so it should be collected
                            // e.g. 'div:xpath(//h3[contains(text(),"Share it!")]/..)'
                            updateBufferNode(context, tokenValue);
                        }
                        break;
                    case COLON:
                        // No white space is allowed between the colon and the following name of the pseudo-class
                        // https://www.w3.org/TR/selectors-4/#pseudo-classes
                        // e.g. 'span: contains(text)'
                        if (WHITE_SPACE_CHARACTERS.includes(nextTokenValue)
                            && SUPPORTED_PSEUDO_CLASSES.includes(nextToNextTokenValue)) {
                            throw new Error(`No white space is allowed before or after extended pseudo-class name in selector: '${selector}'`); // eslint-disable-line max-len
                        }
                        if (bufferNode === null) {
                            // no ast collecting has been started
                            if (nextTokenValue === XPATH_PSEUDO_CLASS_MARKER) {
                                // limit applying of "naked" :xpath pseudo-class
                                // https://github.com/AdguardTeam/ExtendedCss/issues/115
                                initAst(context, XPATH_PSEUDO_SELECTING_ROOT);
                            } else if (nextTokenValue === IS_PSEUDO_CLASS_MARKER
                                || nextTokenValue === NOT_PSEUDO_CLASS_MARKER) {
                                // parent element checking is used for extended pseudo-class :is() and :not().
                                // as there is no parentNode for root element (html)
                                // element selection should be limited to it's children.
                                // e.g. ':is(.page, .main) > .banner'
                                // or   ':not(span):not(p)'
                                initAst(context, IS_OR_NOT_PSEUDO_SELECTING_ROOT);
                            } else if (nextTokenValue === UPWARD_PSEUDO_CLASS_MARKER
                                || nextTokenValue === NTH_ANCESTOR_PSEUDO_CLASS_MARKER) {
                                // selector should be specified before :nth-ancestor() or :upward()
                                // e.g. ':nth-ancestor(3)'
                                // or   ':upward(span)'
                                throw new Error(`Selector should be specified before :${nextTokenValue}() pseudo-class`); // eslint-disable-line max-len
                            } else {
                                // make it more obvious if selector starts with pseudo with no tag specified
                                // e.g. ':has(a)' -> '*:has(a)'
                                // or   ':empty'  -> '*:empty'
                                initAst(context, ASTERISK);
                            }

                            // bufferNode should be updated for following checking
                            bufferNode = getBufferNode(context);
                        }

                        if (!bufferNode) {
                            throw new Error('bufferNode has to be specified by now');
                        }

                        if (bufferNode.type === NodeType.SelectorList) {
                            // bufferNode is SelectorList after comma has been parsed.
                            // parser position is on colon now:
                            // e.g. 'img,:not(.content)'
                            addAstNodeByType(context, NodeType.Selector);
                            // add empty value RegularSelector anyway as any selector should start with it
                            // and check previous token on the next step
                            addAstNodeByType(context, NodeType.RegularSelector);
                            // bufferNode should be updated for following checking
                            bufferNode = getBufferNode(context);
                        }
                        if (bufferNode?.type === NodeType.RegularSelector) {
                            // it can be extended or standard pseudo
                            // e.g. '#share, :contains(share it)'
                            // or   'div,:hover'
                            // of   'div:has(+:contains(text))'  // position is after '+'
                            if (COMBINATORS.includes(prevTokenValue)
                                || prevTokenValue === COMMA) {
                                // case with colon at the start of string - e.g. ':contains(text)'
                                // is covered by 'bufferNode === null' above at start of COLON checking
                                updateBufferNode(context, ASTERISK);
                            }
                            handleNextTokenOnColon(context, selector, tokenValue, nextTokenValue, nextToNextTokenValue);
                        }
                        if (bufferNode?.type === NodeType.Selector) {
                            // after the extended pseudo closing parentheses
                            // parser position is on Selector node
                            // and there is might be another extended selector.
                            // parser position is on colon before 'upward':
                            // e.g. 'p:contains(PR):upward(2)'
                            if (isSupportedExtendedPseudo(nextTokenValue.toLowerCase())) {
                                // if supported extended pseudo-class is next to colon
                                // add ExtendedSelector to Selector children
                                addAstNodeByType(context, NodeType.ExtendedSelector);
                            } else if (nextTokenValue.toLowerCase() === REMOVE_PSEUDO_MARKER) {
                                // :remove() pseudo-class should be handled before
                                // as it is not about element selecting but actions with elements
                                // e.g. '#banner:upward(2):remove()'
                                throw new Error(`Selector parser error: invalid :remove() pseudo-class in selector: '${selector}'`); // eslint-disable-line max-len
                            } else {
                                // otherwise it is standard pseudo after extended pseudo-class in complex selector
                                // and colon should be collected to value of previous RegularSelector
                                // e.g. 'body *:not(input)::selection'
                                //      'input:matches-css(padding: 10):checked'
                                bufferNode = getLastRegularSelectorNode(context);
                                handleNextTokenOnColon(context, selector, tokenValue, nextTokenType, nextToNextTokenValue); // eslint-disable-line max-len
                            }
                        }
                        if (bufferNode?.type === NodeType.AbsolutePseudoClass) {
                            // :xpath() pseudo-class should be the last of extended pseudo-classes
                            if (bufferNode.name === XPATH_PSEUDO_CLASS_MARKER
                                && SUPPORTED_PSEUDO_CLASSES.includes(nextToken.value)
                                && nextToNextToken.value === BRACKETS.PARENTHESES.LEFT) {
                                throw new Error(`:xpath() pseudo-class should be at the end of selector: '${selector}'`); // eslint-disable-line max-len
                            }
                            // collecting arg for absolute pseudo-class
                            // e.g. 'div:matches-css(width:400px)'
                            updateBufferNode(context, tokenValue);
                        }
                        if (bufferNode?.type === NodeType.RelativePseudoClass) {
                            // make it more obvious if selector starts with pseudo with no tag specified
                            // parser position is on colon inside :has() arg
                            // e.g. 'div:has(:contains(text))'
                            // or   'div:not(:empty)'
                            initRelativeSubtree(context, ASTERISK);
                            if (!isSupportedExtendedPseudo(nextTokenValue.toLowerCase())) {
                                // collect the colon to value of RegularSelector
                                // e.g. 'div:not(:empty)'
                                updateBufferNode(context, tokenValue);
                                // parentheses should be balanced only for functional pseudo-classes
                                // e.g. '.yellow:not(:nth-child(3))'
                                if (nextToNextTokenValue === BRACKETS.PARENTHESES.LEFT) {
                                    context.standardPseudoNamesStack.push(nextTokenValue);
                                }
                            } else {
                                // add ExtendedSelector to Selector children
                                // e.g. 'div:has(:contains(text))'
                                upToClosest(context, NodeType.Selector);
                                addAstNodeByType(context, NodeType.ExtendedSelector);
                            }
                        }
                        break;
                    case BRACKETS.PARENTHESES.LEFT:
                        // start of pseudo-class arg
                        if (bufferNode?.type === NodeType.AbsolutePseudoClass) {
                            // no brackets balancing needed inside
                            // 1. :xpath() extended pseudo-class arg
                            // 2. regexp arg for other extended pseudo-classes
                            if (bufferNode.name !== XPATH_PSEUDO_CLASS_MARKER && context.isRegexpOpen) {
                                // if the parentheses is escaped it should be part of regexp
                                // collect it to arg of AbsolutePseudoClass
                                // e.g. 'div:matches-css(background-image: /^url\\("data:image\\/gif;base64.+/)'
                                updateBufferNode(context, tokenValue);
                            } else {
                                // otherwise brackets should be balanced
                                // e.g. 'div:xpath(//h3[contains(text(),"Share it!")]/..)'
                                context.extendedPseudoBracketsStack.push(tokenValue);
                                // eslint-disable-next-line max-len
                                if (context.extendedPseudoBracketsStack.length > context.extendedPseudoNamesStack.length) {
                                    updateBufferNode(context, tokenValue);
                                }
                            }
                        }
                        if (bufferNode?.type === NodeType.RegularSelector) {
                            // continue RegularSelector value collecting for standard pseudo-classes
                            // e.g. '.banner:where(div)'
                            if (context.standardPseudoNamesStack.length > 0) {
                                updateBufferNode(context, tokenValue);
                                context.standardPseudoBracketsStack.push(tokenValue);
                            }
                            // parentheses inside attribute value should be part of RegularSelector value
                            // e.g. 'div:not([href*="window.print()"])'   <-- parser position
                            // is on the `(` after `print`       ↑
                            if (context.isAttributeBracketsOpen) {
                                updateBufferNode(context, tokenValue);
                            }
                        }
                        if (bufferNode?.type === NodeType.RelativePseudoClass) {
                            // save opening bracket for balancing
                            // e.g. 'div:not()'  // position is on `(`
                            context.extendedPseudoBracketsStack.push(tokenValue);
                        }
                        break;
                    case BRACKETS.PARENTHESES.RIGHT:
                        if (bufferNode?.type === NodeType.AbsolutePseudoClass) {
                            // no brackets balancing needed inside
                            // 1. :xpath() extended pseudo-class arg
                            // 2. regexp arg for other extended pseudo-classes
                            if (bufferNode.name !== XPATH_PSEUDO_CLASS_MARKER && context.isRegexpOpen) {
                                // if closing bracket is part of regexp
                                // simply save it to pseudo-class arg
                                updateBufferNode(context, tokenValue);
                            } else {
                                // remove stacked open parentheses for brackets balance
                                // e.g. 'h3:contains((Ads))'
                                // or   'div:xpath(//h3[contains(text(),"Share it!")]/..)'
                                context.extendedPseudoBracketsStack.pop();
                                if (bufferNode.name !== XPATH_PSEUDO_CLASS_MARKER) {
                                    // for all other absolute pseudo-classes except :xpath()
                                    // remove stacked name of extended pseudo-class
                                    context.extendedPseudoNamesStack.pop();
                                    if (context.extendedPseudoBracketsStack.length > context.extendedPseudoNamesStack.length) { // eslint-disable-line max-len
                                        // if brackets stack is not empty yet,
                                        // save tokenValue to arg of AbsolutePseudoClass
                                        // parser position on first closing bracket after 'Ads':
                                        // e.g. 'h3:contains((Ads))'
                                        updateBufferNode(context, tokenValue);
                                    } else if (context.extendedPseudoBracketsStack.length >= 0
                                            && context.extendedPseudoNamesStack.length >= 0) {
                                        // assume it is combined extended pseudo-classes
                                        // parser position on first closing bracket after 'advert':
                                        // e.g. 'div:has(.banner, :contains(advert))'
                                        upToClosest(context, NodeType.Selector);
                                    }
                                } else {
                                    // for :xpath()
                                    if (context.extendedPseudoBracketsStack.length < context.extendedPseudoNamesStack.length) { // eslint-disable-line max-len
                                        // remove stacked name of extended pseudo-class
                                        // if there are less brackets than pseudo-class names
                                        // with means last removes bracket was closing for pseudo-class
                                        context.extendedPseudoNamesStack.pop();
                                    } else {
                                        // otherwise the bracket is part of arg
                                        updateBufferNode(context, tokenValue);
                                    }
                                }
                            }
                        }
                        if (bufferNode?.type === NodeType.RegularSelector) {
                            if (context.isAttributeBracketsOpen) {
                                // parentheses inside attribute value should be part of RegularSelector value
                                // e.g. 'div:not([href*="window.print()"])'   <-- parser position
                                // is on the `)` after `print(`       ↑
                                updateBufferNode(context, tokenValue);
                            } else if (context.standardPseudoNamesStack.length > 0
                                && context.standardPseudoBracketsStack.length > 0) {
                                // standard pseudo-class was processing.
                                // collect the closing bracket to value of RegularSelector
                                // parser position is on bracket after 'class' now:
                                // e.g. 'div:where(.class)'
                                updateBufferNode(context, tokenValue);
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
                                    && nextToNextTokenValue
                                    && HAS_PSEUDO_CLASS_MARKERS.includes(nextToNextTokenValue)) {
                                    // eslint-disable-next-line max-len
                                    throw new Error(`Usage of :${nextToNextTokenValue}() pseudo-class is not allowed after any regular pseudo-element: '${lastStandardPseudo}'`);
                                }
                            } else {
                                // extended pseudo-class was processing.
                                // e.g. 'div:has(h3)'
                                // remove bracket and pseudo name from stacks
                                context.extendedPseudoBracketsStack.pop();
                                context.extendedPseudoNamesStack.pop();
                                upToClosest(context, NodeType.ExtendedSelector);
                                // go to upper selector for possible selector continuation after extended pseudo-class
                                // e.g. 'div:has(h3) > img'
                                upToClosest(context, NodeType.Selector);
                            }
                        }
                        if (bufferNode?.type === NodeType.Selector) {
                            // after inner extended pseudo-class bufferNode is Selector.
                            // parser position is on last bracket now:
                            // e.g. 'div:has(.banner, :contains(ads))'
                            context.extendedPseudoBracketsStack.pop();
                            context.extendedPseudoNamesStack.pop();
                            upToClosest(context, NodeType.ExtendedSelector);
                            upToClosest(context, NodeType.Selector);
                        }
                        if (bufferNode?.type === NodeType.RelativePseudoClass) {
                            // save opening bracket for balancing
                            // e.g. 'div:not()'  // position is on `)`
                            // context.extendedPseudoBracketsStack.push(tokenValue);
                            if (context.extendedPseudoNamesStack.length > 0
                                && context.extendedPseudoBracketsStack.length > 0) {
                                context.extendedPseudoBracketsStack.pop();
                                context.extendedPseudoNamesStack.pop();
                            }
                        }
                        break;
                    case TAB:
                    case LINE_FEED:
                    case FORM_FEED:
                    case CARRIAGE_RETURN:
                        // such characters at start and end of selector should be trimmed
                        // so is there is one them among tokens, it is not valid selector
                        throw new Error(`'${selector}' is not a valid selector.`);
                }
                break;
                // no default statement for Marks as they are limited to SUPPORTED_SELECTOR_MARKS
                // and all other symbol combinations are tokenized as Word
                // so error for invalid Word will be thrown later while element selecting by parsed ast
            default:
                throw new Error(`Unknown type of token: '${tokenValue}'.`);
        }

        i += 1;
    }

    if (context.ast === null) {
        throw new Error(`'${selector}' is not a valid selector`);
    }

    if (context.extendedPseudoNamesStack.length > 0
        || context.extendedPseudoBracketsStack.length > 0) {
        // eslint-disable-next-line max-len
        throw new Error(`Unbalanced brackets for extended pseudo-class: '${getLast(context.extendedPseudoNamesStack)}'`);
    }

    if (context.isAttributeBracketsOpen) {
        throw new Error(`Unbalanced brackets for attributes is selector: '${selector}'`);
    }

    return context.ast;
};
