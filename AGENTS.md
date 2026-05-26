# AI Agent Guidelines for AdGuard ExtendedCss

- [Project Overview](#project-overview)
- [Technical Context](#technical-context)
- [Project Structure](#project-structure)
- [Build And Test Commands](#build-and-test-commands)
- [Contribution Instructions](#contribution-instructions)
- [Code Guidelines](#code-guidelines)
    - [System Design](#system-design)
    - [Architecture](#architecture)
    - [Code Quality](#code-quality)
    - [Testing](#testing)
    - [Dependency Management](#dependency-management)
    - [Configuration & Documentation](#configuration--documentation)
    - [Markdown Formatting](#markdown-formatting)

## Project Overview

ExtendedCss is AdGuard's TypeScript library for non-standard DOM
element selecting and applying CSS styles with extended properties.
It parses stylesheets containing extended CSS pseudo-classes
(`:has()`, `:contains()`, `:matches-css()`, `:xpath()`, etc.),
selects matching DOM elements, and applies or removes styles. It is
published as the `@adguard/extended-css` npm package and consumed
by AdGuard products and other ad-blocking tools.

## Technical Context

| Field                | Value                                                                            |
| -------------------- | -------------------------------------------------------------------------------- |
| Language             | TypeScript (compiled to ES5)                                                     |
| Runtime              | Browser DOM (no Node.js runtime)                                                 |
| Node.js (build)      | >= 22                                                                            |
| Package manager      | pnpm v10                                                                         |
| Bundler              | Rollup v2 (custom build in `tools/build.ts`)                                     |
| Testing              | Vitest 4, jsdom, Vitest browser mode with Playwright, QUnit (BrowserStack)       |
| Linting              | ESLint 8 (airbnb-typescript, jsdoc plugin)                                       |
| Type checking        | TypeScript ~4.7 (`tsc`)                                                          |
| Output formats       | ESM, UMD, IIFE, IIFE-minified                                                    |
| License              | GPL-3.0                                                                          |
| Target platform      | Modern browsers (Chrome 88+, Firefox 84+, Edge 88+, Opera 80+, Safari 14+)       |
| Project type         | Library / Package                                                                |
| Performance goals    | N/A                                                                              |
| Constraints          | No production dependencies — all deps are devDependencies                        |
| Scale/Scope          | Consumed by AdGuard browser extensions and other ad-blocking tools               |

## Project Structure

```text
├── src/                        # Library source code
│   ├── index.ts                # Named exports entry point (ESM/UMD)
│   ├── index.default.ts        # Default export entry point (IIFE)
│   ├── version.ts              # Separate version export
│   ├── common/                 # Shared constants, tokenizer, utilities
│   │   ├── constants.ts        # Pseudo-class names, brackets, operators
│   │   ├── tokenizer.ts        # Generic string tokenizer
│   │   └── utils/              # Helper functions (8 modules)
│   ├── extended-css/           # Main ExtendedCss class and DOM helpers
│   │   ├── extended-css.ts     # Core orchestrator class
│   │   └── helpers/            # DOM observation, style setting, throttling
│   ├── selector/               # Selector parsing, AST, DOM querying
│   │   ├── parser.ts           # Selector → AST parser
│   │   ├── query.ts            # AST → DOM element selection
│   │   ├── converter.ts        # Old syntax normalization
│   │   ├── tokenizer.ts        # Selector-specific tokenizer
│   │   └── utils/              # Parser helpers, matchers, predicates
│   ├── css-rule/               # CSS rule parsing (selector + style block)
│   ├── style-block/            # Style declaration parsing and tokenizing
│   └── stylesheet/             # Full stylesheet string parsing
├── test/                       # Tests (Vitest, Playwright, BrowserStack)
│   ├── helpers/                # Shared test utilities
│   ├── selector/               # Selector parser and query tests
│   ├── css-rule/               # CSS rule parser tests
│   ├── style-block/            # Style block tests
│   ├── stylesheet/             # Stylesheet parser tests
│   ├── browserstack/           # Cross-browser BrowserStack tests
│   └── performance-selector/   # Performance benchmarks
├── tools/                      # Build and test orchestration scripts
│   ├── build.ts                # Rollup build configurations
│   ├── test.ts                 # Vitest/Playwright/BrowserStack runner
│   └── constants.ts            # Build paths and output names
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript config (source)
├── tsconfig.eslint.json        # TypeScript config (lint: src+test+tools)
├── .eslintrc.js                # ESLint configuration
├── babel.config.js             # Babel config for browser targets
├── vitest.config.ts            # Vitest unit/browser/performance configuration
└── AGENTS.md                   # This file
```

## Build And Test Commands

| Command             | Purpose                                    |
| ------------------- | ------------------------------------------ |
| `pnpm build`        | Build all output formats to `dist/`        |
| `pnpm lint`         | Run ESLint and TypeScript type checking    |
| `pnpm test local`   | Run local tests (Vitest + browser mode)    |
| `pnpm build:types`  | Emit `.d.ts` type declarations only        |

**Notes:**

- `pnpm test` runs `ts-node tools/test` which orchestrates Vitest
  and Playwright. Subcommands:
    - `pnpm test local` — local tests only (Vitest unit + browser projects).
    - `pnpm test browserstack` — BrowserStack only (needs creds).
    - `pnpm test performance` — Vitest performance selector benchmarks.
    - `pnpm test` (no subcommand) — runs local + BrowserStack.
  Use `pnpm test local` for day-to-day development.
- `pnpm build` runs `ts-node tools/build` which uses Rollup to
  produce ESM, UMD, IIFE, and minified IIFE bundles.
- `pnpm lint` runs both `eslint .` and
  `tsc --project tsconfig.eslint.json --noEmit`.

## Contribution Instructions

- You MUST verify your changes with the linter, formatter, and
  type checker.

    Use the following commands:
    - `pnpm lint` to run ESLint and TypeScript type checking
    - `pnpm build` to verify the full build succeeds

- You MUST update the unit tests for changed code.

- You MUST run tests with `pnpm test local` to verify that your
  changes do not break existing functionality.

- When making changes to the project structure, ensure the Project
  Structure section in `AGENTS.md` is updated and remains valid.

- If the prompt essentially asks you to refactor or improve
  existing code, check if you can phrase it as a code guideline.
  If it's possible, add it to the relevant Code Guidelines section
  in `AGENTS.md`.

- After completing the task you MUST verify that the code you've
  written follows the Code Guidelines in this file.

- Every exported function, class, method, and class property MUST
  have a JSDoc comment with a description (enforced by ESLint
  jsdoc plugin). JSDoc descriptions must be complete sentences.

- Do not introduce production dependencies. This project ships
  with zero runtime dependencies — all packages in `package.json`
  are devDependencies.

## Code Guidelines

### System Design

Design for a library:

- The library is consumed by other code — never access the
  filesystem, network, or environment unless the caller
  explicitly opts in. Keep side effects out of the default code
  path.
- Export a stable public API; internal functions and types MUST
  be explicitly marked as private or internal.
- Keep the dependency footprint minimal — every transitive
  dependency becomes a burden on consumers. Prefer built-in APIs
  over adding packages.
- Do not mutate global state (environment variables, process
  listeners, shared singletons) — the consumer may use the
  library in a long-running process alongside other code.
- Provide complete type definitions so the library is usable with
  static type checking and editor autocompletion out of the box.
- Document every public function, class, and type with doc
  comments — consumers should not need to read source code to
  use the library.
- Handle errors by throwing specific, documented error classes —
  let the consumer decide how to recover.

### Architecture

Universal design principles this codebase follows:

- **Separation of Concerns** — each module handles one aspect of
  the system (parsing, querying, DOM manipulation, etc.).
- **Single Responsibility Principle** — every file, class, or
  function has one reason to change.
- **Dependency Direction** — dependencies point inward/downward;
  never from lower layers to higher ones.
- **Explicit Boundaries** — module interfaces are intentional;
  no reaching into internals. Each module re-exports its public
  API through `index.ts`.
- **Data Flow Clarity** — data moves through the system in a
  predictable, traceable path: raw CSS string → tokens → AST →
  DOM selection → style application.
- **Minimize Coupling, Maximize Cohesion** — modules are
  self-contained and interact through narrow interfaces.
- **Make Invalid States Impossible** — use types and validation
  to prevent illegal combinations at compile time. The parser
  throws on invalid selectors rather than producing malformed
  ASTs.
- **Observability Built-in** — less critical for a browser
  library; however, the library provides a debug mode and timing
  statistics for selector performance tracking.
- **Keep It Boring** — prefer well-understood patterns over
  clever or novel solutions.

The easiest way to achieve these principles is **layered
architecture**. This project's layers, from top to bottom:

```text
Entry Points (src/index.ts, src/index.default.ts)
     ↓
Orchestration (src/extended-css/ — ExtendedCss class, DOM helpers)
     ↓
Parsing (src/stylesheet/, src/css-rule/, src/style-block/, src/selector/)
     ↓
Tokenization (src/common/tokenizer.ts, src/selector/tokenizer.ts, src/style-block/tokenizer.ts)
     ↓
Utilities & Constants (src/common/constants.ts, src/common/utils/)
```

Each layer may call the layer directly below it. No layer may
depend on a layer above it.

**Dependency flow through the parsing pipeline:**

```text
Raw CSS string
  → parseStylesheet() [stylesheet]
    → parseRule() [css-rule]
      → parseSelectorRulePart() [css-rule/helpers]
        → ExtCssDocument.getSelectorAst() [selector/query]
          → parse() [selector/parser]
            → tokenizeSelector() [selector/tokenizer]
              → tokenize() [common/tokenizer]
      → parseStyleBlock() [style-block/parser]
        → tokenizeStyleBlock() [style-block/tokenizer]
  → ExtCssRuleData[]
```

**Known exclusions** (minor, acceptable):

- `src/css-rule/types.ts` imports `TimingStats` type from
  `src/extended-css/` — a lower layer importing a type from a
  higher layer. Acceptable because it is a type-only import
  (erased at runtime) but ideally the type should live in a
  shared location.
- `src/selector/query.ts` exports a module-level singleton
  `extCssDocument` (AST cache shared across all `ExtendedCss`
  instances). This is intentional for performance but means
  multiple instances share mutable state.

### Code Quality

- **JSDoc required on all public APIs.** ESLint enforces JSDoc
  comments with descriptions on `ClassDeclaration`,
  `ClassProperty`, `FunctionDeclaration`, and
  `MethodDefinition`. Descriptions must be complete sentences.
  `@throws` tags are required when a function throws.
  `@returns` tags are always required. Parameter types and return
  types are omitted from JSDoc (TypeScript provides them).
- **No `eslint-disable` without justification.** If a rule must
  be disabled, add a comment explaining why.
- **Indentation**: 4 spaces (enforced by ESLint).
- **Max line length**: 120 characters (enforced by ESLint).
- **Import style**: Named imports; use `import-newlines` plugin
  rule (max 2 imports per line within 120 chars). No default
  exports in library source code (only `index.default.ts` uses
  default export for the IIFE bundle).
- **Re-exports**: Each module has an `index.ts` that re-exports
  its public API. Consumers import from the module directory, not
  from internal files.
- **Error handling**: Parsers throw on invalid input with
  descriptive error messages using prefixed constants from
  `src/common/constants.ts`. Errors are not caught within the
  parsing pipeline — they propagate to the caller.
- **Naming conventions**: Files use kebab-case. Types and classes
  use PascalCase. Functions and variables use camelCase.
  Constants use UPPER_SNAKE_CASE.

### Testing

- **Framework**: Vitest 4 with jsdom environment for unit tests.
  Vitest browser mode with Playwright for browser-specific selector
  query tests. QUnit + BrowserStack for cross-browser integration
  tests.
- **Test file placement**: Test files mirror the `src/` structure
  under `test/`. Each source module has a corresponding
  `*.test.ts` file (e.g., `test/selector/parser.test.ts` tests
  `src/selector/parser.ts`).
- **Shared test utilities** live in `test/helpers/`.
- **Test naming**: Use `describe`/`test` blocks. `test.each()`
  is used for parameterized tests over selector lists.
- **jsdom environment**: Most unit tests run through the Vitest
  jsdom project. Browser-specific tests use the browser project.
- **Performance tests**: Located in `test/performance-selector/`
  and run separately (not included in default `pnpm test`).
- **BrowserStack tests**: Located in `test/browserstack/` and
  require environment variables (`BROWSERSTACK_USER`,
  `BROWSERSTACK_KEY`). Not included in default `pnpm test`.

### Dependency Management

- **Pin all dependency versions explicitly** — do not use version
  ranges that allow automatic upgrades to untested versions.
- **Prefer vanilla solutions** — use the language's standard
  library and built-in APIs when they adequately solve the
  problem. Only add a dependency when it provides significant
  value over a vanilla implementation.
- **Reputable sources only** — dependencies MUST come from
  well-established, actively maintained projects. Evaluate by
  download counts, repository activity, and known maintainers.
- **Avoid unpopular libraries** — do NOT add niche or obscure
  packages with limited community adoption. These pose security
  risks and may become unmaintained.
- **Minimize dependency count** — each new dependency increases
  attack surface, bundle size, and maintenance burden. Justify
  every addition.
- **Use the latest stable version** — when adding a new
  dependency, explicitly check the package registry for the
  latest stable release and use it. Do not copy outdated version
  numbers from memory, training data, or existing lock files of
  other projects.

**Rationale**: Fewer, well-vetted dependencies reduce security
vulnerabilities, supply chain risks, and long-term maintenance
costs.

**Known exclusions** (to be fixed):

- Most devDependencies in `package.json` use caret (`^`) version
  ranges instead of exact pinning. The `pnpm-lock.yaml` file
  pins exact versions in practice, but `package.json` should
  use exact versions for reproducibility.
- `fs-extra` could be replaced with Node.js built-in
  `fs/promises` (available since Node 14, project requires
  Node >= 22 for development tooling).
- `rimraf` could be replaced with `fs.rm` with `{ recursive:
  true }` (available since Node 14).
- Several Rollup plugins and build tooling packages are on older
  major versions (Rollup v2, `@rollup/plugin-*` v5/v13/v22).

### Configuration & Documentation

- **Runtime configuration**: The library accepts configuration
  via its constructor (`ExtCssConfiguration` object) — no
  environment variables or config files at runtime.
- **Build-time environment**: BrowserStack credentials are
  configured via `.env` file (gitignored). See `.env-example`
  for the template.
- **Documentation files to update when code changes**:
    - `README.md` — when public API, pseudo-class support, or
      usage examples change.
    - `AGENTS.md` — when project structure, build commands, or
      conventions change.
    - `DEVELOPMENT.md` — when development setup, available
      commands, or tooling changes.
    - `CHANGELOG.md` — when releasing a new version.
- **No hardcoded secrets.** BrowserStack keys and other
  credentials go in `.env` (gitignored), never in source code.

### Markdown Formatting

All Markdown files MUST follow these formatting rules:

- **Line length**: Keep lines at most 80 characters. This is not
  a hard lint gate, but SHOULD be followed for readability. Lines
  inside fenced code blocks are exempt from this limit.
- **Unordered lists**: Use dashes (`-`) for bullet points. Indent
  nested list items by 4 spaces.
- **Emphasis**: Use asterisks (`*`) for emphasis (`*italic*`,
  `**bold**`). Do NOT use underscores.
- **Headings**: Duplicate heading names are allowed only among
  sibling headings (same parent level). Avoid duplicates across
  different levels.
- **Inline HTML**: Avoid raw HTML in Markdown. The only allowed
  elements are `<a>`, `<p>`, `<details>`, `<summary>`, and
  `<img>`.
- **Trailing spaces**: Do NOT leave trailing whitespace on any
  line. Do NOT use two-space line breaks — use a blank line
  instead.
- **Bare URLs**: Bare URLs are permitted and do not need to be
  wrapped in angle brackets.
- **Table formatting**: Align table columns with padding when the
  table fits within 80 characters. If the table exceeds 80
  characters or triggers an MD060 linter warning, switch to a
  compact format using single spaces only. This applies to the
  separator row as well — it should be written as `| --- |`,
  not `|--|`.

    Example of correct layout:

    ```markdown
    | Col1 | Col2 |
    | --- | --- |
    | Value1 | Value2 |
    ```

    Do NOT use extra padding or alignment characters beyond
    single spaces.

**Rationale**: Uniform Markdown formatting improves readability
for both humans and AI agents that consume project documentation.
