declare global {
    interface Window {
        WebKitMutationObserver: MutationObserver;
    }
}

export const natives = {
    MutationObserver: window.MutationObserver || window.WebKitMutationObserver,
};

/**
 * As soon as possible stores native Node textContent getter to be used for contains pseudo-class
 * because elements' 'textContent' and 'innerText' properties might be mocked.
 *
 * @see {@link https://github.com/AdguardTeam/ExtendedCss/issues/127}
 */
export const nodeTextContentGetter = (() => {
    const nativeNode = window.Node || Node;
    return Object.getOwnPropertyDescriptor(nativeNode.prototype, 'textContent')?.get;
})();
