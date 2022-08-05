import { ExtCssDocument } from '../../src/selector';

/**
 * Checks whether selectedElements and expectedElements are the same
 * @param selectedElements selected by extCss querySelectorAll()
 * @param expectedElements expected element selected by native document.querySelectorAll()
 */
export const expectTheSameElements = (selectedElements: HTMLElement[], expectedElements: NodeListOf<Element>) => {
    expect(selectedElements.length).toEqual(expectedElements.length);
    expectedElements.forEach((expectedElement, index) => {
        expect(selectedElements[index]).toEqual(expectedElement);
    });
};

/**
 * Checks whether there is no element selected
 * @param selectedElements selected by extCss querySelectorAll()
 */
export const expectNoMatch = (selectedElements: HTMLElement[]) => {
    expect(selectedElements.length).toEqual(0);
};

interface SuccessSelectorInput {
    actual: string,     // selector for extCss querySelectorAll()
    expected: string,   // target selector for checking
}
export const expectSuccessInput = (input: SuccessSelectorInput): void => {
    const { actual, expected } = input;
    const extCssDoc = new ExtCssDocument();
    const selectedElements = extCssDoc.querySelectorAll(actual);
    const expectedElements = document.querySelectorAll(expected);
    expectTheSameElements(selectedElements, expectedElements);
};

interface NoMatchSelectorInput {
    selector: string,   // selector for extCss querySelectorAll()
}
export const expectNoMatchInput = (input: NoMatchSelectorInput): void => {
    const { selector } = input;
    const extCssDoc = new ExtCssDocument();
    const selectedElements = extCssDoc.querySelectorAll(selector);
    expectNoMatch(selectedElements);
};

interface ToThrowSelectorInput {
    selector: string,   // selector for extCss querySelectorAll()
    error: string,      // error text to match
}
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
