# NEXUS AI

NEXUS AI is a cinematic Next.js product experience with a Phase 6 platform
foundation: Firebase identity, a provider-neutral typed API client, a FastAPI
service, PostgreSQL persistence through SQLAlchemy/Alembic, onboarding, durable
settings, and durable manual Quick Capture records.

The default runtime remains deterministic `mock` mode. Live mode is opt-in and
fails closed when its Firebase or API configuration is incomplete.

## Local frontend

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Copy `.env.example` to
`.env.local` only when testing the Phase 6 live adapter, and set:

```text
NEXT_PUBLIC_NEXUS_RUNTIME_MODE=phase6-live
```

## Local backend

The backend requires Python 3.11 or newer.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt -r requirements-dev.txt
Copy-Item ..\.env.example .env
.\.venv\Scripts\python -m alembic upgrade head
.\.venv\Scripts\python -m uvicorn nexus_api.main:app --reload --port 8000
```

Use a PostgreSQL connection for normal live-mode development. Automatic schema
creation is restricted to the isolated test configuration; deployed
environments must run Alembic migrations.

Health endpoints:

- `GET /health/live` — process liveness
- `GET /health/ready` — database readiness

## Validation

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run build:sites

cd backend
.\.venv\Scripts\python -m ruff check .
.\.venv\Scripts\python -m mypy nexus_api
.\.venv\Scripts\python -m pytest
```

The first database revision is `20260728_0001_phase6_foundation`. Railway uses
`backend/railway.toml`, runs `alembic upgrade head` before deployment, starts
Uvicorn, and checks `/health/ready`.

## Phase boundaries

Phase 6 does not connect Gmail, Calendar, Maps, weather, Notion, Microsoft
Graph/Teams, Drive, n8n, a model provider, notifications, or Android. The
Microsoft Teams SVG is registered only as a sanitized product asset.

Provider setup and production verification are documented in
[`docs/PHASE_06_USER_SETUP.md`](docs/PHASE_06_USER_SETUP.md).
