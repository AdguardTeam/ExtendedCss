import { TokenType, tokenizeSelector } from './tokenizer';
import { NodeType, AnySelectorNodeInterface } from './nodes';

import { Context } from './utils/parser-types';
import {
    isSupportedExtendedPseudo,
    doesRegularContinueAfterSpace,
    isRegexpOpening,
    isAttributeOpening,
    isAttributeClosing,
} from './utils/parser-predicate-helpers';
import {
    initAst,
    addAstNodeByType,
    updateBufferNode,
    getBufferNode,
    getUpdatedBufferNode,
    initRelativeSubtree,
    upToClosest,
    getLastRegularSelectorNode,
    handleNextTokenOnColon,
} from './utils/parser-ast-node-helpers';

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
 * Parses selector into ast for following element selection.
 *
 * @param selector Selector to parse.
 *
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
                    if (nextTokenValue
                        && WHITE_SPACE_CHARACTERS.includes(nextTokenValue)
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
                        if (bufferNode?.type === NodeType.RegularSelector
                            // no need to update the buffer node if attribute value is being parsed
                            // e.g. 'div:not([id])[style="position: absolute; z-index: 10000;"]'
                            // parser position inside attribute    ↑
                            && !context.isAttributeBracketsOpen) {
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
                            if (doesRegularContinueAfterSpace(nextTokenType, nextTokenValue)) {
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
                                if (isAttributeOpening(tokenValue, prevTokenValue)) {
                                    // e.g. '[class^="banner-"]'
                                    context.isAttributeBracketsOpen = true;
                                }
                            }
                        } else if (bufferNode.type === NodeType.RegularSelector) {
                            // collect the mark to the value of RegularSelector node
                            updateBufferNode(context, tokenValue);
                            if (isAttributeOpening(tokenValue, prevTokenValue)) {
                                // needed for proper handling element attribute value with comma
                                // e.g. 'div[data-comma="0,1"]'
                                context.isAttributeBracketsOpen = true;
                            }
                        } else if (bufferNode.type === NodeType.AbsolutePseudoClass) {
                            // collect the mark to the arg of AbsolutePseudoClass node
                            updateBufferNode(context, tokenValue);
                            if (!bufferNode.value) {
                                throw new Error('bufferNode should have value by now');
                            }
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
                                    if (isRegexpOpening(context, prevTokenValue, bufferNode.value)) {
                                        context.isRegexpOpen = !context.isRegexpOpen;
                                    } else {
                                        // otherwise force `isRegexpOpen` flag to `false`
                                        context.isRegexpOpen = false;
                                    }
                                }
                            }
                        } else if (bufferNode.type === NodeType.RelativePseudoClass) {
                            // add SelectorList to children of RelativePseudoClass node
                            initRelativeSubtree(context, tokenValue);
                            if (isAttributeOpening(tokenValue, prevTokenValue)) {
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
                                if (isAttributeOpening(tokenValue, prevTokenValue)) {
                                    // handle attribute in compound selector after extended pseudo-class
                                    // e.g. 'div:not(.top)[style="z-index: 10000;"]'
                                    // parser position    ↑
                                    context.isAttributeBracketsOpen = true;
                                }
                            }
                        } else if (bufferNode.type === NodeType.SelectorList) {
                            // add Selector to SelectorList
                            addAstNodeByType(context, NodeType.Selector);
                            // and RegularSelector as it is always the first child of Selector
                            addAstNodeByType(context, NodeType.RegularSelector, tokenValue);
                            if (isAttributeOpening(tokenValue, prevTokenValue)) {
                                // handle simple attribute selector in selector list
                                // e.g. '.banner, [class^="ad-"]'
                                context.isAttributeBracketsOpen = true;
                            }
                        }
                        break;
                    case BRACKETS.SQUARE.RIGHT:
                        if (bufferNode?.type === NodeType.RegularSelector) {
                            // unescaped `]` in regular selector allowed only inside attribute value
                            if (!context.isAttributeBracketsOpen
                                && prevTokenValue !== BACKSLASH) {
                                // e.g. 'div]'
                                throw new Error(`'${selector}' is not a valid selector due to '${tokenValue}' after '${bufferNode.value}'`); // eslint-disable-line max-len
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
                        if (nextTokenValue
                            && WHITE_SPACE_CHARACTERS.includes(nextTokenValue)
                            && nextToNextTokenValue
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
                            if ((prevTokenValue
                                && COMBINATORS.includes(prevTokenValue))
                                    || prevTokenValue === COMMA) {
                                // case with colon at the start of string - e.g. ':contains(text)'
                                // is covered by 'bufferNode === null' above at start of COLON checking
                                updateBufferNode(context, ASTERISK);
                            }
                            handleNextTokenOnColon(context, selector, tokenValue, nextTokenValue, nextToNextTokenValue);
                        }
                        if (bufferNode?.type === NodeType.Selector) {
                            // e.g. 'div:contains(text):'
                            if (!nextTokenValue) {
                                throw new Error(`Invalid colon ':' at the end of selector: '${selector}'`);
                            }
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
                                && nextTokenValue
                                && SUPPORTED_PSEUDO_CLASSES.includes(nextTokenValue)
                                && nextToNextTokenValue === BRACKETS.PARENTHESES.LEFT) {
                                throw new Error(`:xpath() pseudo-class should be at the end of selector: '${selector}'`); // eslint-disable-line max-len
                            }
                            // collecting arg for absolute pseudo-class
                            // e.g. 'div:matches-css(width:400px)'
                            updateBufferNode(context, tokenValue);
                        }
                        if (bufferNode?.type === NodeType.RelativePseudoClass) {
                            if (!nextTokenValue) {
                                // e.g. 'div:has(:'
                                throw new Error(`Invalid pseudo-class arg at the end of selector: '${selector}'`);
                            }
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
                        if (bufferNode?.type === NodeType.RegularSelector
                            && context.isAttributeBracketsOpen) {
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
        throw new Error(`Unbalanced attribute brackets is selector: '${selector}'`);
    }

    return context.ast;
};
