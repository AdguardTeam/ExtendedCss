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

export interface ExtCssConfiguration {
    // css stylesheet
    styleSheet: string;
    // the callback that handles affected elements
    beforeStyleApplied?: BeforeStyleAppliedCallback;
    // flag for applied selectors logging
    debug?: boolean;
}

/**
 * Main ExtendedCss class
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
