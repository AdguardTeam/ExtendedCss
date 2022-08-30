import { ExtCssRuleData, ExtCssRuleDataWithContentStyle } from './stylesheet/parser';
import { ExtMutationObserver } from './helpers/mutation-observer';
declare type ValidationResult = {
    ok: boolean;
    error: string | null;
};
export declare type MainCallback = () => void;
interface AffectedElementProto {
    node: HTMLElement;
    originalStyle: string;
    protectionObserver?: ExtMutationObserver | null;
    removed?: boolean;
}
/**
 * Interface for internal lib usage
 */
export interface AffectedElement extends AffectedElementProto {
    rules: ExtCssRuleData[];
}
/**
 * Api interface with required 'content' style property in rules
 */
export interface IAffectedElement extends Partial<AffectedElementProto> {
    node: HTMLElement;
    rules: ExtCssRuleDataWithContentStyle[];
}
/**
 * Needed for getting affected node elements and handle style properties
 * before they are applied to them if it is necessary.
 *
 * Used by AdGuard Browser extension to display rules in Filtering log
 * and `collect-hits-count` (via tsurlfilter's CssHitsCounter)
 */
declare type BeforeStyleAppliedCallback = (x: IAffectedElement) => AffectedElement;
export interface ExtCssConfiguration {
    styleSheet: string;
    beforeStyleApplied?: BeforeStyleAppliedCallback;
    debug?: boolean;
}
interface RemovalsStatistic {
    [key: string]: number;
}
export interface Context {
    beforeStyleApplied?(x: IAffectedElement): AffectedElement;
    affectedElements: AffectedElement[];
    isDomObserved: boolean;
    domMutationObserver?: MutationObserver;
    mainCallback: MainCallback;
    removalsStatistic: RemovalsStatistic;
    parsedRules: ExtCssRuleData[];
    debug: boolean;
    timingsPrinted?: boolean;
}
/**
 * Main Extended css class
 */
export declare class ExtendedCss {
    private context;
    private applyRulesScheduler;
    private mainCallback;
    constructor(configuration: ExtCssConfiguration);
    /**
     * Applies filtering rules
     */
    private applyRules;
    /**
     * Applies stylesheet rules on page
     */
    apply(): void;
    /**
     * Disposes ExtendedCss and removes our styles from matched elements
     */
    dispose(): void;
    /**
     * Exposed for testing purposes only
     */
    _getAffectedElements(): AffectedElement[];
    /**
     * Returns a list of the document's elements that match the specified selector.
     * Uses ExtCssDocument.querySelectorAll()
     * @param selector selector text
     * @param [noTiming=true] if true -- do not print the timing to the console
     * @returns a list of elements that match the selector
     * @throws an error if selector is not valid
     */
    static query(selector: string, noTiming?: boolean): HTMLElement[];
    /**
     * Validates selector
     * @param selector selector text
     */
    static validate(selector: string): ValidationResult;
}
export {};
