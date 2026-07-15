# Deployment Guide — AI-Powered BI SaaS Platform

## Prerequisites

- GitHub account
- OpenAI API key (optional, for AI features)
- (Optional) Stripe account for billing
- (Optional) SMTP credentials for transactional emails

---

## Free Tier Architecture

| Component | Platform | Cost | Card? | Sleep? |
|---|---|---|---|---|
| **Frontend** (Next.js) | **Vercel** | Free | No | Never sleeps |
| **Backend** (FastAPI) | **Render** | Free | No | Sleeps after 15min idle (~30s wake) |
| **Database** (PostgreSQL) | **Supabase** | Free (500MB) | No | Never sleeps |

```text
                         ┌──────────────┐
                         │    Vercel     │
                         │  (Frontend)   │
                         └──────┬───────┘
                                │ HTTPS
                         ┌──────┴───────┐
                         │    Render     │
                         │  (Backend)    │
                         └──────┬───────┘
                    ┌───────────┴───────────┐
                    ▼                       ▼
             ┌──────────┐          ┌──────────────┐
             │ Supabase  │          │  OpenAI API   │
             │ Postgres  │          │  (optional)   │
             └──────────┘          └──────────────┘
```

---

## Step 1 — Supabase (PostgreSQL)

### Sign up & create a project

1. Go to **[supabase.com](https://supabase.com)** → click **"Start your project"**
2. Sign up with GitHub (no credit card required)
3. Click **"New project"**
4. Fill in:
   - **Name:** `bi-saas`
   - **Database password:** generate a strong one and save it
   - **Region:** pick the closest to you
   - **Pricing plan:** Free
5. Click **"Create new project"** (takes ~1-2 min)

### Get the connection string

1. In your project dashboard, go to **Project Settings** (gear icon) → **Database**
2. Under **"Connection string"**, find the URI (make sure **connection pooling is OFF** — port should be **5432**)
3. It looks like:
   ```
   postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
   ```
4. Convert it to async format:
   ```
   postgresql+asyncpg://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres?sslmode=require
   ```
   (Replace `postgresql://` with `postgresql+asyncpg://` and append `?sslmode=require`)

Save this string — you'll use it as `DATABASE_URL` in Step 2.

---

## Step 2 — Render (Backend)

### Sign up

1. Go to **[render.com](https://render.com)** → click **"Get Started"** → sign up with GitHub
2. No credit card required — click the free tier options

### Create Web Service

1. In the dashboard, click **"New +"** → **"Web Service"**
2. Select your `BI_app` GitHub repository
3. Fill in:
   - **Name:** `bi-saas-backend`
   - **Region:** pick the closest to you
   - **Branch:** `main`
   - **Runtime:** **Docker** (Render will detect the `Dockerfile` at the repo root)
   - **Plan:** **Free** ($0/month)
4. Click **"Advanced"** to expand environment variables

### Set environment variables

Add each of these:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Supabase async connection string from Step 1 |
| `SECRET_KEY` | Run `python -c "import secrets; print(secrets.token_hex(32))"` and paste the output |
| `OPENAI_API_KEY` | Your OpenAI key (leave blank to skip AI features) |
| `OPENAI_MODEL` | `gpt-4o-mini` |
| `ALLOWED_ORIGINS` | Set after Vercel deploys (Step 3) — update this later |
| `APP_URL` | Set after Vercel deploys (Step 3) — update this later |
| `RATELIMIT_ENABLED` | `false` (no Redis on free tier) |
| `DEBUG` | `false` |

5. Click **"Create Web Service"** — Render will build and deploy (takes ~5 min)
6. Once deployed, copy your Render URL — it looks like `https://bi-saas-backend.onrender.com`

### Run database migrations

After the service is live, go to the **"Shell"** tab in your Render dashboard and run:

```bash
alembic upgrade head
```

(Or trigger a health check at `https://bi-saas-backend.onrender.cohealth` — tables auto-create on first startup.)

### Important: Prevent free tier sleep

The free Render service sleeps after 15 minutes of inactivity. To keep it warm during work hours, you can use **[cron-job.org](https://cron-job.org)** (free) to ping your `/health` endpoint every 10 minutes.

---

## Step 3 — Vercel (Frontend)

### Sign up & deploy

1. Go to **[vercel.com](https://vercel.com)** → click **"Sign Up"** → **"Continue with GitHub"**
2. Click **"Add New…"** → **"Project"**
3. Import your `BI_app` repository
4. Set:
   - **Framework preset:** Next.js (auto-detected)
   - **Root Directory:** `frontend/` (important — our Next.js app is in the subdirectory)
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
5. Click **"Environment Variables"** and add:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://bi-saas-backend.onrender.com/api/v1` (your Render URL + `/api/v1`) |

6. Click **"Deploy"**

Once deployed, Vercel gives you a URL like `https://bi-saas-frontend.vercel.app`. Copy it.

### Update CORS on Render

Go back to your **Render dashboard** → your web service → **Environment** tab. Update these variables:

| Variable | New Value |
|---|---|
| `ALLOWED_ORIGINS` | `https://bi-saas-frontend.vercel.app` |
| `APP_URL` | `https://bi-saas-frontend.vercel.app` |

Then click **"Save Changes"** — Render will auto-redeploy.

---

## Environment Variables Reference

### Backend (Render env vars)

| Variable | Required | Notes |
|---|---|---|
| `SECRET_KEY` | Yes | Min 32 chars, use `secrets.token_hex(32)` |
| `DATABASE_URL` | Yes | Supabase async connection string with `?sslmode=require` |
| `OPENAI_API_KEY` | No* | *Required if AI features are enabled |
| `OPENAI_MODEL` | No | Default: `gpt-4o-mini` |
| `ALLOWED_ORIGINS` | Yes | Comma-separated Vercel frontend URLs |
| `APP_URL` | Yes | Public frontend URL for links/emails |
| `RATELIMIT_ENABLED` | No | Set to `false` if no Redis |
| `DEBUG` | No | Must be `false` in production |
| `SMTP_*` | No | Leave blank to log emails to console |
| `STRIPE_*` | No | Leave blank to disable billing |

### Frontend (Vercel env vars)

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Full URL to Render backend + `/api/v1` |

---

## Database Migrations

If you need to run migrations manually (e.g., after schema changes):

```bash
# Via Render Shell tab
alembic upgrade head
```

Tables auto-create on application startup via `Base.metadata.create_all`, but use `alembic upgrade head` explicitly for production schema changes.

---

## Seeding Demo Data

```bash
# Via Render Shell tab
python /app/scripts/seed.py
```

This creates:
- **Email:** `demo@example.com`
- **Password:** `Demo1234`


---

## CI/CD Pipeline

The project includes a GitHub Actions CI workflow (`.github/workflows/ci.yml`):

| Job | What it runs |
|---|---|
| `backend-lint` | `ruff check` + `ruff format --check` |
| `backend-test` | `pytest` against real Postgres service container |
| `frontend-lint` | `npm run lint` + `npm run type-check` |
| `frontend-test` | `jest --passWithNoTests` |
| `docker-build` | `docker compose build` |

Both Render and Vercel auto-deploy when you push to `main` (if you enabled auto-deploy).

---

## Production Checklist

- [ ] **SECRET_KEY** — generated with `secrets.token_hex(32)`, never shared
- [ ] **DEBUG=false** — disables detailed error pages
- [ ] **ALLOWED_ORIGINS** — locked to your Vercel frontend domain
- [ ] **DATABASE_URL** — uses `?sslmode=require` for Supabase
- [ ] **RATELIMIT_ENABLED=false** — rate limiting requires Redis (paid add-on)
- [ ] **Uptime monitoring** — use cron-job.org to ping `/health` every 10min (prevents Render sleep)
- [ ] **Logging** — Render captures stdout logs; view in dashboard
- [ ] **File uploads** — `MAX_UPLOAD_SIZE_MB` defaults to 50; adjust as needed
- [ ] **Key rotation** — rotate `SECRET_KEY` and `OPENAI_API_KEY` regularly

---

## Security

- **JWT authentication** — access tokens expire in 60 min, refresh tokens in 7 days
- **RBAC** — three roles: `admin`, `analyst`, `viewer`
- **Multi-tenant** — all data scoped by organization via `TenantContext`
- **CORS** — locked to `ALLOWED_ORIGINS` (your Vercel domain only)
- **File validation** — strict MIME type and extension checks on upload

---

## Docker Compose (Self-Hosted Alternative)

If you prefer to run on your own VPS:

```bash
cd docker
cp .env.example .env
# Edit .env with your values
docker compose --env-file .env up --build -d
```

| Service    | Internal Port | External Port |
|------------|--------------|---------------|
| Caddy      | 80 / 443     | 80 / 443      |
| Frontend   | 3000         | — (via Caddy) |
| Backend    | 8000         | — (via Caddy) |
| PostgreSQL | 5432         | 5434          |
| Redis      | 6379         | —             |

Requires a VPS with Docker installed and a domain pointed at it.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Backend won't start | Wrong `DATABASE_URL` or Supabase SSL | Ensure URL has `?sslmode=require` and `+asyncpg` driver |
| Frontend shows blank page | Wrong `NEXT_PUBLIC_API_URL` | Redeploy frontend with correct Render URL |
| AI features return errors | Missing `OPENAI_API_KEY` or quota exhausted | Verify key in Render env vars |
| Backend slow on first request | Render free tier cold start (~30s) | Use cron-job.org to ping every 10min |
| Email not sending | Missing SMTP env vars | Configure SMTP or check spam folder |
| CORS error in browser | `ALLOWED_ORIGINS` doesn't match Vercel URL | Update and redeploy Render |
