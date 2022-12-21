/**
 * @jest-environment jsdom
 */

/**
 * Store global window before any import.
 */
const windowBefore = Object.assign({}, window);

const { ExtendedCss } = require('../src'); // eslint-disable-line @typescript-eslint/no-var-requires
const { expectElementStyle } = require('./extended-css.test'); // eslint-disable-line @typescript-eslint/no-var-requires

/**
 * Compares whether the two objects are equal.
 *
 * @param obj1 First object.
 * @param obj2 Second object.
 *
 * @returns True if objects are equal.
 */
const isEqual = <T extends Window>(obj1: T, obj2: T): boolean => {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    return keys1.length === keys2.length
        && keys2.every((k2) => {
            return keys1.includes(k2)
                && keys1[k2 as unknown as number] === keys2[k2 as unknown as number];
        });
};

describe('global scope test', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('global scope pollution check', () => {
        document.body.innerHTML = `
            <div id="case12">
                <div id="case12-blocked">Block me</div>
            </div>
        `;
        const styleSheet = '#case12>div:contains(Block me) { display: none!important; }';
        const extendedCss = new ExtendedCss({ styleSheet });
        extendedCss.apply();

        expectElementStyle('case12-blocked', { display: 'none' });
        document.body.innerHTML = '';

        const windowAfter = Object.assign({}, window);

        expect(isEqual(windowBefore, windowAfter)).toBeTruthy();
    });
});
