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
# The partial-clone blob fetch is a long HTTP/2 stream that GitHub occasionally cuts mid-way.
# Retry the fetch + checkout a few times before giving up.
fetched=0
for attempt in 1 2 3 4; do
  # lowSpeed*: abort a transfer that crawls below ~1 KB/s for 20s, so a hung connection fails
  # (and retries) instead of blocking forever. The checkout's lazy blob fetch honours it too.
  if git -C "$DEST" -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=20 fetch -q --depth 1 --filter=blob:none origin "$UPSTREAM_SHA" \
     && git -C "$DEST" -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=20 checkout -q FETCH_HEAD; then
    fetched=1
    break
  fi
  echo "Fetch attempt $attempt failed; retrying…" >&2
  sleep $((attempt * 3))
done
if [ "$fetched" -ne 1 ]; then
  echo "Could not fetch upstream $UPSTREAM_SHA" >&2
  exit 1
fi

echo "Applying patches/*.patch"
for p in patches/*.patch; do
  git -C "$DEST" apply --whitespace=nowarn "../../$p"
done
# New files the patch adds are copied in from overlay/ (kept as real files so they're reviewable).
cp -R overlay/web-client/. "$DEST/web-client/"

echo "Installing web-client dependencies (bun)"
(cd "$DEST/web-client" && bun install)

echo "Done. Upstream pinned at $UPSTREAM_SHA"
