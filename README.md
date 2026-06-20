# BI Platform — AI-Powered Business Intelligence SaaS

A production-grade, multi-tenant BI platform where businesses upload data, auto-generate dashboards, and query insights using natural language AI.

---

## Architecture

```
BI_app/
├── backend/          # FastAPI — REST API, auth, tenant isolation
│   └── app/
│       ├── models/   # SQLAlchemy ORM (users, orgs, datasets, dashboards, insights, analytics)
│       ├── schemas/  # Pydantic request/response models
│       ├── routers/  # Versioned API routes (/api/v1/...)
│       ├── services/ # Business logic layer
│       └── middleware/auth.py  # JWT + TenantContext injection
├── ai-engine/        # Modular AI provider abstraction
│   ├── providers/    # OpenAIProvider (swap for Anthropic/Gemini)
│   ├── prompts/      # Versioned prompt templates
│   └── services/     # insight_service, forecasting_service
├── frontend/         # Next.js 14 App Router
│   ├── app/          # Pages (auth, dashboard, datasets, insights, admin)
│   └── components/   # Charts, sidebar, upload form
├── docker/           # docker-compose.yml
└── scripts/seed.py   # Demo data seeder
```

---

## Quick Start (Docker)

### 1. Prerequisites
- Docker & Docker Compose
- OpenAI API key

### 2. Configure environment

```bash
# Root .env (create from examples)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Edit backend/.env — set these:
SECRET_KEY=your-32-char-random-secret
OPENAI_API_KEY=sk-your-key
DATABASE_URL=postgresql+asyncpg://postgres:changeme@postgres:5432/bi_saas
```

### 3. Start all services

```bash
cd docker
docker compose up --build
```

Services start at:
- Frontend:  http://localhost:3001
- Backend API: http://localhost:8001
- API Docs: http://localhost:8001/api/v1/docs

### 4. Seed demo data

```bash
docker compose exec backend python /app/../scripts/seed.py
# Login: demo@example.com / Demo1234
```

---

## Local Development (without Docker)

### Backend

```bash
cd backend

# Python 3.12+
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Start Postgres locally, then:
cp .env.example .env  # fill in values
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local  # set NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
npm run dev
```

### AI Engine (standalone)

```bash
cd ai-engine
pip install -r requirements.txt
# The backend imports from ai-engine via PYTHONPATH
```

---

## API Reference

All routes are prefixed `/api/v1/`. Interactive docs: `/api/v1/docs`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create account + organization |
| POST | `/auth/login` | Authenticate, get JWT |
| GET | `/datasets` | List tenant datasets |
| POST | `/datasets` | Upload CSV/Excel |
| DELETE | `/datasets/{id}` | Delete dataset |
| POST | `/dashboards` | Create dashboard (auto or manual) |
| GET | `/dashboards/{id}/data` | Get dashboard with computed widget data |
| PATCH | `/dashboards/{id}` | Update widgets/config |
| POST | `/insights` | Ask AI question about data |
| GET | `/insights` | List past insights |
| GET | `/analytics/usage` | Org usage stats (admin only) |

---

## Multi-Tenancy & Security

- Every DB query filters by `organization_id` from JWT
- `TenantContext` middleware validates membership on every request
- Role-based access: Admin, Analyst, Viewer
- File uploads validated for type (CSV/XLSX) and size (50MB max)
- Rate limiting: per-plan daily AI query caps
- CORS restricted to configured origins

---

## Subscription Tiers

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Datasets | 5 | 50 | Unlimited |
| Rows per dataset | 10,000 | 500,000 | 10M |
| AI queries/day | 20 | 500 | 9,999 |

---

## Swapping AI Providers

Edit `ai-engine/services/insight_service.py`:

```python
def _get_provider() -> AIProvider:
    # return AnthropicProvider()  # or GeminiProvider()
    return OpenAIProvider()
```

Implement the `AIProvider` abstract class in `ai-engine/providers/`.

---

## Database Migrations (Alembic)

```bash
cd backend
alembic init alembic
alembic revision --autogenerate -m "initial"
alembic upgrade head
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | JWT signing key (min 32 chars) |
| `DATABASE_URL` | Async PostgreSQL URL |
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_MODEL` | Model ID (default: `gpt-4o-mini`) |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) |
| `MAX_UPLOAD_SIZE_MB` | Max file upload size |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
