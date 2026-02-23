#!/bin/bash
set -e
WORKSPACE_DIR="/data/workspace"
SEED_DIR="/app/workspace-seed"

echo "🧬 BJS Live-Git Sync: Connecting brain to Cloud Repo..."
mkdir -p "$WORKSPACE_DIR"

# If the workspace isn't a git repo yet, make it one
if [ ! -d "$WORKSPACE_DIR/.git" ]; then
    echo "📦 Initializing Live-Git connection..."
    cd "$WORKSPACE_DIR"
    git init
    git remote add origin "https://sybil-bjs:${GITHUB_TOKEN}@github.com/sybil-bjs/sam-cloud-deploy-1771857056.git" || true
    # Pull current files
    git fetch origin main
    git reset --hard origin/main
    echo "✅ Live-Git initialized."
fi

# Always check for updates on boot (optional, but good for keeping skills fresh)
cd "$WORKSPACE_DIR"
# git pull origin main || echo "⚠️ Offline or No Updates"

# Clear session locks
rm -f "$WORKSPACE_DIR"/*.lock
rm -f "/data/.openclaw/agents/main/sessions"/*.lock 2>/dev/null || true

# Start the gateway
echo "🚀 Starting Gateway..."
exec node /app/src/server.js
