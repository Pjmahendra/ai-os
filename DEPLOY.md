# Deploying AI-OS for free

This deploys the API (`apps/api`) to Fly.io as a persistent process — needed because the
cron scheduler depends on the process staying alive continuously, which serverless platforms
(Vercel, plain Render/Railway free tiers) don't guarantee. The frontend (`apps/web`) goes to
Vercel, which is exactly what it's built for. The database is Supabase's free Postgres tier.

All three are free at this project's scale. Fly.io's free usage allowance requires a card
on file but shouldn't charge anything here; check current pricing/free-tier terms for all
three before you sign up, since these change over time.

**Use `AI_PROVIDER=openrouter` in production.** The local `ollama` provider needs an Ollama
server with a model loaded in memory — that won't run on a free 256MB VM. Keep
`AI_PROVIDER=ollama` in your local `.env` if you use it there; just don't set it in production.

---

## 1. Database — Supabase

1. Create a project at [supabase.com](https://supabase.com) (free tier).
2. In your project's Settings → Database, copy the **connection pooling** connection string
   (not the direct connection) — it looks like:
   ```
   postgresql://postgres.xxxxx:[PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres
   ```
   Pooled is important — a serverless-adjacent/many-short-connections pattern (which the
   scheduler's dedicated lock connection plus normal request traffic both create) needs
   pooling to avoid exhausting Postgres's connection limit.
3. Keep this connection string handy for step 3.

Supabase's free tier pauses a project after a week of *zero* activity — the scheduler's own
requests every 60 seconds count as activity, so a project actually being used won't pause.

## 2. API — Fly.io

1. Install the CLI and sign up: https://fly.io/docs/hands-on/install-flyctl/
   ```bash
   flyctl auth signup   # or `flyctl auth login` if you already have an account
   ```
2. Edit `fly.toml` at the repo root — change `app = "ai-os-api-CHANGE-ME"` to something
   globally unique (Fly app names are global, like a subdomain).
3. From the repo root:
   ```bash
   flyctl launch --no-deploy   # detects fly.toml, creates the app, skip its own Dockerfile prompt
   ```
4. Set secrets (never commit these — this is the equivalent of your local `.env`):
   ```bash
   flyctl secrets set \
     DATABASE_URL="<your Supabase pooled connection string>" \
     JWT_SECRET="<a long random string, 32+ chars>" \
     OPENROUTER_API_KEY="<your OpenRouter key>" \
     OPENROUTER_MODEL="openrouter/free" \
     N8N_WEBHOOK_URL="<your n8n test webhook, if you use it>" \
     N8N_NOTIFICATION_WEBHOOK_URL="<your n8n notification webhook>" \
     CORS_ORIGIN="https://<your-vercel-app>.vercel.app"
   ```
   (`AI_PROVIDER` is already set to `openrouter` in `fly.toml`'s `[env]` block — override with
   `flyctl secrets set AI_PROVIDER=...` only if you need something else.)
5. Deploy:
   ```bash
   flyctl deploy
   ```
   This builds the root `Dockerfile`, which runs `prisma migrate deploy` on every boot before
   starting the server — your Supabase database gets migrated automatically on first deploy.
6. Verify:
   ```bash
   curl https://<your-app>.fly.dev/health
   ```

## 3. Frontend — Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. In the import screen (or Project Settings → General afterward), set **Root Directory** to
   `apps/web` — this is a monorepo, so Vercel needs to know which app to build.
3. Framework preset should auto-detect as Vite. Build command `npm run build`, output
   directory `dist` (Vercel's Vite preset defaults are already correct).
4. Add an environment variable:
   ```
   VITE_API_URL=https://<your-app>.fly.dev
   ```
5. Deploy. Vercel gives you a `https://<project>.vercel.app` URL.
6. Go back to step 2.4 and make sure `CORS_ORIGIN` on Fly matches this exact URL (redeploy
   the API with `flyctl deploy` if you set it after the API was already deployed).

## 4. Smoke test

```bash
curl https://<your-app>.fly.dev/health

curl -X POST https://<your-app>.fly.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"a-real-password","name":"You"}'
```

Then open the Vercel URL, log in, and try the Chat page.

## Notes

- **Migrations on every deploy**: the Dockerfile's `CMD` runs `prisma migrate deploy` before
  starting the server every time the container boots. This is safe/idempotent — it's a no-op
  when nothing's pending — but it does mean a schema change ships automatically on your next
  `flyctl deploy`, with no separate manual migration step.
- **Logs**: `flyctl logs` streams the same structured (pino) logs you see locally.
- **Scaling to zero**: don't. `fly.toml` sets `auto_stop_machines = false` and
  `min_machines_running = 1` specifically so the scheduler keeps ticking. Changing those
  defeats the reason this is on Fly instead of a serverless platform.
