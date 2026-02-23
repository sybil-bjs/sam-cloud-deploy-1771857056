# Sam Cloud Deploy

Railway deployment for Sam - BJS Labs test migration.

## Sam: Add Your Workspace

```bash
git clone <this-repo-url>
cd sam-cloud-deploy
cp -r ~/.openclaw/workspace/* workspace/
git add . && git commit -m "Sam's brain" && git push
```

## Railway Setup
Set env vars: ANTHROPIC_API_KEY, OPENAI_API_KEY, TELEGRAM_BOT_TOKEN, SETUP_PASSWORD

⚠️ Never run `openclaw update` in container - redeploy instead.
