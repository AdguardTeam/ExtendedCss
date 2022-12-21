import {
    COLON,
    REMOVE_PSEUDO_MARKER,
    BRACKETS,
    REMOVE_ERROR_PREFIX,
} from '../common/constants';

export interface Style {
    property: string;
    value: string;
}

export interface ParsedSelectorData {
    selector: string,
    stylesOfSelector: Style[],
}

/**
 * Checks the presence of :remove() pseudo-class and validates it while parsing the selector part of css rule.
 *
 * @param rawSelector Selector which may contain :remove() pseudo-class.
 *
 * @returns Parsed selector data with selector and styles.
 * @throws An error on invalid :remove() position.
 */
export const parseRemoveSelector = (rawSelector: string): ParsedSelectorData => {
    /**
     * No error will be thrown on invalid selector as it will be validated later
     * so it's better to explicitly specify 'any' selector for :remove() pseudo-class by '*',
     * e.g. '.banner > *:remove()' instead of '.banner > :remove()'.
     */

    // ':remove()'
    // eslint-disable-next-line max-len
    const VALID_REMOVE_MARKER = `${COLON}${REMOVE_PSEUDO_MARKER}${BRACKETS.PARENTHESES.LEFT}${BRACKETS.PARENTHESES.RIGHT}`;
    // ':remove(' - needed for validation rules like 'div:remove(2)'
    const INVALID_REMOVE_MARKER = `${COLON}${REMOVE_PSEUDO_MARKER}${BRACKETS.PARENTHESES.LEFT}`;

    let selector: string;
    let shouldRemove = false;
    const firstIndex = rawSelector.indexOf(VALID_REMOVE_MARKER);
    if (firstIndex === 0) {
        // e.g. ':remove()'
        throw new Error(`${REMOVE_ERROR_PREFIX.NO_TARGET_SELECTOR}: '${rawSelector}'`);
    } else if (firstIndex > 0) {
        if (firstIndex !== rawSelector.lastIndexOf(VALID_REMOVE_MARKER)) {
            // rule with more than one :remove() pseudo-class is invalid
            // e.g. '.block:remove() > .banner:remove()'
            throw new Error(`${REMOVE_ERROR_PREFIX.MULTIPLE_USAGE}: '${rawSelector}'`);
        } else if (firstIndex + VALID_REMOVE_MARKER.length < rawSelector.length) {
            // remove pseudo-class should be last in the rule
            // e.g. '.block:remove():upward(2)'
            throw new Error(`${REMOVE_ERROR_PREFIX.INVALID_POSITION}: '${rawSelector}'`);
        } else {
            // valid :remove() pseudo-class position
            selector = rawSelector.substring(0, firstIndex);
            shouldRemove = true;
        }
    } else if (rawSelector.includes(INVALID_REMOVE_MARKER)) {
        // it is not valid if ':remove()' is absent in rule but just ':remove(' is present
        // e.g. 'div:remove(0)'
        throw new Error(`${REMOVE_ERROR_PREFIX.INVALID_REMOVE}: '${rawSelector}'`);
    } else {
        // there is no :remove() pseudo-class is rule
        selector = rawSelector;
    }

    const stylesOfSelector = shouldRemove
        ? [{ property: REMOVE_PSEUDO_MARKER, value: String(shouldRemove) }]
        : [];

    return { selector, stylesOfSelector };
};
