import { parse } from './parser';

import {
    matchPseudo,
    findPseudo,
} from './pseudo-processor';

import {
    NodeType,
    AnySelectorNodeInterface,
} from './nodes';

import utils from './utils';

import {
    CONTAINS_PSEUDO_CLASS_MARKERS,
    HAS_PSEUDO_CLASS_MARKERS,
    MATCHES_ATTR_PSEUDO_CLASS_MARKER,
    MATCHES_CSS_PSEUDO_CLASS_MARKERS,
    MATCHES_PROPERTY_PSEUDO_CLASS_MARKER,
    NTH_ANCESTOR_PSEUDO_CLASS_MARKER,
    UPWARD_PSEUDO_CLASS_MARKER,
    XPATH_PSEUDO_CLASS_MARKER,
    REGULAR_PSEUDO_CLASSES,
    DESCENDANT_COMBINATOR,
    CHILD_COMBINATOR,
    NEXT_SIBLING_COMBINATOR,
    SUBSEQUENT_SIBLING_COMBINATOR,
    IS_PSEUDO_CLASS_MARKER,
    NOT_PSEUDO_CLASS_MARKER,
    IF_NOT_PSEUDO_CLASS_MARKER,
    COLON,
} from './constants';

/**
 * Selects dom elements by value of RegularSelector
 * @param regularSelectorNode RegularSelector node
 * @param root root element
 * @param specificity
 */
const getByRegularSelector = (
    regularSelectorNode: AnySelectorNodeInterface,
    root: Document | Element,
    specificity?: string,
): Element[] => {
    if (!regularSelectorNode) {
        throw new Error('selectorNode should be specified');
    }
    if (!regularSelectorNode.value) {
        throw new Error('RegularSelector value should be specified');
    }
    const selectorText = specificity
        ? `${specificity}${regularSelectorNode.value}`
        : regularSelectorNode.value;
    return Array.from(root.querySelectorAll(selectorText));
};

/**
 * Checks whether the domElement satisfies condition of extended pseudo-class
 * @param domElement dom node, i.e html element
 * @param extendedPseudo absolute extended pseudo-class node
 */
const isAbsoluteMatching = (domElement: Element, extendedPseudo: AnySelectorNodeInterface): boolean => {
    let isMatching = false;
    const { name, arg } = extendedPseudo;
    if (!name || !arg) {
        throw new Error('Pseudo-class name or arg is missing in AbsolutePseudoClass');
    }

    if (CONTAINS_PSEUDO_CLASS_MARKERS.includes(name)) {
        isMatching = matchPseudo.contains(domElement, arg);
    }

    if (MATCHES_CSS_PSEUDO_CLASS_MARKERS.includes(name)) {
        isMatching = matchPseudo.matchesCss(domElement, name, arg);
    }

    if (name === MATCHES_ATTR_PSEUDO_CLASS_MARKER) {
        isMatching = matchPseudo.matchesAttr(domElement, name, arg);
    }

    if (name === MATCHES_PROPERTY_PSEUDO_CLASS_MARKER) {
        isMatching = matchPseudo.matchesProperty(domElement, name, arg);
    }

    return isMatching;
};

/**
 *
 * @param domElement dom node
 * @param selectorNode Selector node child
 */
const isMatching = (domElement: Element, selectorNode: AnySelectorNodeInterface): boolean => {
    let match = false;
    if (selectorNode.type === NodeType.RegularSelector) {
        // TODO: regular selector part after extended pseudo-class
        // e.g. " ~ p" in rule "div:has(a) ~ p"
    } else if (selectorNode.type === NodeType.ExtendedSelector) {
        /**
         * TODO: consider to deprecate NodeTypes.ExtendedSelector
         */
        const extendedPseudo = selectorNode.children[0];
        if (extendedPseudo.type === NodeType.AbsolutePseudoClass) {
            match = isAbsoluteMatching(domElement, extendedPseudo);
        }
    } else {
        // it might be error if there is neither RegularSelector nor ExtendedSelector among Selector.children
    }
    return match;
};

const hasRelativesBySelectorList = (
    element: Element,
    selectorList: AnySelectorNodeInterface,
    pseudoName: string | undefined,
): boolean => {
    return selectorList.children
        // "every" is used here as each selector from selector list should exist on page
        .every((selector) => {
            // selectorList.children always starts with regular selector
            const relativeRegularSelector = selector.children[0];
            if (!relativeRegularSelector) {
                throw new Error(`RegularSelector is missing for :${pseudoName} pseudo-class.`);
            }

            let specificity;
            let rootElement;
            if (relativeRegularSelector.value?.startsWith(NEXT_SIBLING_COMBINATOR)
                || relativeRegularSelector.value?.startsWith(SUBSEQUENT_SIBLING_COMBINATOR)) {
                /**
                 * For matching the element by "element:has(+ next-sibling)" and "element:has(~ sibling)"
                 * we check whether the element's parentElement has specific direct child combination
                 * e.g. 'h1:has(+ .share)' -> h1.parentElement.querySelectorAll(':scope > h1 + .share')
                 * https://www.w3.org/TR/selectors-4/#relational
                 */
                rootElement = element.parentElement;
                const elementSelectorText = element.tagName.toLowerCase();
                specificity = `${COLON}${REGULAR_PSEUDO_CLASSES.SCOPE}${CHILD_COMBINATOR}${elementSelectorText}`;
            } else {
                // e.g. "a:has(> img)", ".block(div > span)"
                /**
                 * TODO: figure out something with :scope usage as IE does not support it
                 * https://developer.mozilla.org/en-US/docs/Web/CSS/:scope#browser_compatibility
                 */
                /**
                 * :scope specification is needed for proper descendants selection
                 * as native element.querySelectorAll() does not select exact element descendants
                 */
                specificity = `${COLON}${REGULAR_PSEUDO_CLASSES.SCOPE}${DESCENDANT_COMBINATOR}`;
                rootElement = element;
            }

            if (!rootElement) {
                throw new Error(`Selection by :${pseudoName} pseudo-class is not possible.`);
            }

            let relativeElements;
            try {
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                relativeElements = getElementsForSelectorNode(selector, rootElement, specificity);
            } catch (e) {
                // fail for invalid selectors
                throw new Error(`Invalid selector for :${pseudoName} pseudo-class: '${relativeRegularSelector.value}'`);
            }
            return relativeElements.length > 0;
        });
};

const isAnyElementBySelectorList = (
    element: Element,
    selectorList: AnySelectorNodeInterface,
    pseudoName: string | undefined,
    errorOnInvalidSelector?: boolean,
): boolean => {
    return selectorList.children
        // "some" is used here as any selector from selector list should exist on page
        .some((selector) => {
            // selectorList.children always starts with regular selector
            const relativeRegularSelector = selector.children[0];
            if (!relativeRegularSelector) {
                throw new Error(`RegularSelector is missing for :${pseudoName} pseudo-class.`);
            }

            const rootElement = element.parentElement;
            if (!rootElement) {
                throw new Error(`Selection by :${pseudoName} pseudo-class is not possible.`);
            }

            const elementSelectorText = utils.getElementSelectorText(element);
            const specificity = `${COLON}${REGULAR_PSEUDO_CLASSES.SCOPE}${CHILD_COMBINATOR}${elementSelectorText}`;

            let anyElements;
            try {
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                anyElements = getElementsForSelectorNode(selector, rootElement, specificity);
            } catch (e) {
                if (errorOnInvalidSelector) {
                    // fail on invalid selectors for :not
                    throw new Error(`Invalid selector for :${pseudoName} pseudo-class: '${relativeRegularSelector.value}'`); // eslint-disable-line max-len
                } else {
                    // do not fail on invalid selectors for :is
                    return false;
                }
            }
            return anyElements.length > 0;
        });
};

/**
 * Returns list of dom nodes filtered or selected by ExtendedSelector node
 * @param domElements array of dom nodes
 * @param extendedSelectorNode ExtendedSelector node
 * @returns array of dom nodes
 */
const getByExtendedSelector = (domElements: Element[], extendedSelectorNode: AnySelectorNodeInterface): Element[] => {
    let foundElements: Element[] = [];
    /**
     * TODO: refactor later
     */
    if (extendedSelectorNode.children[0].name === NTH_ANCESTOR_PSEUDO_CLASS_MARKER) {
        if (!extendedSelectorNode.children[0].arg) {
            throw new Error(`Missing arg for :${extendedSelectorNode.children[0].name} pseudo-class`);
        }
        foundElements = findPseudo.nthAncestor(
            domElements,
            extendedSelectorNode.children[0].arg,
            extendedSelectorNode.children[0].name,
        );
    } else if (extendedSelectorNode.children[0].name === XPATH_PSEUDO_CLASS_MARKER) {
        if (!extendedSelectorNode.children[0].arg) {
            throw new Error('Missing arg for :xpath pseudo-class');
        }
        try {
            document.createExpression(extendedSelectorNode.children[0].arg, null);
        } catch (e) {
            throw new Error(`Invalid argument of :xpath pseudo-class: '${extendedSelectorNode.children[0].arg}'`);
        }
        foundElements = findPseudo.xpath(domElements, extendedSelectorNode.children[0].arg);
    } else if (extendedSelectorNode.children[0].name === UPWARD_PSEUDO_CLASS_MARKER) {
        if (!extendedSelectorNode.children[0].arg) {
            throw new Error('Missing arg for :upward pseudo-class');
        }
        if (Number.isNaN(Number(extendedSelectorNode.children[0].arg))) {
            // so arg is selector, not a number
            foundElements = findPseudo.upward(domElements, extendedSelectorNode.children[0].arg);
        } else {
            foundElements = findPseudo.nthAncestor(
                domElements,
                extendedSelectorNode.children[0].arg,
                extendedSelectorNode.children[0].name,
            );
        }
    } else if (extendedSelectorNode.children[0].name
        && HAS_PSEUDO_CLASS_MARKERS.includes(extendedSelectorNode.children[0].name)) {
        if (extendedSelectorNode.children[0].children.length === 0) {
            throw new Error('Missing arg for :has pseudo-class');
        }
        foundElements = domElements.filter((element) => {
            return hasRelativesBySelectorList(
                element,
                extendedSelectorNode.children[0].children[0],
                extendedSelectorNode.children[0].name,
            );
        });
    } else if (extendedSelectorNode.children[0].name
        && extendedSelectorNode.children[0].name === IF_NOT_PSEUDO_CLASS_MARKER) {
        if (extendedSelectorNode.children[0].children.length === 0) {
            throw new Error('Missing arg for :if-not pseudo-class');
        }
        foundElements = domElements.filter((element) => {
            return !hasRelativesBySelectorList(
                element,
                extendedSelectorNode.children[0].children[0],
                extendedSelectorNode.children[0].name,
            );
        });
    } else if (extendedSelectorNode.children[0].name
        && extendedSelectorNode.children[0].name === IS_PSEUDO_CLASS_MARKER) {
        if (extendedSelectorNode.children[0].children.length === 0) {
            throw new Error('Missing arg for :is pseudo-class');
        }
        foundElements = domElements.filter((el) => {
            return isAnyElementBySelectorList(
                el,
                extendedSelectorNode.children[0].children[0],
                extendedSelectorNode.children[0].name,
            );
        });
    } else if (extendedSelectorNode.children[0].name
        && extendedSelectorNode.children[0].name === NOT_PSEUDO_CLASS_MARKER) {
        if (extendedSelectorNode.children[0].children.length === 0) {
            throw new Error('Missing arg for :not pseudo-class');
        }
        foundElements = domElements.filter((el) => {
            return !isAnyElementBySelectorList(
                el,
                extendedSelectorNode.children[0].children[0],
                extendedSelectorNode.children[0].name,
                true,
            );
        });
    } else {
        foundElements = domElements.filter((el) => {
            return isMatching(el, extendedSelectorNode);
        });
    }

    return foundElements;
};

/**
 * Returns list of dom nodes which selected by
 * @param domElements array of dom nodes
 * @param regularSelectorNode RegularSelector node
 * @returns array of dom nodes
 */
const getByFollowingRegularSelector = (
    domElements: Element[],
    regularSelectorNode: AnySelectorNodeInterface,
): Element[] => {
    let foundElements = [];
    const { value } = regularSelectorNode;
    if (!value) {
        throw new Error('RegularSelector should have a value.');
    }

    if (value.startsWith(CHILD_COMBINATOR)) {
        // e.g. div:has(> img) > .banner
        foundElements = domElements
            .map((root) => {
                const specificity = `${COLON}${REGULAR_PSEUDO_CLASSES.SCOPE}`;
                return getByRegularSelector(regularSelectorNode, root, specificity);
            });
    } else if (value.startsWith(NEXT_SIBLING_COMBINATOR)
        || value.startsWith(SUBSEQUENT_SIBLING_COMBINATOR)) {
        // e.g. div:has(> img) + .banner
        // or   div:has(> img) ~ .banner
        foundElements = domElements
            .map((element) => {
                const rootElement = element.parentElement;
                if (!rootElement) {
                    throw new Error(`Selection by '${value}' part of selector is not possible.`);
                }
                const elementSelectorText = utils.getElementSelectorText(element);
                const specificity = `${COLON}${REGULAR_PSEUDO_CLASSES.SCOPE}${CHILD_COMBINATOR}${elementSelectorText}`;
                const selected = getByRegularSelector(regularSelectorNode, rootElement, specificity);
                return selected;
            });
    } else {
        // space-separated regular selector after extended one
        // e.g. div:has(> img) .banner
        foundElements = domElements
            .map((root) => {
                const specificity = `${COLON}${REGULAR_PSEUDO_CLASSES.SCOPE}${DESCENDANT_COMBINATOR}`;
                return getByRegularSelector(regularSelectorNode, root, specificity);
            });
    }
    // foundElements should be flattened
    // as getByRegularSelector() returns elements array, and map() collects them to array
    return foundElements.flat(1);
};

/**
 * Gets elements nodes for Selector node
 * @param selectorTree Selector node
 * @param root root element
 * @param specificity
 */
const getElementsForSelectorNode = (
    selectorTree: AnySelectorNodeInterface,
    root: Document | Element | HTMLElement,
    specificity?: string,
): Element[] => {
    let selectedElements: Element[] = [];
    let i = 0;
    while (i < selectorTree.children.length) {
        const selectorNode = selectorTree.children[i];
        if (i === 0) {
            // select start nodes by regular selector
            selectedElements = getByRegularSelector(selectorNode, root, specificity);
        } else if (selectorNode.type === NodeType.ExtendedSelector) {
            // filter previously selected elements by next selector nodes
            selectedElements = getByExtendedSelector(selectedElements, selectorNode);
        } else if (selectorNode.type === NodeType.RegularSelector) {
            selectedElements = getByFollowingRegularSelector(selectedElements, selectorNode);
        }
        i += 1;
    }
    return selectedElements;
};

/**
 * Selects elements by selector
 * @param selector
 * @param doc
 */
export const querySelectorAll = (selector: string, doc = document): Element[] => {
    const resultElementsForSelectorList: Element[] = [];

    /**
     * TODO: cache ast results for selector
     */
    const ast = parse(selector);

    if (ast === null) {
        throw new Error(`'${selector}' is not a valid selector`);
    }

    ast?.children.forEach((selectorNode: AnySelectorNodeInterface) => {
        resultElementsForSelectorList.push(...getElementsForSelectorNode(selectorNode, doc));
    });

    // since resultElements is array of arrays with elements
    // it should be flattened
    const uniqueElements = [...new Set(resultElementsForSelectorList.flat(1))];
    return uniqueElements;
};
