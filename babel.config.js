module.exports = (api) => {
    api.cache(false);
    return {
        presets: [
            [
                '@babel/env',
                {
                    // we do not support ie 11,
                    // because it requires polyfills, which are modifying global scope
                    targets: '>= 0.5%',
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
