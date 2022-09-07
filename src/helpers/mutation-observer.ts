import { natives } from '../common/utils/natives';
import { logger } from '../common/utils/logger';

import { MAX_STYLE_PROTECTION_COUNT } from '../common/constants';

export type ProtectionCallback = (m: MutationRecord[], o: ExtMutationObserver) => void;

/**
 * ExtMutationObserver is a wrapper over regular MutationObserver with one additional function:
 * it keeps track of the number of times we called the "ProtectionCallback".
 *
 * We use an instance of this to monitor styles added by ExtendedCss
 * and to make sure these styles are recovered if the page script attempts to modify them.
 *
 * However, we want to avoid endless loops of modification if the page script repeatedly modifies the styles.
 * So we keep track of the number of calls and observe() makes a decision
 * whether to continue recovering the styles or not.
 */
export class ExtMutationObserver {
    private observer: MutationObserver;

    // extra property for keeping 'style fix counts'
    private styleProtectionCount: number;

    constructor(protectionCallback: ProtectionCallback) {
        this.styleProtectionCount = 0;
        this.observer = new natives.MutationObserver((mutations: MutationRecord[]) => {
            if (!mutations.length) {
                return;
            }
            this.styleProtectionCount += 1;
            protectionCallback(mutations, this);
        });
    }

    /**
     * Starts to observe target element,
     * prevents infinite loop of observing due to the limited number of times of callback runs
     */
    observe(target: Node, options: MutationObserverInit): void {
        if (this.styleProtectionCount < MAX_STYLE_PROTECTION_COUNT) {
            this.observer.observe(target, options);
        } else {
            logger.error('ExtendedCss: infinite loop protection for style');
        }
    }

    /**
     * Disconnect ExtMutationObserver
     */
    disconnect(): void {
        this.observer.disconnect();
    }
}
