import { ABSOLUTE_PSEUDO_CLASSES, RELATIVE_PSEUDO_CLASSES } from '../../common/constants';

/**
 * Checks whether the passed `str` is a name of supported absolute extended pseudo-class,
 * e.g. :contains(), :matches-css() etc.
 *
 * @param str Token value to check.
 */
export const isAbsolutePseudoClass = (str: string): boolean => {
    return ABSOLUTE_PSEUDO_CLASSES.includes(str);
};

/**
 * Checks whether the passed `str` is a name of supported relative extended pseudo-class,
 * e.g. :has(), :not() etc.
 *
 * @param str Token value to check.
 */
export const isRelativePseudoClass = (str: string): boolean => {
    return RELATIVE_PSEUDO_CLASSES.includes(str);
};
