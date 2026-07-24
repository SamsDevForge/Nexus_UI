# NEXUS AI Technical Architecture

## Architecture objective

Separate provider integrations, canonical context, deterministic decisions,
language generation, permission checks, and action execution. This prevents an
LLM or an automation workflow from becoming an untraceable authority.

## Repository strategy

Inspect the existing repository before restructuring it. Preserve the current
frontend framework if it is healthy. Do not rewrite a working React/Vite
landing page only to adopt a fashionable framework.

For a greenfield or deliberately migrated project, use a monorepo-shaped
structure:

```text
apps/
  web/                 desktop website and responsive web experience
  mobile/              Android-first React Native/Expo application
services/
  api/                 FastAPI application
  worker/              scheduled and asynchronous jobs
packages/
  contracts/           shared schemas and generated clients
  design-tokens/       cross-platform colour, type, spacing, and motion
  web-ui/              web-specific components
  domain/              provider-neutral domain logic where practical
infra/
  n8n/                 exported workflows and integration notes
  deployment/          infrastructure configuration
docs/                  product and engineering source of truth
```

Do not force DOM components into React Native. Share tokens, contracts, domain
concepts, and selected logic; build platform-appropriate UI components.

## Recommended stack

### Website

- React and TypeScript
- Existing Vite application if already established, or the current stable
  Next.js release for a deliberate greenfield choice
- Route-level code splitting
- A query/cache library for server state
- A small explicit client-state solution only where necessary
- Three.js or React Three Fiber for the cinematic cube
- CSS variables or a token compiler for design tokens

### Android

- React Native with Expo for speed and shared TypeScript knowledge
- Native modules only when location, Health Connect, or background execution
  requires them
- Kotlin only if native constraints become dominant

### Backend

- FastAPI
- Pydantic schemas
- PostgreSQL
- pgvector for embeddings
- Redis for cache, locks, rate limits, and queues
- Celery, Dramatiq, or another proven worker framework
- Object storage for documents and offline packs

### Orchestration

- n8n for connector prototypes and understandable cross-service workflows
- Backend-owned permission checks and canonical action execution

## System flow

```text
Provider or device event
  → connector adapter
  → raw event quarantine
  → normalization
  → canonical context event
  → context/entity update
  → rule or agent candidate
  → insight ranking
  → permission gate
  → in-app item, notification, prepared action, or execution
  → audit event
  → user feedback and outcome
```

## Service boundaries

### Connector layer

Responsibilities:

- OAuth exchange and refresh
- Webhook verification
- Subscription renewal
- Incremental synchronization
- Rate-limit handling
- Provider-payload translation

It returns canonical objects and never decides whether to interrupt the user.

### Context service

Responsibilities:

- Current user context
- Source freshness
- Entity relationships
- Timeline assembly
- Working-context snapshot
- Routine and preference lookup

### Knowledge service

Responsibilities:

- Document ingestion
- Parsing
- Metadata
- Chunking
- Embedding
- Hybrid retrieval
- Permission filtering
- Source citations
- Deletion and re-indexing

### Decision service

Responsibilities:

- Deterministic rules
- Candidate insight generation
- Ranking
- Cooldowns
- Expiration
- Notification bundling

### Agent runtime

Responsibilities:

- Typed agent input/output
- Approved tool registry
- Tool execution records
- Model calls
- Timeouts and budgets
- Evaluation traces

### Permission and action service

Responsibilities:

- Read grants
- Per-action authority
- Approval requirements
- Dry-runs
- Idempotency
- Reversible execution
- Audit logging
- Kill switch

## Canonical data model

Minimum entities:

- `User`
- `UserPreference`
- `Place`
- `Person`
- `Connection`
- `PermissionGrant`
- `CalendarEvent`
- `Task`
- `Document`
- `KnowledgeChunk`
- `ContextEvent`
- `ContextSnapshot`
- `Insight`
- `Evidence`
- `Automation`
- `ActionProposal`
- `ActionRun`
- `MemoryItem`
- `Feedback`
- `Notification`
- `Device`

Every source-derived record needs:

- `user_id`
- `source_provider`
- `source_account`
- `source_record_id`
- `observed_at`
- `source_updated_at`
- `fresh_until`
- `sensitivity`
- `provenance`

## Frontend service boundary

Pages should depend on interfaces such as:

- `TodayService`
- `TimelineService`
- `InsightService`
- `KnowledgeService`
- `AutomationService`
- `ConnectionService`
- `MemoryService`
- `ActivityService`

During UI phases, these interfaces use deterministic mock adapters. Later,
live adapters implement the same contracts.

Mock data should support named scenarios:

- `first-use`
- `student-normal-day`
- `rain-and-traffic`
- `deadline-risk`
- `connection-stale`
- `permission-denied`
- `offline`
- `action-failed`

## Event and action contracts

### Context event

```json
{
  "type": "calendar.event.updated",
  "source": "google_calendar",
  "occurredAt": "ISO-8601",
  "receivedAt": "ISO-8601",
  "entityRefs": ["event:...", "place:..."],
  "sensitivity": "personal",
  "payload": {},
  "deduplicationKey": "..."
}
```

### Insight

```json
{
  "kind": "departure",
  "title": "Leave by 9:12",
  "recommendation": "...",
  "evidence": [],
  "confidence": 0.91,
  "freshUntil": "ISO-8601",
  "priority": 0.84,
  "requiredAuthority": "suggest",
  "proposedAction": null
}
```

### Action proposal

```json
{
  "tool": "notion.create_note",
  "parameters": {},
  "reason": "...",
  "evidenceRefs": [],
  "requiredAuthority": "ask",
  "idempotencyKey": "...",
  "expiresAt": "ISO-8601"
}
```

## Jobs and scheduling

Background jobs include:

- Webhook reconciliation
- Subscription renewal
- Initial and incremental sync
- Morning and evening briefs
- Weather and route refresh near relevant events
- Knowledge ingestion
- Embedding
- Agent evaluation
- Notification delivery
- Deletion propagation

Every job should be idempotent or carry an idempotency key.

## Observability

Track:

- Connector health
- Webhook delay
- Sync lag
- Queue delay
- Rule and agent latency
- Model cost
- Retrieval quality
- Notification delivery
- Action success
- User feedback

Do not log secrets, raw OAuth tokens, unnecessary email bodies, precise
location trails, health details, or retrieved private passages.

## Deployment progression

1. Local web UI and mocks
2. Preview website
3. Local backend and database
4. Staging environment with test accounts
5. Pilot environment with isolated secrets and audit logging
6. Production with backups, monitoring, rate limits, and incident controls

## Architecture tests

- Contract tests between mock and live adapters
- Provider-fixture normalization tests
- Rule-engine scenario tests
- Permission matrix tests
- Tool-call and action-idempotency tests
- Retrieval evaluation set
- Agent scenario tests
- End-to-end critical journeys
- Accessibility and visual regression tests
