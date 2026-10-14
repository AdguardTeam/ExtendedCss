import type { ExtCssRuleData } from '../../css-rule';
import type { EventTracker } from './event-tracker';
import type { ExtMutationObserver } from './mutation-observer';
import type { ThrottleWrapper } from './throttle-wrapper';

export type MainCallback = () => void;

export type ProtectionCallback = (m: MutationRecord[], o: ExtMutationObserver) => void;

/**
 * Prototype interface for:
 *  - `AffectedElement` for internal lib usage
 *     where no required style properties in rules;
 *  - `IAffectedElement` for export
 *     where 'originalStyle' property is not required.
 */
interface AffectedElementProto {
    node: HTMLElement;
    originalStyle: string;
    protectionObserver?: ExtMutationObserver | null;
    removed?: boolean;
}

/**
 * Data pairs for selector and number of times the element was removed by ExtendedCss.
 * Needed to avoid infinite loop of re-setting styles.
 */
type RemovalsStatistic = {
    [key: string]: number;
};

/**
 * Interface for internal lib usage.
 */
export interface AffectedElement extends AffectedElementProto {
    rules: ExtCssRuleData[];
    /**
     * Flag indicating that regular styles of the element are already applied.
     */
    isStyleApplied?: boolean;
    /**
     * Flag indicating that the element has regular styles applied,
     * so it should be style-protected and reverted.
     */
    hasRegularStyles?: boolean;
    /**
     * Flag indicating that actions of the element are applied
     * (including actions added by the `beforeStyleApplied` callback),
     * so the callback should be called again before actions are re-applied.
     */
    hasActionStyles?: boolean;
    /**
     * Selectors of rules whose regular styles are already applied.
     * Needed to apply styles of rules which start matching later,
     * e.g. selectors depending on styles of other rules.
     */
    appliedStyleSelectors?: Set<string>;
    /**
     * Node selected by the `beforeStyleApplied` callback for the current pass,
     * if it differs from the matched node.
     * Actions and removals are applied to it instead of the matched node.
     */
    callbackNode?: HTMLElement;
}

/**
 * API interface.
 */
export interface IAffectedElement extends Partial<AffectedElementProto> {
    node: HTMLElement;
    rules: Partial<ExtCssRuleData>[];
}

/**
 * Needed for getting affected node elements and handle style properties
 * before they are applied to them if it is necessary.
 *
 * Used by AdGuard Browser extension to display rules in Filtering log
 * and `collect-hits-count` (via tsurlfilter's CssHitsCounter).
 */
export type BeforeStyleAppliedCallback = (x: IAffectedElement) => IAffectedElement;

/**
 * Interface for ExtendedCss context. Needed to store affected elements, collect removal stats, etc.
 */
export type Context = {
    /**
     * Callback that handles affected elements.
     */
    beforeStyleApplied?: BeforeStyleAppliedCallback;

    /**
     * Array of data which represents parsed rules, matched dom node, etc.
     */
    affectedElements: AffectedElement[];

    /**
     * Flag for mainObserve() and mainDisconnect(), used while rules applying.
     */
    isDomObserved: boolean;

    /**
     * Instance of EventTracker for document observing.
     */
    eventTracker?: EventTracker;

    /**
     * Main document mutation observer.
     */
    domMutationObserver?: MutationObserver;

    /**
     * Scheduler to throttle calls to the function that applies rules
     * when a lot of DOM events are being tracked by `domMutationObserver`.
     */
    scheduler: ThrottleWrapper;

    /**
     * Info about element selectors and their removing counter.
     */
    removalsStatistic: RemovalsStatistic;

    /**
     * Statistic of action removals per action argument for each element,
     * needed to avoid an endless loop of removing re-added attributes or classes.
     * Keyed by DOM element, so it survives affected element re-creation.
     */
    actionRemovalsStatistic: WeakMap<HTMLElement, RemovalsStatistic>;

    /**
     * Array of parsed rules data needed for elements selecting and processing by ExtendedCss.
     */
    parsedRules: ExtCssRuleData[];

    /**
     * Flag for global debugging mode
     * which can be set in either ExtCssConfiguration or rules.
     */
    debug: boolean;

    /**
     * Flag for printing information about applied rules.
     */
    areTimingsPrinted?: boolean;
};
