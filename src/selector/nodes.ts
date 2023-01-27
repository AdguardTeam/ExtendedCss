/**
 * Possible ast node types.
 *
 * IMPORTANT: it is used as 'const' instead of 'enum' to avoid side effects
 * during ExtendedCss import into other libraries.
 */
export const NODE = {
    SELECTOR_LIST: 'SelectorList',
    SELECTOR: 'Selector',
    REGULAR_SELECTOR: 'RegularSelector',
    EXTENDED_SELECTOR: 'ExtendedSelector',
    ABSOLUTE_PSEUDO_CLASS: 'AbsolutePseudoClass',
    RELATIVE_PSEUDO_CLASS: 'RelativePseudoClass',
} as const;

export type NodeType = typeof NODE[keyof typeof NODE];

/**
 * Universal interface for all node types.
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
 * Used for SelectorList, Selector, ExtendedSelector.
 */
export class AnySelectorNode implements AnySelectorNodeInterface {
    type: string;

    children: AnySelectorNodeInterface[] = [];

    /**
     * Creates new ast node.
     *
     * @param type Ast node type.
     */
    constructor(type: NodeType) {
        this.type = type;
    }

    /**
     * Adds child node to children array.
     *
     * @param child Ast node.
     */
    public addChild(child: AnySelectorNodeInterface): void {
        this.children.push(child);
    }
}

/**
 * Class needed for creating RegularSelector ast node while selector parsing.
 */
export class RegularSelectorNode extends AnySelectorNode {
    value: string;

    /**
     * Creates RegularSelector ast node.
     *
     * @param value Value of RegularSelector node.
     */
    constructor(value: string) {
        super(NODE.REGULAR_SELECTOR);
        this.value = value;
    }
}

/**
 * Class needed for creating RelativePseudoClass ast node while selector parsing.
 */
export class RelativePseudoClassNode extends AnySelectorNode {
    name: string;

    /**
     * Creates RegularSelector ast node.
     *
     * @param name Name of RelativePseudoClass node.
     */
    constructor(name: string) {
        super(NODE.RELATIVE_PSEUDO_CLASS);
        this.name = name;
    }
}

/**
 * Class needed for creating AbsolutePseudoClass ast node while selector parsing.
 */
export class AbsolutePseudoClassNode extends AnySelectorNode {
    name: string;

    value = '';

    /**
     * Creates AbsolutePseudoClass ast node.
     *
     * @param name Name of AbsolutePseudoClass node.
     */
    constructor(name: string) {
        super(NODE.ABSOLUTE_PSEUDO_CLASS);
        this.name = name;
    }
}

/* eslint-disable jsdoc/require-description-complete-sentence */

/**
 * Root node.
 *
 * SelectorList
 *   : Selector
 *     ...
 *   ;
 */

/**
 * Selector node.
 *
 * Selector
 *   : RegularSelector
 *   | ExtendedSelector
 *     ...
 *   ;
 */

/**
 * Regular selector node.
 * It can be selected by querySelectorAll().
 *
 * RegularSelector
 *   : type
 *   : value
 *   ;
 */

/**
 * Extended selector node.
 *
 * ExtendedSelector
 *   : AbsolutePseudoClass
 *   | RelativePseudoClass
 *   ;
 */

/**
 * Absolute extended pseudo-class node,
 * i.e. none-selector args.
 *
 * AbsolutePseudoClass
 *   : type
 *   : name
 *   : value
 *   ;
 */

/**
 * Relative extended pseudo-class node
 * i.e. selector as arg.
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
