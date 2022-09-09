export enum NodeType {
    SelectorList = 'SelectorList',
    Selector = 'Selector',
    RegularSelector = 'RegularSelector',
    ExtendedSelector = 'ExtendedSelector',
    AbsolutePseudoClass = 'AbsolutePseudoClass',
    RelativePseudoClass = 'RelativePseudoClass',
}

/**
 * Universal interface for all node types
 */
export interface AnySelectorNodeInterface {
    type: string;
    children: AnySelectorNodeInterface[];
    value?: string;
    name?: string;

    addChild(child: AnySelectorNodeInterface): void;
}

/**
 * Class needed for creating ast nodes while selector parsing.
 * Used for SelectorList, Selector, ExtendedSelector
 */
export class AnySelectorNode implements AnySelectorNodeInterface {
    type: string;

    children: AnySelectorNodeInterface[] = [];

    constructor(type: NodeType) {
        this.type = type;
    }

    /**
     * Adds child node to children array
     */
    public addChild(child: AnySelectorNodeInterface): void {
        this.children.push(child);
    }
}

/**
 * Class needed for creating ast RegularSelector node while selector parsing
 */
export class RegularSelectorNode extends AnySelectorNode {
    value: string;

    constructor(value: string) {
        super(NodeType.RegularSelector);
        this.value = value;
    }
}

/**
 * Class needed for creating ast RelativePseudoClass node while selector parsing
 */
export class RelativePseudoClassNode extends AnySelectorNode {
    name: string;

    constructor(name: string) {
        super(NodeType.RelativePseudoClass);
        this.name = name;
    }
}

/**
 * Class needed for creating ast AbsolutePseudoClass node while selector parsing
 */
export class AbsolutePseudoClassNode extends AnySelectorNode {
    name: string;

    value = '';

    constructor(name: string) {
        super(NodeType.AbsolutePseudoClass);
        this.name = name;
    }
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
 *   : value
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
