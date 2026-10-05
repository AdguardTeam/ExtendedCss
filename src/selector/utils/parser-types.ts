import { AnySelectorNodeInterface } from '../nodes';

/**
 * Interface for selector parser context.
 */
export type Context = {
    /**
     * Collected result.
     */
    ast: AnySelectorNodeInterface | null;

    /**
     * Array of nodes as path to buffer node.
     */
    pathToBufferNode: AnySelectorNodeInterface[];

    /**
     * Array of extended pseudo-class names;
     * needed for checking while going deep into extended selector.
     */
    extendedPseudoNamesStack: string[];

    /**
     * Array of brackets for proper extended selector args collecting.
     */
    extendedPseudoBracketsStack: string[];

    /**
     * Array of standard pseudo-class names.
     */
    standardPseudoNamesStack: string[];

    /**
     * Array of brackets for proper standard pseudo-class handling.
     */
    standardPseudoBracketsStack: string[];

    /**
     * Flag for processing comma inside attribute value.
     */
    isAttributeBracketsOpen: boolean;

    /**
     * Buffer for attribute to parse it properly.
     */
    attributeBuffer: string;

    /**
     * Flag for extended pseudo-class arg regexp values.
     */
    isRegexpOpen: boolean;

    /**
     * Character of the currently open quoted string, if any.
     * Needed to not treat quoted values as selector syntax,
     * e.g. ':upward([data-x=":remove-attr(title)"])'.
     */
    quoteCharacter: string | undefined;

    /**
     * Flag for optimizing ast before return.
     * Needed for :not() and :is() pseudo-classes
     * which should be parsed as standard if arg has no extended selector.
     */
    shouldOptimize: boolean;
};
