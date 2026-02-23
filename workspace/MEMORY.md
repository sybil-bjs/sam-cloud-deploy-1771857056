# Sam — Boot Memory

## Identity
- **Name:** Sam | **Role:** Frontend / UX / Field Agent | **Team:** VULKN / BJS LABS
- English with Bridget & Johan, Spanish with clients
- Avatar: generated (multi-tool mascot)

## My Humans
- **Bridget** (5063274787) — Co-Founder
- **Johan** (6151122745) — Co-Founder / CEO

## Agent Team
- Sybil (ML/Research): 5fae1839-ab85-412c-acc0-033cbbbbd15b
- Saber (Sales/Marketing): 415a84a4-af9e-4c98-9d48-040834436e44
- Santos (COO): e7fabc18-75fa-4294-bd7d-9e5ed0dedacb
- Sage (Backend, DOWN): f6198962-313d-4a39-89eb-72755602d468
- Sam (me): 62bb0f39-2248-4b14-806d-1c498c654ee7

## My Clients
- **Click Seguros** — Javier Mitrani (8356964364) | Insurance system, landing pages | Spanish | 7 PM daily reports
- **Senda Chat** — Suzanne Rubinstein (7595883487) | Suicide prevention platform | English
- **Sara** — TBD (need contact info)
- **Bituaj** — Diverza Dashboard (Angular) | Spanish

## Key Learnings
- MEMORY.md has ~4000 char limit. Curated index, not a dump. Details go in core/ files.
- Write memory IMMEDIATELY after client conversations. No mental notes — they don't survive sessions.
- Heartbeat runs every 30 min: A2A check, memory write, client oversight, proactive check-ins.
- Cron jobs run overnight (midnight-5 AM) on Sonnet to avoid rate limits during active hours.
- OpenClaw Auto-Update DISABLED for field agents (Bridget's directive).

## Active Projects
- Click Seguros: policy capture system, brand guidelines, daily reports
- Senda Chat: platform planning (4 phases documented)
- Bituaj: Diverza Dashboard maintenance

## Recent Context (2026-02-21/22)
- **Context pruning enabled:** 20m TTL to keep sessions focused (Bridget approved)
- **Major cron overhaul completed:** Fixed all 12 jobs (model alias issue), spaced overnight scheduling
- **A2A daemon stability:** Registration lost after Railway restarts, requires manual restart
- **Memory Guardian tuning:** Producing false positives from pattern matching without context
- **Client guide insights:** Must be completely non-technical, users describe outcomes vs implementation
- **Learning extraction working well:** Surprise-score analysis identifying operational insights

## Systems Status
- 12 cron jobs running (midnight-5 AM schedule)
- A2A WebSocket connected and working
- Context pruning: cache-ttl mode, 20m TTL
- Click Seguros daily report upgraded to opus model