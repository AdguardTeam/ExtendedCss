/**
 * @jest-environment jsdom
 */

import { getValidMatcherArg } from '../../src/matcher-utils';

describe('matcher-utils tests', () => {
    describe('test getValidMatcherArg', () => {
        it('valid arg pattern', () => {
            let argPattern;

            argPattern = '"attrName"';
            expect(getValidMatcherArg(argPattern)).toStrictEqual('attrName');

            argPattern = 'attrName';
            expect(getValidMatcherArg(argPattern)).toStrictEqual('attrName');

            argPattern = '/attrName/';
            expect(getValidMatcherArg(argPattern)).toStrictEqual(/attrName/);

            argPattern = 'attr-*';
            expect(getValidMatcherArg(argPattern)).toStrictEqual(/attr-.*/);
        });

        it('invalid arg pattern', () => {
            let argPattern;

            argPattern = '""';
            expect(() => {
                getValidMatcherArg(argPattern);
            }).toThrow('Empty arg is invalid');

            argPattern = '"';
            expect(() => {
                getValidMatcherArg(argPattern);
            }).toThrow('Invalid argument');

            argPattern = '> [track="true"]';
            expect(() => {
                getValidMatcherArg(argPattern);
            }).toThrow('Invalid argument');

            argPattern = '.?';
            expect(() => {
                getValidMatcherArg(argPattern);
            }).toThrow('Invalid argument');

            argPattern = '//';
            expect(() => {
                getValidMatcherArg(argPattern);
            }).toThrow('Invalid regexp');

            argPattern = '*';
            expect(() => {
                getValidMatcherArg(argPattern);
            }).toThrow('Argument should be more specific');
        });
    });
});
