#!/usr/bin/env bash
set -euo pipefail

# Install pnpm (Render uses npm by default)
npm install -g pnpm

# Install all workspace dependencies
# Build scripts are allowed via .npmrc (onlyBuiltDependencies=*)
pnpm install --frozen-lockfile

# Build only the API server (esbuild → dist/index.mjs)
pnpm --filter @workspace/api-server run build
