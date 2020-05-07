module.exports = (api) => {
    api.cache(false);
    return {
        presets: [
            [
                '@babel/env',
                {
                    useBuiltIns: 'usage',
                    corejs: '3',
                    targets: '>= 0.5%, ie >= 11',
                },
            ],
        ],
    };
};
