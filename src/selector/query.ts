import { parse } from './parser';

import { AnySelectorNodeInterface } from './nodes';

import { getElementsForSelectorNode } from './utils/query-helpers';

import { flatten } from '../common/utils/arrays';

/**
 * Selects elements by ast.
 *
 * @param ast Ast of parsed selector.
 * @param doc Document.
 *
 * @returns Array of DOM elements.
 */
export const selectElementsByAst = (ast: AnySelectorNodeInterface, doc = document): HTMLElement[] => {
    const selectedElements: HTMLElement[] = [];
    // ast root is SelectorList node;
    // it has Selector nodes as children which should be processed separately
    ast.children.forEach((selectorNode: AnySelectorNodeInterface) => {
        selectedElements.push(...getElementsForSelectorNode(selectorNode, doc));
    });
    // selectedElements should be flattened as it is array of arrays with elements
    const uniqueElements = [...new Set(flatten(selectedElements))];
    return uniqueElements;
};

/**
 * Selects elements by selector.
 *
 * @param selector Standard or extended selector.
 *
 * @returns Array of DOM elements.
 */
export const querySelectorAll = (selector: string): HTMLElement[] => {
    const ast = parse(selector);
    return selectElementsByAst(ast);
};

/**
 * Class of ExtCssDocument is needed for caching.
 * For making cache related to each new instance of class, not global.
 */
export class ExtCssDocument {
    /**
     * Cache with selectors and their AST parsing results.
     */
    private readonly astCache: Map<string, AnySelectorNodeInterface>;

    /**
     * Creates new ExtCssDocument and inits new `astCache`.
     */
    constructor() {
        this.astCache = new Map<string, AnySelectorNodeInterface>();
    }

    /**
     * Saves selector and it's ast to cache.
     *
     * @param selector Standard or extended selector.
     * @param ast Selector ast.
     */
    private saveAstToCache(selector: string, ast: AnySelectorNodeInterface): void {
        this.astCache.set(selector, ast);
    }

    /**
     * Returns ast from cache for given selector.
     *
     * @param selector Standard or extended selector.
     *
     * @returns Previously parsed ast found in cache, or null if not found.
     */
    private getAstFromCache(selector: string): AnySelectorNodeInterface | null {
        const cachedAst = this.astCache.get(selector) || null;
        return cachedAst;
    }

    /**
     * Returns selector ast:
     * - if cached ast exists — returns it;
     * - if no cached ast — saves newly parsed ast to cache and returns it.
     *
     * @param selector Standard or extended selector.
     *
     * @returns Ast for `selector`.
     */
    getSelectorAst(selector: string): AnySelectorNodeInterface {
        let ast = this.getAstFromCache(selector);
        if (!ast) {
            ast = parse(selector);
        }
        this.saveAstToCache(selector, ast);
        return ast;
    }

    /**
     * Selects elements by selector.
     *
     * @param selector Standard or extended selector.
     *
     * @returns Array of DOM elements.
     */
    querySelectorAll(selector: string): HTMLElement[] {
        const ast = this.getSelectorAst(selector);
        return selectElementsByAst(ast);
    }
}

export const extCssDocument = new ExtCssDocument();
