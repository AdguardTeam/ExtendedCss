/**
 * A helper class for applied rule stats
 */
export class TimingStats {
    private array: number[];

    length: number;

    private sum: number;

    private squaredSum: number;

    private mean?: number;

    private stddev: number;

    constructor() {
        this.array = [];
        this.length = 0;
        this.sum = 0;
        this.squaredSum = 0;
        this.stddev = 0;
    }

    /**
     * Observe target element and mark observer as active
     */
    push(dataPoint: number): void {
        this.array.push(dataPoint);
        this.length += 1;
        this.sum += dataPoint;
        this.squaredSum += dataPoint * dataPoint;
        this.mean = this.sum / this.length;
        this.stddev = Math.sqrt((this.squaredSum / this.length) - Math.pow(this.mean, 2));
    }
}
