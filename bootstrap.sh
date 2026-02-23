#!/bin/bash
set -e
WORKSPACE_DIR="/data/workspace"
SEED_DIR="/app/workspace-seed"

echo "🧬 BJS Final Anchor: Forced Identity Restoration..."

# 1. Clear any zombie locks
rm -rf /data/.openclaw/*.lock 2>/dev/null || true
rm -rf "$WORKSPACE_DIR"/*.lock 2>/dev/null || true

# 2. FORCE RESTORE from Repo Image
# We don't care if it's "initialized" — we are overwriting the amnesia.
echo "📦 Injecting memories from repo into volume..."
mkdir -p "$WORKSPACE_DIR"
cp -rf "$SEED_DIR"/* "$WORKSPACE_DIR/"

# 3. Sanity check: Ensure IDENTITY.md is actually the right one
if grep -q "Sam" "$WORKSPACE_DIR/IDENTITY.md"; then
    echo "✅ IDENTITY VERIFIED: Sam is in the workspace."
else
    echo "❌ ERROR: Identity mismatch in workspace."
fi

# Start Gateway
echo "🚀 Starting Gateway..."
exec node /app/src/server.js
