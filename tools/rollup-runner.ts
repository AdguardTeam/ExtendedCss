import { rollup, RollupOptions } from 'rollup';
import chalk from 'chalk';

const { log } = console;

/**
 * Runs single rollup config.
 *
 * @param config Rollup config.
 * @param [name] Config name for better logging.
 */
const runOneConfig = async (config: RollupOptions, name?: string) => {
    const { input, output } = config;
    if (!output) {
        throw new Error(`No 'output' set in config with such input: '${input}'`);
    }
    const configInfo = name
        ? `${name} - ${input}`
        : input;
    log(`Start building... ${configInfo}`);
    const bundle = await rollup(config);
    if (Array.isArray(output)) {
        for (const outputItem of output) {
            await bundle.write(outputItem);
        }
    } else {
        await bundle.write(output);
    }
    log(chalk.greenBright('Successfully built:'), configInfo);
};

/**
 * Builds the lib.
 *
 * @param config May be a list of configs or just one config.
 * @param [name] Config name for better logging.
 */
export const rollupRunner = async (config: RollupOptions | RollupOptions[], name?: string) => {
    if (Array.isArray(config)) {
        for (const oneConfig of config) {
            await runOneConfig(oneConfig, name);
        }
    } else {
        await runOneConfig(config, name);
    }
};
