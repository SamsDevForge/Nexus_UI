# NEXUS AI

NEXUS AI is a cinematic Next.js product experience with a Phase 6 platform
foundation: Firebase identity, a provider-neutral typed API client, a FastAPI
service, PostgreSQL persistence through SQLAlchemy/Alembic, onboarding, durable
settings, and durable manual Quick Capture records.

The default runtime remains deterministic `mock` mode. Live mode is opt-in and
fails closed when its Firebase or API configuration is incomplete.

An opt-in [commute planner development preview](docs/PUBLIC_CONTEXT_PREVIEW.md)
adds real location search, endpoint weather forecasts, optional driving
estimates and deterministic preparation/departure times at `/app/context`.
It works locally without the unavailable hosting account. Other daily screens
remain sample-data experiences; cloud acceptance is still open.

[Phase 8 notifications](docs/PHASE_08_NOTIFICATIONS.md) adds opt-in brief
schedules, a durable inbox/worker queue and Firebase Installation ID push
plumbing. The default UI is a labeled demonstration; real scheduling requires
configured identity, PostgreSQL and a separately started worker. Deployed
browser/device acceptance remains open.

[Phase 9 Calendar and timetable](docs/PHASE_09_CALENDAR.md) adds an owner-scoped
agenda, manual events, ICS/timetable imports, read-only Google/Outlook OAuth,
leased incremental synchronization and verified webhook scheduling. The dedicated
Calendar screen reports sources, freshness and preparation conflicts. Real OAuth
and deployed acceptance remain open; default mode stays a local demonstration.

[Phase 10 Email](docs/PHASE_10_EMAIL.md) adds a source-linked review queue,
separate read-only Gmail/Outlook consent, bounded Inbox polling, conservative
extraction, attachment metadata and explicit corrections. Mail evidence and
credentials use a separate encrypted store; full bodies are not retained.
Default examples remain fictional and real provider acceptance remains open.

The [workspace UI refinement](docs/UI_AUDIT_2026-11-21.md) unifies Calendar,
Mail, Notifications and Commute, adds an accessible single-row mobile dock,
and makes event entry and review actions easier to find. The large cube and
existing sample/live service boundaries are preserved.

[Phase 11 Notion and Teams](docs/PHASE_11_COLLABORATION.md) adds the Sources &
notes workspace: explicitly selected sources, encrypted bounded snapshots,
verified Notion invalidation, editable class/meeting templates and revision-bound
approval for Notion create/append/update. Teams stays read-only. Default examples
are fictional; real provider consent, writes and hosted acceptance remain open.

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

The backend requires Python 3.12 or newer.

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

The separately authorized public-context preview connects geocoding, forecasts
and optional OSRM only. It grants suggestion authority and changes no calendar.

Provider setup and production verification are documented in
[`docs/PHASE_06_USER_SETUP.md`](docs/PHASE_06_USER_SETUP.md).
