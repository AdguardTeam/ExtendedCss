# Base for build plan (node-ssh)
FROM adguard/node-ssh:22.17--0 AS base
WORKDIR /workdir
ENV YARN_CACHE_FOLDER=/yarn-cache

# Install dependencies (--ignore-scripts skips husky install which requires .git)
FROM base AS deps
RUN --mount=type=cache,target=/yarn-cache,id=extended-css-yarn \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=yarn.lock,target=yarn.lock \
    yarn install --frozen-lockfile --ignore-scripts

FROM base AS source-deps
COPY --from=deps /workdir/node_modules ./node_modules
COPY . .

# =============================================================================
# Test plan
# =============================================================================

FROM adguard/playwright-runner:22.17--1.53.2--1 AS test-base
WORKDIR /workdir
ENV YARN_CACHE_FOLDER=/yarn-cache

# Install dependencies (--ignore-scripts skips husky install which requires .git)
# Tests run on BrowserStack (remote), no local browser install needed
FROM test-base AS test-deps
RUN --mount=type=cache,target=/yarn-cache,id=extended-css-yarn \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=yarn.lock,target=yarn.lock \
    yarn install --frozen-lockfile --ignore-scripts

FROM test-base AS test
COPY --from=test-deps /workdir/node_modules ./node_modules
COPY . .
RUN --mount=type=secret,id=BROWSERSTACK_USER \
    --mount=type=secret,id=BROWSERSTACK_KEY \
    BROWSERSTACK_USER="$(cat /run/secrets/BROWSERSTACK_USER)" \
    BROWSERSTACK_KEY="$(cat /run/secrets/BROWSERSTACK_KEY)" \
    yarn test && yarn build

FROM scratch AS test-output
COPY --from=test /workdir/dist/extended-css.js /artifacts/extended-css.js

# =============================================================================
# Build plan
# =============================================================================

FROM source-deps AS build
RUN yarn build && yarn pack --filename extended-css.tgz

FROM scratch AS build-output
COPY --from=build /workdir/extended-css.tgz /artifacts/extended-css.tgz
COPY --from=build /workdir/dist/build.txt /artifacts/build.txt
