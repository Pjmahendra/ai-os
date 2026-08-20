# Deploying AI-OS for free

The API (`apps/api`) needs to run as a **persistent process**, not a serverless function —
the cron scheduler (`services/scheduler.ts`) depends on `setInterval` in a process that stays
alive continuously, which Vercel/serverless platforms don't guarantee. The frontend
(`apps/web`) has no such constraint and deploys to Vercel exactly as intended.

Two paths for the API, depending on whether you have a card to put on file:

- **No credit card → Render** (this doc's main path). Free, no card, but the container sleeps
  after 15 minutes of no traffic unless kept awake — see the keep-alive step below.
- **Have a card → Fly.io** (see `DEPLOY-FLY.md`... actually just the alternate section at the
  bottom of this file). A real always-on VM, no sleep workaround needed, but Fly requires a
  card on file for its free allowance even though it shouldn't charge you at this scale.

Either way, the database is a free hosted Postgres (Neon or Supabase) and the frontend is
Vercel. Provider free-tier terms change over time — double check current policy (card
requirements, usage limits) at signup for whichever you pick.

**Use `AI_PROVIDER=gemini` in production.** The local `ollama` provider needs an Ollama
server with a model loaded in memory — that won't run on a free, tiny instance. Keep
`AI_PROVIDER=ollama` in your local `.env` if you use it there; just don't set it in production.

---

## 1. Database — Neon (no card required)

1. Create a project at [neon.tech](https://neon.tech) (free tier, no card at signup).
2. Copy the **pooled** connection string from your project dashboard — it looks like:
   ```
   postgresql://user:password@ep-xxxx-pooler.region.aws.neon.tech/dbname?sslmode=require
   ```
   Pooled (the `-pooler` host) matters — the scheduler's dedicated advisory-lock connection
   plus normal request traffic both open connections, and pooling avoids exhausting Postgres's
   connection limit.
3. Keep this connection string for step 2.

Neon's free tier suspends compute after 5 minutes of inactivity and wakes on the next query
(a few seconds of added latency for that one request) — normal and fine for a personal
project; just don't be surprised by an occasional slow first request.

(Supabase is a fine alternative if you'd rather use it — same pooled-connection-string idea.)

## 2. API — Render (no card required)

1. Sign up at [render.com](https://render.com) — no card needed for the free tier.
2. New → **Web Service** → connect your GitHub repo.
3. Configure:
   - **Root Directory**: leave blank (the `Dockerfile` at the repo root already builds
     `apps/api` specifically — see the Dockerfile comments).
   - **Runtime**: Docker (Render auto-detects the root `Dockerfile`).
   - **Instance type**: Free.
4. Add environment variables (Render's dashboard, not committed anywhere):
   ```
   DATABASE_URL=<your Neon pooled connection string>
   JWT_SECRET=<a long random string, 32+ chars>
   AI_PROVIDER=gemini
   GEMINI_API_KEY=<your Gemini key>
   GEMINI_MODEL=gemini-2.5-flash
   N8N_WEBHOOK_URL=<your n8nx test webhook, if you use it>
   N8N_NOTIFICATION_WEBHOOK_URL=<your n8n notification webhook>
   CORS_ORIGIN=https://<your-vercel-app>.vercel.app   # add this after step 3, then redeploy
   ```
   Render sets `PORT` itself — the app already reads `process.env.PORT` via `@ai-os/config`,
   so no change needed there.
5. Deploy. Render builds the `Dockerfile`, which runs `prisma migrate deploy` on every boot
   before starting the server — your Neon database gets migrated automatically.
6. Verify: `curl https://<your-app>.onrender.com/health`

### Keeping it awake (the part Fly.io doesn't need)

Render's free tier stops the container entirely after ~15 minutes with no incoming HTTP
request — which would also stop the in-process scheduler. Fix: a free external pinger that
hits `/health` every 10 minutes, so it never goes idle long enough to sleep.

1. Sign up at [cron-job.org](https://cron-job.org) (free, no card).
2. Create a job: URL = `https://<your-app>.onrender.com/health`, interval = every 10 minutes.

This is a known, common workaround — not a perfect guarantee like a real always-on VM, but
effective in practice. Two things worth knowing:
- Render's free tier also has a monthly usage-hour cap (check Render's current docs — it's
  historically been generous but not unlimited); running 24/7 all month may bump into it.
- If the container *does* restart for any reason (deploy, brief outage), any cron tick that
  would have fired during the gap is simply skipped, not queued — same behavior as your local
  dev machine being asleep, not a correctness bug.

## 3. Frontend — Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new) (no card required for Hobby).
2. Set **Root Directory** to `apps/web` (this is a monorepo).
3. Framework preset auto-detects as Vite; defaults are correct.
4. Add an environment variable:
   ```
   VITE_API_URL=https://<your-app>.onrender.com
   ```
5. Deploy. Vercel gives you `https://<project>.vercel.app`.
6. Go back to Render's env vars and set `CORS_ORIGIN` to that exact URL, then redeploy the API.

## 4. Smoke testxx

```bash
curl https://<your-app>.onrender.com/health

curl -X POST https://<your-app>.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"a-real-password","name":"You"}'
```

Then open the Vercel URL, log in, and try the Chat page.

---

## Alternative: Fly.io (if you get a card later)

A real always-on VM — no keep-alive pinger needed, and Fly's free allowance shouldn't charge
anything at this project's scale (a card is required to enable it regardless).

1. Install and sign up: https://fly.io/docs/hands-on/install-flyctl/ then `flyctl auth signup`.
2. Edit `fly.toml` at the repo root — change `app = "ai-os-api-CHANGE-ME"` to something
   globally unique.
3. From the repo root: `flyctl launch --no-deploy`
4. Set secrets (same values as the Render env vars above):
   ```bash
   flyctl secrets set \
     DATABASE_URL="<your Neon/Supabase pooled connection string>" \
     JWT_SECRET="<a long random string, 32+ chars>" \
     GEMINI_API_KEY="<your Gemini key>" \
     GEMINI_MODEL="gemini-2.5-flash" \
     N8N_WEBHOOK_URL="<your n8n test webhook, if you use it>" \
     N8N_NOTIFICATION_WEBHOOK_URL="<your n8n notification webhook>" \
     CORS_ORIGIN="https://<your-vercel-app>.vercel.app"
   ```
5. `flyctl deploy`, then point `VITE_API_URL` (Vercel) at `https://<your-app>.fly.dev` instead
   of the Render URL.

`fly.toml` sets `auto_stop_machines = false` and `min_machines_running = 1` deliberately —
don't change those, it's the entire reason to use Fly over a serverless platform.

## Notes

- **Migrations on every deploy**: the Dockerfile's `CMD` runs `prisma migrate deploy` before
  starting the server every boot. Safe/idempotent (a no-op when nothing's pending), but it
  does mean a schema change ships automatically on your next deploy, with no separate manual
  migration step.
- **Logs**: Render's dashboard streams the same structured (pino) logs you see locally
  (`flyctl logs` on Fly).
