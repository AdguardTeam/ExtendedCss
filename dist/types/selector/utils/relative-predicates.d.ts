import { AnySelectorNodeInterface } from '../nodes';
/**
 * Additional calculated selector part which is needed to :has(), :if-not(), :is() and :not() pseudo-classes.
 *
 * Native Document.querySelectorAll() does not select exact descendant elements
 * but match all page elements satisfying the selector,
 * so extra specification is needed for proper descendants selection
 * e.g. 'div:has(> img)'
 *
 * Its calculation depends on extended selector.
 */
export declare type Specificity = string;
export interface RelativePredicateArgsInterface {
    element: Element;
    relativeSelectorList: AnySelectorNodeInterface;
    pseudoName: string;
    errorOnInvalidSelector?: boolean;
}
/**
 * Checks whether the element has all relative elements specified by pseudo-class arg
 * Used for :has() and :if-not()
 * @param argsData
 */
export declare const hasRelativesBySelectorList: (argsData: RelativePredicateArgsInterface) => boolean;
/**
 * Checks whether the element is an any element specified by pseudo-class arg.
 * Used for :is() and :not()
 * @param argsData
 */
export declare const isAnyElementBySelectorList: (argsData: RelativePredicateArgsInterface) => boolean;
