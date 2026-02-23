#!/bin/bash
# BJS Agent Bootstrap - SAFE version
# NEVER overwrites existing workspace files

WORKSPACE_DIR="/data/workspace"
REPO_URL="https://sybil-bjs:${GITHUB_TOKEN}@github.com/sybil-bjs/sam-cloud-deploy-1771857056.git"

echo "🧬 BJS Autonomy: Starting up..."

# 1. Prepare Workspace
mkdir -p "$WORKSPACE_DIR"
cd "$WORKSPACE_DIR"

# 2. Check if workspace already has files (PROTECT EXISTING BRAIN)
if [ -f "$WORKSPACE_DIR/IDENTITY.md" ] || [ -f "$WORKSPACE_DIR/SOUL.md" ] || [ -f "$WORKSPACE_DIR/MEMORY.md" ]; then
    echo "🧠 Existing brain detected - PROTECTING existing files!"
    echo "   Skipping git sync and template seeding to preserve Sam's memory."
else
    echo "📦 No existing brain found - setting up fresh workspace..."
    
    # Try Git Connection (but don't fail if it doesn't work)
    if [ -n "$GITHUB_TOKEN" ]; then
        echo "📡 Attempting brain sync from GitHub..."
        
        if [ ! -d ".git" ]; then
            git init 2>/dev/null || true
            git remote add origin "$REPO_URL" 2>/dev/null || true
        fi
        
        if git fetch origin main 2>/dev/null && git reset --hard origin/main 2>/dev/null; then
            echo "✅ Brain synchronized from GitHub."
        else
            echo "⚠️ Git sync failed - will use template instead."
            # Seed from template
            if [ -d "/app/workspace-seed" ]; then
                cp -r /app/workspace-seed/* "$WORKSPACE_DIR/" 2>/dev/null || true
                echo "✅ Workspace seeded from template."
            fi
        fi
    else
        echo "⚠️ No GITHUB_TOKEN - seeding from template..."
        if [ -d "/app/workspace-seed" ]; then
            cp -r /app/workspace-seed/* "$WORKSPACE_DIR/" 2>/dev/null || true
            echo "✅ Workspace seeded from template."
        fi
    fi
fi

# 3. Start OpenClaw (the main event!)
echo "🚀 Starting OpenClaw..."
exec openclaw gateway start
