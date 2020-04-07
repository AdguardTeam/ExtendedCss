declare module 'extended-css' {
    export interface IAffectedElement {
        rules: { style: { content: string }}[]
        node: HTMLElement;
    }

    export interface IConfiguration {
        styleSheets: string;
        beforeStyleApplied(x:IAffectedElement): IAffectedElement;
    }

    export class ExtendedCss {
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
        _getAffectedElements(): IAffectedElement[];
    }
}


