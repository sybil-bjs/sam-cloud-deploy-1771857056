#!/bin/bash
# BJS Agent Bootstrap - Robust version
# Allows OpenClaw to start even if git sync fails

WORKSPACE_DIR="/data/workspace"
REPO_URL="https://sybil-bjs:${GITHUB_TOKEN}@github.com/sybil-bjs/sam-cloud-deploy-1771857056.git"

echo "🧬 BJS Autonomy: Starting up..."

# 1. Prepare Workspace
mkdir -p "$WORKSPACE_DIR"
cd "$WORKSPACE_DIR"

# 2. Try Git Connection (but don't fail if it doesn't work)
if [ -n "$GITHUB_TOKEN" ]; then
    echo "📡 Attempting brain sync from GitHub..."
    
    if [ ! -d ".git" ]; then
        echo "📦 Initializing brain link..."
        git init 2>/dev/null || true
        git remote add origin "$REPO_URL" 2>/dev/null || true
    fi
    
    # Try to pull, but continue if it fails
    if git fetch origin main 2>/dev/null && git reset --hard origin/main 2>/dev/null; then
        echo "✅ Brain synchronized from GitHub."
    else
        echo "⚠️ Git sync failed - using existing workspace. Continuing anyway..."
    fi
else
    echo "⚠️ No GITHUB_TOKEN set - skipping brain sync."
fi

# 3. Seed from template if workspace is empty
if [ ! -f "$WORKSPACE_DIR/IDENTITY.md" ] && [ -d "/app/workspace-seed" ]; then
    echo "📦 Seeding workspace from template..."
    cp -r /app/workspace-seed/* "$WORKSPACE_DIR/" 2>/dev/null || true
    echo "✅ Workspace seeded."
fi

# 4. Start OpenClaw (the main event!)
echo "🚀 Starting OpenClaw..."
exec openclaw gateway start
