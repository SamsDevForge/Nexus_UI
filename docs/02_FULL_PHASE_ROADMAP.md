# Complete NEXUS AI Phase Roadmap

## Roadmap rule

All planned feature families remain in the roadmap. The phases control order,
not ultimate scope. A phase begins only when the previous phase’s acceptance
gate passes.

## Stage A — Complete website UI before live integrations

### Phase 0 — Repository and product foundation

**Goal:** Make the project safe to extend.

Add:

- Repository audit
- Preserved working landing-page functionality
- TypeScript strictness where compatible
- Route and folder conventions
- Shared formatting, linting, and test commands
- Environment-example file with no secrets
- Project decisions and progress logs
- Provider-neutral domain contracts

Exit gate:

- Existing experience still runs.
- Production build succeeds.
- The architecture and next phase are documented.
- No framework rewrite occurs without a recorded reason.

### Phase 1 — Design system and application foundation

**Goal:** Translate the cinematic landing-page identity into reusable product UI.

Add:

- Colour, type, spacing, radius, elevation, and motion tokens
- Base components and interaction states
- Public landing route
- Product application shell
- Desktop sidebar/top context bar
- Responsive narrow-width navigation plan
- Typed mock-service boundary
- Today screen as the reference implementation
- Development-only component gallery when useful

Exit gate:

- Landing and product surfaces feel like the same brand.
- The application does not resemble a generic admin template.
- The Today screen has complete loading, empty, populated, stale, error, and permission states.
- Desktop and narrow-width screenshots pass the UI rubric.

### Phase 2 — Core product screens with mock data

**Goal:** Build the complete daily-use experience before backend work.

Add fully interactive mock screens for:

- Today
- Timeline
- Insights
- NEXUS assistant
- Knowledge
- Notes
- Search

Include:

- Detail drawers or pages
- Source evidence
- Confidence and freshness
- Quick actions
- Snooze, dismiss, correct, and explain interactions

Exit gate:

- Primary user journey can be demonstrated end to end with mock data.
- Navigation and hierarchy remain coherent across all core screens.
- No future screen invents a conflicting component language.

### Phase 3 — Control and configuration screens

Add:

- Automations
- Connections
- Permission centre
- Memory and routine editor
- Activity and action log
- Notification preferences
- Account, privacy, data export, and deletion surfaces
- Integration health and reconnect states

Exit gate:

- Every future data read and action has a visible control surface.
- A user can understand what NEXUS knows and what it may do.

### Phase 4 — Complete UI state coverage

Add all cross-product states:

- First use
- No connections
- Partial connections
- Loading
- Empty
- Error
- Rate-limited
- Stale source
- Revoked permission
- Offline
- Degraded AI
- Action pending approval
- Action running
- Action succeeded
- Action failed and recoverable

Exit gate:

- No screen relies only on a perfect populated state.
- Failure states explain recovery without exposing implementation details.

### Phase 5 — Responsive, accessible, and motion-complete website

Add:

- Desktop, laptop, tablet, and narrow-width layouts
- Keyboard navigation
- Visible focus states
- Reduced-motion behaviour
- Contrast and semantic checks
- Performance budgets
- Final cube-state language
- Landing-to-app transition

Exit gate:

- The full website UI is accepted before integration work starts.
- Core workflows remain usable without animation.
- No horizontal overflow or accidental landing-page scroll exists.

## Stage B — Platform foundation and simple live capabilities

### Phase 6 — Backend, identity, and user profile

Add:

- FastAPI service
- Authentication integration
- PostgreSQL schema and migrations
- User profile, timezone, places, travel mode, quiet hours, and preferences
- Typed frontend API client
- Mock/live adapter switch
- Audit-safe logging

Exit gate:

- A user can sign in, complete onboarding, and retain settings.
- UI contracts remain stable when mock adapters are replaced.

### Phase 7 — Public APIs

Connect:

- Weather
- Geocoding
- Traffic-aware routes
- Timezone and public-holiday information where useful

Deliver:

- Live weather context
- Live travel estimates
- Manual origin/destination fallback
- Rain and departure suggestions based on deterministic rules

Exit gate:

- API failures degrade safely.
- Freshness and source are visible.
- API keys never reach public client bundles when prohibited.

### Phase 8 — Notifications and scheduled jobs

Add:

- Web push for the website
- Firebase Cloud Messaging foundation for future Android use
- Background scheduler and job queue
- Morning and evening brief schedules
- Quiet hours, deduplication, throttling, and expiry

Exit gate:

- A user receives one explainable scheduled brief.
- Duplicate or obsolete notifications are suppressed.

## Stage C — User-authorized connections

### Phase 9 — Calendar and timetable

Connect:

- Google Calendar first
- Outlook Calendar next
- ICS and manual timetable fallback

Add:

- OAuth consent
- Initial sync
- Incremental sync
- Webhook subscription and renewal
- Event normalization
- Conflict and preparation-buffer logic

Exit gate:

- Event changes reliably reach NEXUS.
- Revoking the connection stops access and produces a clear UI state.

### Phase 10 — Email

Connect Gmail, followed by Outlook mail.

Add:

- Minimum necessary scopes
- Important-message classification
- Deadline, event, and attachment extraction
- User correction
- No automatic sending

Exit gate:

- NEXUS extracts useful structured items and always links back to evidence.
- Raw message retention is minimized and documented.

### Phase 11 — Notion and Drive

Add:

- Selected-page and selected-database Notion access
- Notion change webhooks
- Read, create, append, and update workflows
- Google Drive file discovery
- Permission-aware document ingestion
- Class-note and meeting-note templates

Exit gate:

- NEXUS can draft a note from supplied source material and create it only after the configured approval.
- Deleted or revoked sources disappear from future retrieval.

### Phase 12 — n8n orchestration layer

Use n8n for:

- Connector prototypes
- Webhook routing
- Scheduled workflow composition
- Non-critical cross-service recipes
- Human-visible workflow debugging

Keep in the backend:

- User identity
- Tokens and permissions
- Canonical context state
- Notification policy
- Action authorization
- Audit log

Exit gate:

- Replaying a workflow is idempotent.
- n8n failure cannot bypass product permissions.

## Stage D — Conversational intelligence, knowledge, and agents

### Phase 13 — NEXUS assistant

Add:

- Streaming conversation
- Structured tool calling
- Conversation titles and history
- Source display
- “Why?” explanations
- Tool confirmation UI
- Safe fallback when tools or the model fail

The assistant may initially:

- Read Today and Timeline context
- Explain insights
- Search connected content
- Prepare tasks and notes
- Calculate travel advice

Exit gate:

- The model cannot claim a tool succeeded without a recorded tool result.
- Side-effect tools require the correct authority.

### Phase 14 — RAG and Knowledge

Add:

- Ingestion pipeline
- Parsing and metadata extraction
- Chunking by source structure
- Embeddings
- Hybrid lexical and vector retrieval
- Permission filters
- Source citations
- Re-index and deletion handling

Exit gate:

- Answers are grounded in permitted sources.
- Retrieval evaluation meets the target before answer-style tuning.

### Phase 15 — Basic bounded agents

Introduce independently testable agents:

- Morning Brief Agent
- Departure Agent
- Deadline Radar Agent
- Class Preparation Agent
- Note Maker Agent
- Inbox Triage Agent
- Weekly Review Agent

Each agent receives typed input and returns:

- Proposed insight or action
- Evidence
- Confidence
- Expiry
- Required permission
- Safe fallback

Exit gate:

- Agents cannot call arbitrary tools.
- Every result can be traced to inputs and policy.

## Stage E — Proactive context and automation

### Phase 16 — Context event engine

Add:

- Canonical context-event schema
- Source freshness
- Event deduplication
- Entity relationships between event, task, place, person, document, and device
- Working-context snapshots
- Rule evaluation

Exit gate:

- The same scenario produces deterministic structured context before an LLM writes the explanation.

### Phase 17 — Insight ranking and interruption policy

Add:

- Urgency
- Importance
- Confidence
- User preference
- Interruption cost
- Cooldowns
- Bundling
- Expiration

Exit gate:

- Low-value events remain in the app instead of generating notifications.
- The system can explain why an insight interrupted the user.

### Phase 18 — Automation and action engine

Add:

- Observe, Suggest, Prepare, Ask, and Act modes
- Per-action authority
- Automation recipes
- Preview and dry-run
- Idempotency
- Reversible action support
- Retry and compensation policy
- Kill switch

Initial actions:

- Create or update a Notion note
- Create a task
- Suggest or create a calendar block
- Prepare an email draft
- Download an offline pack

Sending messages and deleting data remain separately protected.

### Phase 19 — Feedback and personalization

Add:

- Helpful
- Incorrect
- Too early
- Too late
- Not important
- Never suggest this
- Memory correction
- Preference and threshold adaptation

Exit gate:

- Learning changes ranking and timing without silently expanding permissions.

## Stage F — Android and device-aware NEXUS

### Phase 20 — Android application foundation

Build:

- React Native/Expo application unless a native requirement justifies Kotlin
- Shared contracts and design tokens
- Today, Timeline, NEXUS, Knowledge, and Settings
- Secure session storage
- Deep links
- FCM registration

The Android application should share the brand and domain model, not blindly
reuse desktop layouts.

### Phase 21 — Mobile context

Add:

- Foreground and consented background location
- Geofences
- Network state
- Battery state where available
- Local notification actions
- Offline cache
- Background sync constrained by the OS

Deliver:

- Location-based reminders
- More reliable departure detection
- Campus/home routine signals
- Offline preparation packs

### Phase 22 — Health and wearable context

Add optional:

- Health Connect
- Sleep sessions
- Activity and recovery summaries
- Wearable-sourced signals
- Separate sensitive-data consent and retention

Deliver only conservative planning suggestions. Do not present medical advice.

### Phase 23 — Laptop companion and cross-device readiness

Add optional Windows/macOS companion:

- Laptop battery
- Connectivity
- Selected local-file readiness
- Charger heuristics
- Cross-device handoff
- Campus Wi-Fi reliability history

This phase enables the pitch’s charger and unreliable-Wi-Fi scenarios with
real evidence rather than invented inference.

## Stage G — Advanced intelligence and full-market expansion

### Phase 24 — Behaviour and prediction models

After sufficient consented history, add:

- Routine detection
- Typical preparation time
- Travel-duration calibration
- Deadline-risk scoring
- Best reminder timing
- Notification usefulness prediction
- Anomaly detection

Start with interpretable features and compare against rule baselines.

### Phase 25 — Advanced planning

Add:

- Schedule optimization
- Recovery from missed or delayed events
- Energy-aware focus planning
- Multi-step preparation plans
- Goal progress
- Long-term pattern summaries

### Phase 26 — Family and shared coordination

Add:

- Shared calendars and errands
- Explicit visibility boundaries
- Delegated reminders
- Household planning
- Consent and role controls

Never expose one member’s private memory by default.

### Phase 27 — Professional and business edition

Add:

- Work-project connectors
- Meeting preparation and follow-up
- Team workflows
- Organization policies
- Admin controls
- Enterprise audit and retention
- Licensing and billing

### Phase 28 — Optional finance and fitness domains

Add these only through compliant providers and separate consent:

- Spending summaries
- Bill reminders
- Budget goals
- Fitness planning

Do not mix health or finance data into general prompts without explicit purpose.

### Phase 29 — Hardening, evaluation, and scale

Complete:

- Security review and threat modelling
- Encryption and key rotation
- Data export and deletion verification
- Multi-region and disaster-recovery decisions
- Queue and webhook scaling
- Cost controls
- Model and retrieval evaluations
- Agent scenario tests
- Red-team tests
- Accessibility and performance audits
- Student pilot
- Professional/family pilot
- Production launch gates

## Recommended immediate sequence

The next six implementation prompts should cover:

1. Phase 0 and Phase 1 foundation
2. Core Today and Timeline UI
3. Insights, NEXUS, and Knowledge UI
4. Automations, Connections, Memory, and Activity UI
5. Complete state coverage
6. Responsive, accessible, cinematic-to-product polish

Only after those are accepted should backend work begin.
