#!/bin/bash
set -e
WORKSPACE_DIR="/data/workspace"
SEED_DIR="/app/workspace-seed"

echo "🧬 BJS Identity Anchor: Seeding brain from GitHub..."
mkdir -p "$WORKSPACE_DIR"

# Seed memory if not initialized
if [ ! -f "$WORKSPACE_DIR/.initialized" ]; then
    echo "📦 Seeding memories from repository..."
    cp -r "$SEED_DIR"/* "$WORKSPACE_DIR/" 2>/dev/null || true
    touch "$WORKSPACE_DIR/.initialized"
    echo "✅ Memories anchored."
else
    echo "✅ Memories found on volume. Skipping seed."
fi

# Start the wrapper/gateway
echo "🚀 Starting Gateway..."
exec node src/server.js
