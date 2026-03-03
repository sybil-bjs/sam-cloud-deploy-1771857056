#!/usr/bin/env node
/**
 * 🐝 Hive Mind Pull — Morning pull with namespace filtering
 * 
 * Pulls learnings based on agent's access level, stores locally.
 * 
 * Access rules:
 *   - HQ agents: vulkn:* + general:*
 *   - Field agents: client:X:* + general:*
 *   - Queen (Sybil): ALL namespaces (for curation)
 * 
 * Usage:
 *   node hive-pull.cjs [--since 7] [--topic sales] [--dry-run]
 * 
 * Env:
 *   AGENT_ROLE=hq|field|queen
 *   CLIENT_ID=acme (required if field)
 *   AGENT_NAME=sybil
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

// Config
const WORKSPACE = process.env.WORKSPACE || path.join(process.env.HOME, '.openclaw/workspace');
const TOPICS_DIR = path.join(WORKSPACE, 'topics');
const HIVE_CACHE_DIR = path.join(WORKSPACE, 'memory/hive-cache');
const REGISTRY_PATH = path.join(TOPICS_DIR, '_registry.json');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const AGENT_NAME = process.env.AGENT_NAME || 'unknown';
const AGENT_ROLE = process.env.AGENT_ROLE || 'hq';
const CLIENT_ID = process.env.CLIENT_ID || null;

// Parse args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose');
const allNamespaces = args.includes('--all');  // Queen mode: see everything
const sinceDays = parseInt(args.find((a, i) => args[i - 1] === '--since') || '7');
const topicFilter = args.find((a, i) => args[i - 1] === '--topic');
const namespaceFilter = args.find((a, i) => args[i - 1] === '--namespace');

// Determine allowed namespaces based on role
function getAllowedNamespaces() {
  if (allNamespaces || AGENT_ROLE === 'queen') {
    return null;  // null = all namespaces
  }
  
  const allowed = ['general'];  // Everyone gets general
  
  if (AGENT_ROLE === 'hq') {
    allowed.push('vulkn');
  } else if (AGENT_ROLE === 'field') {
    if (!CLIENT_ID) {
      console.error('❌ Field agents must set CLIENT_ID');
      process.exit(1);
    }
    allowed.push(`client:${CLIENT_ID}`);
  }
  
  return allowed;
}

// Ensure directories exist
function ensureDirs() {
  if (!fs.existsSync(HIVE_CACHE_DIR)) {
    fs.mkdirSync(HIVE_CACHE_DIR, { recursive: true });
  }
}

// Load topic registry
function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) return { topics: {} };
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
}

// Query Hive Mind
async function queryHive(sinceDays, topic, namespaces) {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
  
  let url = `${SUPABASE_URL}/rest/v1/bjs_knowledge?select=*&order=created_at.desc&limit=200`;
  url += `&created_at=gte.${since}`;
  
  if (topic) {
    url += `&tags=cs.{${topic}}`;
  }

  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          let entries = JSON.parse(data);
          
          // Filter by allowed namespaces
          if (namespaces) {
            entries = entries.filter(e => {
              const nsTag = (e.tags || []).find(t => t.startsWith('namespace:'));
              if (!nsTag) return true;  // No namespace = allow
              const ns = nsTag.replace('namespace:', '');
              return namespaces.some(allowed => ns.startsWith(allowed));
            });
          }
          
          resolve(entries);
        } else {
          reject(new Error(`Query failed: ${res.statusCode} ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Get namespace and topic from tags
function parseEntry(entry) {
  const tags = entry.tags || [];
  let namespace = 'unknown';
  let topic = 'general';
  let agent = 'unknown';
  
  for (const tag of tags) {
    if (tag.startsWith('namespace:')) {
      namespace = tag.replace('namespace:', '');
    } else if (tag.startsWith('agent:')) {
      agent = tag.replace('agent:', '');
    } else if (tag.startsWith('date:')) {
      // Skip date tags
    } else {
      // Assume it's a topic
      topic = tag;
    }
  }
  
  return { namespace, topic, agent };
}

// Append learning to local topic file
function appendToTopic(topic, namespace, entry, registry) {
  const topicConfig = registry.topics[topic];
  let filePath;
  
  if (topicConfig) {
    filePath = path.join(WORKSPACE, topicConfig.file);
  } else {
    // Use hive-cache for unmatched topics, organized by namespace
    const cacheDir = path.join(HIVE_CACHE_DIR, namespace.replace(/:/g, '-'));
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    filePath = path.join(cacheDir, `${topic}.md`);
  }
  
  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Create file if doesn't exist
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, `# ${topic} — Hive Mind\n\n## Learnings from Hive\n\n`);
  }
  
  // Check if already exists
  const content = fs.readFileSync(filePath, 'utf-8');
  const snippet = entry.content?.slice(0, 50);
  if (snippet && content.includes(snippet)) {
    return false;  // Duplicate
  }
  
  // Append
  const dateStr = entry.created_at?.split('T')[0] || 'unknown';
  const agent = entry.created_by || 'unknown';
  const newEntry = `\n- [${dateStr}] (${agent}, ${namespace}): ${entry.content}\n`;
  
  if (content.includes('## Learnings from Hive') || content.includes('## Hive Learnings')) {
    const newContent = content.replace(
      /(## (?:Learnings from Hive|Hive Learnings))/,
      `$1${newEntry}`
    );
    fs.writeFileSync(filePath, newContent);
  } else {
    fs.appendFileSync(filePath, `\n## Hive Learnings${newEntry}`);
  }
  
  return true;
}

// Main
async function main() {
  const allowedNamespaces = getAllowedNamespaces();
  
  console.log(`
🐝 Hive Mind Pull — Last ${sinceDays} days
   Agent: ${AGENT_NAME}
   Role: ${AGENT_ROLE}
   Access: ${allowedNamespaces ? allowedNamespaces.join(', ') : 'ALL (Queen mode)'}
${dryRun ? '   ⚠️  DRY RUN MODE\n' : ''}
`);
  
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY');
    process.exit(1);
  }
  
  ensureDirs();
  const registry = loadRegistry();
  
  // Query hive with access filtering
  console.log('Querying Hive Mind...');
  const entries = await queryHive(sinceDays, topicFilter, allowedNamespaces);
  console.log(`Found ${entries.length} entries (after access filtering)\n`);
  
  if (entries.length === 0) {
    console.log('Nothing new to pull.');
    return;
  }
  
  // Group by namespace for display
  const byNamespace = {};
  for (const entry of entries) {
    const { namespace, topic, agent } = parseEntry(entry);
    if (!byNamespace[namespace]) byNamespace[namespace] = [];
    byNamespace[namespace].push({ entry, topic, agent });
  }
  
  // Store locally
  let added = 0;
  let skipped = 0;
  
  for (const [namespace, items] of Object.entries(byNamespace)) {
    console.log(`📁 ${namespace} (${items.length})`);
    
    for (const { entry, topic, agent } of items) {
      if (dryRun) {
        console.log(`  [DRY RUN] [${topic}] ${entry.content?.slice(0, 40)}...`);
        added++;
      } else {
        const wasAdded = appendToTopic(topic, namespace, entry, registry);
        if (wasAdded) {
          added++;
          if (verbose) console.log(`  ✅ [${topic}] ${entry.content?.slice(0, 40)}...`);
        } else {
          skipped++;
          if (verbose) console.log(`  ⏭️  Already exists: ${entry.content?.slice(0, 30)}...`);
        }
      }
    }
  }
  
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Added: ${added} | Skipped: ${skipped}`);
}

main().catch(console.error);
