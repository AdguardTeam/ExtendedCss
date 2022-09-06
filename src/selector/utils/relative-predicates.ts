import { getElementsForSelectorNode } from './query-helpers';

import { AnySelectorNodeInterface } from '../nodes';

import { logger } from '../../common/utils/logger';
import { getElementSelectorDesc } from '../../common/utils/nodes';

import {
    COLON,
    DESCENDANT_COMBINATOR,
    CHILD_COMBINATOR,
    NEXT_SIBLING_COMBINATOR,
    SUBSEQUENT_SIBLING_COMBINATOR,
    REGULAR_PSEUDO_CLASSES,
} from '../../common/constants';

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
export type Specificity = string;

export interface RelativePredicateArgsInterface {
    // dom element to check relatives
    element: HTMLElement,
    // SelectorList node
    relativeSelectorList: AnySelectorNodeInterface,
    // extended pseudo-class name
    pseudoName: string,
    // flag for error throwing on invalid selector from selectorList
    // e.g. true for :not() pseudo-class
    errorOnInvalidSelector?: boolean,
}

/**
 * Checks whether the element has all relative elements specified by pseudo-class arg
 * Used for :has() and :if-not()
 * @param argsData
 */
export const hasRelativesBySelectorList = (argsData: RelativePredicateArgsInterface): boolean => {
    const { element, relativeSelectorList, pseudoName } = argsData;
    return relativeSelectorList.children
        // Array.every() is used here as each Selector node from SelectorList should exist on page
        .every((selector) => {
            // selectorList.children always starts with regular selector as any selector generally
            const [relativeRegularSelector] = selector.children;
            if (!relativeRegularSelector) {
                throw new Error(`RegularSelector is missing for :${pseudoName} pseudo-class.`);
            }

            let specificity: Specificity = '';
            let rootElement: HTMLElement | null = null;
            if (relativeRegularSelector.value?.startsWith(NEXT_SIBLING_COMBINATOR)
                || relativeRegularSelector.value?.startsWith(SUBSEQUENT_SIBLING_COMBINATOR)) {
                /**
                 * For matching the element by "element:has(+ next-sibling)" and "element:has(~ sibling)"
                 * we check whether the element's parentElement has specific direct child combination
                 * e.g. 'h1:has(+ .share)' -> `h1Node.parentElement.querySelectorAll(':scope > h1 + .share')`
                 * https://www.w3.org/TR/selectors-4/#relational
                 */
                rootElement = element.parentElement;
                const elementSelectorText = element.tagName.toLowerCase();
                specificity = `${COLON}${REGULAR_PSEUDO_CLASSES.SCOPE}${CHILD_COMBINATOR}${elementSelectorText}`;
            } else {
                /**
                 * TODO: figure out something with :scope usage as IE does not support it
                 * https://developer.mozilla.org/en-US/docs/Web/CSS/:scope#browser_compatibility
                 */
                /**
                 * :scope specification is needed for proper descendants selection
                 * as native element.querySelectorAll() does not select exact element descendants
                 * e.g. 'a:has(> img)' -> `aNode.querySelectorAll(':scope > img')`
                 * OR '.block(div > span)' -> `blockClassNode.querySelectorAll(':scope div > span')`
                 */
                specificity = `${COLON}${REGULAR_PSEUDO_CLASSES.SCOPE}${DESCENDANT_COMBINATOR}`;
                rootElement = element;
            }

            if (!rootElement) {
                throw new Error(`Selection by :${pseudoName} pseudo-class is not possible.`);
            }

            let relativeElements: HTMLElement[];
            try {
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                relativeElements = getElementsForSelectorNode(selector, rootElement, specificity);
            } catch (e) {
                logger.error(e);
                // fail for invalid selector
                throw new Error(`Invalid selector for :${pseudoName} pseudo-class: '${relativeRegularSelector.value}'`);
            }
            return relativeElements.length > 0;
        });
};

/**
 * Checks whether the element is an any element specified by pseudo-class arg.
 * Used for :is() and :not()
 * @param argsData
 */
export const isAnyElementBySelectorList = (argsData: RelativePredicateArgsInterface): boolean => {
    const { element, relativeSelectorList, pseudoName, errorOnInvalidSelector } = argsData;
    return relativeSelectorList.children
        // Array.some() is used here as any selector from selector list should exist on page
        .some((selector) => {
            // selectorList.children always starts with regular selector
            const [relativeRegularSelector] = selector.children;
            if (!relativeRegularSelector) {
                throw new Error(`RegularSelector is missing for :${pseudoName} pseudo-class.`);
            }

            /**
             * For checking the element by 'div:is(.banner)' and 'div:not([data="content"])
             * we check whether the element's parentElement has any specific direct child
             */
            const rootElement = element.parentElement;
            if (!rootElement) {
                throw new Error(`Selection by :${pseudoName} pseudo-class is not possible.`);
            }

            /**
             * So we calculate the element "description" by it's tagname and attributes for targeting
             * and use it to specify the selection
             * e.g. 'div:is(.banner)' -> `divNode.parentElement.querySelectorAll(':scope > div[class="banner"]')`
             */
            const elementSelectorText = getElementSelectorDesc(element);
            const specificity = `${COLON}${REGULAR_PSEUDO_CLASSES.SCOPE}${CHILD_COMBINATOR}${elementSelectorText}`;

            let anyElements: HTMLElement[];
            try {
                anyElements = getElementsForSelectorNode(selector, rootElement, specificity);
            } catch (e) {
                if (errorOnInvalidSelector) {
                    // fail on invalid selectors for :not()
                    logger.error(e);
                    throw new Error(`Invalid selector for :${pseudoName} pseudo-class: '${relativeRegularSelector.value}'`); // eslint-disable-line max-len
                } else {
                    // do not fail on invalid selectors for :is()
                    return false;
                }
            }
            return anyElements.length > 0;
        });
};
