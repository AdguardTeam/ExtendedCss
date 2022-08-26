export declare type ProtectionCallback = (m: MutationRecord[], o: ExtMutationObserver) => void;
/**
 * A helper class for MutationObserver with extra property `styleProtectionCount`
 */
export declare class ExtMutationObserver {
    private observer;
    isActive: boolean;
    styleProtectionCount: number;
    constructor(callback: ProtectionCallback);
    /**
     * Observe target element and mark observer as active
     */
    observe(target: Node, options: MutationObserverInit): void;
    /**
     * Disconnect Observer and mark as inactive
     */
    disconnect(): void;
}
