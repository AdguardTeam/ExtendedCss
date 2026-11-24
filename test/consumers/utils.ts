import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Absolute path to the repository root.
 */
export const REPO_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Absolute path to the built package directory.
 */
export const DIST_PATH = path.join(REPO_ROOT, 'dist');

/**
 * Directory that contains the consumer fixture templates.
 */
const TEMPLATES_PATH = path.join(__dirname, 'templates');

/**
 * Version that is stamped into the temporary package before packing.
 *
 * `package.json` in the repository has no version: CI provides one for
 * release builds. `npm pack` needs a version, so the consumer tests add
 * this placeholder version to the temporary copy only.
 */
const CONSUMER_PACKAGE_VERSION = '0.0.0-consumer-test';

/**
 * Files that every published package must contain.
 */
export const REQUIRED_DIST_FILES = [
    'extended-css.esm.js',
    'extended-css.umd.js',
    'extended-css.js',
    'extended-css.min.js',
    'version.cjs.js',
    'version.esm.mjs',
    'types/src/index.d.ts',
    'types/src/version.d.ts',
];

/**
 * Options for {@link runCommand}.
 */
interface IRunCommandOptions {
    /**
     * Extra environment variables for the child process.
     */
    env?: NodeJS.ProcessEnv;
}

/**
 * Throws when the `dist` directory or one of its public files is missing.
 *
 * This makes the suite fail with a clear message when it runs without a
 * build, or when the build stops producing an entry point.
 *
 * @throws An error when `dist` or a required entry point is missing.
 */
export const assertDistReady = (): void => {
    if (!fs.existsSync(DIST_PATH)) {
        throw new Error('The "dist" directory is missing. Run "pnpm build" before "pnpm test consumers".');
    }

    for (const fileName of REQUIRED_DIST_FILES) {
        const filePath = path.join(DIST_PATH, fileName);
        if (!fs.existsSync(filePath)) {
            throw new Error(`The build does not contain "${fileName}". Run "pnpm build" and check the build output.`);
        }
    }
};

/**
 * Collects every file target from the package entry point fields.
 *
 * @param packageJson Package manifest.
 *
 * @returns List of file targets.
 */
const collectPackageTargets = (packageJson: Record<string, unknown>): string[] => {
    const targets: string[] = [];

    for (const fieldName of ['main', 'module', 'typings']) {
        const fieldValue = packageJson[fieldName];
        if (typeof fieldValue === 'string') {
            targets.push(fieldValue);
        }
    }

    const exportsField = packageJson.exports;
    if (exportsField && typeof exportsField === 'object') {
        for (const exportValue of Object.values(exportsField)) {
            if (typeof exportValue === 'string') {
                targets.push(exportValue);
                continue;
            }
            if (exportValue && typeof exportValue === 'object') {
                for (const conditionValue of Object.values(exportValue)) {
                    if (typeof conditionValue === 'string') {
                        targets.push(conditionValue);
                    }
                }
            }
        }
    }

    return targets;
};

/**
 * Throws when `package.json` points to a file that does not exist.
 *
 * This checks `main`, `module`, `typings`, and every `exports` target at
 * build time.
 *
 * @throws An error when a package entry point points to a missing file.
 */
export const assertPackageTargets = (): void => {
    const packageJsonPath = path.join(REPO_ROOT, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as Record<string, unknown>;

    for (const target of collectPackageTargets(packageJson)) {
        if (path.isAbsolute(target) || target.startsWith('..')) {
            throw new Error(`package.json contains an invalid file target: ${target}`);
        }

        const targetPath = path.resolve(REPO_ROOT, target);
        if (!fs.existsSync(targetPath)) {
            throw new Error(`package.json points to a missing file: ${target}`);
        }
    }
};

/**
 * Runs a command and returns its standard output.
 *
 * The command output is shown only when the command fails, so a passing
 * suite stays readable.
 *
 * @param command Executable to run.
 * @param args Command arguments.
 * @param cwd Working directory for the command.
 * @param options Extra command options.
 *
 * @returns Standard output of the command.
 *
 * @throws An error when the command exits with a non-zero code.
 */
export const runCommand = (
    command: string,
    args: string[],
    cwd: string,
    options: IRunCommandOptions = {},
): string => {
    console.log(`[consumers] Running "${command} ${args.join(' ')}" in ${cwd}`);

    try {
        return execFileSync(command, args, {
            cwd,
            encoding: 'utf8',
            env: {
                ...process.env,
                ...options.env,
            },
            stdio: ['ignore', 'pipe', 'pipe'],
        });
    } catch (error: unknown) {
        const execError = error as {
            stdout?: string;
            stderr?: string;
        };

        if (execError.stdout) {
            console.error(execError.stdout);
        }
        if (execError.stderr) {
            console.error(execError.stderr);
        }

        throw error;
    }
};

/**
 * Copies a fixture template to a target directory and renames `*.tpl` files.
 *
 * @param source Source directory.
 * @param destination Target directory.
 */
const copyTemplateDirectory = (source: string, destination: string): void => {
    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
        const sourcePath = path.join(source, entry.name);
        const targetName = entry.name.endsWith('.tpl')
            ? entry.name.slice(0, -'.tpl'.length)
            : entry.name;
        const targetPath = path.join(destination, targetName);

        if (entry.isDirectory()) {
            fs.mkdirSync(targetPath, { recursive: true });
            copyTemplateDirectory(sourcePath, targetPath);
        } else {
            fs.copyFileSync(sourcePath, targetPath);
        }
    }
};

/**
 * Writes a minimal `package.json` for a consumer fixture.
 *
 * @param fixtureDir Fixture directory.
 * @param name Fixture name.
 */
const writeFixturePackageJson = (fixtureDir: string, name: string): void => {
    const packageJson = {
        name: `extended-css-consumer-${name}`,
        version: '1.0.0',
        private: true,
    };

    fs.writeFileSync(
        path.join(fixtureDir, 'package.json'),
        `${JSON.stringify(packageJson, null, 4)}\n`,
    );
};

/**
 * Creates a temporary consumer fixture from a template.
 *
 * @param name Template name, for example `typescript`.
 *
 * @returns Absolute path to the fixture directory.
 */
export const createFixture = (name: string): string => {
    const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), `extended-css-consumer-${name}-`));

    copyTemplateDirectory(path.join(TEMPLATES_PATH, name), fixtureDir);
    writeFixturePackageJson(fixtureDir, name);

    return fixtureDir;
};

/**
 * Removes a temporary fixture directory.
 *
 * @param fixtureDir Fixture directory.
 */
export const removeFixture = (fixtureDir: string): void => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
};

/**
 * Packs the repository and installs the tarball into a fixture.
 *
 * The repository is copied to a temporary staging directory, a test version
 * is stamped into the copied `package.json`, and `npm pack` runs there. The
 * fixture then installs the tarball with `npm install`.
 *
 * @param fixtureDir Fixture directory.
 *
 * @returns Absolute path to the created tarball.
 *
 * @throws An error when `npm pack` does not create a tarball file.
 */
export const packAndInstallPackage = (fixtureDir: string): string => {
    const stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'extended-css-pack-'));

    try {
        const packageJsonPath = path.join(stagingDir, 'package.json');
        fs.copyFileSync(path.join(REPO_ROOT, 'package.json'), packageJsonPath);
        fs.cpSync(DIST_PATH, path.join(stagingDir, 'dist'), { recursive: true });

        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as Record<string, unknown>;
        packageJson.version = CONSUMER_PACKAGE_VERSION;
        fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 4)}\n`);

        const packOutput = runCommand(
            'npm',
            ['pack', '--json', '--ignore-scripts', '--pack-destination', fixtureDir],
            stagingDir,
        );
        const jsonStart = packOutput.indexOf('[');
        const jsonEnd = packOutput.lastIndexOf(']');
        if (jsonStart === -1 || jsonEnd === -1) {
            throw new Error(`npm pack did not return JSON output: ${packOutput}`);
        }

        const packResult = JSON.parse(packOutput.slice(jsonStart, jsonEnd + 1)) as Array<{ filename: string }>;
        const tarballName = packResult[0]?.filename;

        if (!tarballName) {
            throw new Error('npm pack did not return a tarball file name.');
        }

        const tarballPath = path.isAbsolute(tarballName)
            ? tarballName
            : path.join(fixtureDir, tarballName);

        runCommand(
            'npm',
            [
                'install',
                tarballPath,
                '--ignore-scripts',
                '--no-audit',
                '--no-fund',
                '--no-package-lock',
            ],
            fixtureDir,
        );

        return tarballPath;
    } finally {
        fs.rmSync(stagingDir, { recursive: true, force: true });
    }
};

/**
 * Returns the path to the TypeScript compiler of the repository.
 *
 * @returns Absolute path to `tsc`.
 */
export const getTscPath = (): string => {
    const typescriptPackagePath = require.resolve('typescript/package.json');

    return path.join(path.dirname(typescriptPackagePath), 'bin', 'tsc');
};

/**
 * Runs the shared Node.js smoke test for a CommonJS bundle.
 *
 * The bundle must export `ExtendedCss` and `EXTENDED_CSS_VERSION`. The
 * script applies an extended selector in jsdom and checks the style.
 *
 * @param fixtureDir Fixture directory.
 * @param bundleName Bundle file name inside the fixture directory.
 */
export const runBundleSmokeTest = (fixtureDir: string, bundleName: string): void => {
    runCommand(
        process.execPath,
        [
            path.join(fixtureDir, 'run-bundle.cjs'),
            path.join(fixtureDir, bundleName),
        ],
        fixtureDir,
        {
            env: {
                NODE_PATH: path.join(REPO_ROOT, 'node_modules'),
            },
        },
    );
};
