export declare const logger: {
    /**
     * Safe console.error version
     */
    error: {
        (...data: any[]): void;
        (message?: any, ...optionalParams: any[]): void;
    };
    /**
    * Safe console.info version
    */
    info: {
        (...data: any[]): void;
        (message?: any, ...optionalParams: any[]): void;
    };
};
