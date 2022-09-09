import { CssStyleMap, ExtCssRuleData } from '../../stylesheet/parser';
import { ExtMutationObserver } from './mutation-observer';

export type MainCallback = () => void;

export type ProtectionCallback = (m: MutationRecord[], o: ExtMutationObserver) => void;

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
 * Needed for ExtCssConfiguration.beforeStyleApplied();
 * value of 'content' property is applied rule text
 */
interface CssStyleMapWithContent extends CssStyleMap {
    content: string;
}

/**
 * Rule data interface with required 'style' property defined with required 'content' property
 */
interface ExtCssRuleDataWithContentStyle extends Partial<ExtCssRuleData> {
    style: CssStyleMapWithContent;
}

/**
 * Api interface with required 'content' style property in rules
 */
export interface IAffectedElement extends Partial<AffectedElementProto> {
    node: HTMLElement;
    rules: ExtCssRuleDataWithContentStyle[];
}

/**
 * Data pairs for selector and number of times the element was removed by ExtendedCss.
 * Needed to avoid infinite loop of re-setting styles
 */
interface RemovalsStatistic {
    [key: string]: number;
}

/**
 * Needed for getting affected node elements and handle style properties
 * before they are applied to them if it is necessary.
 *
 * Used by AdGuard Browser extension to display rules in Filtering log
 * and `collect-hits-count` (via tsurlfilter's CssHitsCounter)
 */
export type BeforeStyleAppliedCallback = (x:IAffectedElement) => AffectedElement;

export interface Context {
    /**
     * Callback that handles affected elements
     */
    beforeStyleApplied?: BeforeStyleAppliedCallback;

    /**
     * Array of data which represents parsed rules, matched dom node, etc.
     */
    affectedElements: AffectedElement[];

    /**
     * Flag for mainObserve() and mainDisconnect(), used while rules applying
     */
    isDomObserved: boolean;

    /**
     * Main document mutation observer
     */
    domMutationObserver?: MutationObserver;

    /**
     * Actually the main callback — applyRules() scheduled by AsyncWrapper
     */
    mainCallback: MainCallback;

    /**
     * Info about element selectors and their removing counter
     */
    removalsStatistic: RemovalsStatistic;

    /**
     * Array of parsed rules data needed for elements selecting and processing by ExtendedCss
     */
    parsedRules: ExtCssRuleData[];

    /**
     * Flag for global debugging mode
     * which can be set in either ExtCssConfiguration or rules
     */
    debug: boolean;

    /**
     * Flag for printing information about applied rules
     */
    areTimingsPrinted?: boolean;
}
