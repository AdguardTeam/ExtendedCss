module.exports = (api) => {
    api.cache(false);
    return {
        presets: [
            [
                '@babel/env',
                {
                    // we do not support ie 11,
                    // because it requires polyfills, which are modifying global scope
                    targets: [
                        'last 1 version',
                        '> 1%',
                        "chrome >= 55",
                        'safari >= 10',
                    ],
                },
            ],
            [
                '@babel/preset-typescript',
                {
                    allowNamespaces: true,
                },
            ],
        ],
    };
};
