/* eslint-disable max-len */

const { utils, matcherUtils } = exports;

QUnit.test('Test matcher utils', (assert) => {
    let input;
    let output;

    input = 'test';
    output = matcherUtils.parseMatcherFilter(input);
    assert.ok(output instanceof Array);
    assert.equal(output.length, 1);
    assert.equal(output[0], 'test');

    input = '"test"="123"';
    output = matcherUtils.parseMatcherFilter(input);
    assert.equal(output.length, 2);
    assert.equal(output[0], 'test');
    assert.equal(output[1], '123');

    input = 'test123';
    output = matcherUtils.parseRawMatcherArg(input);
    assert.ok(output instanceof Object);
    assert.equal(output.arg, 'test123');
    assert.notOk(output.isRegexp);

    input = '/test(.{1,2})?/';
    output = matcherUtils.parseRawMatcherArg(input);
    assert.ok(output instanceof Object);
    assert.equal(output.arg, '/test(.{1,2})?/');
    assert.ok(output.isRegexp);

    let inputChain; let inputBase;
    inputBase = {
        id: 1,
        test: {
            abc123: 123,
            abc456: 456,
            abc4: null,
        },
    };
    inputChain = [
        {
            arg: 'test',
            isRegexp: false,
        },
        {
            arg: utils.toRegExp('/^abc4.+?/'),
            isRegexp: true,
        },
    ];
    output = matcherUtils.filterRootsByRegexpChain(inputBase, inputChain);
    assert.ok(output instanceof Array);
    assert.equal(output.length, 1);
    assert.ok(output[0].base instanceof Object); // due to 'test' prop in inputBase
    assert.strictEqual(output[0].prop, 'abc456');
    assert.strictEqual(output[0].value, 456);
    output = matcherUtils.validatePropMatcherArgs(inputChain);
    assert.ok(output);

    inputBase = {
        id: 1,
        test1: {
            id: 0,
            src: null,
        },
        test2: {
            id: 1,
            src: 'ad.com',
        },
    };
    inputChain = [
        {
            arg: utils.toRegExp('/test/'),
            isRegexp: true,
        },
        {
            arg: 'id',
            isRegexp: false,
        },
    ];
    output = matcherUtils.filterRootsByRegexpChain(inputBase, inputChain);
    assert.ok(output instanceof Array);
    assert.equal(output.length, 2);
    assert.strictEqual(output[0].prop, 'id');
    assert.strictEqual(output[0].value, 0);
    assert.strictEqual(output[1].prop, 'id');
    assert.strictEqual(output[1].value, 1);
    output = matcherUtils.validatePropMatcherArgs(inputChain);
    assert.ok(output);

    input = {
        arg: 'test',
        isRegexp: false,
    };
    output = matcherUtils.validatePropMatcherArgs(input);
    assert.ok(output);

    input = {
        arg: '/^abc.+?/',
        isRegexp: true,
    };
    output = matcherUtils.validatePropMatcherArgs(input);
    assert.ok(output);

    input = {
        arg: 'abc123',
        isRegexp: true,
    };
    output = matcherUtils.validatePropMatcherArgs(input);
    assert.notOk(output);

    input = {
        arg: '/abc',
        isRegexp: true,
    };
    output = matcherUtils.validatePropMatcherArgs(input);
    assert.notOk(output);
});
