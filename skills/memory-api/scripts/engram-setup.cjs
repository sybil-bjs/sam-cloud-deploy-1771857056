#!/usr/bin/env node
/**
 * Engram Setup — Initialize project-based memory for an agent
 * 
 * Creates the memory/projects/ structure with auto-loading triggers.
 * Safe to run on existing agents — only creates what's missing.
 * 
 * Usage:
 *   node engram-setup.cjs [--workspace /path/to/workspace]
 * 
 * Env:
 *   AGENT_NAME=saber
 *   AGENT_ROLE=hq|field
 *   CLIENT_ID=acme (required if field)
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const workspaceArg = args.find((a, i) => args[i - 1] === '--workspace');
const WORKSPACE = workspaceArg || process.env.WORKSPACE || path.join(process.env.HOME, '.openclaw/workspace');
const AGENT_NAME = process.env.AGENT_NAME || 'agent';
const AGENT_ROLE = process.env.AGENT_ROLE || 'hq';
const CLIENT_ID = process.env.CLIENT_ID || null;

console.log(`
🧠 Engram Memory Setup
   Workspace: ${WORKSPACE}
   Agent: ${AGENT_NAME} (${AGENT_ROLE})
   ${AGENT_ROLE === 'field' && CLIENT_ID ? `Client: ${CLIENT_ID}` : ''}
`);

// Create directories (non-destructive)
const dirs = [
  'memory/projects',
  'memory/learning',
  'memory/hive-cache'
];

for (const dir of dirs) {
  const fullPath = path.join(WORKSPACE, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅ Created: ${dir}/`);
  } else {
    console.log(`⏭️  Exists: ${dir}/`);
  }
}

// Create registry if doesn't exist
const registryPath = path.join(WORKSPACE, 'memory/projects/_registry.json');
if (!fs.existsSync(registryPath)) {
  const starterRegistry = {
    "$schema": "project-registry-v1",
    "description": "Maps trigger words to project files for auto-loading. When conversation mentions a trigger, the project file is loaded automatically.",
    
    "projects": {
      // Example entries — agent adds their own as they create projects
      "example-project": {
        "file": "memory/projects/example-project.md",
        "triggers": ["example", "demo"],
        "description": "Example project (delete this)"
      }
    },
    
    "config": {
      "maxProjectsPerSession": 3,
      "autoDetect": true,
      "fallbackToSearch": true
    }
  };
  
  fs.writeFileSync(registryPath, JSON.stringify(starterRegistry, null, 2));
  console.log(`✅ Created: memory/projects/_registry.json`);
} else {
  console.log(`⏭️  Exists: memory/projects/_registry.json`);
}

// Create starter project file based on role
const starterProject = AGENT_ROLE === 'field' && CLIENT_ID
  ? {
      path: `memory/projects/${CLIENT_ID}.md`,
      name: CLIENT_ID,
      triggers: [CLIENT_ID.toLowerCase()],
      content: `# Project: ${CLIENT_ID}
<!-- Updated by any session working on ${CLIENT_ID}. Last: ${new Date().toISOString().split('T')[0]} -->

## Context
Primary client project for ${AGENT_NAME}.

## Current Status
[Where things stand]

## Key Decisions
[Important choices made and why]

## Next Steps
[What needs to happen next]

## Knowledge Base
[Accumulated knowledge about this client]
`
    }
  : {
      path: 'memory/projects/general.md',
      name: 'general',
      triggers: ['general', 'misc', 'other'],
      content: `# Project: General
<!-- Updated by any session. Last: ${new Date().toISOString().split('T')[0]} -->

## Context
General work that doesn't fit a specific project.

## Current Status
[Where things stand]

## Key Decisions
[Important choices made and why]

## Next Steps
[What needs to happen next]
`
    };

const projectPath = path.join(WORKSPACE, starterProject.path);
if (!fs.existsSync(projectPath)) {
  fs.writeFileSync(projectPath, starterProject.content);
  console.log(`✅ Created: ${starterProject.path}`);
  
  // Also add to registry
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
  registry.projects[starterProject.name] = {
    file: starterProject.path,
    triggers: starterProject.triggers,
    description: `${starterProject.name} project`
  };
  // Remove example if we added a real one
  if (starterProject.name !== 'example-project') {
    delete registry.projects['example-project'];
  }
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  console.log(`✅ Added to registry: ${starterProject.name}`);
} else {
  console.log(`⏭️  Exists: ${starterProject.path}`);
}

// Create HEARTBEAT.md if doesn't exist
const heartbeatPath = path.join(WORKSPACE, 'HEARTBEAT.md');
if (!fs.existsSync(heartbeatPath)) {
  const heartbeatContent = `# HEARTBEAT.md

## Memory Write (every heartbeat)
Review what happened since your last heartbeat. If there were any interactions, decisions, or notable events, write them to the relevant project file in memory/projects/ now. Don't skip this.

## Memory Consolidation (2-3x daily)
Check memory/projects/ for files updated since last consolidation.
If significant content exists, summarize to memory/YYYY-MM-DD.md and promote key insights to MEMORY.md.
Track in memory/heartbeat-state.json: { "lastConsolidation": <timestamp> }

## A2A Check (if configured)
Check for pending A2A messages and process them.
`;
  fs.writeFileSync(heartbeatPath, heartbeatContent);
  console.log(`✅ Created: HEARTBEAT.md`);
} else {
  console.log(`⏭️  Exists: HEARTBEAT.md`);
}

// Create heartbeat-state.json if doesn't exist
const statePath = path.join(WORKSPACE, 'memory/heartbeat-state.json');
if (!fs.existsSync(statePath)) {
  const state = {
    lastConsolidation: null,
    lastChecks: {}
  };
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  console.log(`✅ Created: memory/heartbeat-state.json`);
} else {
  console.log(`⏭️  Exists: memory/heartbeat-state.json`);
}

console.log(`
${'─'.repeat(50)}
✅ Engram setup complete!

Structure created:
  memory/
  ├── projects/
  │   ├── _registry.json    ← trigger words for auto-loading
  │   └── ${starterProject.name}.md
  ├── learning/             ← corrections and patterns
  ├── hive-cache/           ← pulled from collective
  └── heartbeat-state.json  ← consolidation tracking

Next steps:
1. Create project files as you work: memory/projects/{name}.md
2. Add triggers to _registry.json for auto-loading
3. Set up Memory Refresh cron (4 AM daily)

Usage:
  # Auto-load project by context
  node skills/memory-api/scripts/project-recall.cjs "conversation text"
  
  # List all projects
  node skills/memory-api/scripts/project-recall.cjs --list

Env vars for hive:
  AGENT_NAME=${AGENT_NAME}
  AGENT_ROLE=${AGENT_ROLE}
  ${AGENT_ROLE === 'field' ? `CLIENT_ID=${CLIENT_ID || 'your-client'}` : ''}
`);
