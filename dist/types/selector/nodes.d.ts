export declare enum NodeType {
    SelectorList = "SelectorList",
    Selector = "Selector",
    RegularSelector = "RegularSelector",
    ExtendedSelector = "ExtendedSelector",
    AbsolutePseudoClass = "AbsolutePseudoClass",
    RelativePseudoClass = "RelativePseudoClass"
}
/**
 * Universal interface for all node types
 */
export interface AnySelectorNodeInterface {
    type: string;
    children: AnySelectorNodeInterface[];
    value?: string;
    name?: string;
    arg?: string;
    addChild(child: AnySelectorNodeInterface): void;
}
/**
 * Class needed for creating ast nodes while selector parsing.
 * Used for SelectorList, Selector, ExtendedSelector
 */
export declare class AnySelectorNode implements AnySelectorNodeInterface {
    type: string;
    children: AnySelectorNodeInterface[];
    constructor(type: NodeType);
    /**
     * Adds child node to children array
     */
    addChild(child: AnySelectorNodeInterface): void;
}
/**
 * Class needed for creating ast RegularSelector node while selector parsing
 */
export declare class RegularSelectorNode extends AnySelectorNode {
    value: string;
    constructor(value: string);
}
/**
 * Class needed for creating ast RelativePseudoClass node while selector parsing
 */
export declare class RelativePseudoClassNode extends AnySelectorNode {
    name: string;
    constructor(name: string);
}
/**
 * Class needed for creating ast AbsolutePseudoClass node while selector parsing
 */
export declare class AbsolutePseudoClassNode extends AnySelectorNode {
    name: string;
    arg: string;
    constructor(name: string);
}
/**
 * Root node
 *
 * SelectorList
 *   : Selector
 *     ...
 *   ;
 */
/**
 * Selector node
 *
 * Selector
 *   : RegularSelector
 *   | ExtendedSelector
 *     ...
 *   ;
 */
/**
 * Regular selector node;
 * it can be selected by querySelectorAll()
 *
 * RegularSelector
 *   : type
 *   : value
 *   ;
 */
/**
 * Extended selector node
 *
 * ExtendedSelector
 *   : AbsolutePseudoClass
 *   | RelativePseudoClass
 *   ;
 */
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
