/**
 * @jest-environment jsdom
 */

import { getValidMatcherArg, parseRawPropChain } from '../../../src/selector/utils/absolute-matcher';

describe('matcher-utils tests', () => {
    describe('test getValidMatcherArg', () => {
        it('valid arg pattern', () => {
            let argPattern: string;

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
            let argPattern: string;

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

    describe('test parseRawPropChain', () => {
        it('valid arg pattern', () => {
            expect(parseRawPropChain('"propName"')).toEqual(['propName']);
            expect(parseRawPropChain('propName')).toEqual(['propName']);
            expect(parseRawPropChain('"prop.test"')).toEqual(['prop', 'test']);
            expect(parseRawPropChain('prop./test/')).toEqual(['prop', /test/]);
            expect(parseRawPropChain('prop.*.test')).toEqual(['prop', /.*/, 'test']);
            expect(parseRawPropChain('aProp.unit123./.{1,5}/')).toEqual(['aProp', 'unit123', /.{1,5}/]);
        });

        it('invalid arg pattern', () => {
            expect(() => {
                parseRawPropChain('""');
            }).toThrow('Invalid pseudo-class arg');

            expect(() => {
                parseRawPropChain('"');
            }).toThrow('Invalid property pattern');

            expect(() => {
                parseRawPropChain('.?');
            }).toThrow('Invalid pseudo-class arg');

            expect(() => {
                parseRawPropChain('//');
            }).toThrow('Invalid regexp property pattern');

            expect(() => {
                parseRawPropChain('nested..test');
            }).toThrow('Invalid pseudo-class arg');

            expect(() => {
                parseRawPropChain('abc.?+/.test');
            }).toThrow('Invalid property pattern');

            expect(() => {
                parseRawPropChain('/id');
            }).toThrow('Invalid regexp property pattern');

            expect(() => {
                parseRawPropChain('test.//.id');
            }).toThrow('Invalid regexp property pattern');
        });
    });
});
