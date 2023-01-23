import { ExtCssDocument } from '../../src/selector';

export type XpathEvaluationResult = {
    counter: number,
    elements: Element[],
};

export const checkXpathEvaluation = (selector: string, document: Document): XpathEvaluationResult => {
    let counter = 0;
    const nativeEvaluate = Document.prototype.evaluate;
    Document.prototype.evaluate = (...args) => {
        counter += 1;
        return nativeEvaluate.apply(document, args);
    };
    const extCssDoc = new ExtCssDocument();
    const elements = extCssDoc.querySelectorAll(selector);

    return { counter, elements };
};
