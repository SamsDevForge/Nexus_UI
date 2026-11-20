# On-demand commute planner — development preview

The owner authorized continued feature development while the lost private Site
keeps Phase 6 cloud acceptance open (decision D-035). This is an independently
testable portion of Phase 7, not acceptance of either phase or the full vision.

## Available now

Open `/app/context` from the Commute planner navigation item. Search for an
origin and destination, or enter their coordinates. Search results identify
place centers; adjust them for a specific venue. Enter an event within the next
seven days, a journey-time fallback, preparation time and arrival buffer.

The backend calculates, in UTC:

```text
arrive by = event start − arrival buffer
leave at  = arrive by − journey duration
prepare  = leave at − preparation duration
```

The interface accepts and displays times in the device's local timezone. It
flags preparation/departure times that have passed, including across midnight.
Optional OSRM routing is a driving-duration estimate, with no live traffic.
Failure or missing routing configuration uses only the explicitly entered
fallback; the backend refuses to invent one.

Open-Meteo weather covers hourly intervals overlapping the journey at both
endpoints. Missing hours or invalid provider values make that endpoint's weather
unavailable. Rain probability of at least 40% suggests an umbrella. Incomplete
weather never implies dry conditions. Forecasts are not observations, road
conditions, or coverage of the entire path. The result includes retrieval time,
sources, warnings, a five-minute refresh deadline and a manual refresh action.
Editing any input invalidates the result.

This preview does not save a trip, read a calendar, send notifications, collect
background location, or execute an action. All other daily screens keep their
existing sample-data boundaries.

## Run locally

Install the frontend and backend dependencies from the main README. Keep the
frontend in its default `mock` mode for this standalone preview. No database,
Firebase account, paid API key or hosting identity is needed for local public
context. In the first PowerShell terminal, from the repository root:

```powershell
$env:PUBLIC_CONTEXT_ENABLED = 'true'
# Optional: set to an OSRM server you operate or are permitted to use.
# $env:OSRM_BASE_URL = 'https://your-routing-server.example'
backend/.venv/Scripts/python -m uvicorn nexus_api.main:app --host 127.0.0.1 --port 8000
```

In the second terminal:

```powershell
$env:NEXUS_CONTEXT_API_URL = 'http://127.0.0.1:8000'
npm run dev
```

Open `http://localhost:3000/app/context`. Without `PUBLIC_CONTEXT_ENABLED=true`,
the backend returns an explicit disabled-service error. To deploy eventually,
set `APP_ENV=production`, configure the existing Firebase/database requirements,
and enable the context feature explicitly. Production context endpoints verify
the same Firebase bearer identity as the other protected APIs. Mock frontend
identity cannot bypass this. The existing hosting identity is unchanged.

`NEXUS_CONTEXT_API_URL` is a server-only Next/Worker binding, separate from the
public Firebase configuration. The browser calls a same-origin allowlisted
Next bridge, which forwards only JSON and bearer authorization to the backend.

## API and provider boundaries

| Endpoint | Input | Result |
| --- | --- | --- |
| `POST /api/public-context/search` | `query` (3–80 characters) | Up to five places, coordinates, region, country, timezone and source |
| `POST /api/public-context/plan` | `origin`, `destination` (latitude/longitude), timezone-aware `event_at`, optional `travel_minutes`, preparation/buffer minutes, `use_driving_estimate` | Suggested times, endpoint forecasts, provenance, warnings, freshness and explicit suggestion authority |

Responses use the existing `{ data, requestId }` envelope; errors use the
existing error envelope. Pydantic rejects unknown fields, invalid coordinates,
naive dates, and out-of-range durations. The frontend requires a manual fallback
even when requesting routing.

The HTTPX provider adapter has six-second request timeouts, disabled redirects,
a bounded 128-entry/five-minute in-memory cache and concurrent-request
deduplication. Identical cached forecasts retain their original retrieval
timestamp. Queries and coordinates are sent to the disclosed providers only
when requested. They are not written to the database or application logs;
the temporary cache is not encrypted and is discarded on process exit.
There is no persistent location history. HTTPX request-URL INFO logging is
suppressed because provider URLs include coordinates.

Provider contracts: [Open-Meteo forecast documentation](https://open-meteo.com/en/docs),
[geocoding documentation](https://open-meteo.com/en/docs/geocoding-api),
[OSRM API](https://project-osrm.org/docs/v5.24.0/api/).
Open-Meteo's free endpoint is for non-commercial use and is rate limited;
commercial deployment needs an appropriate provider arrangement. Review the
[provider terms](https://open-meteo.com/en/terms) before release. No public OSRM
demo service is configured by default or promised as production infrastructure.
Cross-instance rate limiting, production quotas and provider operations remain
release prerequisites.

## Verification

Backend tests cover timezone arithmetic, midnight, travel-window selection,
missing hourly coverage, partial weather, malformed responses, timeouts,
routing fallback, cache provenance/deduplication, validation, feature gating and
production identity enforcement. Browser tests traverse the real Next bridge
and FastAPI app with **deterministic provider fixtures**; they cover location
selection, calculation, fallback, incomplete weather, result focus, stale-plan
warnings, desktop/mobile layouts and invalid requests.

```powershell
python -m pip install -r backend/requirements.txt
npx playwright install chromium
npm run test:e2e
```

Set `NEXUS_E2E_PYTHON` if Python is in a virtual environment. To use installed
Edge locally, set `NEXUS_E2E_BROWSER_CHANNEL=msedge`. CI installs Chromium and
runs the same tests. The fixture refuses startup unless `NEXUS_E2E=1`; the
Playwright configuration supplies that flag only to the isolated test process.
It is not a production identity or provider fallback.

A separate live-provider smoke check on 20 November 2026 found Bengaluru,
returned an OSRM driving estimate and retrieved usable weather at both journey
endpoints. Earlier local browser verification also traversed real geocoding and
weather. Those observations establish local integration, not provider uptime,
live traffic, production availability or deployed sign-in acceptance.

Compatible framework patches clear the runtime dependency audit as of this
check. Eleven development/tooling findings remain in the existing vinext,
Cloudflare and Vite stack. Review and migrate that stack before exposing its
development server or resuming a hosted release; this preview is not a security
certification.

## Remaining acceptance work

Restore access to the existing private Site and verify Phase 6 identity,
persistence and cross-user isolation. Full Phase 7 still needs broader public
context/timezone/holiday contracts, operational limits, integration into the
daily reasoning surfaces, and deployed acceptance. Calendar and productivity
OAuth, notifications, LLM/RAG, automations and Android remain later roadmap work.
