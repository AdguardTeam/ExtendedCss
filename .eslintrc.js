const path = require('path');

module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        tsconfigRootDir: path.join(__dirname),
        project: 'tsconfig.eslint.json',
    },
    plugins: [
        'import',
        '@typescript-eslint',
    ],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'airbnb-typescript/base',
        'plugin:jsdoc/recommended',
    ],
    plugins: [
        'import-newlines',
    ],
    rules: {
        'indent': ['error', 4, {
            'SwitchCase': 1,
        }],
        '@typescript-eslint/indent': ['error', 4],
        'no-bitwise': 'off',
        'no-new': 'off',
        'max-len': ['error', {
            'code': 120,
            'comments': 120,
            'tabWidth': 4,
            'ignoreUrls': false,
            'ignoreTrailingComments': false,
            'ignoreComments': false
        }],
        'import/prefer-default-export': 'off',
        '@typescript-eslint/no-non-null-assertion': 'error',
        'no-continue': 'off',
        'import/no-extraneous-dependencies': 'off',
        'import/extensions': 'off',
        'import-newlines/enforce': ['error', 2, 120],
        'no-restricted-syntax': ['error', 'LabeledStatement', 'WithStatement'],
        'no-constant-condition': ['error', { 'checkLoops': false }],
        '@typescript-eslint/interface-name-prefix': 'off',
        'arrow-body-style': 'off',
        'jsdoc/require-jsdoc': [
            'error',
            {
                contexts: [
                    'ClassDeclaration',
                    'ClassProperty',
                    'FunctionDeclaration',
                    'MethodDefinition',
                ],
            },
        ],
        'jsdoc/require-description': [
            'error',
            {
                contexts: [
                    'ClassDeclaration',
                    'ClassProperty',
                    'FunctionDeclaration',
                    'MethodDefinition',
                ],
            },
        ],
        'jsdoc/require-description-complete-sentence': [
            'error',
            {
                abbreviations: ['e.g.', 'i.e.'],
            },
        ],
        'jsdoc/require-throws': 'error',
        'jsdoc/tag-lines': 'off',
        // signal error if @returns is missed
        'jsdoc/require-returns': ['error'],
        // disabled as types are described in typescript
        'jsdoc/require-param-type': 'off',
        'jsdoc/require-returns-type': 'off',
        // for jest tests
        'jsdoc/check-tag-names': ['error', {
            'definedTags': ['jest-environment'],
        }],
    },
};
