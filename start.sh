#!/bin/bash
# BJS Agent Bootstrap - Uses the proper server.js wrapper
# NEVER overwrites existing workspace files

WORKSPACE_DIR="/data/workspace"
STATE_DIR="/data/.openclaw"

echo "🧬 BJS Autonomy: Starting up..."

# 1. Prepare directories
mkdir -p "$WORKSPACE_DIR"
mkdir -p "$STATE_DIR"

# 2. Check if workspace already has files (PROTECT EXISTING BRAIN)
if [ -f "$WORKSPACE_DIR/IDENTITY.md" ] || [ -f "$WORKSPACE_DIR/SOUL.md" ] || [ -f "$WORKSPACE_DIR/MEMORY.md" ]; then
    echo "🧠 Existing brain detected - PROTECTING existing files!"
    echo "   Skipping template seeding to preserve Sam's memory."
else
    echo "📦 No existing brain found - seeding from template..."
    if [ -d "/app/workspace-seed" ]; then
        cp -r /app/workspace-seed/* "$WORKSPACE_DIR/" 2>/dev/null || true
        echo "✅ Workspace seeded from template."
    fi
fi

# 3. Start the server.js wrapper (handles healthcheck + setup UI + gateway proxy)
echo "🚀 Starting OpenClaw server..."
export OPENCLAW_WORKSPACE_DIR="$WORKSPACE_DIR"
export OPENCLAW_STATE_DIR="$STATE_DIR"

exec node /app/src/server.js
