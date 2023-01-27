import { parse } from '../../src/selector/parser';
import { NODE } from '../../src/selector/nodes';

type TestAnySelectorNodeInterface = {
    type: string,
    children: TestAnySelectorNodeInterface[],
    value?: string,
    name?: string,
};

/**
 * Returns RegularSelector node with specified value.
 *
 * @param regularValue String value for RegularSelector.
 *
 * @returns Ast RegularSelector node for tests.
 */
export const getRegularSelector = (regularValue: string): TestAnySelectorNodeInterface => {
    return {
        type: NODE.REGULAR_SELECTOR,
        value: regularValue,
        children: [],
    };
};

/**
 * Returns extended selector AbsolutePseudoClass node.
 *
 * @param name Extended pseudo-class name.
 * @param value Value of pseudo-class.
 *
 * @returns Ast AbsolutePseudoClass node for tests.
 */
export const getAbsoluteExtendedSelector = (name: string, value: string): TestAnySelectorNodeInterface => {
    return {
        type: NODE.EXTENDED_SELECTOR,
        children: [
            {
                type: NODE.ABSOLUTE_PSEUDO_CLASS,
                name,
                value,
                children: [],
            },
        ],
    };
};

/**
 * Returns Selector node with RegularSelector as single child.
 *
 * @param regularValue String value for RegularSelector.
 *
 * @returns Ast Selector node for tests.
 */
export const getSelectorAsRegular = (regularValue: string): TestAnySelectorNodeInterface => {
    const selectorNode = {
        type: NODE.SELECTOR,
        children: [getRegularSelector(regularValue)],
    };
    return selectorNode;
};

/**
 * Returns extended selector RelativePseudoClass node with single RegularSelector.
 *
 * @param name Extended pseudo-class name.
 * @param value Value of it's inner regular selector.
 *
 * @returns Ast RelativePseudoClass node for tests.
 */
export const getRelativeExtendedWithSingleRegular = (name: string, value: string): TestAnySelectorNodeInterface => {
    return {
        type: NODE.EXTENDED_SELECTOR,
        children: [
            {
                type: NODE.RELATIVE_PSEUDO_CLASS,
                name,
                children: [
                    {
                        type: NODE.SELECTOR_LIST,
                        children: [
                            {
                                type: NODE.SELECTOR,
                                children: [
                                    {
                                        type: NODE.REGULAR_SELECTOR,
                                        value,
                                        children: [],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    };
};

/**
 * Returns SelectorList with multiple Selector nodes which have single RegularSelector node with specified value.
 *
 * @param regularValues Array of RegularSelector values.
 *
 * @returns Ast SelectorList node for tests.
 */
export const getSelectorListOfRegularSelectors = (regularValues: string[]): TestAnySelectorNodeInterface => {
    const selectorNodes = regularValues.map((value) => {
        return getSelectorAsRegular(value);
    });
    return {
        type: NODE.SELECTOR_LIST,
        children: selectorNodes,
    };
};

/**
 * Returns SelectorList with single Selector node which has single RegularSelector node with specified value.
 *
 * @param regularValue String value for RegularSelector.
 *
 * @returns Ast SelectorList node for tests.
 */
export const getAstWithSingleRegularSelector = (regularValue: string): TestAnySelectorNodeInterface => {
    return getSelectorListOfRegularSelectors([regularValue]);
};

/**
 * Data object for generating Selector children nodes:
 * 1. Only one of isRegular/isAbsolute/isRelative should be true.
 * 2. Acceptable parameters for:
 *   - isRegular: value;
 *   - isAbsolute or isRelative: name, value.
 */
type AnyChildOfSelectorRaw = {
    isRegular?: boolean,
    isAbsolute?: boolean,
    isRelative?: boolean
    value?: string,
    name?: string,
};

/**
 * Returns SelectorList with single Selector node which with any ast node.
 *
 * @param expected Simplified data for Selector child to expect.
 *
 * @returns Ast SelectorList node for tests.
 */
export const getSingleSelectorAstWithAnyChildren = (
    expected: AnyChildOfSelectorRaw[],
): TestAnySelectorNodeInterface => {
    const selectorChildren = expected.map((raw) => {
        const {
            isRegular,
            isAbsolute,
            isRelative,
            value,
            name,
        } = raw;

        if (isRegular && isAbsolute && isRelative) {
            throw new Error('Just one of properties should be specified: isRegular OR isAbsolute');
        }

        let childNode;
        if (isRegular && value) {
            childNode = getRegularSelector(value);
        } else if (isAbsolute && name && value) {
            childNode = getAbsoluteExtendedSelector(name, value);
        } else if (isRelative && name && value) {
            childNode = getRelativeExtendedWithSingleRegular(name, value);
        }
        if (!childNode) {
            throw new Error('Selector node child cannot be undefined. Some input param might be not set.');
        }
        return childNode;
    });

    return {
        type: NODE.SELECTOR_LIST,
        children: [
            {
                type: NODE.SELECTOR,
                children: selectorChildren,
            },
        ],
    };
};

type SelectorListOfRegularsInput = {
    /**
     * Selector for parsing.
     */
    actual: string,

    /**
     * Array of expected values for RegularSelector nodes.
     */
    expected: string[],
};

/**
 * Checks whether the passed selector is parsed into proper SelectorList.
 *
 * @param input - { actual, expected }.
 * @param input.actual Selector to parse to ast.
 * @param input.expected Expected ast selector.
 */
export const expectSelectorListOfRegularSelectors = ({ actual, expected }: SelectorListOfRegularsInput): void => {
    expect(parse(actual)).toEqual(getSelectorListOfRegularSelectors(expected));
};

type SelectorListOfAnyChildrenInput = {
    /**
     * Selector for parsing.
     */
    actual: string,

    /**
     * Array of data for building ast.
     */
    expected: AnyChildOfSelectorRaw[],
};

/**
 * Checks whether the 'actual' is parsed into AST with specified parameters.
 *
 * @param input - { actual, expected }.
 * @param input.actual Selector to parse to ast.
 * @param input.expected Expected ast selector.
 */
export const expectSingleSelectorAstWithAnyChildren = ({ actual, expected }: SelectorListOfAnyChildrenInput): void => {
    expect(parse(actual)).toEqual(getSingleSelectorAstWithAnyChildren(expected));
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
    expect(() => {
        parse(selector);
    }).toThrow(error);
};
