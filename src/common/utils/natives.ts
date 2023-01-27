declare global {
    interface Window {
        WebKitMutationObserver: MutationObserver;
    }
}

export const natives = {
    MutationObserver: window.MutationObserver || window.WebKitMutationObserver,
};

/**
 * Class NativeTextContent is needed to intercept and save the native Node textContent getter
 * for proper work of :contains() pseudo-class as it may be mocked.
 *
 * @see {@link https://github.com/AdguardTeam/ExtendedCss/issues/127}
 */
export class NativeTextContent {
    /**
     * Native Node.
     */
    private nativeNode;

    /**
     * Native Node textContent getter.
     */
    public getter: (() => string) | undefined;

    /**
     * Stores native node.
     */
    constructor() {
        this.nativeNode = window.Node || Node;
    }

    /**
     * Sets native Node textContext getter to `getter` class field.
     */
    public setGetter(): void {
        this.getter = Object.getOwnPropertyDescriptor(this.nativeNode.prototype, 'textContent')?.get;
    }
}

export const nativeTextContent = new NativeTextContent();
