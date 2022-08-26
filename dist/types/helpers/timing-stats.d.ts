/**
 * A helper class for applied rule stats
 */
export declare class TimingStats {
    private array;
    length: number;
    private sum;
    private squaredSum;
    private mean?;
    private stddev;
    constructor();
    /**
     * Observe target element and mark observer as active
     */
    push(dataPoint: number): void;
}
