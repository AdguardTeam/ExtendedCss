import { extCssDocument } from '../selector';
import { parseStylesheet } from '../stylesheet';
import { parseRemoveSelector, parseRules } from '../css-rule';

import { ThrottleWrapper } from './helpers/throttle-wrapper';
import { applyRules } from './helpers/rules-applier';
import { revertStyle } from './helpers/style-setter';
import { disconnectDocument } from './helpers/document-observer';
import {
    AffectedElement,
    BeforeStyleAppliedCallback,
    Context,
} from './helpers/types';

import { getErrorMessage } from '../common/utils/error';
import { isBrowserSupported } from '../common/utils/user-agents';
import { logger } from '../common/utils/logger';
import { nativeTextContent } from '../common/utils/natives';

import { DEBUG_PSEUDO_PROPERTY_GLOBAL_VALUE } from '../common/constants';


/**
 * Result of selector validation.
 */
export type SelectorValidationResult = {
    ok: boolean,
    error: string | null,
};

/**
 * Interface for ExtendedCss constructor argument. Needed to create the instance of ExtendedCss.
 *
 * ExtendedCss configuration may contain:
 * - `styleSheet` — CSS stylesheet of rules to apply;
 * - `cssRules` — list of separated CSS rules instead of or additionally to the CSS stylesheet;
 * - `beforeStyleApplied` — the callback for matched elements;
 * - `debug` — flag for global logging which is useful for selectors debugging.
 *
 * > Both `styleSheet` and `cssRules` are optional but at least one of them should be set.
 *
 * > If both `styleSheet` and `cssRules` are set, both of them are to be applied.
 *
 * CSS stylesheet and list of CSS rules can contain not just extended selectors
 * but standard ones, and all of them will be applied by the lib.
 *
 * CSS comments and at-rules are not supported.
 */
export interface ExtCssConfiguration {
    // TODO: deprecate `styleSheet` after the release of version with `cssRules`
    /**
     * Standard CSS stylesheet — a set of CSS rules
     * which generally consists of selector and style (except `:remove()` pseudo-class).
     *
     * ExtendedCss is able to parse and apply almost any CSS stylesheet, not just extended selectors
     * but there are some limitations - for example, CSS comments and at-rules are not supported;
     * learn more about the Limitations in README.md.
     */
    styleSheet?: string;

    /**
     * Array of CSS rules which consist of selector and style.
     * In fact it is similar to `styleSheet` but it is needed
     * for more convenient and flexible parsing of selectors and styles.
     *
     * As an advantage of such approach, invalid rules are skipped
     * in contradistinction to `styleSheet` which might cause its total failure
     * during the applying with some tricky invalid selector in it.
     *
     * Invalid rules reasons are to be logged.
     */
    cssRules?: string[];

    /**
     * The callback that handles affected elements.
     *
     * Needed for getting affected node elements and handle style properties
     * before they are applied to them if it is necessary.
     *
     * Used by AdGuard Browser extension to display rules in Filtering log
     * and `collect-hits-count` (via tsurlfilter's CssHitsCounter).
     */
    beforeStyleApplied?: BeforeStyleAppliedCallback;

    /**
     * Optional flag for global debugging mode.
     *
     * Alternatively can be set by extended pseudo-property `debug: global` in styleSheet rules.
     *
     * Learn more about Selectors debugging mode in README.md.
     */
    debug?: boolean;
}


/**
 * Main class of ExtendedCss lib.
 *
 * Parses css stylesheet with any selectors (passed to its argument as styleSheet),
 * and guarantee its applying as mutation observer is used to prevent the restyling of needed elements by other scripts.
 * This style protection is limited to 50 times to avoid infinite loop (MAX_STYLE_PROTECTION_COUNT).
 * Our own ThrottleWrapper is used for styles applying to avoid too often lib reactions on page mutations.
 *
 * Constructor creates the instance of class which should be run be `apply()` method to apply the rules,
 * and the applying can be stopped by `dispose()`.
 *
 * Can be used to select page elements by selector with `query()` method (similar to `Document.querySelectorAll()`),
 * which does not require instance creating.
 */
export class ExtendedCss {
    private context: Context;

    /**
     * Creates new ExtendedCss.
     *
     * @param configuration ExtendedCss configuration.
     */
    constructor(configuration: ExtCssConfiguration) {
        if (!configuration) {
            throw new Error('ExtendedCss configuration should be provided.');
        }

        this.applyRulesCallbackListener = this.applyRulesCallbackListener.bind(this);

        this.context = {
            beforeStyleApplied: configuration.beforeStyleApplied,
            debug: false,
            affectedElements: [],
            isDomObserved: false,
            removalsStatistic: {},
            parsedRules: [],
            scheduler: new ThrottleWrapper(this.applyRulesCallbackListener),
        };

        // TODO: throw an error instead of logging and handle it in related products.
        if (!isBrowserSupported()) {
            logger.error('Browser is not supported by ExtendedCss');
            return;
        }

        // at least 'styleSheet' or 'cssRules' should be provided
        if (!configuration.styleSheet
            && !configuration.cssRules) {
            throw new Error("ExtendedCss configuration should have 'styleSheet' or 'cssRules' defined.");
        }

        // 'styleSheet' and 'cssRules' are optional
        // and both can be provided at the same time
        // so both should be parsed and applied in such case
        if (configuration.styleSheet) {
            // stylesheet parsing can fail on some invalid selectors
            try {
                this.context.parsedRules.push(...parseStylesheet(configuration.styleSheet, extCssDocument));
            } catch (e: unknown) {
                // eslint-disable-next-line max-len
                throw new Error(`Pass the rules as configuration.cssRules since configuration.styleSheet cannot be parsed because of: '${getErrorMessage(e)}'`);
            }
        }
        if (configuration.cssRules) {
            this.context.parsedRules.push(...parseRules(configuration.cssRules, extCssDocument));
        }

        // true if set in configuration
        // or any rule in styleSheet has `debug: global`
        this.context.debug = configuration.debug || this.context.parsedRules.some((ruleData) => {
            return ruleData.debug === DEBUG_PSEUDO_PROPERTY_GLOBAL_VALUE;
        });

        if (this.context.beforeStyleApplied && typeof this.context.beforeStyleApplied !== 'function') {
            // eslint-disable-next-line max-len
            throw new Error(`Invalid configuration. Type of 'beforeStyleApplied' should be a function, received: '${typeof this.context.beforeStyleApplied}'`);
        }
    }

    /**
     * Invokes {@link applyRules} function with current app context.
     * 
     * This method is bound to the class instance in the constructor because it is called
     * in {@link ThrottleWrapper} and on the DOMContentLoaded event.
     */
    private applyRulesCallbackListener(): void {
        applyRules(this.context);
    }

    /**
     * Initializes ExtendedCss.
     *
     * Should be executed on page ASAP,
     * otherwise the :contains() pseudo-class may work incorrectly.
     */
    init(): void {
        /**
         * Native Node textContent getter must be intercepted as soon as possible,
         * and stored as it is needed for proper work of :contains() pseudo-class
         * because DOM Node prototype 'textContent' property may be mocked.
         *
         * @see {@link https://github.com/AdguardTeam/ExtendedCss/issues/127}
         */
        nativeTextContent.setGetter();
    }

    /**
     * Applies stylesheet rules on page.
     */
    apply(): void {
        applyRules(this.context);

        if (document.readyState !== 'complete') {
            document.addEventListener(
                'DOMContentLoaded',
                this.applyRulesCallbackListener,
                false,
            );
        }
    }

    /**
     * Disposes ExtendedCss and removes our styles from matched elements.
     */
    dispose(): void {
        disconnectDocument(this.context);
        this.context.affectedElements.forEach((el) => {
            revertStyle(el);
        });
        document.removeEventListener(
            'DOMContentLoaded',
            this.applyRulesCallbackListener,
            false,
        );
    }

    /**
     * Exposed for testing purposes only.
     *
     * @returns Array of AffectedElement data objects.
     */
    getAffectedElements(): AffectedElement[] {
        return this.context.affectedElements;
    }

    /**
     * Returns a list of the document's elements that match the specified selector.
     * Uses ExtCssDocument.querySelectorAll().
     *
     * @param selector Selector text.
     * @param [noTiming=true] If true — do not print the timings to the console.
     *
     * @throws An error if selector is not valid.
     * @returns A list of elements that match the selector.
     */
    public static query(selector: string, noTiming = true): HTMLElement[] {
        if (typeof selector !== 'string') {
            throw new Error('Selector should be defined as a string.');
        }

        const start = performance.now();

        try {
            return extCssDocument.querySelectorAll(selector);
        } finally {
            const end = performance.now();
            if (!noTiming) {
                logger.info(`[ExtendedCss] Elapsed: ${Math.round((end - start) * 1000)} μs.`);
            }
        }
    }

    /**
     * Validates selector.
     *
     * @param inputSelector Selector text to validate.
     *
     * @returns Result of selector validation.
     */
    public static validate(inputSelector: string): SelectorValidationResult {
        try {
            // ExtendedCss in general supports :remove() in selector
            // but ExtendedCss.query() does not support it as it should be parsed by stylesheet parser.
            // so for validation we have to handle selectors with `:remove()` in it
            const { selector } = parseRemoveSelector(inputSelector);
            ExtendedCss.query(selector);
            return { ok: true, error: null };
        } catch (e: unknown) {
            // not valid input `selector` should be logged eventually
            const error = `Error: Invalid selector: '${inputSelector}' -- ${getErrorMessage(e)}`;
            return { ok: false, error };
        }
    }
}
