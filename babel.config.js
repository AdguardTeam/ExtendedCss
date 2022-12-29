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
                        'chrome >= 88',
                        'firefox >= 84',
                        'edge >= 88',
                        'opera >= 80',
                        'safari >= 14',
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
