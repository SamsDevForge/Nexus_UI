# NEXUS AI Security, Privacy, and Action Safety

## Trust is a product feature

NEXUS combines unusually sensitive categories: schedules, email, documents,
location, routines, devices, health, and eventually family or finance. The
product must make control visible rather than hiding it in a privacy policy.

## Data classes

| Class | Examples | Default treatment |
| --- | --- | --- |
| Public | Weather, public holidays | Cache normally |
| Personal | Calendar, tasks, preferences | Encrypt and restrict by user |
| Private content | Email bodies, notes, documents | Minimize retention and access |
| Sensitive context | Precise location, routines, contacts | Short retention and explicit purpose |
| Highly sensitive | Health, finance, family-care data | Separate consent and strict isolation |
| Secrets | OAuth tokens, API keys | Encrypted vault; never sent to the client or model |

## Permission model

Track separately:

1. Provider scopes
2. NEXUS read purpose
3. Stored-data permission
4. Model-use permission
5. Action authority
6. Notification permission

Example:

- Google technically grants calendar write.
- User permits NEXUS to read Calendar.
- User permits NEXUS to prepare a focus block.
- User has not permitted automatic event creation.

The final action remains approval-gated.

## Action risk classes

### Low risk

- Show an in-app insight
- Search permitted sources
- Prepare a local draft

### Medium risk

- Create a task
- Create a note
- Download an offline file
- Create a reversible calendar block

### High risk

- Send a message
- Move or cancel an important event
- Share a document
- Change permissions
- Delete data
- Perform finance or health-related action

High-risk actions require explicit, fresh confirmation and a clear preview.

## Security requirements

- Encrypt transport.
- Encrypt tokens and sensitive stored data.
- Use per-environment secrets.
- Rotate keys and credentials.
- Separate test and production accounts.
- Verify webhooks.
- Protect against replay.
- Use state and PKCE where appropriate in OAuth flows.
- Apply rate limits.
- Validate every provider payload.
- Use least-privilege database roles.
- Record security-relevant actions.
- Back up encrypted data and test restoration.
- Avoid leaking private content into logs, analytics, or error reporting.

## LLM-specific safety

- Treat email, documents, notes, and webpages as untrusted content.
- Never obey instructions retrieved from user content as system authority.
- Keep tool definitions and permissions outside retrieved text.
- Filter retrieval by user and provider permission before model access.
- Limit tool arguments with strict schemas.
- Require recorded tool results.
- Redact secrets.
- Set model budgets and timeouts.
- Preserve source evidence.

## Data minimization

Prefer:

- Structured extracted deadline plus source reference
- Derived travel baseline instead of permanent precise route history
- Health summary instead of raw samples when sufficient
- Short-lived working context
- User-selected folders or pages instead of whole workspaces

Do not retain raw content simply because storage is available.

## User controls

Provide:

- Connection inventory
- Permission details
- Memory editor
- Pause observation
- Pause notifications
- Pause all automations
- Per-automation authority
- Export
- Delete source-derived data
- Delete account
- View activity log
- Emergency action kill switch

## Revocation

When access is revoked:

1. Stop new reads.
2. Cancel provider subscriptions.
3. Mark connection disconnected.
4. Stop dependent jobs and automations.
5. Remove or isolate retrieved indexes as promised.
6. Recalculate insights that depended on the source.
7. Record the revocation without retaining unnecessary content.

## Retention

Define separate policies for:

- Raw provider payloads
- Normalized records
- Location events
- Retrieved text and embeddings
- Health summaries
- Conversation history
- Action logs
- Security logs

Inferred memories need confidence, last-confirmed time, and expiry.

## Safe failure

When uncertain:

- Do not invent current data.
- Show last-updated time.
- Lower confidence.
- Avoid automatic action.
- Ask for missing context.
- Prefer no notification over a misleading interruption.

## Pilot readiness

Before real student data:

- Threat model complete
- OAuth consent tested
- Token storage reviewed
- Revocation verified
- Export and deletion verified
- Prompt-injection scenarios tested
- Permission matrix tested
- Audit log reviewed
- Incident and kill-switch procedure documented

Health, family, finance, and enterprise features require additional review
before their respective phases.
