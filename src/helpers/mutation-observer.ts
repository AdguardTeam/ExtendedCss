import { natives } from '../common/utils/natives';

export type ProtectionCallback = (m: MutationRecord[], o: ExtMutationObserver) => void;

/**
 * ExtMutationObserver is a wrapper over regular MutationObserver with one additional function:
 * it keeps track of the number of times we called the "ProtectionCallback".
 * We use an instance of this to monitor styles added by ExtendedCss
 * and to make sure these styles are recovered if the page script attempts to modify them.
 * However, we want to avoid endless loops of modification if the page script repeatedly modifies the styles.
 * So we keep track of the number of calls and expose it via public property "styleProtectionCount"
 * so that the caller could make a decision whether to continue recovering the styles or not.
 */
export class ExtMutationObserver {
    private observer: MutationObserver;

    isActive: boolean;

    // extra property for keeping 'style fix counts'
    styleProtectionCount: number;

    constructor(callback: ProtectionCallback) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.observer = new (natives.MutationObserver as any)(callback);
        this.isActive = false;
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
