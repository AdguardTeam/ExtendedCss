export enum NodeTypes {
    SelectorList = 'SelectorList',
    Selector = 'Selector',
    RegularSelector = 'RegularSelector',
    ExtendedSelector = 'ExtendedSelector',
    AbsolutePseudoClass = 'AbsolutePseudoClass',
    RelativePseudoClass = 'RelativePseudoClass',
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
export const regularSelectorNode = (value) => {
    return {
        type: NodeTypes.RegularSelector,
        value,
    };
};

/**
 * Extended selector node
 *
 * ExtendedSelector
 *   : AbsolutePseudoClass
 *   | RelativePseudoClass
 *   ;
 */
export const extendedSelectorNode = () => {
    return {
        type: NodeTypes.ExtendedSelector,
        children: [],
    };
};

/**
 * Absolute extended pseudo-class node
 * i.e. none-selector args
 *
 * AbsolutePseudoClass
 *   : type
 *   : name
 *   : arg
 *   ;
 */
export const absolutePseudoClassNode = (name) => {
    return {
        type: NodeTypes.AbsolutePseudoClass,
        name,
        // init with no arg value, update it while tokens iterating
        arg: '',
    };
};

/**
 * Relative extended pseudo-class node
 * i.e. selector as arg
 *
 * RelativePseudoClass
 *   : type
 *   : name
 *   : SelectorList
 *   ;
 */
 export const relativePseudoClassNode = (name) => {
    return {
        type: NodeTypes.RelativePseudoClass,
        name,
        children: [],
    };
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
