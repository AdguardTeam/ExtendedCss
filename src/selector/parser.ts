import { tokenizeSelector } from './tokenizer';
import { NODE, AnySelectorNodeInterface } from './nodes';

import { Context } from './utils/parser-types';
import {
    isSelectorListNode,
    isSelectorNode,
    isRegularSelectorNode,
    isExtendedSelectorNode,
    isAbsolutePseudoClassNode,
    isRelativePseudoClassNode,
    getNodeName,
    getNodeValue,
} from './utils/ast-node-helpers';
import {
    doesRegularContinueAfterSpace,
    isRegexpOpening,
    isAttributeOpening,
    isAttributeClosing,
    isSupportedPseudoClass,
    isOptimizationPseudoClass,
    isWhiteSpaceChar,
} from './utils/parser-predicates';
import { isAbsolutePseudoClass } from './utils/common-predicates';
import {
    initAst,
    addAstNodeByType,
    updateBufferNode,
    getBufferNode,
    getUpdatedBufferNode,
    initRelativeSubtree,
    upToClosest,
    getContextLastRegularSelectorNode,
    handleNextTokenOnColon,
} from './utils/parser-ast-node-helpers';
import { optimizeAst } from './utils/parser-ast-optimizer';

import { TOKEN_TYPE } from '../common/tokenizer';

import { getLast } from '../common/utils/arrays';

import {
    BRACKET,
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
    SUPPORTED_PSEUDO_CLASSES,
    XPATH_PSEUDO_CLASS_MARKER,
    HAS_PSEUDO_CLASS_MARKERS,
    REMOVE_PSEUDO_MARKER,
    REGULAR_PSEUDO_ELEMENTS,
    UPWARD_PSEUDO_CLASS_MARKER,
    NTH_ANCESTOR_PSEUDO_CLASS_MARKER,
    NO_SELECTOR_ERROR_PREFIX,
    REMOVE_ERROR_PREFIX,
} from '../common/constants';

// limit applying of :xpath() pseudo-class to 'any' element
// https://github.com/AdguardTeam/ExtendedCss/issues/115
const XPATH_PSEUDO_SELECTING_ROOT = 'body';

const NO_WHITESPACE_ERROR_PREFIX = 'No white space is allowed before or after extended pseudo-class name in selector';

/**
 * Parses selector into ast for following element selection.
 *
 * @param selector Selector to parse.
 *
 * @returns Parsed ast.
 * @throws An error on invalid selector.
 */
export const parse = (selector: string): AnySelectorNodeInterface => {
    const tokens = tokenizeSelector(selector);

    const context: Context = {
        ast: null,
        pathToBufferNode: [],
        extendedPseudoNamesStack: [],
        extendedPseudoBracketsStack: [],
        standardPseudoNamesStack: [],
        standardPseudoBracketsStack: [],
        isAttributeBracketsOpen: false,
        attributeBuffer: '',
        isRegexpOpen: false,
        shouldOptimize: false,
    };

    let i = 0;
    while (i < tokens.length) {
        const token = tokens[i];
        if (!token) {
            break;
        }
        // Token to process
        const { type: tokenType, value: tokenValue } = token;

        // needed for SPACE and COLON tokens checking
        const nextToken = tokens[i + 1];
        const nextTokenType = nextToken?.type;
        const nextTokenValue = nextToken?.value;

        // needed for limitations
        // - :not() and :is() root element
        // - :has() usage
        // - white space before and after pseudo-class name
        const nextToNextToken = tokens[i + 2];
        const nextToNextTokenValue = nextToNextToken?.value;

        // needed for COLON token checking for none-specified regular selector before extended one
        // e.g. 'p, :hover'
        // or   '.banner, :contains(ads)'
        const previousToken = tokens[i - 1];
        const prevTokenType = previousToken?.type;
        const prevTokenValue = previousToken?.value;

        // needed for proper parsing of regexp pattern arg
        // e.g. ':matches-css(background-image: /^url\(https:\/\/example\.org\//)'
        const previousToPreviousToken = tokens[i - 2];
        const prevToPrevTokenValue = previousToPreviousToken?.value;

        let bufferNode = getBufferNode(context);

        switch (tokenType) {
            case TOKEN_TYPE.WORD:
                if (bufferNode === null) {
                    // there is no buffer node only in one case — no ast collecting has been started
                    initAst(context, tokenValue);
                } else if (isSelectorListNode(bufferNode)) {
                    // add new selector to selector list
                    addAstNodeByType(context, NODE.SELECTOR);
                    addAstNodeByType(context, NODE.REGULAR_SELECTOR, tokenValue);
                } else if (isRegularSelectorNode(bufferNode)) {
                    updateBufferNode(context, tokenValue);
                } else if (isExtendedSelectorNode(bufferNode)) {
                    // No white space is allowed between the name of extended pseudo-class
                    // and its opening parenthesis
                    // https://www.w3.org/TR/selectors-4/#pseudo-classes
                    // e.g. 'span:contains (text)'
                    if (isWhiteSpaceChar(nextTokenValue)
                        && nextToNextTokenValue === BRACKET.PARENTHESES.LEFT) {
                        throw new Error(`${NO_WHITESPACE_ERROR_PREFIX}: '${selector}'`);
                    }
                    const lowerCaseTokenValue = tokenValue.toLowerCase();
                    // save pseudo-class name for brackets balance checking
                    context.extendedPseudoNamesStack.push(lowerCaseTokenValue);
                    // extended pseudo-class name are parsed in lower case
                    // as they should be case-insensitive
                    // https://www.w3.org/TR/selectors-4/#pseudo-classes
                    if (isAbsolutePseudoClass(lowerCaseTokenValue)) {
                        addAstNodeByType(context, NODE.ABSOLUTE_PSEUDO_CLASS, lowerCaseTokenValue);
                    } else {
                        // if it is not absolute pseudo-class, it must be relative one
                        // add RelativePseudoClass with tokenValue as pseudo-class name to ExtendedSelector children
                        addAstNodeByType(context, NODE.RELATIVE_PSEUDO_CLASS, lowerCaseTokenValue);
                        // for :not() and :is() pseudo-classes parsed ast should be optimized later
                        if (isOptimizationPseudoClass(lowerCaseTokenValue)) {
                            context.shouldOptimize = true;
                        }
                    }
                } else if (isAbsolutePseudoClassNode(bufferNode)) {
                    // collect absolute pseudo-class arg
                    updateBufferNode(context, tokenValue);
                } else if (isRelativePseudoClassNode(bufferNode)) {
                    initRelativeSubtree(context, tokenValue);
                }
                break;
            case TOKEN_TYPE.MARK:
                switch (tokenValue) {
                    case COMMA:
                        if (!bufferNode || (typeof bufferNode !== 'undefined' && !nextTokenValue)) {
                            // consider the selector is invalid if there is no bufferNode yet (e.g. ', a')
                            // or there is nothing after the comma while bufferNode is defined (e.g. 'div, ')
                            throw new Error(`'${selector}' is not a valid selector`);
                        } else if (isRegularSelectorNode(bufferNode)) {
                            if (context.isAttributeBracketsOpen) {
                                // the comma might be inside element attribute value
                                // e.g. 'div[data-comma="0,1"]'
                                updateBufferNode(context, tokenValue);
                            } else {
                                // new Selector should be collected to upper SelectorList
                                upToClosest(context, NODE.SELECTOR_LIST);
                            }
                        } else if (isAbsolutePseudoClassNode(bufferNode)) {
                            // the comma inside arg of absolute extended pseudo
                            // e.g. 'div:xpath(//h3[contains(text(),"Share it!")]/..)'
                            updateBufferNode(context, tokenValue);
                        } else if (isSelectorNode(bufferNode)) {
                            // new Selector should be collected to upper SelectorList
                            // if parser position is on Selector node
                            upToClosest(context, NODE.SELECTOR_LIST);
                        }
                        break;
                    case SPACE:
                        // it might be complex selector with extended pseudo-class inside it
                        // and the space is between that complex selector and following regular selector
                        // parser position is on ` ` before `span` now:
                        // e.g. 'div:has(img).banner span'
                        // so we need to check whether the new ast node should be added (example above)
                        // or previous regular selector node should be updated
                        if (isRegularSelectorNode(bufferNode)
                            // no need to update the buffer node if attribute value is being parsed
                            // e.g. 'div:not([id])[style="position: absolute; z-index: 10000;"]'
                            // parser position inside attribute    ↑
                            && !context.isAttributeBracketsOpen) {
                            bufferNode = getUpdatedBufferNode(context);
                        }
                        if (isRegularSelectorNode(bufferNode)) {
                            // standard selectors with white space between colon and name of pseudo
                            // are invalid for native document.querySelectorAll() anyway,
                            // so throwing the error here is better
                            // than proper parsing of invalid selector and passing it further.
                            // first of all do not check attributes
                            // e.g. div[style="text-align: center"]
                            if (!context.isAttributeBracketsOpen
                                // check the space after the colon and before the pseudo
                                // e.g. '.block: nth-child(2)
                                && ((prevTokenValue === COLON && nextTokenType === TOKEN_TYPE.WORD)
                                    // or after the pseudo and before the opening parenthesis
                                    // e.g. '.block:nth-child (2)
                                    || (prevTokenType === TOKEN_TYPE.WORD
                                        && nextTokenValue === BRACKET.PARENTHESES.LEFT))
                            ) {
                                throw new Error(`'${selector}' is not a valid selector`);
                            }
                            // collect current tokenValue to value of RegularSelector
                            // if it is the last token or standard selector continues after the space.
                            // otherwise it will be skipped
                            if (!nextTokenValue
                                || doesRegularContinueAfterSpace(nextTokenType, nextTokenValue)
                                // we also should collect space inside attribute value
                                // e.g. `[onclick^="window.open ('https://example.com/share?url="]`
                                // parser position             ↑
                                || context.isAttributeBracketsOpen) {
                                updateBufferNode(context, tokenValue);
                            }
                        }
                        if (isAbsolutePseudoClassNode(bufferNode)) {
                            // space inside extended pseudo-class arg
                            // e.g. 'span:contains(some text)'
                            updateBufferNode(context, tokenValue);
                        }
                        if (isRelativePseudoClassNode(bufferNode)) {
                            // init with empty value RegularSelector
                            // as the space is not needed for selector value
                            // e.g. 'p:not( .content )'
                            initRelativeSubtree(context);
                        }
                        if (isSelectorNode(bufferNode)) {
                            // do NOT add RegularSelector if parser position on space BEFORE the comma in selector list
                            // e.g. '.block:has(> img) , .banner)'
                            if (doesRegularContinueAfterSpace(nextTokenType, nextTokenValue)) {
                                // regular selector might be after the extended one.
                                // extra space before combinator or selector should not be collected
                                // e.g. '.banner:upward(2) .block'
                                //      '.banner:upward(2) > .block'
                                // so no tokenValue passed to addAnySelectorNode()
                                addAstNodeByType(context, NODE.REGULAR_SELECTOR);
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
                    case BRACKET.CURLY.LEFT:
                    case BRACKET.CURLY.RIGHT:
                    case ASTERISK:
                    case ID_MARKER:
                    case CLASS_MARKER:
                    case BRACKET.SQUARE.LEFT:
                        // it might be complex selector with extended pseudo-class inside it
                        // and the space is between that complex selector and following regular selector
                        // e.g. 'div:has(img).banner'   // parser position is on `.` before `banner` now
                        //      'div:has(img)[attr]'    // parser position is on `[` before `attr` now
                        // so we need to check whether the new ast node should be added (example above)
                        // or previous regular selector node should be updated
                        if (COMBINATORS.includes(tokenValue)) {
                            if (bufferNode === null) {
                                // cases where combinator at very beginning of a selector
                                // e.g. '> div'
                                // or   '~ .banner'
                                // or even '+js(overlay-buster)' which not a selector at all
                                // but may be validated by FilterCompiler so error message should be appropriate
                                throw new Error(`'${selector}' is not a valid selector`);
                            }
                            bufferNode = getUpdatedBufferNode(context);
                        }
                        if (bufferNode === null) {
                            // no ast collecting has been started
                            // e.g. '.banner > p'
                            // or   '#top > div.ad'
                            // or   '[class][style][attr]'
                            // or   '*:not(span)'
                            initAst(context, tokenValue);
                            if (isAttributeOpening(tokenValue, prevTokenValue)) {
                                // e.g. '[class^="banner-"]'
                                context.isAttributeBracketsOpen = true;
                            }
                        } else if (isRegularSelectorNode(bufferNode)) {
                            if (
                                tokenValue === BRACKET.CURLY.LEFT
                                && !(context.isAttributeBracketsOpen || context.isRegexpOpen)
                            ) {
                                // e.g. 'div { content: "'
                                throw new Error(`'${selector}' is not a valid selector`);
                            }
                            // collect the mark to the value of RegularSelector node
                            updateBufferNode(context, tokenValue);
                            if (isAttributeOpening(tokenValue, prevTokenValue)) {
                                // needed for proper handling element attribute value with comma
                                // e.g. 'div[data-comma="0,1"]'
                                context.isAttributeBracketsOpen = true;
                            }
                        } else if (isAbsolutePseudoClassNode(bufferNode)) {
                            // collect the mark to the arg of AbsolutePseudoClass node
                            updateBufferNode(context, tokenValue);
                            // 'isRegexpOpen' flag is needed for brackets balancing inside extended pseudo-class arg
                            if (tokenValue === SLASH
                                && context.extendedPseudoNamesStack.length > 0) {
                                if (prevTokenValue === SLASH
                                    && prevToPrevTokenValue === BACKSLASH) {
                                    // it may be specific url regexp pattern in arg of pseudo-class
                                    // e.g. ':matches-css(background-image: /^url\(https:\/\/example\.org\//)'
                                    // parser position is on final slash before `)`                        ↑
                                    context.isRegexpOpen = false;
                                } else if (prevTokenValue && prevTokenValue !== BACKSLASH) {
                                    if (isRegexpOpening(context, prevTokenValue, getNodeValue(bufferNode))) {
                                        context.isRegexpOpen = !context.isRegexpOpen;
                                    } else {
                                        // otherwise force `isRegexpOpen` flag to `false`
                                        context.isRegexpOpen = false;
                                    }
                                }
                            }
                        } else if (isRelativePseudoClassNode(bufferNode)) {
                            // add SelectorList to children of RelativePseudoClass node
                            initRelativeSubtree(context, tokenValue);
                            if (isAttributeOpening(tokenValue, prevTokenValue)) {
                                // besides of creating the relative subtree
                                // opening square bracket means start of attribute
                                // e.g. 'div:not([class="content"])'
                                //      'div:not([href*="window.print()"])'
                                context.isAttributeBracketsOpen = true;
                            }
                        } else if (isSelectorNode(bufferNode)) {
                            // after the extended pseudo closing parentheses
                            // parser position is on Selector node
                            // and regular selector can be after the extended one
                            // e.g. '.banner:upward(2)> .block'
                            // or   '.inner:nth-ancestor(1)~ .banner'
                            if (COMBINATORS.includes(tokenValue)) {
                                addAstNodeByType(context, NODE.REGULAR_SELECTOR, tokenValue);
                            } else if (!context.isRegexpOpen) {
                                // it might be complex selector with extended pseudo-class inside it.
                                // parser position is on `.` now:
                                // e.g. 'div:has(img).banner'
                                // so we need to get last regular selector node and update its value
                                bufferNode = getContextLastRegularSelectorNode(context);
                                updateBufferNode(context, tokenValue);
                                if (isAttributeOpening(tokenValue, prevTokenValue)) {
                                    // handle attribute in compound selector after extended pseudo-class
                                    // e.g. 'div:not(.top)[style="z-index: 10000;"]'
                                    // parser position    ↑
                                    context.isAttributeBracketsOpen = true;
                                }
                            }
                        } else if (isSelectorListNode(bufferNode)) {
                            // add Selector to SelectorList
                            addAstNodeByType(context, NODE.SELECTOR);
                            // and RegularSelector as it is always the first child of Selector
                            addAstNodeByType(context, NODE.REGULAR_SELECTOR, tokenValue);
                            if (isAttributeOpening(tokenValue, prevTokenValue)) {
                                // handle simple attribute selector in selector list
                                // e.g. '.banner, [class^="ad-"]'
                                context.isAttributeBracketsOpen = true;
                            }
                        }
                        break;
                    case BRACKET.SQUARE.RIGHT:
                        if (isRegularSelectorNode(bufferNode)) {
                            // unescaped `]` in regular selector allowed only inside attribute value
                            if (!context.isAttributeBracketsOpen
                                && prevTokenValue !== BACKSLASH) {
                                // e.g. 'div]'
                                // eslint-disable-next-line max-len
                                throw new Error(`'${selector}' is not a valid selector due to '${tokenValue}' after '${getNodeValue(bufferNode)}'`);
                            }
                            // needed for proper parsing regular selectors after the attributes with comma
                            // e.g. 'div[data-comma="0,1"] > img'
                            if (isAttributeClosing(context)) {
                                context.isAttributeBracketsOpen = false;
                                // reset attribute buffer on closing `]`
                                context.attributeBuffer = '';
                            }
                            // collect the bracket to the value of RegularSelector node
                            updateBufferNode(context, tokenValue);
                        }
                        if (isAbsolutePseudoClassNode(bufferNode)) {
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
                        if (isWhiteSpaceChar(nextTokenValue)
                            && nextToNextTokenValue
                            && SUPPORTED_PSEUDO_CLASSES.includes(nextToNextTokenValue)) {
                            throw new Error(`${NO_WHITESPACE_ERROR_PREFIX}: '${selector}'`);
                        }
                        if (bufferNode === null) {
                            // no ast collecting has been started
                            if (nextTokenValue === XPATH_PSEUDO_CLASS_MARKER) {
                                // limit applying of "naked" :xpath pseudo-class
                                // https://github.com/AdguardTeam/ExtendedCss/issues/115
                                initAst(context, XPATH_PSEUDO_SELECTING_ROOT);
                            } else if (nextTokenValue === UPWARD_PSEUDO_CLASS_MARKER
                                || nextTokenValue === NTH_ANCESTOR_PSEUDO_CLASS_MARKER) {
                                // selector should be specified before :nth-ancestor() or :upward()
                                // e.g. ':nth-ancestor(3)'
                                // or   ':upward(span)'
                                throw new Error(`${NO_SELECTOR_ERROR_PREFIX} before :${nextTokenValue}() pseudo-class`);
                            } else {
                                // make it more obvious if selector starts with pseudo with no tag specified
                                // e.g. ':has(a)' -> '*:has(a)'
                                // or   ':empty'  -> '*:empty'
                                initAst(context, ASTERISK);
                            }

                            // bufferNode should be updated for following checking
                            bufferNode = getBufferNode(context);
                        }

                        if (isSelectorListNode(bufferNode)) {
                            // bufferNode is SelectorList after comma has been parsed.
                            // parser position is on colon now:
                            // e.g. 'img,:not(.content)'
                            addAstNodeByType(context, NODE.SELECTOR);
                            // add empty value RegularSelector anyway as any selector should start with it
                            // and check previous token on the next step
                            addAstNodeByType(context, NODE.REGULAR_SELECTOR);
                            // bufferNode should be updated for following checking
                            bufferNode = getBufferNode(context);
                        }
                        if (isRegularSelectorNode(bufferNode)) {
                            // it can be extended or standard pseudo
                            // e.g. '#share, :contains(share it)'
                            // or   'div,:hover'
                            // of   'div:has(+:contains(text))'  // position is after '+'
                            if ((prevTokenValue
                                && COMBINATORS.includes(prevTokenValue))
                                    || prevTokenValue === COMMA) {
                                // case with colon at the start of string - e.g. ':contains(text)'
                                // is covered by 'bufferNode === null' above at start of COLON checking
                                updateBufferNode(context, ASTERISK);
                            }
                            handleNextTokenOnColon(context, selector, tokenValue, nextTokenValue, nextToNextTokenValue);
                        }
                        if (isSelectorNode(bufferNode)) {
                            // e.g. 'div:contains(text):'
                            if (!nextTokenValue) {
                                throw new Error(`Invalid colon ':' at the end of selector: '${selector}'`);
                            }
                            // after the extended pseudo closing parentheses
                            // parser position is on Selector node
                            // and there is might be another extended selector.
                            // parser position is on colon before 'upward':
                            // e.g. 'p:contains(PR):upward(2)'
                            if (isSupportedPseudoClass(nextTokenValue.toLowerCase())) {
                                // if supported extended pseudo-class is next to colon
                                // add ExtendedSelector to Selector children
                                addAstNodeByType(context, NODE.EXTENDED_SELECTOR);
                            } else if (nextTokenValue.toLowerCase() === REMOVE_PSEUDO_MARKER) {
                                // :remove() pseudo-class should be handled before
                                // as it is not about element selecting but actions with elements
                                // e.g. '#banner:upward(2):remove()'
                                throw new Error(`${REMOVE_ERROR_PREFIX.INVALID_REMOVE}: '${selector}'`);
                            } else {
                                // otherwise it is standard pseudo after extended pseudo-class in complex selector
                                // and colon should be collected to value of previous RegularSelector
                                // e.g. 'body *:not(input)::selection'
                                //      'input:matches-css(padding: 10):checked'
                                bufferNode = getContextLastRegularSelectorNode(context);
                                handleNextTokenOnColon(
                                    context,
                                    selector,
                                    tokenValue,
                                    nextTokenType,
                                    nextToNextTokenValue,
                                );
                            }
                        }
                        if (isAbsolutePseudoClassNode(bufferNode)) {
                            // :xpath() pseudo-class should be the last of extended pseudo-classes
                            if (getNodeName(bufferNode) === XPATH_PSEUDO_CLASS_MARKER
                                && nextTokenValue
                                && SUPPORTED_PSEUDO_CLASSES.includes(nextTokenValue)
                                && nextToNextTokenValue === BRACKET.PARENTHESES.LEFT) {
                                throw new Error(`:xpath() pseudo-class should be the last in selector: '${selector}'`);
                            }
                            // collecting arg for absolute pseudo-class
                            // e.g. 'div:matches-css(width:400px)'
                            updateBufferNode(context, tokenValue);
                        }
                        if (isRelativePseudoClassNode(bufferNode)) {
                            if (!nextTokenValue) {
                                // e.g. 'div:has(:'
                                throw new Error(`Invalid pseudo-class arg at the end of selector: '${selector}'`);
                            }
                            // make it more obvious if selector starts with pseudo with no tag specified
                            // parser position is on colon inside :has() arg
                            // e.g. 'div:has(:contains(text))'
                            // or   'div:not(:empty)'
                            initRelativeSubtree(context, ASTERISK);
                            if (!isSupportedPseudoClass(nextTokenValue.toLowerCase())) {
                                // collect the colon to value of RegularSelector
                                // e.g. 'div:not(:empty)'
                                updateBufferNode(context, tokenValue);
                                // parentheses should be balanced only for functional pseudo-classes
                                // e.g. '.yellow:not(:nth-child(3))'
                                if (nextToNextTokenValue === BRACKET.PARENTHESES.LEFT) {
                                    context.standardPseudoNamesStack.push(nextTokenValue);
                                }
                            } else {
                                // add ExtendedSelector to Selector children
                                // e.g. 'div:has(:contains(text))'
                                upToClosest(context, NODE.SELECTOR);
                                addAstNodeByType(context, NODE.EXTENDED_SELECTOR);
                            }
                        }
                        break;
                    case BRACKET.PARENTHESES.LEFT:
                        // start of pseudo-class arg
                        if (isAbsolutePseudoClassNode(bufferNode)) {
                            // no brackets balancing needed inside
                            // 1. :xpath() extended pseudo-class arg
                            // 2. regexp arg for other extended pseudo-classes
                            if (getNodeName(bufferNode) !== XPATH_PSEUDO_CLASS_MARKER && context.isRegexpOpen) {
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
                        if (isRegularSelectorNode(bufferNode)) {
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
                        if (isRelativePseudoClassNode(bufferNode)) {
                            // save opening bracket for balancing
                            // e.g. 'div:not()'  // position is on `(`
                            context.extendedPseudoBracketsStack.push(tokenValue);
                        }
                        break;
                    case BRACKET.PARENTHESES.RIGHT:
                        if (isAbsolutePseudoClassNode(bufferNode)) {
                            // no brackets balancing needed inside
                            // 1. :xpath() extended pseudo-class arg
                            // 2. regexp arg for other extended pseudo-classes
                            if (getNodeName(bufferNode) !== XPATH_PSEUDO_CLASS_MARKER && context.isRegexpOpen) {
                                // if closing bracket is part of regexp
                                // simply save it to pseudo-class arg
                                updateBufferNode(context, tokenValue);
                            } else {
                                // remove stacked open parentheses for brackets balance
                                // e.g. 'h3:contains((Ads))'
                                // or   'div:xpath(//h3[contains(text(),"Share it!")]/..)'
                                context.extendedPseudoBracketsStack.pop();
                                if (getNodeName(bufferNode) !== XPATH_PSEUDO_CLASS_MARKER) {
                                    // for all other absolute pseudo-classes except :xpath()
                                    // remove stacked name of extended pseudo-class
                                    context.extendedPseudoNamesStack.pop();
                                    // eslint-disable-next-line max-len
                                    if (context.extendedPseudoBracketsStack.length > context.extendedPseudoNamesStack.length) {
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
                                        upToClosest(context, NODE.SELECTOR);
                                    }
                                } else {
                                    // for :xpath()
                                    // eslint-disable-next-line max-len
                                    if (context.extendedPseudoBracketsStack.length < context.extendedPseudoNamesStack.length) {
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
                        if (isRegularSelectorNode(bufferNode)) {
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
                                upToClosest(context, NODE.EXTENDED_SELECTOR);
                                // go to upper selector for possible selector continuation after extended pseudo-class
                                // e.g. 'div:has(h3) > img'
                                upToClosest(context, NODE.SELECTOR);
                            }
                        }
                        if (isSelectorNode(bufferNode)) {
                            // after inner extended pseudo-class bufferNode is Selector.
                            // parser position is on last bracket now:
                            // e.g. 'div:has(.banner, :contains(ads))'
                            context.extendedPseudoBracketsStack.pop();
                            context.extendedPseudoNamesStack.pop();
                            upToClosest(context, NODE.EXTENDED_SELECTOR);
                            upToClosest(context, NODE.SELECTOR);
                        }
                        if (isRelativePseudoClassNode(bufferNode)) {
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
                    case LINE_FEED:
                    case FORM_FEED:
                    case CARRIAGE_RETURN:
                        // such characters at start and end of selector should be trimmed
                        // so is there is one them among tokens, it is not valid selector
                        throw new Error(`'${selector}' is not a valid selector`);
                    case TAB:
                        // allow tab only inside attribute value
                        // as there are such valid rules in filter lists
                        // e.g. 'div[style^="margin-right: auto;	text-align: left;',
                        // parser position                      ↑
                        if (isRegularSelectorNode(bufferNode) && context.isAttributeBracketsOpen) {
                            updateBufferNode(context, tokenValue);
                        } else {
                            // otherwise not valid
                            throw new Error(`'${selector}' is not a valid selector`);
                        }
                }
                break;
                // no default statement for Marks as they are limited to SUPPORTED_SELECTOR_MARKS
                // and all other symbol combinations are tokenized as Word
                // so error for invalid Word will be thrown later while element selecting by parsed ast
            default:
                throw new Error(`Unknown type of token: '${tokenValue}'`);
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
        throw new Error(`Unbalanced attribute brackets in selector: '${selector}'`);
    }

    return context.shouldOptimize
        ? optimizeAst(context.ast)
        : context.ast;
};
