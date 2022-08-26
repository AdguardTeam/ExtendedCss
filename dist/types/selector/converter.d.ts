/**
 * Prepares the rawSelector before tokenization:
 * 1. trims it
 * 2. converts old syntax `[-ext-pseudo-class="..."]` to new one `:pseudo-class(...)`
 * 3. handles :scope pseudo inside :has() pseudo-class arg
 * @param rawSelector selector with no style declaration
 * @returns prepared selector with no style declaration
 */
export declare const convert: (rawSelector: string) => string;
