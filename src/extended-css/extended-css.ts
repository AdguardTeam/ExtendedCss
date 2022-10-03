import { ExtCssDocument } from '../selector';
import { parse as parseStylesheet } from '../stylesheet';

import { AsyncWrapper } from './helpers/async-wrapper';
import { applyRules } from './helpers/rules-applier';
import { revertStyle } from './helpers/style-setter';
import { mainDisconnect } from './helpers/document-observer';
import {
    AffectedElement,
    BeforeStyleAppliedCallback,
    Context,
    MainCallback,
} from './helpers/types';

import { isBrowserSupported } from '../common/utils/user-agents';
import { logger } from '../common/utils/logger';

import { DEBUG_PSEUDO_PROPERTY_GLOBAL_VALUE } from '../common/constants';

/**
 * Throttle timeout for AsyncWrapper to execute applyRules()
 */
const APPLY_RULES_DELAY = 150;

/**
 * Result of selector validation
 */
type ValidationResult = {
    ok: boolean,
    error: string | null,
};

/**
 * Interface for ExtendedCss constructor argument. Needed to create the instance of ExtendedCss.
 *
 * ExtendedCss configuration should contain:
 * - CSS stylesheet of rules to apply
 * - the callback for matched elements
 * and also may contain a flag for global logging which is useful for selectors debugging.
 *
 * Stylesheet can contain not just extended selectors, and all of them will be applied by the lib.
 * Stylesheet does not support CSS comments and at-rules.
 */
export interface ExtCssConfiguration {
    /**
     * Standard CSS stylesheet — a set of CSS rules
     * which generally consists of selector and style (except `:remove()` pseudo-class).
     *
     * ExtendedCss is able to parse and apply almost any CSS stylesheet, not just extended selectors
     * but there are some limitations - for example, CSS comments and at-rules are not supported;
     * learn more about the Limitations in README.md
     */
    styleSheet: string;

    /**
     * The callback that handles affected elements.
     *
     * Needed for getting affected node elements and handle style properties
     * before they are applied to them if it is necessary.
     *
     * Used by AdGuard Browser extension to display rules in Filtering log
     * and `collect-hits-count` (via tsurlfilter's CssHitsCounter)
     */
    beforeStyleApplied?: BeforeStyleAppliedCallback;

    /**
     * Optional flag for global debugging mode.
     *
     * Alternatively can be set by extended pseudo-property `debug: global` in styleSheet rules
     *
     * Learn more about Selectors debug mode in README.md
     */
    debug?: boolean;
}

/**
 * Main class of ExtendedCss lib.
 *
 * Parses css stylesheet with any selectors (passed to its argument as styleSheet),
 * and guarantee its applying as mutation observer is used to prevent the restyling of needed elements by other scripts.
 * This style protection is limited to 50 times to avoid infinite loop (MAX_STYLE_PROTECTION_COUNT).
 * Our own AsyncWrapper is used for styles applying to avoid too often lib reactions on page mutations.
 *
 * Constructor creates the instance of class which should be run be `apply()` method to apply the rules,
 * and the applying can be stopped by `dispose()`.
 *
 * Can be used to select page elements by selector with `query()` method (similar to `Document.querySelectorAll()`),
 * which does not require instance creating
 */
export class ExtendedCss {
    private context: Context;

    private applyRulesScheduler: AsyncWrapper;

    private mainCallback: MainCallback;

    // Instance of ExtCssDocument is needed for using selector-ast cache
    extCssDocument: ExtCssDocument;

    constructor(configuration: ExtCssConfiguration) {
        if (!isBrowserSupported()) {
            throw new Error('Browser is not supported by ExtendedCss.');
        }

        if (!configuration) {
            throw new Error('ExtendedCss configuration should be provided.');
        }

        this.extCssDocument = new ExtCssDocument();

        this.context = {
            beforeStyleApplied: configuration.beforeStyleApplied,
            debug: false,
            affectedElements: [],
            isDomObserved: false,
            removalsStatistic: {},
            parsedRules: parseStylesheet(configuration.styleSheet, this.extCssDocument),
            mainCallback: () => {},
        };

        // true if set in configuration
        // or any rule in styleSheet has `debug: global`
        this.context.debug = configuration.debug || this.context.parsedRules.some((ruleData) => {
            return ruleData.debug === DEBUG_PSEUDO_PROPERTY_GLOBAL_VALUE;
        });

        this.applyRulesScheduler = new AsyncWrapper(this.context, applyRules, APPLY_RULES_DELAY);
        this.mainCallback = this.applyRulesScheduler.run.bind(this.applyRulesScheduler);

        this.context.mainCallback = this.mainCallback;

        if (this.context.beforeStyleApplied && typeof this.context.beforeStyleApplied !== 'function') {
            throw new Error(`Invalid configuration. Type of 'beforeStyleApplied' should be a function, received: '${typeof this.context.beforeStyleApplied}'`); // eslint-disable-line max-len
        }
    }

    /**
     * Applies stylesheet rules on page
     */
    apply(): void {
        applyRules(this.context);

        if (document.readyState !== 'complete') {
            document.addEventListener(
                'DOMContentLoaded',
                () => { applyRules(this.context); },
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
    getAffectedElements(): AffectedElement[] {
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
