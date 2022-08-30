import { AnySelectorNodeInterface } from '../selector/nodes';
import { TimingStats } from '../helpers/timing-stats';
interface Style {
    property: string;
    value: string;
}
export interface CssStyleMap {
    [key: string]: string;
}
export interface ExtCssRuleData {
    selector: string;
    ast: AnySelectorNodeInterface;
    style?: CssStyleMap;
    debug?: string;
    timingStats?: TimingStats;
}
/**
 * Needed for ExtCssConfiguration.beforeStyleApplied();
 * value of 'content' property is applied rule text
 */
export interface CssStyleMapWithContent extends CssStyleMap {
    content: string;
}
/**
 * Rule data interface with required 'style' property defined with required 'content' property
 */
export interface ExtCssRuleDataWithContentStyle extends Partial<ExtCssRuleData> {
    style: CssStyleMapWithContent;
}
/**
 * Prepares final RuleData
 * @param selector
 * @param ast
 * @param rawStyles array of previously collected styles which may contain 'remove' and 'debug'
 */
export declare const prepareRuleData: (selector: string, ast: AnySelectorNodeInterface, rawStyles: Style[]) => ExtCssRuleData;
/**
 * Parses stylesheet into rules data objects
 * @param stylesheet
 */
export declare const parse: (rawStylesheet: string) => ExtCssRuleData[];
export {};
