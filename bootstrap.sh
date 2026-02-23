#!/bin/bash
set -e

WORKSPACE_DIR="/data/workspace"
SEED_DIR="/app/workspace-seed"

echo "🧬 BJS Identity Anchor v3: Forcing Git-to-Volume Sync..."

# 1. Ensure workspace exists
mkdir -p "$WORKSPACE_DIR"

# 2. Force the volume to match the image-baked repo files EXACTLY
# We use -rf to overwrite any blank templates or amnesia-inducing files
echo "📦 Injecting fresh memories from repository image..."
cp -rf "$SEED_DIR"/* "$WORKSPACE_DIR/" 2>/dev/null || true

# 3. Clean up any stale session locks that prevent identity boot
rm -f "$WORKSPACE_DIR"/*.lock
rm -f "/data/.openclaw/agents/main/sessions"/*.lock 2>/dev/null || true

touch "$WORKSPACE_DIR/.initialized"
echo "✅ Identity Anchored. Memory synced from GitHub."

# Start the wrapper/gateway
echo "🚀 Starting Gateway..."
exec node src/server.js
