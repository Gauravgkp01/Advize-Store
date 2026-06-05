#!/usr/bin/env bash
set -euo pipefail

# Install pnpm (Render uses npm by default)
npm install -g pnpm

# Allow all packages to run build scripts (pnpm 10+ blocks them by default)
pnpm approve-builds --all

# Install all workspace dependencies (API server needs shared libs from lib/*)
pnpm install

# Build only the API server (esbuild → dist/index.mjs)
pnpm --filter @workspace/api-server run build
