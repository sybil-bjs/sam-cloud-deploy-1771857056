#!/usr/bin/env node
/**
 * Project Add — Register a new project with triggers
 * 
 * Adds a project entry to memory/projects/_registry.json and optionally
 * creates the project file with a starter template.
 * 
 * Usage:
 *   node project-add.cjs harvard --triggers "harvard,research,university"
 *   node project-add.cjs vulkn-sales --triggers "vulkn,sales,pricing" --create
 *   node project-add.cjs --remove old-project
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const WORKSPACE = process.env.WORKSPACE || path.join(process.env.HOME, '.openclaw/workspace');
const REGISTRY_PATH = path.join(WORKSPACE, 'memory/projects/_registry.json');
const PROJECTS_DIR = path.join(WORKSPACE, 'memory/projects');

// Parse args
const projectName = args.find(a => !a.startsWith('--'));
const triggersArg = args.find((a, i) => args[i - 1] === '--triggers');
const descArg = args.find((a, i) => args[i - 1] === '--desc');
const createFile = args.includes('--create');
const removeMode = args.includes('--remove');

if (!projectName) {
  console.log(`
Usage:
  project-add.cjs <name> --triggers "word1,word2,word3" [--create] [--desc "description"]
  project-add.cjs --remove <name>

Examples:
  project-add.cjs harvard --triggers "harvard,research" --create
  project-add.cjs vulkn-sales --triggers "vulkn,sales,pricing"
  project-add.cjs --remove old-project
`);
  process.exit(1);
}

// Load registry
function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    return {
      "$schema": "project-registry-v1",
      "projects": {},
      "config": {
        "maxProjectsPerSession": 3,
        "autoDetect": true,
        "fallbackToSearch": true
      }
    };
  }
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
}

// Save registry
function saveRegistry(registry) {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

// Remove project
if (removeMode) {
  const registry = loadRegistry();
  
  if (!registry.projects[projectName]) {
    console.error(`❌ Project not found: ${projectName}`);
    process.exit(1);
  }
  
  delete registry.projects[projectName];
  saveRegistry(registry);
  console.log(`✅ Removed from registry: ${projectName}`);
  console.log(`   (File not deleted — remove manually if needed)`);
  process.exit(0);
}

// Add project
if (!triggersArg) {
  console.error('❌ Must provide --triggers "word1,word2,..."');
  process.exit(1);
}

const triggers = triggersArg.split(',').map(t => t.trim().toLowerCase());
const filePath = `memory/projects/${projectName}.md`;
const fullPath = path.join(WORKSPACE, filePath);

const registry = loadRegistry();

// Check if already exists
if (registry.projects[projectName]) {
  console.log(`⚠️  Project already exists: ${projectName}`);
  console.log(`   Updating triggers...`);
}

// Add to registry
registry.projects[projectName] = {
  file: filePath,
  triggers: triggers,
  description: descArg || `${projectName} project`
};

saveRegistry(registry);
console.log(`✅ Added to registry: ${projectName}`);
console.log(`   Triggers: ${triggers.join(', ')}`);

// Create file if requested
if (createFile) {
  if (fs.existsSync(fullPath)) {
    console.log(`⏭️  File exists: ${filePath}`);
  } else {
    const template = `# Project: ${projectName}
<!-- Updated by any session working on ${projectName}. Last: ${new Date().toISOString().split('T')[0]} -->

## Context
[What this project is about]

## Current Status
[Where things stand]

## Key Decisions
[Important choices made and why]

## Next Steps
[What needs to happen next]

## Knowledge Base
[Accumulated knowledge and learnings]
`;
    fs.writeFileSync(fullPath, template);
    console.log(`✅ Created: ${filePath}`);
  }
}

console.log(`
Done! The project will auto-load when conversation mentions: ${triggers.join(', ')}
`);
