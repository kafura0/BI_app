# BI App — Agent Instructions

## Project Overview
Production-grade multi-tenant AI-powered Business Intelligence SaaS platform. Upload datasets (CSV/Excel), auto-generate dashboards, query data via natural language AI. Includes subscription billing (Stripe), team management (RBAC), email verification, usage analytics.

## Tech Stack

**Frontend:** Next.js 14 (App Router) + TypeScript 5.6 + Tailwind CSS 3.4 + Radix UI + Recharts + Zustand 5 + React Hook Form + Zod
**Backend:** FastAPI 0.115 (async) + Python 3.12 + SQLAlchemy 2.0 (asyncio) + PostgreSQL 16 + Redis 7
**AI:** OpenAI gpt-4o-mini (abstracted behind `AIProvider` interface in `ai-engine/`)
**Infra:** Docker Compose (Postgres 16, Redis 7, backend, frontend)

## Directory Structure

```
.opencode/           # opencode configuration
ai-engine/           # AI provider abstraction (providers/, prompts/, services/)
backend/             # FastAPI REST API
  app/
    config.py        # Pydantic Settings (50+ env vars)
    database.py      # Async engine + session factory
    main.py          # App factory, CORS, error handlers, lifespan
    middleware/       # JWT auth + tenant context
    models/          # SQLAlchemy ORM models
    schemas/         # Pydantic request/response schemas
    routers/         # API endpoints
    services/        # Business logic
frontend/            # Next.js 14 App Router
  app/               # Route groups: (auth), (dashboard)
  components/        # UI, layout, charts, dashboard
  hooks/             # use-auth
  lib/               # API client, auth helpers, utils
  types/             # TypeScript interfaces
docker/              # Docker Compose + env
scripts/             # seed.py (demo data)
```

## Key Conventions

### Python (backend)
- Async/await throughout, SQLAlchemy 2.0 style (`select()`, `await db.execute()`)
- Type annotations required: `str | None`, `list[dict]`, `Annotated` for DI
- Pydantic v2 schemas for all request/response models
- Services layer for business logic; routers are thin wrappers
- All DB queries filter by `org_id` (tenant isolation)
- `@inject_user` middleware dependency provides `current_user` and `tenant`

### TypeScript (frontend)
- Strict mode, `@/` path alias maps to `frontend/`
- Interfaces in `types/index.ts`, Zod schemas for forms
- `api.ts` exports typed API functions (not raw axios calls in pages)
- Auth via `use-auth.ts` hook + localStorage persistence
- `utils.ts` for shared helpers (`cn()`, `formatBytes()`, etc.)

## Critical Rules

1. **Never commit `.env` files** — they contain secrets and are not in `.gitignore`
2. **Never store secrets in code** — use env vars via `config.py` (backend) or `NEXT_PUBLIC_*` (frontend)
3. **All DB queries must filter by org** — tenant isolation is non-negotiable
4. **Validate all inputs** — Zod on frontend, Pydantic on backend
5. **Use async everywhere** — no `requests` or sync DB calls in request handlers

## Running the Project

```bash
# Docker (full stack)
docker compose -f docker/docker-compose.yml up --build

# Backend only
cd backend
pip install -r requirements.txt
cd ../ai-engine && pip install -r requirements.txt && cd ../backend
uvicorn app.main:app --reload --port 8000

# Frontend only
cd frontend
npm install
npm run dev

# Seed demo data
python scripts/seed.py
```

## Testing (NOT YET IMPLEMENTED)
No tests exist yet. When adding tests:
- Backend: pytest + httpx.AsyncClient + test database
- Frontend: Jest + React Testing Library
- E2E: Playwright

## Common Gotchas
- Two `next.config.*` files exist; prefer `next.config.mjs` (the active one)
- `backend/app/routers/insights.py` uses `sys.path.insert(0, ...)` to import ai-engine — fragile, should be replaced with proper PYTHONPATH
- Rate limiting (slowapi) is installed but not wired to any router
- Email templates are inline in `email_service.py` — extract to `templates/` for production
- Frontend lacks error boundaries — wrap route segments with `ErrorBoundary`
- Auth tokens in localStorage — should migrate to HttpOnly cookies
