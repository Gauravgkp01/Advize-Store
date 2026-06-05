#!/usr/bin/env bash
set -euo pipefail

echo "Using Node $(node -v)"
echo "Using npm $(npm -v)"

# Install pnpm
npm install -g pnpm

echo "Using pnpm $(pnpm -v)"

# Allow dependency build scripts (sharp/esbuild/etc.)
pnpm config set ignore-scripts false

# Install workspace dependencies
pnpm install --no-frozen-lockfile

# Build API server
pnpm --filter @workspace/api-server run build

echo "Build completed successfully"