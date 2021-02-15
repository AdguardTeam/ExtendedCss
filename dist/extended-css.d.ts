declare module 'extended-css' {
    export interface IAffectedElement {
        rules: { style: { content: string }}[]
        node: HTMLElement;
    }

    export interface IConfiguration {
        styleSheet: string;
        beforeStyleApplied?(x:IAffectedElement): IAffectedElement;
    }

    export default class ExtendedCss {
        constructor(configuration: IConfiguration);

        /**
         *  Applies filtering rules
         */
        apply(): void;

        /**
         * Disposes ExtendedCss and removes our styles from matched elements
         */
        dispose(): void;

        /**
         * Exposes querySelectorAll for debugging and validating selectors
         * @param selectorText
         * @param noTiming
         */
        static query(selectorText: string, noTiming: boolean): void;

        /**
         * Used for testing purposes only
         */
        _getAffectedElements(): IAffectedElement[];
    }
}


