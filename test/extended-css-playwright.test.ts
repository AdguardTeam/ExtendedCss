/**
 * Vitest browser mode is required for real MutationObserver behavior:
 * attribute filtering/relevance checks and action re-application
 * depend on native mutation delivery and throttled timers.
 */

import { ExtendedCss } from '../src';

// sometimes default 5 seconds are not enough
const TESTS_RUN_TIMEOUT_MS = 20 * 1000;

/**
 * Waits until the callback returns true or the timeout expires.
 *
 * @param callback Condition to wait for.
 * @param timeoutMs Maximum wait time in ms.
 * @throws An error if the condition is not met in time.
 */
const waitFor = async (callback: () => boolean, timeoutMs = 5000): Promise<void> => {
    const start = Date.now();
    const delay = (ms: number): Promise<void> => {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    };
    while (!callback()) {
        if (Date.now() - start > timeoutMs) {
            throw new Error('Timed out while waiting for condition');
        }
        // polling needs sequential awaits
        // eslint-disable-next-line no-await-in-loop
        await delay(50);
    }
};

vi.setConfig({ testTimeout: TESTS_RUN_TIMEOUT_MS });

describe('extended css runtime in browser', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('removes an attribute when the selector attribute is added', async () => {
        document.body.innerHTML = '<div id="browser-selector-attr" onclick="alert(1)"></div>';
        const extendedCss = new ExtendedCss({ cssRules: ['[data-enabled]:remove-attr(/^on/)'] });
        extendedCss.apply();
        try {
            const element = document.getElementById('browser-selector-attr');
            // the rule does not match yet
            expect(element?.hasAttribute('onclick')).toBe(true);

            element?.setAttribute('data-enabled', '');

            // the selector attribute change should trigger a pass
            // and the element should start matching the rule
            await waitFor(() => !element?.hasAttribute('onclick'));
            expect(element?.hasAttribute('onclick')).toBe(false);
        } finally {
            extendedCss.dispose();
        }
    });

    it('removes a re-added attribute after a mutation', async () => {
        document.body.innerHTML = '<div id="browser-re-add" onclick="alert(1)"></div>';
        const extendedCss = new ExtendedCss({ cssRules: ['#browser-re-add:remove-attr(/^on/)'] });
        extendedCss.apply();
        try {
            const element = document.getElementById('browser-re-add');
            expect(element?.hasAttribute('onclick')).toBe(false);

            element?.setAttribute('onclick', 'alert(2)');

            await waitFor(() => !element?.hasAttribute('onclick'));
            expect(element?.hasAttribute('onclick')).toBe(false);
        } finally {
            extendedCss.dispose();
        }
    });

    it('removes a re-added mixed-case SVG attribute', async () => {
        document.body.innerHTML = '<svg id="browser-svg" viewBox="0 0 10 10"></svg>';
        const extendedCss = new ExtendedCss({ cssRules: ['#browser-svg:remove-attr(viewBox)'] });
        extendedCss.apply();
        try {
            const element = document.getElementById('browser-svg');
            // the initial mixed-case attribute should be removed
            expect(element?.hasAttribute('viewBox')).toBe(false);

            // the re-added attribute should be removed by the observer pass
            element?.setAttribute('viewBox', '0 0 20 20');

            await waitFor(() => !element?.hasAttribute('viewBox'));
            expect(element?.hasAttribute('viewBox')).toBe(false);
        } finally {
            extendedCss.dispose();
        }
    });

    it('limits action removals for self-unmatching rules', () => {
        document.body.innerHTML = '<div id="browser-cap" class="ad"></div>';
        const extendedCss = new ExtendedCss({ cssRules: ['.ad:remove-class(ad)'] });
        extendedCss.apply();
        try {
            const element = document.getElementById('browser-cap');
            expect(element?.classList.contains('ad')).toBe(false);

            // re-add the class more times than the removal cap allows;
            // the element stops matching the rule after each removal,
            // but the removal counter should survive it
            for (let i = 0; i < 60; i += 1) {
                element?.classList.add('ad');
                extendedCss.apply();
            }

            // the removal cap stops the action, so the class stays
            expect(element?.classList.contains('ad')).toBe(true);
        } finally {
            extendedCss.dispose();
        }
    });
});
