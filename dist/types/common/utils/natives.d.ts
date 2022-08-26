declare global {
    interface Window {
        WebKitMutationObserver: MutationObserver;
    }
}
export declare const natives: {
    MutationObserver: {
        new (callback: MutationCallback): MutationObserver;
        prototype: MutationObserver;
    };
};
/**
 * As soon as possible stores native Node textContent getter to be used for contains pseudo-class
 * because elements' 'textContent' and 'innerText' properties might be mocked
 * https://github.com/AdguardTeam/ExtendedCss/issues/127
 */
export declare const nodeTextContentGetter: (() => any) | undefined;
