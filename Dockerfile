# Base for build plan (node-ssh)
FROM adguard/node-ssh:22.22--0 AS base
WORKDIR /workdir
ENV PNPM_STORE_DIR=/pnpm-store

# Install dependencies (--ignore-scripts skips husky install which requires .git)
FROM base AS deps
RUN --mount=type=cache,target=/pnpm-store,id=extended-css-pnpm \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=bind,source=pnpm-workspace.yaml,target=pnpm-workspace.yaml \
    --mount=type=bind,source=.npmrc,target=.npmrc \
    pnpm install --frozen-lockfile --ignore-scripts

FROM base AS source-deps
COPY --from=deps /workdir/node_modules ./node_modules
COPY . .

# =============================================================================
# Test plan
# =============================================================================

FROM adguard/playwright-runner:22.20--1.56.0--0 AS test-base
WORKDIR /workdir
ENV PNPM_STORE_DIR=/pnpm-store

FROM test-base AS test-deps
RUN --mount=type=cache,target=/pnpm-store,id=extended-css-pnpm \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=bind,source=pnpm-workspace.yaml,target=pnpm-workspace.yaml \
    --mount=type=bind,source=.npmrc,target=.npmrc \
    pnpm install --frozen-lockfile --ignore-scripts

# Shared source bootstrap for all test stages: dependencies plus the full
# working tree. Each stage below derives from this instead of repeating the
# COPY bootstrap, so the bootstrap is maintained in a single place.
FROM test-base AS test-src
COPY --from=test-deps /workdir/node_modules ./node_modules
COPY . .

FROM test-src AS lint
RUN pnpm lint && \
    mkdir -p /out && touch /out/lint.txt

FROM scratch AS lint-output
COPY --from=lint /out/ /

# Local tests (Vitest unit + Playwright browser projects). No BrowserStack
# credentials are needed, so this runs on every PR and push.
FROM test-src AS test-local
RUN pnpm test local && \
    mkdir -p /out && touch /out/test.txt

FROM scratch AS local-test-output
COPY --from=test-local /out/ /

# BrowserStack cross-browser tests. Only built when credentials are present;
# the workflow guards this with `HAS_BROWSERSTACK`, so the stage is not
# evaluated at all when the secrets are absent.
FROM test-src AS test-run
RUN --mount=type=secret,id=BROWSERSTACK_USER \
    --mount=type=secret,id=BROWSERSTACK_KEY \
    BROWSERSTACK_USER="$(cat /run/secrets/BROWSERSTACK_USER)" \
    BROWSERSTACK_KEY="$(cat /run/secrets/BROWSERSTACK_KEY)" \
    pnpm test browserstack && \
    mkdir -p /out && touch /out/bs.txt

FROM scratch AS browserstack-output
COPY --from=test-run /out/ /

# The shared `publish-release.yml` reusable workflow builds `--target
# test-output` during release without passing BrowserStack secrets, so
# cross-browser tests are skipped at release time and only lint + local tests
# run. This alias combines the `lint` and `test-local` outputs.
FROM scratch AS test-output
COPY --from=lint /out/ /
COPY --from=test-local /out/ /

# =============================================================================
# Build plan
# =============================================================================

FROM source-deps AS build
# Stamp a version into package.json when the workflow did not provide one
# (e.g. a local `docker build --target build-output .`). CI stamps it via the
# ext-shared-actions `set-dev-version` action before `docker build`; this
# fallback reuses tools/build-version.ts to derive a `-dev` version from
# CHANGELOG.md. It is a no-op when a version is already present.
RUN node -r ts-node/register -e "const fs=require('fs');const p=require('./package.json');if(!p.version){const v=require('./tools/build-version').getBuildVersion();p.version=v;fs.writeFileSync('./package.json',JSON.stringify(p,null,4)+'\n');}"
RUN pnpm build && pnpm pack --out extended-css.tgz && \
    mkdir -p /out/artifacts && \
    mv extended-css.tgz /out/artifacts/

FROM scratch AS build-output
COPY --from=build /out/artifacts/ /
