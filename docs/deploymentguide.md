# Deployment Guide — AI-Powered BI SaaS Platform

## Prerequisites

- Docker & Docker Compose (v2.22+)
- Domain name(s) pointed at your server
- OpenAI API key (or alternative AI provider)
- (Optional) Stripe account for billing
- (Optional) SMTP credentials for transactional emails

---

## Quick Start (Docker Compose)

```bash
# 1. Clone and enter the docker directory
cd docker

# 2. Copy and edit environment variables
cp .env.example .env
```

```bash
# Quick secret generation
./scripts/generate-secrets.sh
```

Edit `docker/.env` with your production values (see [full reference below](#environment-variables-reference)):

```env
POSTGRES_PASSWORD=<generated_24_char_password>
SECRET_KEY=<generated_64_char_hex>
OPENAI_API_KEY=sk-...
DOMAIN=app.yourdomain.com
API_DOMAIN=api.yourdomain.com
CADDY_EMAIL=admin@yourdomain.com
ALLOWED_ORIGINS=https://app.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
DEBUG=false
```

```bash
# 3. Start all services (Caddy auto-proxies + gets SSL)
docker compose --env-file docker/.env up --build -d

# 4. Run database migrations
docker compose exec backend alembic upgrade head

# 5. (Optional) Seed demo data
docker compose exec backend python /app/scripts/seed.py

# 6. Verify via the proxy
curl https://api.yourdomain.com/health
```

| Service    | Internal Port | External (via Caddy) |
|------------|--------------|----------------------|
| Caddy      | 80 / 443     | 80 / 443             |
| Frontend   | 3000         | `https://app.yourdomain.com` |
| Backend    | 8000         | `https://api.yourdomain.com` |
| PostgreSQL | 5432         | `localhost:5434` (admin only) |
| Redis      | 6379         | — (internal only)    |

---

## Production Architecture

```text
                        ┌──────────────┐
                        │   CDN / DNS   │
                        │ (Cloudflare)  │
                        └──────┬───────┘
                    ┌──────────┴──────────┐
                    │   Reverse Proxy     │
                    │  (nginx / Caddy)    │
                    │  SSL termination    │
                    └────┬──────────┬─────┘
                  ┌──────┘          └──────┐
                  ▼                         ▼
           ┌──────────┐            ┌──────────────┐
           │ Frontend │            │   Backend     │
           │ :3001    │◄──────────►│   :8001       │
           └──────────┘            └──────┬───────┘
                    ┌──────────┬──────────┘
                    ▼          ▼
             ┌─────────┐ ┌────────┐
             │ Postgres│ │ Redis  │
             │ :5434   │ │        │
             └─────────┘ └────────┘
```

For production, always place a reverse proxy in front of the backend and frontend. Example nginx config:

```nginx
# API subdomain
server {
    listen 443 ssl;
    server_name api.yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# App subdomain
server {
    listen 443 ssl;
    server_name app.yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## Environment Variables Reference

### Backend (`docker/.env`)

| Variable | Required | Notes |
|---|---|---|
| `SECRET_KEY` | Yes | Min 32 chars, use `secrets.token_hex(32)` |
| `POSTGRES_PASSWORD` | Yes | Strong password for DB |
| `DATABASE_URL` | Auto | Built from `POSTGRES_PASSWORD` in compose |
| `OPENAI_API_KEY` | Yes* | *Required if AI features are enabled |
| `OPENAI_MODEL` | No | Default: `gpt-4o-mini` |
| `REDIS_URL` | No | Default: `redis://redis:6379/0` |
| `ALLOWED_ORIGINS` | Yes | Comma-separated, e.g. `https://app.yourdomain.com` |
| `APP_URL` | Yes | Public frontend URL for links/emails |
| `SMTP_*` | No | Leave blank to log emails to console |
| `STRIPE_*` | No | Leave blank to disable billing |
| `DEBUG` | No | Must be `false` in production |

### Frontend (Docker build arg)

| Arg | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Public API URL clients will call |

---

## Database Migrations

```bash
# Run pending migrations
docker compose exec backend alembic upgrade head

# Create a new migration (after model changes)
docker compose exec backend alembic revision --autogenerate -m "description"

# Rollback one step
docker compose exec backend alembic downgrade -1
```

Migrations run automatically on first startup via `Base.metadata.create_all` in the FastAPI lifespan, but use `alembic upgrade head` explicitly for production deployments.

---

## Seeding Demo Data

```bash
docker compose exec backend python /app/scripts/seed.py
```

This creates:
- **Email:** `demo@example.com`
- **Password:** `Demo1234`
- Demo organization, dataset, dashboard, and sample insights

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

To add CD, extend the workflow after tests pass:

```yaml
deploy:
  needs: [backend-lint, backend-test, frontend-lint, frontend-test, docker-build]
  runs-on: ubuntu-latest
  steps:
    - name: Deploy to production
      run: |
        # Use SSH deploy key, Docker context, or cloud CLI
        # to pull and restart on your server
```

---

## Production Checklist

- [ ] **SECRET_KEY** — generated with `secrets.token_hex(32)`, never shared
- [ ] **DEBUG=false** — disables detailed error pages
- [ ] **PostgreSQL password** — strong, unique, rotated
- [ ] **SSL/TLS** — terminate at reverse proxy (Let's Encrypt via Caddy/Certbot)
- [ ] **ALLOWED_ORIGINS** — locked to your actual domain(s)
- [ ] **Rate limiting** — enabled by default (Redis-backed via slowapi)
- [ ] **Database backups** — configure `pg_dump` cron job
- [ ] **Monitoring** — add uptime monitoring (health endpoint at `/health`)
- [ ] **Logging** — Uvicorn logs to stdout; collect with Docker log driver or external service
- [ ] **Non-root user** — frontend already runs as `nextjs` user
- [ ] **File uploads** — `MAX_UPLOAD_SIZE_MB` defaults to 50; adjust as needed
- [ ] **Key rotation** — rotate `SECRET_KEY`, `OPENAI_API_KEY`, Stripe keys regularly

---

## Security

- **JWT authentication** — access tokens expire in 60 min, refresh tokens in 7 days
- **RBAC** — three roles: `admin`, `analyst`, `viewer`
- **Multi-tenant** — all data scoped by organization via `TenantContext`
- **Rate limiting** — Redis-backed, configurable via `RATELIMIT_ENABLED`
- **CORS** — locked to `ALLOWED_ORIGINS`
- **File validation** — strict MIME type and extension checks on upload

---

## Scaling

### Horizontal

- **Backend**: Increase `--workers` in the Dockerfile (or use `gunicorn` with uvicorn workers)
- **Frontend**: Stateless; scale behind a load balancer
- **Postgres**: Consider read replicas for analytics queries
- **Redis**: Used only for rate limiting; minimal load

### Docker Compose → Orchestration

For multi-node production, migrate from Docker Compose to:

- **AWS ECS / Fargate** — with Cloud Map for service discovery
- **Kubernetes** — each service as a deployment with horizontal pod autoscaling
- **Render / Railway** — simpler PaaS alternatives with Docker support

The `NEXT_PUBLIC_API_URL` build arg requirement means frontend must be rebuilt per environment (staging vs production).

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Backend won't start | DB not ready / wrong DATABASE_URL | Check `postgres` health; verify `POSTGRES_PASSWORD` |
| Frontend shows blank page | Wrong `NEXT_PUBLIC_API_URL` | Rebuild frontend with correct API URL |
| AI features return errors | Missing `OPENAI_API_KEY` or quota exhausted | Verify key and billing status |
| Email not sending | Missing SMTP env vars | Configure SMTP or check spam folder |
| `pg_isready` fails | Postgres still initializing | Wait 10-15s for first-time volume init |
