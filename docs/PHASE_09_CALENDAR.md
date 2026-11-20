# Phase 9 — Calendar and timetable development

PR #3 was merged into `codex/nexus-phase6-reconciliation` at `1a5b3de`.
The owner requested this phase under D-038. This is an independently testable
development implementation. Earlier cloud gates, real provider acceptance and
deployed acceptance remain open. The lost private Site identity is preserved.

## Experience

`/app/calendar` presents a seven-day agenda with source filters, source timezone,
all-day date boundaries, busy/tentative/declined states, freshness, preparation
buffers and deterministic overlap warnings. Filters do not hide conflicts from
other sources. Intervals are half-open; adjacent events conflict only when the
later event's preparation buffer overlaps the earlier one. Free and declined
events do not create conflicts. All-day events have no preparation buffer.

Manual events support creation, editing, removal and idempotent creation keys.
They stay in NEXUS. Provider events are read-only; their preparation buffer is a
NEXUS suggestion and never changes the source event. The default mock runtime
supports screen-local manual examples and explicitly disables provider consent
and imports. Reloading resets those examples. An account change destroys the
previous calendar workspace.

ICS upload imports a fixed copy, not a URL subscription. Limits: 1 MB, 200 event
definitions, 5,000 expanded occurrences, 30 days before import through 90 days
after import. Supported recurrence: daily, weekly, monthly and yearly, bounded
COUNT/INTERVAL and supported BY* selectors, EXDATE and recurrence exceptions.
Unsupported recurrence is rejected atomically. Very old recurring definitions
require a recent-window export. Floating times use the selected IANA timezone;
ambiguous/nonexistent floating times require an explicit source offset. Original
all-day dates and exclusive end dates are retained. Attachments, alarms and URLs
are not executed or stored. Reimporting an identical named file is idempotent;
changing that name's contents requires the replacement checkbox. Removing an
import removes its owned copies.

Timetables generate selected weekdays across a term of at most 120 days. Sessions
must start and end on the same local day. At a DST gap the first valid minute is
used; at a repeated time the earlier occurrence is used. Import failures leave
the previous collection intact.

## Runtime and consent setup

Use the existing verified Firebase identity and PostgreSQL configuration.
Run `alembic upgrade head` from `backend`; the new head is `20261120_0003`.
Set `CALENDAR_ENABLED=true` in backend configuration. Manual/ICS/timetable need
no OAuth credentials. Keep every calendar secret on the backend, never in a
`NEXT_PUBLIC_*` variable.

Generate a separate Fernet key:

```powershell
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Store that output as `CALENDAR_ENCRYPTION_KEY` in the secret store. Preserve it
across restarts; key rotation currently requires disconnecting and reconnecting
provider accounts. OAuth access/refresh tokens, PKCE verifiers and sync cursors
are encrypted. Event titles, locations and times are private application data
in the owned database. Raw provider descriptions, attendee lists, attachments
and uploaded ICS files are not retained.

Configure `CALENDAR_API_PUBLIC_URL` and `CALENDAR_WEB_URL` as origins only, with
no path, query or fragment. HTTPS is required; localhost HTTP is allowed only
in development/test, and cannot establish provider webhooks. Register exact
callbacks with the selected provider:

- Google: `{API_ORIGIN}/api/v1/calendar/oauth/google/callback`.
- Microsoft: `{API_ORIGIN}/api/v1/calendar/oauth/microsoft/callback`.

Set the corresponding `GOOGLE_CALENDAR_CLIENT_ID/SECRET` or
`MICROSOFT_CALENDAR_CLIENT_ID/SECRET`. Configure the provider consent screen and
eligible test accounts/tenant policy. No application registration or new hosting
identity was created by this implementation.

Google requests `calendar.events.readonly`, offline access, explicit consent and
account selection for the primary calendar. Microsoft requests delegated
`Calendars.Read` and `offline_access` for the default calendar. NEXUS Firebase
sign-in grants neither permission. OAuth uses Authlib, S256 PKCE, a random
owner-bound state with a ten-minute expiry, one-use code exchange and fixed
redirects. The provider identity selected during consent may differ from the
Firebase account; the grant belongs only to the authenticated NEXUS owner that
started it. No provider event-write or email scope is requested.

The API strips OAuth callback queries before downstream access logging, hides
HTTPX/HTTPcore/Authlib diagnostic logging and marks calendar responses no-store.
Production ingress/proxy logs must independently redact callback query strings;
application middleware cannot control an upstream proxy's logs.

## Synchronization

Run this explicit process separately from FastAPI:

```powershell
python -m nexus_api.calendar_worker
# One diagnostic tick, without creating a scheduler:
python -m nexus_api.calendar_worker --once
```

The worker checks due sources every 30 seconds, polls each active source every
five minutes and performs a full moving-window refresh daily. Its provider
window is the previous 30 and next 90 days. Google uses event sync tokens;
Microsoft uses calendarView delta links. Google 410 responses trigger a full
resync. Pagination is bounded to 30 pages and 5,000 changes per connection/tick.
Microsoft continuation links are restricted to the exact Graph delta host and
path; no user-provided provider endpoint or redirect is followed.

All pages normalize before a snapshot is committed. Transient provider failures
preserve the last confirmed snapshot and show an error/stale state. PostgreSQL
conditional leases prevent concurrent workers from applying the same source.
Generation checks and guards before provider requests prevent revoked sources
from making subsequent reads or restoring data from in-flight responses. A
request already in flight at disconnect cannot be recalled. Consent rejection
clears credentials/copies and requires reconnection. Observation and automation
pauses block reads. A manual sync queues work and never claims it completed.

HTTPS webhooks only queue reads; callback payloads never directly become events.
Google channel ID, hashed secret and resource ID must match. Microsoft validates
the plaintext challenge and matches subscription ID plus hashed `clientState`.
Google watches request a one-day TTL; Microsoft subscriptions request two days.
The worker renews them before expiry (six-hour margin). Missed signals and failed
watch registration recover through polling; UI shows when no active watch is
confirmed. Hosting must expose those webhook paths to providers.

Disconnect commits local credential deletion, source-copy deletion, generation
invalidation and pending-state invalidation before best-effort subscription
cleanup. It does not revoke the provider's application grant globally. The UI
instructs users to withdraw that grant in the provider's account settings too.

## API

Personal routes require Firebase bearer identity and owner scope:

| Method | Path under `/api/v1/calendar` | Purpose |
| --- | --- | --- |
| GET | `?start=YYYY-MM-DD&days=7` | Agenda, conflicts, source state; max 31 days/1,000 results |
| POST | `/events` | Idempotent manual creation |
| PUT / DELETE | `/events/{id}` | Manual-only edit/removal |
| PATCH | `/events/{id}/preparation` | NEXUS-only buffer, 0–240 minutes |
| POST | `/imports/ics` | Named fixed-copy import/replacement |
| POST | `/imports/timetable` | Weekly term generation/replacement |
| DELETE | `/collections/{id}` | Remove owned collection and copies |
| POST | `/oauth/{google|microsoft}/start` | Begin separate read-only consent |
| POST | `/connections/{id}/sync` | Queue a source read |
| DELETE | `/connections/{id}` | Stop local access and remove copies |

OAuth callbacks use bound one-use state instead of bearer identity. Webhook
callbacks use their provider challenge/subscription secrets. Calendar request
bodies are bounded before parsing. Composite owner/source foreign keys provide
an additional database boundary. Responses disclose source, freshness and
truncation; conflict output is capped at 200.

## Validation and remaining gates

Checks cover owner isolation, idempotent/manual editing, atomic ICS replacement,
recurrence/exclusions, all-day and floating timestamps, DST and Windows/IANA
normalization, PKCE/state replay, encrypted credentials, multi-page/delta reads,
token refresh, expired-cursor recovery, webhook secrets, watch renewal, stale
snapshot retention, revocation during a read and cursor-host restrictions.
CI additionally runs the real PostgreSQL migrations and competing workers in
an isolated schema. Browser checks exercise desktop/mobile manual scheduling,
conflict warnings, editing, source boundaries and reload reset. Locked cube
hashes remain part of the frontend checks.

Live consent, Google/Microsoft event edits reaching a deployed NEXUS instance,
public webhook delivery/renewal, real-tenant revocation and deployed Firebase
persistence have **not** been accepted. These require the owner's provider
registration and recoverable hosting credentials. No deployed phase completion
is claimed. Other daily screens and general Connections/Permissions remain
their existing mock experiences; this dedicated Calendar is the live boundary.
Notifications still explain saved Quick Capture drafts only and explicitly say
that calendar copies are not consulted. Calendar-to-brief reasoning is deferred.

Next is **Phase 10 — Email**: Gmail then Outlook mail, minimum read scopes,
evidence-linked classification/extraction, user correction, documented minimal
raw retention and no automatic sending. It is not implemented in this phase.
