import {
    parse as parseStylesheet,
    CssStyleMap,
    ExtCssRuleData,
    ExtCssRuleDataWithContentStyle,
} from './stylesheet/parser';

import {
    ExtCssDocument,
    selectElementsByAst,
} from './selector/query';

import { AsyncWrapper } from './helpers/async-wrapper';
import { EventTracker } from './helpers/event-tracker';
import {
    ProtectionCallback,
    ExtMutationObserver,
} from './helpers/mutation-observer';
import { TimingStats } from './helpers/timing-stats';

import { natives } from './common/utils/natives';
import { logger } from './common/utils/logger';
import { removeSuffix } from './common/utils/strings';
import { getElementSelectorPath } from './common/utils/nodes';

import {
    DEBUG_PSEUDO_PROPERTY_GLOBAL_VALUE,
    PSEUDO_PROPERTY_POSITIVE_VALUE,
    REMOVE_PSEUDO_PROPERTY_KEY,
} from './common/constants';

const APPLY_RULES_DELAY = 150;

const isEventListenerSupported = typeof window.addEventListener !== 'undefined';

type ValidationResult = {
    ok: boolean,
    error: string | null,
};

export type MainCallback = () => void;

const observeDocument = (context: Context, callback: MainCallback): void => {
    // We are trying to limit the number of callback calls by not calling it on all kind of "hover" events.
    // The rationale behind this is that "hover" events often cause attributes modification,
    // but re-applying extCSS rules will be useless as these attribute changes are usually transient.
    const shouldIgnoreMutations = (mutations: MutationRecord[]) => {
        // ignore if all mutations are about attributes changes
        return mutations.every((m) => m.type === 'attributes');
    };

    if (natives.MutationObserver) {
        context.domMutationObserver = new natives.MutationObserver(((mutations) => {
            if (!mutations || mutations.length === 0) {
                return;
            }
            const eventTracker = new EventTracker();
            if (eventTracker.isIgnoredEventType() && shouldIgnoreMutations(mutations)) {
                return;
            }
            callback();
        }));
        context.domMutationObserver.observe(document, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['id', 'class'],
        });
    } else if (isEventListenerSupported) {
        document.addEventListener('DOMNodeInserted', callback, false);
        document.addEventListener('DOMNodeRemoved', callback, false);
        document.addEventListener('DOMAttrModified', callback, false);
    }
};

const disconnectDocument = (context: Context, callback: MainCallback): void => {
    if (context.domMutationObserver) {
        context.domMutationObserver.disconnect();
    } else if (isEventListenerSupported) {
        document.removeEventListener('DOMNodeInserted', callback, false);
        document.removeEventListener('DOMNodeRemoved', callback, false);
        document.removeEventListener('DOMAttrModified', callback, false);
    }
};

/**
 * Sets style to the specified DOM node
 * @param node element
 * @param style style
 */
const setStyleToElement = (node: Node, style: CssStyleMap): void => {
    if (!(node instanceof HTMLElement)) {
        return;
    }
    Object.keys(style).forEach((prop) => {
        // Apply this style only to existing properties
        // We can't use hasOwnProperty here (does not work in FF)
        if (typeof node.style.getPropertyValue(prop) !== 'undefined') {
            let value = style[prop];
            // First we should remove !important attribute (or it won't be applied')
            value = removeSuffix(value.trim(), '!important').trim();
            node.style.setProperty(prop, value, 'important');
        }
    });
};

const MAX_STYLE_PROTECTION_COUNT = 50;

const protectionObserverOption = {
    attributes: true,
    attributeOldValue: true,
    attributeFilter: ['style'],
};

/**
 * Creates MutationObserver protection callback
 * @param styles
 */
const createProtectionCallback = (styles: CssStyleMap[]): ProtectionCallback => {
    const protectionCallback = (mutations: MutationRecord[], observer: ExtMutationObserver): void => {
        if (!mutations.length) {
            return;
        }
        const { target } = mutations[0];
        observer.disconnect();
        styles.forEach((style) => {
            setStyleToElement(target, style);
        });

        if (typeof observer.styleProtectionCount === 'undefined') {
            observer.styleProtectionCount = 0;
        }
        observer.styleProtectionCount += 1;

        if (observer.styleProtectionCount < MAX_STYLE_PROTECTION_COUNT) {
            observer.observe(target, protectionObserverOption);
        } else {
            logger.error('ExtendedCss: infinite loop protection for style');
        }
    };

    return protectionCallback;
};

/**
 * Sets up a MutationObserver which protects style attributes from changes
 * @param node DOM node
 * @param rules rule data objects
 * @returns Mutation observer used to protect attribute or null if there's nothing to protect
 */
const protectStyleAttribute = (
    node: HTMLElement,
    rules: ExtCssRuleData[],
): ExtMutationObserver | null => {
    if (!natives.MutationObserver) {
        return null;
    }
    const styles: CssStyleMap[] = [];
    rules.forEach((ruleData) => {
        const { style } = ruleData;
        if (!style) {
            throw new Error(`No affectedElement style to apply for selector: '${ruleData.selector}'`);
        }
        styles.push(style);
    });
    const protectionObserver = new ExtMutationObserver(createProtectionCallback(styles));
    protectionObserver.observe(node, protectionObserverOption);
    return protectionObserver;
};

export interface AffectedElement {
    node: HTMLElement;
    rules: ExtCssRuleData[],
    originalStyle: string,
    protectionObserver?: ExtMutationObserver | null,
    removed?: boolean,
}

/**
 * Finds affectedElement object for the specified DOM node
 * @param affElements context.affectedElements
 * @param domNode DOM node
 * @returns found affectedElement or undefined
 */
const findAffectedElement = (affElements: AffectedElement[], domNode: Element): AffectedElement | undefined => {
    return affElements.find((affEl) => affEl.node === domNode);
};

/**
 * Removes affectedElement.node from DOM
 * @param context
 * @param affectedElement
 */
const removeElement = (context: Context, affectedElement: AffectedElement): void => {
    const { node } = affectedElement;

    affectedElement.removed = true;

    const elementSelector = getElementSelectorPath(node);

    // check if the element has been already removed earlier
    const elementRemovalsCounter = context.removalsStatistic[elementSelector] || 0;

    // if removals attempts happened more than specified we do not try to remove node again
    if (elementRemovalsCounter > MAX_STYLE_PROTECTION_COUNT) {
        logger.error(`ExtendedCss: infinite loop protection for selector: '${elementSelector}'`);
        return;
    }

    if (node.parentElement) {
        node.parentElement.removeChild(node);
        context.removalsStatistic[elementSelector] = elementRemovalsCounter + 1;
    }
};

/**
 * Api interface with required 'content' style property in rules
 */
export interface IAffectedElement extends AffectedElement {
    rules: ExtCssRuleDataWithContentStyle[],
}

/**
 * Needed for getting affected node elements and handle style properties
 * before they are applied to them if it is necessary.
 *
 * Used by AdGuard Browser extension to display rules in Filtering log
 * and `collect-hits-count` (via tsurlfilter's CssHitsCounter)
 */
type BeforeStyleAppliedCallback = (x:IAffectedElement) => IAffectedElement;

export interface ExtCssConfiguration {
    // css stylesheet
    styleSheet: string;
    // the callback that handles affected elements
    beforeStyleApplied?: BeforeStyleAppliedCallback;
    // flag for applied selectors logging
    debug?: boolean;
}

interface RemovalsStatistic {
    [key: string]: number;
}

/**
 * Applies style to the specified DOM node
 * @param context
 * @param affectedElement Object containing DOM node and rule to be applied
 */
const applyStyle = (context: Context, affectedElement: AffectedElement): void => {
    if (affectedElement.protectionObserver?.isActive) {
        // style is already applied and protected by the observer
        return;
    }

    if (context.beforeStyleApplied) {
        affectedElement = context.beforeStyleApplied(affectedElement);
        if (!affectedElement) {
            return;
        }
    }

    const { node } = affectedElement;
    for (let i = 0; i < affectedElement.rules.length; i += 1) {
        const { selector, style } = affectedElement.rules[i];
        if (!style) {
            throw new Error(`No affectedElement style to apply for selector: '${selector}'`);
        }
        if (style[REMOVE_PSEUDO_PROPERTY_KEY] === PSEUDO_PROPERTY_POSITIVE_VALUE) {
            removeElement(context, affectedElement);
            return;
        }
        setStyleToElement(node, style);
    }
};

/**
 * Reverts style for the affected object
 */
const revertStyle = (affElement: AffectedElement): void => {
    if (affElement.protectionObserver?.isActive) {
        affElement.protectionObserver.disconnect();
    }
    affElement.node.style.cssText = affElement.originalStyle;
};

/**
 * Applies specified rule and returns list of elements affected
 * @param ruleData rule to apply
 * @returns list of elements affected by the rule
 */
const applyRule = (context: Context, ruleData: ExtCssRuleData): HTMLElement[] => {
    // debugging mode can be enabled in two ways:
    // 1. for separate rules - by `{ debug: true; }`
    // 2. for all rules simultaneously by:
    //   - `{ debug: global; }` in any rule
    //   - positive `debug` property in ExtCssConfiguration
    const isDebuggingMode = !!ruleData.debug || context.debug;
    let startTime: number | undefined;
    if (isDebuggingMode) {
        startTime = AsyncWrapper.now();
    }

    const { ast } = ruleData;
    const nodes = selectElementsByAst(ast);

    nodes.forEach((node) => {
        let affectedElement = findAffectedElement(context.affectedElements, node);

        if (affectedElement) {
            affectedElement.rules.push(ruleData);
            applyStyle(context, affectedElement);
        } else {
            // Applying style first time
            const originalStyle = node.style.cssText;
            affectedElement = {
                node,                       // affected DOM node
                rules: [ruleData],          // rule to be applied
                originalStyle,              // original node style
                protectionObserver: null,   // style attribute observer
            };
            applyStyle(context, affectedElement);
            context.affectedElements.push(affectedElement);
        }
    });

    if (isDebuggingMode && startTime) {
        const elapsed = AsyncWrapper.now() - startTime;
        if (!ruleData.timingStats) {
            ruleData.timingStats = new TimingStats();
        }
        ruleData.timingStats.push(elapsed);
    }

    return nodes;
};

interface LoggingStat {
    selector: string,
    timings: TimingStats,
}

/**
 * Prints timing information if debugging mode is enabled
 */
const printTimingInfo = (context: Context): void => {
    if (context.timingsPrinted) {
        return;
    }
    context.timingsPrinted = true;

    const timingsToLog: LoggingStat[] = [];

    context.parsedRules.forEach((rule) => {
        if (rule.timingStats) {
            const record = {
                selector: rule.selector,
                timings: rule.timingStats,
            };
            timingsToLog.push(record);
        }
    });

    if (timingsToLog.length === 0) {
        return;
    }
    // add location.href to the message to distinguish frames
    logger.info('[ExtendedCss] Timings in milliseconds for %o:\n%o', window.location.href, timingsToLog);
};

export interface Context {
    beforeStyleApplied?(x: AffectedElement): AffectedElement;
    affectedElements: AffectedElement[],
    isDomObserved: boolean,
    domMutationObserver?: MutationObserver,
    mainCallback: MainCallback,
    removalsStatistic: RemovalsStatistic,
    parsedRules: ExtCssRuleData[],
    debug: boolean,
    timingsPrinted?: boolean
}

const mainObserve = (context: Context, mainCallback: MainCallback): void => {
    if (context.isDomObserved) {
        return;
    }
    // handle dynamically added elements
    context.isDomObserved = true;
    observeDocument(context, mainCallback);
};

const mainDisconnect = (context: Context, mainCallback: MainCallback): void => {
    if (!context.isDomObserved) {
        return;
    }
    context.isDomObserved = false;
    disconnectDocument(context, mainCallback);
};

/**
 * Main Extended css class
 */
export class ExtendedCss {
    private context: Context;

    private applyRulesScheduler: AsyncWrapper;

    private mainCallback: MainCallback;

    constructor(configuration: ExtCssConfiguration) {
        if (!configuration) {
            throw new Error('ExtendedCss configuration should be provided.');
        }

        this.context = {
            beforeStyleApplied: configuration.beforeStyleApplied,
            debug: configuration.debug || false,
            affectedElements: [],
            isDomObserved: false,
            removalsStatistic: {},
            parsedRules: parseStylesheet(configuration.styleSheet),
            mainCallback: () => {},
        };

        // true if any one rule in styleSheet has `debug: global`
        this.context.debug = this.context.parsedRules.some((ruleData) => {
            return ruleData.debug === DEBUG_PSEUDO_PROPERTY_GLOBAL_VALUE;
        });

        this.applyRulesScheduler = new AsyncWrapper(this.context, this.applyRules, APPLY_RULES_DELAY);
        this.mainCallback = this.applyRulesScheduler.run.bind(this.applyRulesScheduler);

        this.context.mainCallback = this.mainCallback;

        if (this.context.beforeStyleApplied && typeof this.context.beforeStyleApplied !== 'function') {
            throw new Error(`Invalid configuration. Type of 'beforeStyleApplied' should be a function, received: '${typeof this.context.beforeStyleApplied}'`); // eslint-disable-line max-len
        }
    }

    /**
     * Applies filtering rules
     */
    private applyRules(context: Context): void {
        const newSelectedElements: HTMLElement[] = [];
        // some rules could make call - selector.querySelectorAll() temporarily to change node id attribute
        // this caused MutationObserver to call recursively
        // https://github.com/AdguardTeam/ExtendedCss/issues/81
        mainDisconnect(context, context.mainCallback);
        context.parsedRules.forEach((ruleData) => {
            const nodes = applyRule(context, ruleData);
            Array.prototype.push.apply(newSelectedElements, nodes);
        });
        // Now revert styles for elements which are no more affected
        let affLength = context.affectedElements.length;
        // do nothing if there is no elements to process
        while (affLength) {
            const affectedEl = context.affectedElements[affLength - 1];
            if (!newSelectedElements.includes(affectedEl.node)) {
                // Time to revert style
                revertStyle(affectedEl);
                context.affectedElements.splice(affLength - 1, 1);
            } else if (!affectedEl.removed) {
                // Add style protection observer
                // Protect "style" attribute from changes
                if (!affectedEl.protectionObserver?.isActive) {
                    affectedEl.protectionObserver = protectStyleAttribute(affectedEl.node, affectedEl.rules);
                }
            }
            affLength -= 1;
        }
        // After styles are applied we can start observe again
        mainObserve(context, context.mainCallback);

        printTimingInfo(context);
    }

    /**
     * Applies stylesheet rules on page
     */
    apply(): void {
        this.applyRules(this.context);

        if (document.readyState !== 'complete') {
            document.addEventListener(
                'DOMContentLoaded',
                () => { this.applyRules(this.context); },
                false,
            );
        }
    }

    /**
     * Disposes ExtendedCss and removes our styles from matched elements
     */
    dispose(): void {
        mainDisconnect(this.context, this.context.mainCallback);
        this.context.affectedElements.forEach((el) => {
            revertStyle(el);
        });
    }

    /**
     * Exposed for testing purposes only
     */
    _getAffectedElements(): AffectedElement[] {
        return this.context.affectedElements;
    }

    /**
     * Returns a list of the document's elements that match the specified selector.
     * Uses ExtCssDocument.querySelectorAll()
     * @param selector selector text
     * @param [noTiming=true] if true -- do not print the timing to the console
     * @returns a list of elements that match the selector
     * @throws an error if selector is not valid
     */
    public static query(selector: string, noTiming = true): HTMLElement[] {
        if (typeof selector !== 'string') {
            throw new Error('Selector should be defined as a string.');
        }

        const start = AsyncWrapper.now();

        try {
            const extCssDoc = new ExtCssDocument();
            return extCssDoc.querySelectorAll(selector);
        } finally {
            const end = AsyncWrapper.now();
            if (!noTiming) {
                logger.info(`[ExtendedCss] Elapsed: ${Math.round((end - start) * 1000)} μs.`);
            }
        }
    }

    /**
     * Validates selector
     * @param selector selector text
     */
    public static validate(selector: string): ValidationResult {
        try {
            ExtendedCss.query(selector);
            return { ok: true, error: null };
        } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            const error = `Error: selector "${selector}" is invalid — ${e.message})`;
            return { ok: false, error };
        }
    }
}
