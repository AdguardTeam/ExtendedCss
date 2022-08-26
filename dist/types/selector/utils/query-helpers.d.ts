import { AnySelectorNodeInterface } from '../nodes';
import { Specificity } from './relative-predicates';
/**
 * Selects dom elements by value of RegularSelector
 * @param regularSelectorNode RegularSelector node
 * @param root root dom element
 * @param specificity
 */
export declare const getByRegularSelector: (regularSelectorNode: AnySelectorNodeInterface, root: Document | Element, specificity?: Specificity) => HTMLElement[];
/**
 * Returns list of dom elements filtered or selected by ExtendedSelector node
 * @param domElements array of dom elements
 * @param extendedSelectorNode ExtendedSelector node
 * @returns array of dom elements
 */
export declare const getByExtendedSelector: (domElements: HTMLElement[], extendedSelectorNode: AnySelectorNodeInterface) => HTMLElement[];
/**
 * Returns list of dom elements which is selected by RegularSelector value
 * @param domElements array of dom elements
 * @param regularSelectorNode RegularSelector node
 * @returns array of dom elements
 */
export declare const getByFollowingRegularSelector: (domElements: HTMLElement[], regularSelectorNode: AnySelectorNodeInterface) => HTMLElement[];
/**
 * Gets elements nodes for Selector node.
 * As far as any selector always starts with regular part,
 * it selects by RegularSelector first and checks found elements later.
 *
 * Relative pseudo-classes has it's own subtree so getElementsForSelectorNode is called recursively.
 *
 * 'specificity' is needed for :has(), :is() and :not() pseudo-classes.
 * e.g. ':scope' specification is needed for proper descendants selection for 'div:has(> img)'
 * as native querySelectorAll() does not select exact element descendants even if it is called on 'div'.
 * so we check `divNode.querySelectorAll(':scope > img').length > 0`
 *
 * @param selectorNode Selector node
 * @param root root dom element
 * @param specificity needed element specification
 */
export declare const getElementsForSelectorNode: (selectorNode: AnySelectorNodeInterface, root: Document | Element | HTMLElement, specificity?: Specificity) => HTMLElement[];
