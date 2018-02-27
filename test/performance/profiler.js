/**
 * A very simple profiler.
 * Use it to wrap a function and record all the function calls.
 */
var Profiler = (function () {

    /**
     * Contains all the information about functions being profiled
     */
    var perfCounters = {};

    /**
     * Creates an empty performance counters object
     */
    var createPerformanceCounter = function (name) {
        return {
            /** Counter name */
            name: name,
            /** Total count of calls */
            count: 0,
            /** Total time elapsed (ms) */
            totalElapsed: 0,
            /** Avg elapsed per call (ms) */
            averageElapsed: 0,
            /** Min elapsed on a call (ms) */
            minElapsed: null,
            /** Max elapsed on a call (ms) */
            maxElapsed: null,
            /** Exceptions thrown */
            errors: 0
        };
    };

    /**
     * Wraps the specified function in order to measure its performance
     * 
     * @param {*} func function to wrap
     * @param {*} name profile/function name
     * @returns a wrapped function. Every call of that wrapped function is to be recorded
     */
    var profile = function (func, name) {

        return function () {

            var startTime = performance.now();
            // Calling the original function
            // TODO: Catch exception and count errors
            var returnVal = func.apply(this, arguments);
            var elapsed = performance.now() - startTime;

            // Getting or creating the functions perf counter
            var perfCounter = perfCounters[name];
            if (!perfCounter) {
                perfCounter = createPerformanceCounter(name);
                perfCounters[name] = perfCounter;
            }

            // Incrementing it
            perfCounter.count++;
            perfCounter.totalElapsed += elapsed;
            perfCounter.averageElapsed = perfCounter.totalElapsed / perfCounter.count;
            if (perfCounter.minElapsed === null || perfCounter.minElapsed > elapsed) {
                perfCounter.minElapsed = elapsed;
            }
            if (perfCounter.maxElapsed === null || perfCounter.maxElapsed < elapsed) {
                perfCounter.maxElapsed = elapsed;
            }

            return returnVal;
        };
    };

    /**
     * Prints all the recorded performance counters data to the console
     */
    var print = function () {
        for (var name in perfCounters) {
            if (perfCounters.hasOwnProperty(name)) {
                var perfCounter = perfCounters[name];
                console.log(JSON.stringify(perfCounter, null, 4));
            }
        }
    };

    /** 
     * Gets all the recorded performance counters
     */
    var getCounters = function() {
        return perfCounters;
    };

    /**
     * Clears all the recorded data
     */
    var clear = function () {
        perfCounters = {};
    };

    // Expose
    return {
        profile: profile,
        print: print,
        clear: clear,
        getCounters: getCounters
    };
})();