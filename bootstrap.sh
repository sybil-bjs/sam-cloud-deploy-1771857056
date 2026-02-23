#!/bin/bash
set -e
WORKSPACE_DIR="/data/workspace"
SEED_DIR="/app/workspace-seed"

echo "🧬 BJS Identity Anchor v2: Synchronizing brain..."
mkdir -p "$WORKSPACE_DIR"

# FORCE copy from image to volume to ensure IDENTITY.md isn't blank
echo "📦 Injecting fresh memories from repository..."
cp -rf "$SEED_DIR"/* "$WORKSPACE_DIR/" 2>/dev/null || true
touch "$WORKSPACE_DIR/.initialized"
echo "✅ Identity Anchored."

# Start the wrapper/gateway
echo "🚀 Starting Gateway..."
exec node src/server.js
