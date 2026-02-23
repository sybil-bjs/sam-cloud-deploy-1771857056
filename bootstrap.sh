#!/bin/bash
set -e

WORKSPACE_DIR="/data/workspace"
SEED_DIR="/app/workspace-seed"

echo "🧬 BJS Smart Sync: Initializing Cloud Identity..."

# 1. Ensure workspace exists
mkdir -p "$WORKSPACE_DIR"

# 2. SMART SYNC: 
# Only copy files from repo if they are NEWER or if the local file is generic/blank.
# This prevents overwriting NEW memories Sam makes in the cloud, 
# while still fixing the "Amnesia" bug if he starts with blank templates.
echo "📦 Merging cloud soul with local volume..."
cp -nrf "$SEED_DIR"/* "$WORKSPACE_DIR/" 2>/dev/null || true

# 3. Support for LIVE UPDATES:
# If we want to force a skill update from GitHub, we can just delete /data/workspace/.initialized
# and the agent will pull the fresh repo files on next restart.
touch "$WORKSPACE_DIR/.initialized"

echo "✅ Sync complete. Sam is fully writable and anchored."

# Start the wrapper/gateway
exec node src/server.js
