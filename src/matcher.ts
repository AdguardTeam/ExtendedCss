import utils from './utils';
import { matchingText } from './matcher-utils';

const matchPseudo = {
    /**
     * Checks whether the element satisfies condition of contains pseudo-class
     * @param domElement dom node
     * @param rawPseudoArg contains pseudo-class arg
     */
    contains: (domElement: Node, rawPseudoArg: string): boolean => {
        const elemTextContent = utils.getNodeTextContent(domElement);
        let isTextContentMatched;
        try {
            isTextContentMatched = matchingText(elemTextContent, rawPseudoArg);
        } catch (error) {
            isTextContentMatched = false;
            throw error;
        }
        return isTextContentMatched;
    },
};

export default matchPseudo;
