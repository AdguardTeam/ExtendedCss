# Development Guide

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
    - [Clone the Repository](#clone-the-repository)
    - [Install Dependencies](#install-dependencies)
    - [Environment Configuration](#environment-configuration)
- [Development Workflow](#development-workflow)
    - [Available Commands](#available-commands)
    - [Building](#building)
    - [Linting and Type Checking](#linting-and-type-checking)
    - [Testing](#testing)
        - [Local Tests](#local-tests)
        - [BrowserStack Tests](#browserstack-tests)
        - [Performance Tests](#performance-tests)
    - [Pre-commit Hook](#pre-commit-hook)
    - [Contributing Changes](#contributing-changes)
- [Common Tasks](#common-tasks)
    - [Adding a New Pseudo-class](#adding-a-new-pseudo-class)
    - [Incrementing the Version](#incrementing-the-version)
    - [Inspecting Build Output](#inspecting-build-output)
- [Troubleshooting](#troubleshooting)
- [Additional Resources](#additional-resources)

## Prerequisites

| Tool    | Version  | Notes                          |
| ---     | ---      | ---                            |
| Node.js | >= 16    | See `engines` in package.json  |
| Yarn    | 1.x      | Classic Yarn (not Yarn Berry)  |

Verify your setup:

```bash
node --version   # must be 16 or higher
yarn --version   # must be 1.x
```

No other system-level tools are required for local
development. BrowserStack tests need credentials (see
[Environment Configuration](#environment-configuration)).

## Getting Started

### Clone the Repository

```bash
git clone https://github.com/AdguardTeam/ExtendedCss.git
cd ExtendedCss
```

### Install Dependencies

```bash
yarn install
```

All dependencies are devDependencies — the library ships
with zero runtime dependencies.

### Environment Configuration

The only environment variables are for **BrowserStack
testing**, which is optional for day-to-day development.

1. Copy the example file:

    ```bash
    cp .env-example .env
    ```

2. Fill in your credentials:

    ```text
    BROWSERSTACK_USER=<your-username>
    BROWSERSTACK_KEY=<your-key>
    ```

The `.env` file is gitignored. You do **not** need it for
local builds, linting, or local tests.

## Development Workflow

### Available Commands

| Command                | Purpose                                |
| ---                    | ---                                    |
| `yarn build`           | Build all output formats to `dist/`    |
| `yarn build:types`     | Emit `.d.ts` declarations only         |
| `yarn lint`            | Run ESLint + TypeScript type checking  |
| `yarn test local`      | Run local tests (Jest + Playwright)    |
| `yarn test browserstack` | Run BrowserStack tests (needs creds) |
| `yarn test performance`  | Run performance benchmarks           |
| `yarn test`            | Run local + BrowserStack tests         |
| `yarn increment`       | Bump patch version in package.json     |

### Building

```bash
yarn build
```

This runs `ts-node tools/build`, which uses Rollup to
produce the following bundles in `dist/`:

| File                       | Format        |
| ---                        | ---           |
| `extended-css.esm.js`      | ESM           |
| `extended-css.umd.js`      | UMD           |
| `extended-css.js`           | IIFE          |
| `extended-css.min.js`       | IIFE minified |
| `version.cjs.js`           | CJS (version) |
| `version.esm.mjs`          | ESM (version) |

The `prebuild` script automatically runs `rimraf dist` and
`yarn build:types` before each build.

To emit only TypeScript declarations:

```bash
yarn build:types
```

### Linting and Type Checking

```bash
yarn lint
```

This runs two checks sequentially:

1. `eslint .` — lint all TypeScript files
2. `tsc --project tsconfig.eslint.json --noEmit` — type
   check `src/`, `test/`, and `tools/`

Key ESLint rules enforced:

- 4-space indentation
- 120-character max line length
- JSDoc required on all public APIs (classes, methods,
  functions, class properties) with complete-sentence
  descriptions
- Named imports with at most 2 imports per line

### Testing

#### Local Tests

```bash
yarn test local
```

This is the primary test command for development. It:

1. Builds selector tests for Playwright (Rollup bundle)
2. Builds xpath evaluation performance tests
3. Runs Jest with jsdom environment

Test files mirror the `src/` structure under `test/`. For
example, `src/selector/parser.ts` is tested by
`test/selector/parser.test.ts`.

Most test files use the `@jest-environment jsdom` directive
at the top of the file.

#### BrowserStack Tests

```bash
yarn test browserstack
```

Requires `BROWSERSTACK_USER` and `BROWSERSTACK_KEY` in your
`.env` file. Builds an IIFE bundle plus QUnit test files,
then runs them on BrowserStack.

#### Performance Tests

```bash
yarn test performance
```

Runs selector performance benchmarks comparing ExtendedCss
v1 and v2. These are not included in the default test suite
and should be run manually when needed.

### Pre-commit Hook

The project uses Husky with a pre-commit hook that runs
`lint-staged`. When you commit, all staged `.ts` files are
automatically linted via ESLint.

No additional setup is needed — `yarn install` runs
`husky install` via the `prepare` script.

### Contributing Changes

1. Create a branch for your changes.
2. Make your changes, ensuring they follow the code
   guidelines in [AGENTS.md](AGENTS.md).
3. Run the full verification suite:

    ```bash
    yarn lint
    yarn build
    yarn test local
    ```

4. Update or add tests for any changed functionality.
5. Submit a pull request.

## Common Tasks

### Adding a New Pseudo-class

1. Add the pseudo-class name constant in
   `src/common/constants.ts`.
2. Implement the selector tokenizer support in
   `src/selector/tokenizer.ts`.
3. Add parsing logic in `src/selector/parser.ts`.
4. Implement the DOM query matching in
   `src/selector/query.ts` and related utilities under
   `src/selector/utils/`.
5. Add tests in `test/selector/` mirroring the modules
   you changed.
6. Update `README.md` with the new pseudo-class
   documentation.

### Incrementing the Version

```bash
yarn increment
```

This runs `yarn version --patch --no-git-tag-version`,
bumping the patch version in `package.json` without
creating a Git tag.

### Inspecting Build Output

After running `yarn build`, the `dist/` directory contains:

- All bundle formats (ESM, UMD, IIFE, minified IIFE)
- Type declarations under `dist/types/`
- A `build.txt` file with the version number

```bash
yarn build
ls dist/
```

## Troubleshooting

**`yarn install` fails with Node.js version error**

The project requires Node.js >= 16. Check your version
with `node --version` and upgrade if needed.

**Tests fail with "Cannot find module 'playwright'"**

Playwright is a devDependency but may need browser binaries
installed. Run:

```bash
npx playwright install
```

**`yarn lint` reports JSDoc errors**

Every exported function, class, method, and class property
must have a JSDoc comment with a complete-sentence
description. The ESLint jsdoc plugin enforces `@returns`
tags and `@throws` tags (when applicable). See the JSDoc
rules in `.eslintrc.js`.

**BrowserStack tests fail with authentication errors**

Ensure your `.env` file contains valid `BROWSERSTACK_USER`
and `BROWSERSTACK_KEY` values. Copy `.env-example` as a
template.

**Build produces stale output**

The `prebuild` script runs `rimraf dist` automatically, but
if you see stale files, clean manually:

```bash
rm -rf dist
yarn build
```

**Type errors in test files**

The lint command uses `tsconfig.eslint.json`, which extends
`tsconfig.json` and includes `src/`, `test/`, and `tools/`.
Ensure your test imports match the project's module
resolution settings.

## Additional Resources

- [README.md](README.md) — project overview, API
  documentation, usage examples, and browser compatibility
- [AGENTS.md](AGENTS.md) — code guidelines, architecture
  overview, and project structure
- [CHANGELOG.md](CHANGELOG.md) — version history and
  release notes
- [GitHub Issues](https://github.com/AdguardTeam/ExtendedCss/issues)
  — bug reports and feature requests
