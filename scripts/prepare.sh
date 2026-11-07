#!/usr/bin/env bash
# Fetches the pinned upstream web-client, applies our patch, installs its dependencies.
# Idempotent: re-running wipes vendor/ and starts clean.
set -euo pipefail

cd "$(dirname "$0")/.."

UPSTREAM_URL="https://github.com/wingedsheep/argentum-engine.git"
UPSTREAM_SHA="$(tr -d '[:space:]' < UPSTREAM_COMMIT)"
DEST="vendor/argentum-engine"

rm -rf "$DEST"
mkdir -p "$DEST"
git -C "$DEST" init -q
git -C "$DEST" remote add origin "$UPSTREAM_URL"
git -C "$DEST" sparse-checkout init --cone
git -C "$DEST" sparse-checkout set web-client
git -C "$DEST" fetch -q --depth 1 --filter=blob:none origin "$UPSTREAM_SHA"
git -C "$DEST" checkout -q FETCH_HEAD

echo "Applying patches/*.patch"
for p in patches/*.patch; do
  git -C "$DEST" apply --whitespace=nowarn "../../$p"
done
# New files the patch adds are copied in from overlay/ (kept as real files so they're reviewable).
cp -R overlay/web-client/. "$DEST/web-client/"

echo "Installing web-client dependencies (bun)"
(cd "$DEST/web-client" && bun install)

echo "Done. Upstream pinned at $UPSTREAM_SHA"
