/**
 * Normalizes stylesheet before tokenization
 * @param input
 */
export const normalize = (input: string): string => {
    const normalized = input.trim();

    // TODO:
    // https://www.w3.org/TR/css-syntax-3/#css-filter-code-points

    return normalized;
};
