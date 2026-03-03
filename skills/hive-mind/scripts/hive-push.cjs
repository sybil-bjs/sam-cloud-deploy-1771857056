#!/usr/bin/env node
/**
 * 🐝 Hive Mind Push — Nightly push with topic + namespace tagging
 * 
 * Extracts today's learnings, tags with topics AND namespace, pushes to collective.
 * 
 * Namespaces:
 *   - vulkn:*     — HQ agent learnings about Vulkn
 *   - client:X:*  — Field agent learnings about client X
 *   - general:*   — Cross-cutting best practices (promoted by Queen)
 *   - inbox:*     — Raw learnings awaiting curation
 * 
 * Usage:
 *   node hive-push.cjs [--date YYYY-MM-DD] [--dry-run]
 * 
 * Env:
 *   AGENT_ROLE=hq|field (default: hq)
 *   CLIENT_ID=acme (required if field)
 *   AGENT_NAME=sybil
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

// Config
const WORKSPACE = process.env.WORKSPACE || path.join(process.env.HOME, '.openclaw/workspace');
const MEMORY_DIR = path.join(WORKSPACE, 'memory');
const TOPICS_DIR = path.join(WORKSPACE, 'topics');
const REGISTRY_PATH = path.join(TOPICS_DIR, '_registry.json');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const AGENT_NAME = process.env.AGENT_NAME || 'unknown';
const AGENT_ROLE = process.env.AGENT_ROLE || 'hq';  // hq or field
const CLIENT_ID = process.env.CLIENT_ID || null;

// Parse args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose');
const dateArg = args.find((a, i) => args[i - 1] === '--date');
const targetDate = dateArg || new Date().toISOString().split('T')[0];

// Determine namespace based on role
function getNamespace() {
  if (AGENT_ROLE === 'field') {
    if (!CLIENT_ID) {
      console.error('❌ Field agents must set CLIENT_ID');
      process.exit(1);
    }
    return `client:${CLIENT_ID}`;
  }
  return 'vulkn';  // HQ agents default to vulkn namespace
}

// Load topic registry for detection
function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) return { topics: {} };
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
}

// Detect topic from text
function detectTopic(text, registry) {
  const textLower = text.toLowerCase();
  for (const [topicId, topic] of Object.entries(registry.topics)) {
    for (const trigger of topic.triggers) {
      if (textLower.includes(trigger.toLowerCase())) {
        return topicId;
      }
    }
  }
  return 'general';
}

// Check if learning mentions "general" or "best practice" (explicit share)
function isExplicitlyGeneral(text) {
  const generalPatterns = [
    /\bgeneral\b/i,
    /\bbest.?practice/i,
    /\beveryone should/i,
    /\ball agents/i,
    /\bshare with team/i
  ];
  return generalPatterns.some(p => p.test(text));
}

// Extract learnings from memory file
function extractLearnings(content, registry, namespace) {
  const learnings = [];
  
  const patterns = [
    { regex: /💡\s*(.+)/g, category: 'insight' },
    { regex: /learned[:\s]+([^\n]+)/gi, category: 'insight' },
    { regex: /realized[:\s]+([^\n]+)/gi, category: 'insight' },
    { regex: /key insight[:\s]+([^\n]+)/gi, category: 'insight' },
    { regex: /correction[:\s]+([^\n]+)/gi, category: 'correction' },
    { regex: /decided[:\s]+([^\n]+)/gi, category: 'decision' },
    { regex: /mistake[:\s]+([^\n]+)/gi, category: 'warning' }
  ];
  
  for (const { regex, category } of patterns) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      const text = match[1].trim();
      if (text.length > 20 && text.length < 500) {
        const topic = detectTopic(text, registry);
        
        // Determine final namespace
        let finalNamespace = namespace;
        if (isExplicitlyGeneral(text)) {
          finalNamespace = 'general';  // Explicitly marked for sharing
        }
        
        learnings.push({
          content: text,
          category,
          topic,
          namespace: finalNamespace,
          date: targetDate
        });
      }
    }
  }
  
  return learnings;
}

// Push to Supabase
async function pushToHive(learning) {
  if (dryRun) {
    console.log(`  [DRY RUN] Would push: [${learning.namespace}] ${learning.content.slice(0, 50)}...`);
    return true;
  }

  const body = JSON.stringify({
    title: learning.content.slice(0, 100),
    content: learning.content,
    category: learning.category,
    tags: [
      learning.topic,
      `namespace:${learning.namespace}`,
      `date:${learning.date}`,
      `agent:${AGENT_NAME}`
    ],
    created_by: AGENT_NAME,
    version: 1
  });

  return new Promise((resolve, reject) => {
    const parsed = new URL(`${SUPABASE_URL}/rest/v1/bjs_knowledge`);
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }
    }, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve(true);
      } else {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.error(`  ❌ Push failed: ${res.statusCode} ${data}`);
          resolve(false);
        });
      }
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Main
async function main() {
  const namespace = getNamespace();
  
  console.log(`
🐝 Hive Mind Push — ${targetDate}
   Agent: ${AGENT_NAME}
   Role: ${AGENT_ROLE}
   Namespace: ${namespace}
${dryRun ? '   ⚠️  DRY RUN MODE\n' : ''}
`);
  
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY');
    process.exit(1);
  }

  // Load memory file
  const memoryPath = path.join(MEMORY_DIR, `${targetDate}.md`);
  if (!fs.existsSync(memoryPath)) {
    console.log(`No memory file for ${targetDate}`);
    return;
  }
  
  const content = fs.readFileSync(memoryPath, 'utf-8');
  const registry = loadRegistry();
  const learnings = extractLearnings(content, registry, namespace);
  
  console.log(`Found ${learnings.length} learning(s)\n`);
  
  if (learnings.length === 0) {
    console.log('Nothing to push.');
    return;
  }
  
  // Group by namespace for display
  const byNamespace = {};
  for (const l of learnings) {
    if (!byNamespace[l.namespace]) byNamespace[l.namespace] = [];
    byNamespace[l.namespace].push(l);
  }
  
  // Push each learning
  let pushed = 0;
  let failed = 0;
  
  for (const [ns, nsLearnings] of Object.entries(byNamespace)) {
    console.log(`📁 ${ns} (${nsLearnings.length})`);
    
    for (const learning of nsLearnings) {
      const success = await pushToHive(learning);
      if (success) {
        pushed++;
        if (verbose) console.log(`  ✅ [${learning.topic}] ${learning.content.slice(0, 50)}...`);
      } else {
        failed++;
      }
    }
  }
  
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Pushed: ${pushed} | Failed: ${failed}`);
  console.log(`Namespace: ${namespace}`);
}

main().catch(console.error);
