import { nativeTextContent } from './natives';

/**
 * Returns textContent of passed domElement.
 *
 * @param domElement DOM element.
 *
 * @returns DOM element textContent.
 */
export const getNodeTextContent = (domElement: Node): string => {
    if (nativeTextContent.getter) {
        return nativeTextContent.getter.apply(domElement);
    }
    // if ExtendedCss.init() has not been executed and there is no nodeTextContentGetter,
    // use simple approach, especially when init() is not really needed, e.g. local tests
    return domElement.textContent || '';
};

/**
 * Matches characters which end or escape a double-quoted CSS string:
 * double quote, backslash, line feed, carriage return and form feed.
 */
const CSS_STRING_SPECIAL_CHARS_REGEXP = /["\\\n\r\f]/g;

/**
 * Matches ASCII characters which cannot be used in a CSS identifier as is.
 */
const CSS_IDENTIFIER_SPECIAL_CHARS_REGEXP = /[^\w\-\u0080-\uffff]/g;

/**
 * Matches a digit at the start of a CSS identifier, optionally preceded by a hyphen.
 */
const CSS_IDENTIFIER_LEADING_DIGIT_REGEXP = /^(-?)(\d)/;

/**
 * Namespace prefix of an attribute selector which matches an attribute in any namespace.
 */
const ANY_NAMESPACE_PREFIX = '*|';

/**
 * Code of the first character which is not a C0 control character.
 */
const SPACE_CHAR_CODE = 0x20;

/**
 * Code of the DELETE control character.
 */
const DELETE_CHAR_CODE = 0x7f;

/**
 * Returns CSS code point escape for `char`, e.g. `\a ` for a line feed.
 * The trailing space ends the escape, so the next character is not read as a part of it.
 *
 * @param char Single character.
 *
 * @returns Escaped character.
 */
const getCssCodePointEscape = (char: string): string => {
    return `\\${char.charCodeAt(0).toString(16)} `;
};

/**
 * Escapes `char` so it loses its special meaning in CSS.
 *
 * @param char Single character.
 *
 * @returns Escaped character.
 */
const escapeCssChar = (char: string): string => {
    const charCode = char.charCodeAt(0);
    // a backslash before a line break does not escape it,
    // so control characters are escaped by their code points
    return charCode < SPACE_CHAR_CODE || charCode === DELETE_CHAR_CODE
        ? getCssCodePointEscape(char)
        : `\\${char}`;
};

/**
 * Escapes `value` so it can be used inside a double-quoted CSS string.
 *
 * @param value Raw string value.
 *
 * @returns Escaped string value.
 */
const escapeCssStringValue = (value: string): string => {
    return value.replace(CSS_STRING_SPECIAL_CHARS_REGEXP, escapeCssChar);
};

/**
 * Escapes `value` so it can be used as a CSS identifier, the same way as `CSS.escape()` does.
 *
 * @param value Raw identifier, e.g. Tag name or attribute name.
 *
 * @returns Escaped identifier.
 */
const escapeCssIdentifier = (value: string): string => {
    if (value === '-') {
        return '\\-';
    }
    return value
        .replace(CSS_IDENTIFIER_SPECIAL_CHARS_REGEXP, escapeCssChar)
        .replace(CSS_IDENTIFIER_LEADING_DIGIT_REGEXP, (match, hyphen: string, digit: string) => {
            return `${hyphen}${getCssCodePointEscape(digit)}`;
        });
};

/**
 * Returns the name of `attr` as it should be specified in an attribute selector.
 *
 * @param attr Element attribute.
 *
 * @returns Escaped attribute name.
 */
const getAttrSelectorName = (attr: Attr): string => {
    // a selector with no namespace specified matches only attributes with no namespace,
    // so an attribute with a namespace, e.g. `xlink:href` in inline SVG, is described by its local name
    return attr.namespaceURI
        ? `${ANY_NAMESPACE_PREFIX}${escapeCssIdentifier(attr.localName)}`
        : escapeCssIdentifier(attr.name);
};

/**
 * Returns element selector text based on it's tagName and attributes.
 *
 * @param element DOM element.
 *
 * @returns String representation of `element`.
 */
export const getElementSelectorDesc = (element: Element): string => {
    let selectorText = escapeCssIdentifier(element.tagName.toLowerCase());
    selectorText += Array.from(element.attributes)
        .map((attr) => {
            return `[${getAttrSelectorName(attr)}="${escapeCssStringValue(attr.value)}"]`;
        })
        .join('');
    return selectorText;
};

/**
 * Returns path to a DOM element as a selector string.
 *
 * @param inputEl Input element.
 *
 * @returns String path to a DOM element.
 * @throws An error if `inputEl` in not instance of `Element`.
 */
export const getElementSelectorPath = (inputEl: Element): string => {
    if (!(inputEl instanceof Element)) {
        throw new Error('Function received argument with wrong type');
    }

    let el: Element | null;

    el = inputEl;
    const path: string[] = [];
    // we need to check '!!el' first because it is possible
    // that some ancestor of the inputEl was removed before it
    while (!!el && el.nodeType === Node.ELEMENT_NODE) {
        let selector: string = el.nodeName.toLowerCase();
        if (el.id && typeof el.id === 'string') {
            selector += `#${el.id}`;
            path.unshift(selector);
            break;
        }
        let sibling = el;
        let nth = 1;
        while (sibling.previousElementSibling) {
            sibling = sibling.previousElementSibling;
            if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName.toLowerCase() === selector) {
                nth += 1;
            }
        }
        if (nth !== 1) {
            selector += `:nth-of-type(${nth})`;
        }

        path.unshift(selector);
        el = el.parentElement;
    }
    return path.join(' > ');
};

/**
 * Checks whether the element is instance of HTMLElement.
 *
 * @param element Element to check.
 *
 * @returns True if `element` is HTMLElement.
 */
export const isHtmlElement = (element: HTMLElement | Node | null): element is HTMLElement => {
    return element instanceof HTMLElement;
};

/**
 * Takes `element` and returns its parent element.
 *
 * @param element Element.
 * @param errorMessage Optional error message to throw.
 *
 * @returns Parent of `element`.
 * @throws An error if element has no parent element.
 */
export const getParent = (element: HTMLElement, errorMessage?: string): HTMLElement => {
    const { parentElement } = element;
    if (!parentElement) {
        throw new Error(errorMessage || 'Element does no have parent element');
    }
    return parentElement;
};
