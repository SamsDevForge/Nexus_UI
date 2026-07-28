# NEXUS AI — Phase 6 Codex Implementation Prompt

Use `$build-nexus-ai`. Use `$polish-nexus-ui` only for the sign-in, onboarding,
profile, and Quick Capture surfaces changed by this phase.

Implement **NEXUS AI Phase 6: Backend, Identity, User Profile, and Durable
Manual Capture**.

This is an implementation task. Inspect the repository, build the Phase 6
platform foundation, validate it, update project records, commit intentional
changes, deploy the backend when credentials are available, and update the
existing private Sites deployment when frontend source changes. Do not stop
after returning a plan.

## Accepted starting point

Phase 5 is accepted at:

- Commit: `3b4acdd15c6a39d8a143fab4f4611c27ec533140`
- Branch at handoff: `test/phase-5-quality`
- Private Sites version: `18`
- Phase 4 baseline retained in history:
  `cb0b79d6ef49cb0452714d9ec7bcf3af2a7db535`

Start Phase 6 from `3b4acdd...` or a documentation-only descendant that fixes
the final Phase 5 test-count record. Create or use:

```text
feature/phase-6-platform-foundation
```

Do not discard, reset, or rewrite the accepted Phase 5 history.

## Phase 5 record check

The final handoff reports 52/52 tests, while the attached Phase 5 quality report
reported 50. Before Phase 6 work:

1. Inspect the latest successful test output or rerun the complete suite.
2. Correct `docs/PHASE_5_QUALITY_REPORT.md` and any conflicting project record
   only if the evidence confirms a different count.
3. Do not invent or copy a count from the handoff without verification.

This record correction must not trigger a deployment by itself.

## Read first

Read completely:

- `AGENTS.md`
- `docs/00_START_HERE.md`
- `docs/01_PRODUCT_BLUEPRINT.md`
- `docs/02_FULL_PHASE_ROADMAP.md`
- `docs/03_INFORMATION_ARCHITECTURE.md`
- `docs/04_DESIGN_SYSTEM.md`
- `docs/05_TECHNICAL_ARCHITECTURE.md`
- The connection, security, permission, data, and API documents relevant to
  identity and persistence
- `docs/10_CODEX_EXECUTION_PROTOCOL.md`
- `docs/12_ACCEPTANCE_GATES.md`
- `docs/15_DECISIONS.md`
- `docs/PROGRESS.md`
- `docs/PHASE_5_QUALITY_REPORT.md`
- `.openai/hosting.json`
- Current typed domain contracts, service registries, mock adapters, routes,
  tests, and environment examples

Repository documents and explicit product-owner decisions are newer than
bundled references when they conflict.

Timebox initial discovery to ten minutes. Do not scan `node_modules`, `.next`,
`dist`, `coverage`, `.git`, `exfonts`, generated output, unrelated assets,
font directories, or OneDrive metadata.

Do not repeatedly search for unavailable skills or treat them as blockers.

## Locked product decisions

- Preserve all Phase 0–5 behaviour.
- Preserve the approved website design and route hierarchy.
- Preserve the large cross-screen cube exactly.
- Cube implementation, scale, position, overlap, material, lighting, motion,
  and dominance remain locked.
- Verify cube files remain byte-for-byte unchanged from the accepted baseline.
- Preserve all 22 files in `exfonts/` untouched and uncommitted.
- Preserve `public/icons/nexus-notepad.svg`.
- Preserve unrelated user changes.
- Do not use emoji icons.
- Keep page components provider-neutral.
- Keep deterministic time, freshness, permission, validation, and action safety
  outside LLMs.
- Do not add an LLM, RAG, n8n, public data API, notification worker, or external
  productivity connector in this phase.

## Approved Phase 6 platform stack

Implement behind replaceable boundaries:

- Frontend: existing Next.js application and private Sites deployment
- Backend: FastAPI and Pydantic
- Runtime deployment: Railway
- Database: Neon PostgreSQL
- ORM and migrations: SQLAlchemy 2-style models and Alembic
- PostgreSQL driver: async driver compatible with the chosen SQLAlchemy setup
- Identity: Firebase Authentication
- Backend identity verification: Firebase Admin SDK behind a typed identity
  verifier interface

Do not rewrite the frontend or change frameworks.

Do not couple domain services directly to Railway, Neon, or Firebase payloads.
Provider adapters own provider-specific configuration and translation.

## Core integration set to record now

Update the roadmap and durable decisions to reflect this product-owner-approved
core integration set:

1. Weather API
2. Maps API for geocoding, routes, traffic, and travel estimates
3. Google Calendar
4. Gmail
5. Notion
6. Microsoft Teams
7. Quick Capture as the manual source for unsupported or difficult apps such
   as WhatsApp

Google Drive is optional rather than a required core connection unless a later
product decision restores it.

Preserve the existing phase numbers:

- Phase 7: Weather and Maps
- Phase 9: Google Calendar
- Phase 10: Gmail
- Phase 11: Notion and Microsoft Teams, with Drive optional
- Phase 12: n8n orchestration without moving state or authority out of the
  backend

Do not implement those live connections now. Phase 6 may add canonical provider
and capability metadata only where required by existing contracts.

Important identity boundary:

- Firebase Google sign-in authenticates the NEXUS user.
- It does not grant Gmail, Calendar, Maps, Teams, or Notion access.
- Later connector OAuth grants are separate, capability-specific, revocable,
  and stored server-side.

## Microsoft Teams SVG

The user will attach a Microsoft Teams SVG to the Phase 6 chat.

When the attachment is present:

1. Inspect it as an SVG.
2. Remove scripts, event handlers, embedded remote content, or unsafe active
   elements if present.
3. Preserve its supplied appearance and aspect ratio.
4. Save it following the repository asset convention, preferably:

   `public/icons/microsoft-teams.svg`

5. Use it for the existing Teams connection/provider representation when that
   representation exists.
6. Do not redraw it, replace it with an emoji, or invent a different permanent
   icon.

This asset does not authorize live Microsoft Graph integration in Phase 6.

If the attachment is absent or unreadable, complete all other Phase 6 work,
retain the current neutral placeholder, document the exact expected path, and
do not wait indefinitely.

## Objective

Phase 6 exits when:

- A user can sign in with Firebase Authentication.
- FastAPI verifies the authenticated identity.
- A corresponding internal NEXUS user is created safely.
- The user can complete onboarding.
- Profile, timezone, places, travel mode, quiet hours, and preferences survive
  reloads and new sessions.
- Quick Capture notes and confirmed local event drafts can persist for the
  authenticated user.
- Existing typed frontend contracts remain stable.
- Mock and Phase 6 live adapters can be selected deliberately.
- Data belonging to one user cannot be accessed by another.
- Logs and audit records do not expose tokens, pasted content, or unnecessary
  private values.

## 1. Backend service foundation

Create or extend a repository-local FastAPI service using the existing
repository conventions. Do not create a separate unrelated repository.

Provide:

- Application factory or a clear application entry point
- Environment-aware typed settings
- Lifespan-managed database resources
- Versioned API routing, such as `/api/v1`
- Consistent success and error contracts
- Request/correlation IDs
- Exact CORS allowlist from environment configuration
- `/health/live`
- `/health/ready`
- Structured audit-safe logs
- Graceful startup failure when required production configuration is absent
- Development and test configuration that cannot silently activate in
  production

Do not log:

- Authorization headers
- Firebase ID tokens
- Service-account material
- Database credentials
- Full request bodies
- Quick Capture text
- Profile values not needed for an operational event

Log identifiers and field names changed rather than sensitive values.

## 2. Identity boundary

Define a provider-neutral authenticated-principal contract containing only the
canonical information the backend requires, such as:

- Provider
- Subject
- Email when granted
- Email-verification status
- Display name when available
- Authentication time or token metadata needed for policy

Create:

- A typed identity-verifier interface
- A Firebase implementation
- A deterministic fake implementation used only in automated tests
- FastAPI authentication dependency/middleware
- Fail-closed production behaviour

Verify Firebase ID tokens server-side. Do not trust identity fields supplied by
the browser separately from the verified token.

Production must never enable fake authentication through a query parameter,
header, cookie, or overlooked environment default.

The frontend should use the Firebase modular web SDK for sign-in and auth-state
observation. Use Google sign-in as the initial supported user-facing method.
Do not request Gmail or Calendar scopes during identity sign-in.

Implement:

- Sign-in
- Auth-loading state
- Signed-out state
- Protected product routes
- Sign-out
- Expired/invalid-token recovery
- One bounded token refresh attempt after an authentication failure
- Safe return to the intended product route after sign-in

Preserve accessible focus management and the approved NEXUS visual language.

## 3. PostgreSQL schema and migrations

Use PostgreSQL migrations as the source of truth. Do not create production
tables automatically at application startup.

Use internal UUID identifiers and timezone-aware timestamps.

Create the minimum schema needed for:

### Users and identity

- Internal NEXUS user
- External identity provider and subject
- Email and basic display fields when available
- Onboarding completion
- Created and updated timestamps
- Status suitable for later account pause/deletion work

Do not use an email address as the primary user identity.

### Profile

- Display name
- IANA timezone
- Locale when needed
- Other profile fields already represented in the UI contract

### Places

- User ownership
- Human label such as Home, Campus, or Work
- User-entered address or place text
- Optional coordinates only when explicitly supplied
- Default/origin role where required

Do not call a geocoding provider in Phase 6.

### Preferences

- Travel mode
- Quiet-hours start and end
- Notification/personalization fields already present in the UI contract
- Default authority or approval preference only if already a durable product
  contract

Validate quiet hours that span midnight.

### Durable manual capture

Persist user-authorized Quick Capture results with:

- User ownership
- Kind: note or local event draft
- Original user-provided text where needed for the saved item
- Canonical parsed fields
- Optional user-supplied source-app label
- Provenance fixed to manual/Quick Capture
- Creation and update timestamps
- Status
- Idempotency key or equivalent duplicate protection

Confirmed event captures remain **local NEXUS event drafts** until Google
Calendar is connected in Phase 9. Label them honestly; do not claim they were
written to an external calendar.

Support user correction and deletion. Do not log captured content.

### Audit events

Record:

- Authentication outcome category
- Onboarding completion
- Profile/preference/place mutations
- Quick Capture note or local-event creation, correction, and deletion
- Request ID
- Actor/internal user ID
- Target type and ID
- Result
- Timestamp

Audit records must not duplicate private content or credentials.

## 4. Tenant isolation and data access

Every user-owned query and mutation must derive user identity from the verified
server-side principal.

Do not accept a user ID from the client as authorization.

Test:

- User A cannot read, update, or delete User B's profile.
- User A cannot access User B's places, preferences, or captures.
- Guessing UUIDs does not bypass ownership.
- Missing, expired, malformed, or incorrectly signed tokens fail safely.
- Deleted or unavailable resources do not disclose whether another user owns
  them.

## 5. API surface

Adapt route names to existing repository conventions, but provide equivalent
typed operations for:

- Current authenticated user
- Onboarding state and completion
- Profile read/update
- Places list/create/update/delete
- Preferences read/update
- Quick Capture note create/read/update/delete
- Local event draft create/read/update/delete
- Relevant Activity/audit summaries for the authenticated user

Validate:

- IANA timezone
- Travel mode enum
- Quiet-hour format and cross-midnight intervals
- Place labels and lengths
- Capture content and size
- Date/time ambiguity rules inherited from Quick Capture
- Idempotency on repeated capture confirmation

Return canonical frontend contracts, not ORM objects or Firebase payloads.

## 6. Typed frontend API and adapter composition

Build a typed API client around the existing service boundaries.

Include:

- Configurable API base URL
- Auth-token injection
- Request timeout and abort support
- Typed error normalization
- One bounded authentication refresh/retry
- Request IDs when returned
- No secret in client code

Extend the existing mock/live switching instead of replacing it.

Phase 6 live mode should use live adapters only for:

- Identity
- Current user/onboarding
- Profile
- Places
- Preferences
- Durable Quick Capture
- The corresponding Activity records

Every later-phase service remains on its existing deterministic mock adapter.
Do not turn a global switch into calls to unimplemented endpoints.

Mock mode must continue to support the complete Phase 0–5 demonstration without
Firebase, Railway, Neon, or network access.

## 7. Onboarding and profile experience

Wire the existing approved surfaces to the live Phase 6 contracts.

The minimum onboarding flow should:

1. Explain value before requesting data.
2. Authenticate.
3. Confirm display name and timezone.
4. Add optional Home, Campus, or Work places manually.
5. Select travel mode.
6. Set quiet hours and existing preferences.
7. Review the saved values.
8. Complete onboarding and enter the existing Today experience.

Do not request Calendar, Gmail, Notion, Teams, location, notification, Maps, or
weather permissions in Phase 6.

Preserve:

- Keyboard navigation
- Visible focus
- Reduced motion
- 44 px narrow touch targets
- Existing route focus handoff
- No horizontal overflow
- Locked cube integrity

Do not redesign accepted application routes.

## 8. Quick Capture live persistence

Replace only the persistence boundary in Phase 6 live mode.

Preserve:

- Manual paste/input only
- Save as note
- Editable likely-event extraction
- No silent date or time guessing
- Explicit confirmation
- Cancel with no side effect
- Correct provenance
- Notes, Timeline, NEXUS, and Activity coherence
- Duplicate prevention
- Disconnected/offline/failure recovery

Phase 6 live behaviour:

- Notes survive reload and a new signed-in session.
- Confirmed event drafts survive reload.
- Captures remain isolated per user.
- Offline or failed writes remain visibly unsaved; do not claim persistence.
- A confirmed event says “Saved in NEXUS” or equivalent, not “Added to Google
  Calendar.”

Mock/scenario mode retains deterministic Phase 4 behaviour and reset semantics.

## 9. Environment and secret handling

Add environment examples containing names and safe descriptions only.

Expected frontend names may include, adjusted to repository convention:

```text
NEXT_PUBLIC_NEXUS_API_BASE_URL
NEXT_PUBLIC_NEXUS_RUNTIME_MODE
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

Expected backend names may include:

```text
APP_ENV
DATABASE_URL
MIGRATION_DATABASE_URL
CORS_ALLOWED_ORIGINS
FIREBASE_PROJECT_ID
FIREBASE_SERVICE_ACCOUNT_JSON_B64
LOG_LEVEL
```

Firebase web configuration is public application configuration, but backend
service-account material, database URLs, and private keys are secrets.

Never:

- Commit a `.env` file
- Print secret values
- Paste credentials into documentation
- Add `NEXT_PUBLIC_` to backend secrets
- Send secrets to the frontend

## 10. Deployment assets

Prepare:

- Reproducible backend dependency manifest
- Backend start command
- Railway-compatible service configuration
- Migration command suitable for a pre-deploy step
- Health-check path
- Local development instructions
- Test instructions
- Updated root documentation for running frontend and backend together

Do not introduce Render configuration.

Use a pooled Neon connection for normal runtime and the appropriate direct
connection for migrations when required by the chosen driver/tooling.

## 11. Tests and verification

Add backend tests for:

- Health and readiness
- Auth success/failure
- Fail-closed production auth
- First-login user creation
- Profile and preference persistence
- Timezone validation
- Quiet hours spanning midnight
- Place ownership
- Cross-user isolation/IDOR resistance
- Quick Capture note persistence
- Local event-draft persistence
- Correction and deletion
- Idempotent repeated confirmation
- Audit redaction
- Consistent error contracts

Add/update frontend tests for:

- Auth loading and signed-out states
- Protected-route behaviour
- Token injection and bounded refresh
- Mock/Phase 6 live adapter composition
- Onboarding persistence
- Quick Capture live success/failure
- Existing global search, focus, and accessibility behaviour

Run:

- Backend formatting/linting according to repository tooling
- Backend type/static checks where configured
- Complete backend tests
- Existing TypeScript typecheck
- Existing ESLint
- Complete frontend test suite
- Next.js production build
- Sites/vinext production build
- Migration upgrade against PostgreSQL
- `git diff --check`
- Repository-integrity checks
- Cube hash verification
- `exfonts/` verification

Rendered verification must include:

- Sign-in
- Onboarding
- Profile/settings reload persistence
- Place creation/edit/delete
- Quick Capture note persistence after reload
- Local event draft after reload
- Sign-out and protected-route recovery
- At least 1440×900 and 390×844
- Keyboard and reduced-motion paths
- No console or hydration errors

Do not weaken or replace the accepted Phase 0–5 tests.

## 12. Deployment

If Firebase, Neon, Railway, and Sites credentials/configuration are already
available through the authorized environment:

1. Apply migrations to the intended Phase 6 database.
2. Deploy FastAPI to the existing/new authorized Railway project.
3. Verify health and readiness.
4. Configure the existing Sites project with the backend URL and public
   Firebase web configuration.
5. Reuse the exact Sites project ID from `.openai/hosting.json`.
6. Do not create a duplicate Sites project.
7. Deploy the exact committed frontend source privately with owner-only access.
8. Verify a real sign-in, onboarding save, reload persistence, and Quick Capture
   persistence.

If credentials or external authorization are unavailable:

- Complete all local implementation and tests possible.
- Create/update `docs/PHASE_6_USER_SETUP.md` with exact remaining steps and
  environment-variable names only.
- Do not fabricate a deployment or claim the Phase 6 exit gate passed.
- Report one bounded external-setup blocker.
- Stop cleanly rather than waiting or looping.

## Out of scope

Do not implement:

- Weather provider calls
- Maps, routes, traffic, or geocoding calls
- Google Calendar OAuth or event writes
- Gmail OAuth or mailbox access
- Notion OAuth or workspace access
- Microsoft Graph or Teams access
- Google Drive access
- Connector token storage
- Web push, Firebase Cloud Messaging registration, notification schedules, or
  job queues
- Redis
- LLM calls
- OpenRouter, Gemini, Groq, or Nemotron
- RAG or embeddings
- pgvector-backed knowledge tables
- n8n
- Agents or automations
- Android
- Health or device context
- A broad UI redesign
- Cube modification

Do not request later-phase API keys during Phase 6.

## Documentation

Update `docs/PROGRESS.md` with:

- Phase 6 completion status
- What is live
- What remains mocked
- Authentication mode
- Database and migration status
- Profile/onboarding persistence
- Quick Capture persistence status
- Test and build results
- Deployment status
- Known limitations
- Exact next phase: **Phase 7 — Weather, Maps, and Public Context APIs**

Update `docs/15_DECISIONS.md` only with durable decisions, including:

- Firebase identity behind a provider-neutral verifier
- Railway FastAPI deployment
- Neon PostgreSQL
- Core connection set
- Quick Capture as the manual unsupported-app source
- Durable local event drafts before Calendar connection

Update `docs/02_FULL_PHASE_ROADMAP.md` only where required to add Teams, make
Drive optional, and clarify Quick Capture persistence without renumbering later
phases.

## Commit discipline

- Review the complete diff.
- Exclude secrets, `.env` files, service-account JSON, screenshots, build
  output, temporary artifacts, `exfonts/`, and unrelated changes.
- Commit intentional Phase 6 code, migrations, tests, assets, and documentation.
- Do not amend the accepted Phase 5 commit.
- Push only through the authorized existing workflow.
- Tag or report the exact migration revision and commit deployed.

## Acceptance criteria

Phase 6 is complete only when:

- The final Phase 5 test-count record is internally consistent.
- Firebase sign-in works.
- FastAPI verifies identity server-side.
- The internal user is created idempotently.
- Onboarding and settings persist in PostgreSQL.
- Profile, places, travel mode, timezone, quiet hours, and preferences survive
  reload.
- Quick Capture notes and local event drafts persist and remain user-isolated.
- Mock mode remains fully functional.
- Later product services remain deterministic mocks.
- Cross-user access tests pass.
- No secrets or private content appear in source or logs.
- Migrations apply successfully to PostgreSQL.
- Typecheck, lint, tests, builds, browser checks, and integrity checks pass.
- The locked cube and `exfonts/` remain untouched.
- Railway and private Sites deployments succeed when external configuration is
  available.
- Project records accurately describe any remaining setup blocker.

## Final report

Lead with the outcome. Then report:

- Phase 6 commit hash and branch
- Phase 5 documentation correction, if any
- Backend structure and API routes
- Database tables and Alembic revision
- Identity flow
- Frontend adapter composition
- Quick Capture persistence behaviour
- Teams SVG path and sanitization result
- Backend and frontend test counts
- Typecheck, lint, build, migration, and browser results
- Railway deployment URL label and health status
- Sites version, access level, and status
- Cube hash result
- `exfonts/` result
- Live versus mocked boundaries
- Secrets/configuration still required from the user
- Known limitations
- Exact Phase 7 starting point

Stop after Phase 6. Do not begin Phase 7.

Do not ask non-blocking questions. Use repository decisions and conservative
judgment. Ask only when proceeding requires a secret, external authorization,
destructive action, or a choice that materially changes approved behaviour.
