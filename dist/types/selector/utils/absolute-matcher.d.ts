export interface MatcherArgsInterface {
    pseudoName: string;
    pseudoArg: string;
    domElement: Element;
    regularPseudoElement?: string;
}
/**
 * Checks whether the domElement is matched by :matches-css() arg
 * @param argsData
 */
export declare const isStyleMatched: (argsData: MatcherArgsInterface) => boolean;
/**
 * Returns valid arg for :matches-attr and :matcher-property
 * @param rawArg arg pattern
 * @param [isWildcardAllowed=false] flag for wildcard (`*`) using as pseudo-class arg
 */
export declare const getValidMatcherArg: (rawArg: string, isWildcardAllowed?: boolean) => string | RegExp;
interface RawMatchingArgData {
    rawName: string;
    rawValue?: string;
}
/**
 * Parses pseudo-class argument and returns parsed data
 * @param pseudoName extended pseudo-class name
 * @param pseudoArg extended pseudo-class argument
 */
export declare const getRawMatchingData: (pseudoName: string, pseudoArg: string) => RawMatchingArgData;
/**
 * Checks whether the domElement is matched by :matches-attr() arg
 * @param argsData
 */
export declare const isAttributeMatched: (argsData: MatcherArgsInterface) => boolean;
/**
 * Parses raw :matches-property() arg which may be chain of properties
 * @param input argument of :matches-property()
 */
export declare const parseRawPropChain: (input: string) => (string | RegExp)[];
/**
 * Checks whether the domElement is matched by :matches-property() arg
 * @param argsData
 */
export declare const isPropertyMatched: (argsData: MatcherArgsInterface) => boolean;
/**
 * Checks whether the textContent is matched by :contains arg
 * @param argsData
 */
export declare const isTextMatched: (argsData: MatcherArgsInterface) => boolean;
export {};
