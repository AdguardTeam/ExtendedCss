export enum NodeTypes {
    SelectorList = 'SelectorList',
    Selector = 'Selector',
    RegularSelector = 'RegularSelector',
    ExtendedSelector = 'ExtendedSelector',
    ExtendedPseudo = 'ExtendedPseudoSelector',
    PseudoClass = 'PseudoClassSelector',
};

/**
 * Root node
 *
 * SelectorList
 *   : Selector
 *     ...
 *   ;
 */
export const selectorListNode = () => {
    return {
        type: NodeTypes.SelectorList,
        children: [],
    };
};

/**
 * Selector node
 *
 * Selector
 *   : RegularSelector
 *   | ExtendedSelector
 *     ...
 *   ;
 */
export const selectorNode = () => {
    return {
        type: NodeTypes.Selector,
        children: [],
    };
};

/**
 * Regular selector node;
 * it can be selected by querySelectorAll()
 *
 * RegularSelector
 *   : type
 *   : value
 *   ;
 */
export const regSelectorNode = (value) => {
    return {
        type: NodeTypes.RegularSelector,
        value,
    };
};

/**
 * Extended selector node
 *
 * ExtendedSelector
 *   : RegularSelector
 *   : ExtendedPseudoSelector
 *   ;
 */
export const extSelectorNode = () => {
    return {
        type: NodeTypes.ExtendedSelector,
        children: [],
    };
};

/**
 * Extended pseudo node;
 * may contain another pseudo-class
 *
 * ExtendedPseudoSelector
 *   : PseudoClassSelector
 *   : SelectorList
 *   ;
 */
export const extPseudoNode = () => {
    return {
        type: NodeTypes.ExtendedPseudo,
        children: [],
    };
};

/**
 * Extended pseudo node
 *
 * PseudoClassSelector
 *   : type
 *   : value
 *   ;
 */
export const pseudoClassNode = (value) => {
    return {
        type: NodeTypes.PseudoClass,
        value,
    };
};

/**
 * Only RegularSelector and PseudoClassSelector can have value
 * @param {string} type
 * @param {string} value
 * @returns {Object}
 */
export const getNodeWithValue = (type, value) => {
    switch (type) {
        case NodeTypes.RegularSelector:
            return regSelectorNode(value);
        case NodeTypes.PseudoClass:
            return pseudoClassNode(value);
    }
};

//
//  ast example
//
//  div.banner > div:has(span, p), a img.ad
//
//  SelectorList - div.banner > div:has(span, p), a img.ad
//      Selector - div.banner > div:has(span, p)
//          RegularSelector - div.banner > div
//          ExtendedSelector - :has(span, p)
//              PseudoClassSelector - :has
//              SelectorList - span, p
//                  Selector - span
//                      RegularSelector - span
//                  Selector - p
//                      RegularSelector - p
//      Selector - a img.ad
//          RegularSelector - a img.ad
//
