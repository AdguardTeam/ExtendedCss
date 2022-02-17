import {
    REGEXP_WITH_FLAGS_REGEXP,
    SLASH,
} from './constants';

/**
 * Checks whether the textContent is matched by :contains arg
 * @param textContent dom element textContent
 * @param rawPseudoArg argument of :contains pseudo-class
 */
export const matchingText = (textContent: string, rawPseudoArg: string): boolean => {
    let isTextContentMatched;

    /**
     * TODO: add helper for parsing rawPseudoArg (string or regexp) later,
     * seems to be similar for few extended pseudo-classes
     */
    let pseudoArg = rawPseudoArg;

    if (pseudoArg.startsWith(SLASH)
        && REGEXP_WITH_FLAGS_REGEXP.test(pseudoArg)) {
        // regexp arg
        const flagsIndex = pseudoArg.lastIndexOf('/');
        const flagsStr = pseudoArg.substring(flagsIndex + 1);
        pseudoArg = pseudoArg
            .substring(0, flagsIndex + 1)
            .slice(1, -1)
            .replace(/\\([\\"])/g, '$1');
        let regex;
        try {
            regex = new RegExp(pseudoArg, flagsStr);
        } catch (e) {
            throw new Error(`Invalid argument of :contains pseudo-class: ${rawPseudoArg}`);
        }
        isTextContentMatched = regex.test(textContent);
    } else {
        // none-regexp arg
        pseudoArg = pseudoArg.replace(/\\([\\()[\]"])/g, '$1');
        isTextContentMatched = textContent.includes(pseudoArg);
    }

    return isTextContentMatched;
};
