module.exports = (api) => {
    api.cache(false);
    return {
        presets: [
            [
                '@babel/env',
                {
                    targets: [
                        'last 1 version',
                        '> 1%',
                        // ie 11 is dead and no longer supported
                        'not dead',
                        'chrome >= 55',
                        'firefox >= 52',
                        'opera >= 80',
                        'edge >= 80',
                        'safari >= 11',
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
