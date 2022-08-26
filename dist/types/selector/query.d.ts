import { AnySelectorNodeInterface } from './nodes';
/**
 * Selects elements by ast
 * @param ast ast of parsed selector
 * @param doc document
 */
export declare const selectElementsByAst: (ast: AnySelectorNodeInterface, doc?: Document) => HTMLElement[];
/**
 * Selects elements by selector
 * @param selector
 */
export declare const querySelectorAll: (selector: string) => HTMLElement[];
/**
 * Class of ExtCssDocument is needed for caching.
 * For making cache related to each new instance of class, not global
 */
export declare class ExtCssDocument {
    /**
     * Cache with selectors and their AST parsing results
     */
    private readonly astCache;
    constructor();
    /**
     * Saves selector and it's ast to cache
     * @param selector
     * @param ast
     */
    private saveAstToCache;
    /**
     * Gets ast from cache for given selector
     * @param selector
     */
    private getAstFromCache;
    /**
     * Gets selector ast:
     * - if cached ast exists — returns it
     * - if no cached ast — saves newly parsed ast to cache and returns it
     * @param selector
     */
    private getSelectorAst;
    /**
     * Selects elements by selector
     * @param selector
     */
    querySelectorAll(selector: string): HTMLElement[];
}
