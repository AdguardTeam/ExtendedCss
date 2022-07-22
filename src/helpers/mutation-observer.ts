import utils from '../utils';

export type ProtectionCallback = (m: MutationRecord[], o: ExtMutationObserver) => void;

export class ExtMutationObserver {
    private observer: MutationObserver;

    isActive: boolean;

    styleProtectionCount: number;

    constructor(callback: ProtectionCallback) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.observer = new (utils.MutationObserver as any)(callback);
        this.isActive = false;
        // extra property for keeping 'style fix counts'
        this.styleProtectionCount = 0;
    }

    /**
     * Observe target element and mark observer as active
     */
    observe(target: Node, options: MutationObserverInit): void {
        this.isActive = true;
        this.observer.observe(target, options);
    }

    /**
     * Disconnect Observer and mark as inactive
     */
    disconnect(): void {
        this.isActive = false;
        this.observer.disconnect();
    }
}
