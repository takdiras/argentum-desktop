#!/usr/bin/env bash
# Runs before `bun run dev` / `bun run build`: fetch + patch the upstream web-client on first use,
# so a fresh clone works with just `bun install && bun run dev`.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -d vendor/argentum-engine/web-client/node_modules ] \
   && [ "$(git -C vendor/argentum-engine rev-parse HEAD 2>/dev/null)" = "$(tr -d '[:space:]' < UPSTREAM_COMMIT)" ]; then
  echo "vendor/ is ready (upstream $(tr -d '[:space:]' < UPSTREAM_COMMIT | cut -c1-10))"
else
  echo "vendor/ missing or out of date — running prepare:web (first run takes a minute or two)"
  bash scripts/prepare.sh
fi
