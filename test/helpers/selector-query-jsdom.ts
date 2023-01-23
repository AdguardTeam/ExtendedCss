import { ExtCssDocument } from '../../src/selector';

/**
 * Checks whether selectedElements and expectedElements are the same.
 *
 * @param selectedElements Selected by extCss querySelectorAll().
 * @param expectedElements Expected element selected by native document.querySelectorAll().
 */
export const expectTheSameElements = (selectedElements: HTMLElement[], expectedElements: NodeListOf<Element>) => {
    expect(selectedElements.length).toEqual(expectedElements.length);
    expectedElements.forEach((expectedElement, index) => {
        expect(selectedElements[index]).toEqual(expectedElement);
    });
};

/**
 * Checks whether there is no element selected.
 *
 * @param selectedElements Selected by extCss querySelectorAll().
 */
export const expectNoMatch = (selectedElements: HTMLElement[]) => {
    expect(selectedElements.length).toEqual(0);
};

type SuccessSelectorInput = {
    /**
     * Selector for extCss querySelectorAll().
     */
    actual: string,

    /**
     * Target selector for checking.
     */
    expected: string,
};
export const expectSuccessInput = (input: SuccessSelectorInput): void => {
    const { actual, expected } = input;
    const extCssDoc = new ExtCssDocument();
    const selectedElements = extCssDoc.querySelectorAll(actual);
    const expectedElements = document.querySelectorAll(expected);
    expectTheSameElements(selectedElements, expectedElements);
};

type NoMatchSelectorInput = {
    /**
     * Selector for extCss querySelectorAll().
     */
    selector: string,
};
export const expectNoMatchInput = (input: NoMatchSelectorInput): void => {
    const { selector } = input;
    const extCssDoc = new ExtCssDocument();
    const selectedElements = extCssDoc.querySelectorAll(selector);
    expectNoMatch(selectedElements);
};

type ToThrowSelectorInput = {
    /**
     * Selector for extCss querySelectorAll().
     */
    selector: string,

    /**
     * Error text to match.
     */
    error: string,
};
export const expectToThrowInput = (input: ToThrowSelectorInput): void => {
    const { selector, error } = input;
    const extCssDoc = new ExtCssDocument();
    expect(() => {
        extCssDoc.querySelectorAll(selector);
    }).toThrow(error);
};

export interface TestPropElement extends Element {
    // eslint-disable-next-line @typescript-eslint/ban-types
    _testProp: string | Object,
}
