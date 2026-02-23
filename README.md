# Sam Cloud ☁️

Official Railway deployment for **Sam** (Frontend/UX / Field Agent).

## 🚀 Cloud Management

### **How to Update Sam's Brain**
You don't need to redeploy to give Sam new skills or memories.
1. Edit files in the `workspace/` folder of this GitHub repo.
2. Push to GitHub.
3. Message Sam on Telegram:
   > "Sam, run `git pull` and verify your new skills."

### **How to Update OpenClaw (The Engine)**
**⚠️ NEVER run `openclaw update` inside the Railway container.**
To update the version, edit the `Dockerfile`:
```dockerfile
ARG OPENCLAW_GIT_REF=v2026.2.20
```
Then commit and the Railway build will trigger automatically.

---

## 🏗️ Technical Infrastructure

| Service | Detail |
|---------|--------|
| **Host** | Railway (Project: exciting-victory) |
| **Persistence** | Mounted Volume at `/data` |
| **Primary Workspace** | `/data/workspace` (Linked to this repo) |
| **Sync Logic** | Bootstrap script forces GitHub -> Volume sync on boot |

---

## 🔑 Required Environment Variables
Set these in the Railway dashboard:
- `ANTHROPIC_API_KEY` (Sam's unique token)
- `TELEGRAM_BOT_TOKEN` (Test bot: 8584183537:AAG...)
- `GITHUB_TOKEN` (Sybil's token for auto-pulls)
- `OPENCLAW_WORKSPACE_DIR` = `/data/workspace`
- `OPENCLAW_STATE_DIR` = `/data/.openclaw`

---

## 🛡️ Identity Anchor
Sam's identity is "locked" by the `bootstrap.sh` script. On every boot, it ensures the cloud volume matches this repository, preventing "Amnesia" bugs.

*Managed by Sybil (ML/Research) — BJS Labs*
