declare module 'extended-css' {
    interface IConfiguration {
        styleSheets: string;
        beforeStyleApplied(): HTMLElement;
    }

    class ExtendedCss {
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
        query(selectorText: string, noTiming: boolean): void;

        /**
         * Used for testing purposes only
         */
        _getAffectedElements(): HTMLElement[];
    }
}


