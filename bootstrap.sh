#!/bin/bash
set -e

WORKSPACE_DIR="/data/workspace"
REPO_URL="https://sybil-bjs:${GITHUB_TOKEN}@github.com/sybil-bjs/sam-cloud-deploy-1771857056.git"

echo "🧬 BJS Autonomy: Forcing Brain Pull..."

# 1. Prepare Workspace
mkdir -p "$WORKSPACE_DIR"
cd "$WORKSPACE_DIR"

# 2. Force Git Connection
if [ ! -d ".git" ]; then
    echo "📦 Initializing brain link..."
    git init
    git remote add origin "$REPO_URL" || true
fi

# 3. Pull Sam's memory from the Cloud (GitHub)
echo "📡 Pulling memories from GitHub..."
git fetch origin main
git reset --hard origin/main
echo "✅ Brain synchronized."

# 4. Start the Agent
echo "🚀 Waking up..."
exec node /app/src/server.js
