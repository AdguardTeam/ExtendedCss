import { TimingStats } from '../extended-css';
import { AnySelectorNodeInterface } from '../selector';
import { StyleDeclaration } from '../style-block';

export type ParsedSelectorData = {
    selector: string,
    stylesOfSelector: StyleDeclaration[],
};

export type CssStyleMap = {
    [key: string]: string;
};

/**
 * Type for storing data parsed from selector part of css rule.
 */
export type SelectorPartData = {
    /**
     * Success status.
     */
    success: boolean;

    /**
     * Parsed selector.
     */
    selector: string;

    /**
     * Selector ast to query elements by,
     * might be not defined if selector is not valid.
     */
    ast?: AnySelectorNodeInterface;

    /**
     * Styles parsed from selector rule part,
     * relevant to rules with `:remove()` pseudo-class which may not have actual style declaration.
     */
    stylesOfSelector?: StyleDeclaration[];
};

export type RawCssRuleData = {
    /**
     * String selector.
     */
    selector: string;

    /**
     * Parsed selector ast.
     */
    ast?: AnySelectorNodeInterface;

    /**
     * Array of previously collected styles which may contain 'remove' and 'debug'.
     */
    rawStyles?: StyleDeclaration[];

    /**
     * Flag indicating that the selector contains an action pseudo-class,
     * so its styles are action declarations.
     */
    hasActionPseudoClass?: boolean;
};

/**
 * Styles of one parsed rule with the same selector.
 */
export type RawStyleGroup = {
    /**
     * Raw styles of the rule.
     */
    styles: StyleDeclaration[];

    /**
     * Flag indicating that the rule selector contains an action pseudo-class.
     */
    hasActionPseudoClass: boolean;
};

export type RawResultValue = {
    ast: AnySelectorNodeInterface;
    /**
     * Raw styles of each parsed rule with the same selector.
     * Rules are kept separately to preserve the source of styles:
     * action pseudo-class declarations and styles of regular rules
     * are merged differently.
     */
    styleGroups: RawStyleGroup[];
};

export type RawResults = Map<string, RawResultValue>;

/**
 * Interface for rules data parsed from passed styleSheet.
 */
export type ExtCssRuleData = {
    /**
     * Selector text.
     */
    selector: string;

    /**
     * Selector ast to query dom elements.
     */
    ast: AnySelectorNodeInterface;

    /**
     * Styles to apply to matched dom elements.
     */
    style?: CssStyleMap;

    /**
     * Action pseudo-class styles (e.g. `:remove-attr()` or `:remove-class()`)
     * with all their arguments preserved.
     *
     * This is the source of truth for action pseudo-classes:
     * they are not stored in `style` and callbacks can edit them here,
     * e.g. change an argument or remove an action.
     */
    actionStyles?: StyleDeclaration[];

    /**
     * Flag indicating that the `content` style of the rule is declared
     * by an action pseudo-class rule and is kept only for the
     * `beforeStyleApplied` callback (e.g. CssHitsCounter).
     * Such `content` should not be applied to matched elements.
     */
    hasInternalContent?: boolean;

    /**
     * Rule debugging mode value.
     */
    debug?: 'true' | 'global';

    /**
     * Log data, available only for debugging mode.
     */
    timingStats?: TimingStats;

    /**
     * Dom elements matched by rule, available only for debugging mode.
     */
    matchedElements?: HTMLElement[];
};
