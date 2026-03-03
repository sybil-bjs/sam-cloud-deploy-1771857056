#!/usr/bin/env node
/**
 * 🐝 Hive Mind Curate — Queen's curation workflow
 * 
 * Reviews client-specific learnings and decides what should be promoted to general.
 * Run weekly by Sybil (Queen).
 * 
 * Workflow:
 *   1. Fetch all client:* and vulkn:* entries from last N days
 *   2. Show each one with context
 *   3. Agent decides: keep in namespace OR promote to general
 *   4. Promoted entries get re-tagged
 * 
 * Usage:
 *   node hive-curate.cjs [--since 7] [--dry-run] [--auto]
 * 
 * Flags:
 *   --auto    Auto-detect generalizable learnings (no prompts)
 *   --report  Just show what would be curated
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const reportOnly = args.includes('--report');
const autoMode = args.includes('--auto');
const sinceDays = parseInt(args.find((a, i) => args[i - 1] === '--since') || '7');

// Patterns that suggest a learning is generalizable
const GENERAL_PATTERNS = [
  /\balways\b/i,
  /\bnever\b/i,
  /\bbest.?practice/i,
  /\bpattern/i,
  /\bworks well/i,
  /\bshould\b/i,
  /\blearned that/i,
  /\bimportant to/i,
  /\bkey insight/i,
  /\beveryone/i,
  /\ball agents/i,
  /\bin general/i,
  /\busually/i,
  /\btypically/i
];

// Patterns that suggest client-specific (keep isolated)
const CLIENT_PATTERNS = [
  /\bthis client/i,
  /\btheir\s+(team|company|business)/i,
  /\bspecifically/i,
  /\bonly here/i,
  /\bunique to/i,
  /\b(prefers?|likes?|wants?)\b/i,  // Client preferences
  /\bcontact/i,
  /\bphone|email|address/i
];

// Score how generalizable a learning is (-10 to +10)
function scoreGeneralizability(content) {
  let score = 0;
  
  for (const pattern of GENERAL_PATTERNS) {
    if (pattern.test(content)) score += 2;
  }
  
  for (const pattern of CLIENT_PATTERNS) {
    if (pattern.test(content)) score -= 3;
  }
  
  // Length bonus: longer explanations are often more generalizable
  if (content.length > 100) score += 1;
  if (content.length > 200) score += 1;
  
  return Math.max(-10, Math.min(10, score));
}

// Query entries not in general namespace
async function queryNonGeneral(sinceDays) {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
  
  let url = `${SUPABASE_URL}/rest/v1/bjs_knowledge?select=*&order=created_at.desc&limit=100`;
  url += `&created_at=gte.${since}`;

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
          
          // Filter out already-general entries
          entries = entries.filter(e => {
            const tags = e.tags || [];
            const nsTag = tags.find(t => t.startsWith('namespace:'));
            if (!nsTag) return true;
            return !nsTag.includes('general');
          });
          
          resolve(entries);
        } else {
          reject(new Error(`Query failed: ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Promote entry to general namespace
async function promoteToGeneral(entry) {
  // Update tags to include general namespace
  const newTags = (entry.tags || []).filter(t => !t.startsWith('namespace:'));
  newTags.push('namespace:general');
  newTags.push('promoted:true');
  newTags.push(`promoted_from:${entry.tags?.find(t => t.startsWith('namespace:'))?.replace('namespace:', '') || 'unknown'}`);
  
  const body = JSON.stringify({ tags: newTags });
  
  return new Promise((resolve, reject) => {
    const parsed = new URL(`${SUPABASE_URL}/rest/v1/bjs_knowledge?id=eq.${entry.id}`);
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'PATCH',
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
        resolve(false);
      }
    });
    req.on('error', () => resolve(false));
    req.write(body);
    req.end();
  });
}

// Parse namespace from entry
function getNamespace(entry) {
  const nsTag = (entry.tags || []).find(t => t.startsWith('namespace:'));
  return nsTag ? nsTag.replace('namespace:', '') : 'unknown';
}

// Main
async function main() {
  console.log(`
👑 Hive Mind Curation — Queen's Review
   Since: ${sinceDays} days
   Mode: ${autoMode ? 'Auto-detect' : 'Manual review'}
${dryRun || reportOnly ? '   ⚠️  REPORT ONLY (no changes)\n' : ''}
`);

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY');
    process.exit(1);
  }

  const entries = await queryNonGeneral(sinceDays);
  console.log(`Found ${entries.length} entries to review\n`);
  
  if (entries.length === 0) {
    console.log('Nothing to curate.');
    return;
  }
  
  const candidates = [];
  const keepIsolated = [];
  
  for (const entry of entries) {
    const score = scoreGeneralizability(entry.content || '');
    const namespace = getNamespace(entry);
    
    if (score >= 3) {
      candidates.push({ entry, score, namespace });
    } else {
      keepIsolated.push({ entry, score, namespace });
    }
  }
  
  // Report
  console.log(`📊 Curation Summary\n`);
  console.log(`Candidates for promotion (score >= 3): ${candidates.length}`);
  console.log(`Keep isolated (score < 3): ${keepIsolated.length}\n`);
  
  if (candidates.length > 0) {
    console.log(`\n✅ PROMOTE TO GENERAL:\n`);
    for (const { entry, score, namespace } of candidates) {
      console.log(`  [Score: ${score}] (${namespace}) ${entry.created_by}`);
      console.log(`    "${entry.content?.slice(0, 80)}..."\n`);
    }
  }
  
  if (keepIsolated.length > 0 && autoMode) {
    console.log(`\n⏭️ KEEP ISOLATED (first 5):\n`);
    for (const { entry, score, namespace } of keepIsolated.slice(0, 5)) {
      console.log(`  [Score: ${score}] (${namespace}) "${entry.content?.slice(0, 60)}..."`);
    }
  }
  
  // Actually promote if not dry run
  if (!dryRun && !reportOnly && candidates.length > 0) {
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`Promoting ${candidates.length} entries to general...\n`);
    
    let promoted = 0;
    for (const { entry } of candidates) {
      const success = await promoteToGeneral(entry);
      if (success) {
        promoted++;
        console.log(`  ✅ Promoted: ${entry.content?.slice(0, 40)}...`);
      } else {
        console.log(`  ❌ Failed: ${entry.content?.slice(0, 40)}...`);
      }
    }
    
    console.log(`\nPromoted: ${promoted}/${candidates.length}`);
  }
  
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Curation complete.`);
}

main().catch(console.error);
