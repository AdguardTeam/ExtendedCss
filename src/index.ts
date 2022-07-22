import {
    parse as parseStylesheet,
    ExtendedCssRuleData,
    CssStyleMap,
} from './stylesheet/parser';

import {
    ExtCssDocument,
    selectElementsByAst,
} from './selector';

import { AsyncWrapper } from './helpers/async-wrapper';
import { EventTracker } from './helpers/event-tracker';
import {
    ProtectionCallback,
    ExtMutationObserver,
} from './helpers/mutation-observer';

import utils from './utils';
import {
    PSEUDO_PROPERTY_POSITIVE_VALUE,
    REMOVE_PSEUDO_PROPERTY_KEY,
} from './constants';

const APPLY_RULES_DELAY = 150;

const isEventListenerSupported = typeof window.addEventListener !== 'undefined';

const observeDocument = (context: Context, callback: EventListener): void => {
    // We are trying to limit the number of callback calls by not calling it on all kind of "hover" events.
    // The rationale behind this is that "hover" events often cause attributes modification,
    // but re-applying extCSS rules will be useless as these attribute changes are usually transient.
    const shouldIgnoreMutations = (mutations: MutationRecord[]) => {
        // ignore if all mutations are about attributes changes
        return mutations.every((m) => m.type === 'attributes');
    };

    if (utils.MutationObserver) {
        context.domMutationObserver = new utils.MutationObserver(((mutations) => {
            if (!mutations || mutations.length === 0) {
                return;
            }
            const eventTracker = new EventTracker();
            if (eventTracker.isIgnoredEventType() && shouldIgnoreMutations(mutations)) {
                return;
            }
            const lastEvent = eventTracker.getLastEvent();
            if (lastEvent) {
                callback(lastEvent);
            }
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

const disconnectDocument = (context: Context, callback: EventListener): void => {
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
            value = utils.removeSuffix(value.trim(), '!important').trim();
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
    const protectionCallback = (mutations: MutationRecord[], observer: ExtMutationObserver) => {
        if (!mutations.length) {
            return;
        }
        const { target } = mutations[0];
        observer.disconnect();
        styles.forEach((style) => {
            setStyleToElement(target, style);
        });
        observer.styleProtectionCount += 1;
        if (observer.styleProtectionCount < MAX_STYLE_PROTECTION_COUNT) {
            observer.observe(target, protectionObserverOption);
        } else {
            utils.logError('ExtendedCss: infinite loop protection for style');
        }
    };

    return protectionCallback;
};

/**
 * Sets up a MutationObserver which protects style attributes from changes
 * @param node DOM node
 * @param rules rules
 * @returns Mutation observer used to protect attribute or null if there's nothing to protect
 */
const protectStyleAttribute = (
    node: HTMLElement,
    rules: ExtendedCssRuleData[],
): ExtMutationObserver | null => {
    if (!utils.MutationObserver) {
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

interface AffectedElement {
    node: HTMLElement;
    rules: ExtendedCssRuleData[],
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

const removeElement = (context: Context, affectedElement: AffectedElement): void => {
    const { node } = affectedElement;

    affectedElement.removed = true;

    const elementSelector = utils.getNodeSelector(node);

    // check if the element has been already removed earlier
    const elementRemovalsCounter = context.removalsStatistic[elementSelector] || 0;

    // if removals attempts happened more than specified we do not try to remove node again
    if (elementRemovalsCounter > MAX_STYLE_PROTECTION_COUNT) {
        utils.logError(`ExtendedCss: infinite loop protection for selector: '${elementSelector}'`);
        return;
    }

    if (node.parentElement) {
        node.parentElement.removeChild(node);
        context.removalsStatistic[elementSelector] = elementRemovalsCounter + 1;
    }
};

/**
 * Needed for getting affected node elements and handle style properties
 * before they are applied to them if it is necessary.
 *
 * Used by AdGuard Browser extension to display rules in Filtering log
 * and `collect-hits-count` (via tsurlfilter's CssHitsCounter)
 */
type BeforeStyleAppliedCallback = (x:AffectedElement) => AffectedElement;

interface ExtCssConfiguration {
    // css stylesheet
    styleSheet: string;
    // the callback that handles affected elements
    beforeStyleApplied?: BeforeStyleAppliedCallback;
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
 * @returns List of elements affected by this rule
 */
const applyRule = (context: Context, ruleData: ExtendedCssRuleData): HTMLElement[] => {
    // TODO:
    // const debug = rule.debug;
    // let start;
    // if (debug) {
    //     start = AsyncWrapper.now();
    // }

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

    // TODO:
    // if (debug && start) {
    //     const elapsed = AsyncWrapper.now() - start;
    //     if (!('timingStats' in rule)) {
    //         // TODO: remake stats later
    //         // rule.timingStats = new utils.Stats();
    //     }
    //     rule.timingStats.push(elapsed);
    // }

    return nodes;
};

export interface Context {
    beforeStyleApplied?(x: AffectedElement): AffectedElement;
    affectedElements: AffectedElement[],
    domObserved: boolean,
    domMutationObserver?: MutationObserver,
    removalsStatistic: RemovalsStatistic,
    parsedRules: ExtendedCssRuleData[],
}

/**
 * Extended css class
 */
export class ExtendedCss {
    private context: Context;

    private applyRulesScheduler:  AsyncWrapper;

    private mainCallback: () => void;

    constructor(configuration: ExtCssConfiguration) {
        if (!configuration) {
            throw new Error('ExtendedCss configuration should be provided.');
        }

        this.context = {
            beforeStyleApplied: configuration.beforeStyleApplied,
            affectedElements: [],
            domObserved: false,
            removalsStatistic: {},
            parsedRules: parseStylesheet(configuration.styleSheet),
        };

        this.applyRulesScheduler = new AsyncWrapper(this.context, this.applyRules, APPLY_RULES_DELAY);
        this.mainCallback = this.applyRulesScheduler.run.bind(this.applyRulesScheduler);

        if (this.context.beforeStyleApplied && typeof this.context.beforeStyleApplied !== 'function') {
            throw new Error(`Invalid configuration. Type of 'beforeStyleApplied' should be a function, received: '${typeof this.context.beforeStyleApplied}'`); // eslint-disable-line max-len
        }
    }

    /**
     * Applies filtering rules
     */
    private applyRules(context: Context): void {
        const elementsIndex: HTMLElement[] = [];
        // some rules could make call - selector.querySelectorAll() temporarily to change node id attribute
        // this caused MutationObserver to call recursively
        // https://github.com/AdguardTeam/ExtendedCss/issues/81
        this.stopObserve();
        context.parsedRules.forEach((ruleData) => {
            const nodes = applyRule(context, ruleData);
            // Array.prototype.push.apply(elementsIndex, nodes);
            elementsIndex.push(...nodes);
        });
        // Now revert styles for elements which are no more affected
        let l = context.affectedElements.length;
        // do nothing if there is no elements to process
        if (elementsIndex.length > 0) {
            while (l--) {
                const affectedEl = context.affectedElements[l];
                if (elementsIndex.indexOf(affectedEl.node) === -1) {
                    // Time to revert style
                    revertStyle(affectedEl);
                    context.affectedElements.splice(l, 1);
                } else if (!affectedEl.removed) {
                    // Add style protection observer
                    // Protect "style" attribute from changes
                    if (!affectedEl.protectionObserver?.isActive) {
                        affectedEl.protectionObserver = protectStyleAttribute(affectedEl.node, affectedEl.rules);
                    }
                }
            }
        }
        // After styles are applied we can start observe again
        this.observe();
        // TODO:
        // printTimingInfo();
    }

    private observe(): void {
        if (this.context.domObserved) {
            return;
        }
        // handle dynamically added elements
        this.context.domObserved = true;
        observeDocument(this.context, this.mainCallback);
    }

    private stopObserve(): void {
        if (!this.context.domObserved) { return; }
        this.context.domObserved = false;
        disconnectDocument(this.context, this.mainCallback);
    }

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
        this.stopObserve();
        this.context.affectedElements.forEach((el) => {
            revertStyle(el);
        });
    }

    /** Exposed for testing purposes only */
    _getAffectedElements(): AffectedElement[] {
        return this.context.affectedElements;
    }

    /**
     * Expose querySelectorAll for debugging and validating selectors
     *
     * @param {string} selector selector text
     * @returns {Array<Node>|NodeList} a list of elements found
     * @throws Will throw an error if the argument is not a valid selector
     */
    // TODO:
    // * @param {boolean} noTiming if true -- do not print the timing to the console
    // query(selector: string, noTiming: boolean): HTMLElement[] {
    query(selector: string): HTMLElement[] {
        if (typeof selector !== 'string') {
            throw new Error('Selector text is empty');
        }

        // TODO:
        // const { now } = AsyncWrapper;
        // const start = now();

        try {
            const extCssDoc = new ExtCssDocument();
            return extCssDoc.querySelectorAll(selector);
        } finally {
            // TODO:
            // const end = now();
            // if (!noTiming) {
            //     utils.logInfo(`[ExtendedCss] Elapsed: ${Math.round((end - start) * 1000)} μs.`);
            // }
        }
    }

    /**
     * TODO: consider adding a new ExtendedCss method for selectorText validation
     * as there is such old test "Test using ExtendedCss.query for selectors validation"
     */
}

export default ExtendedCss;
