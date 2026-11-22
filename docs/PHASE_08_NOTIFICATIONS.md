# Phase 8 — Notifications and scheduled jobs

The owner requested merging PR #2 and continuing to the next phase. PR #2 is
merged into `codex/nexus-phase6-reconciliation`; this phase branches from that
merged development state. Earlier cloud acceptance and the remaining broader
Phase 7 scope stay open (D-037). No hosting identity was replaced.

## Implemented behavior

`/app/notifications` provides opt-in morning and evening schedules, quiet hours,
in-app delivery, explicit browser push registration/revocation, a test-brief
request, inbox/read state, provenance, and delivery history. It labels queued,
available, suppressed, expired and uncertain results. A queued request is never
reported as a sent push. Default mock mode is an explicitly labeled, screen-only
demonstration; it does not schedule, register a device, call an API or send push.

Configured `phase6-live` mode uses authenticated FastAPI endpoints and durable
PostgreSQL records. No fake identity or unconfigured-service fallback is added.
Notifications and push are both disabled on the backend by default. Morning
and evening schedules also default to disabled for every existing/new account.

Briefs count only the owning user's saved/corrected local NEXUS event drafts:
the original scheduled local day for a morning brief, the following day for
an evening brief, even if quiet hours delay delivery across midnight. They explain that
external calendars are not connected and that this is not a complete schedule.
Raw capture text, event titles, location and private provider content are not
copied into brief bodies or push messages. Email delivery, model-generated
briefs and Calendar integration are outside this phase.

## Scheduling and delivery rules

- Schedule times use the profile's IANA timezone, with UTC storage/arithmetic.
  Spring DST gaps move to the first valid minute; autumn folds choose the earlier
  occurrence. A unique owner/kind/local-date key prevents a second daily brief.
- Quiet hours can cross midnight. A brief waits until quiet hours end only if
  its original two-hour expiry still permits delivery. Delaying does not extend
  that expiry. A 30-minute per-user cooldown separates multiple ready briefs.
- The worker reads current account, schedule, channel and privacy/automation
  pause preferences at delivery. Disabled/revoked/obsolete/expired work is
  suppressed, with a readable reason. Pending schedule changes replace timing
  rather than creating a second daily brief.
- The inbox item and push outbox entries commit together. PostgreSQL owner locks,
  conditional claims and unique constraints serialize concurrent workers.
  Scheduling reads users in bounded pages; each tick handles at most 100 ready
  inbox items and 100 ready push deliveries.
- Each notification/device pair has one push outbox row. A committed send claim
  precedes external I/O. Provider success means **accepted**, not received.
  Interrupted/unknown sends become **uncertain** and are not automatically
  resent. The in-app item remains readable. Invalid registrations are retired.
- Web messages contain a notification ID and expiry only. The service worker
  rejects expired/invalid payloads, uses a stable notification tag without
  renotification, and displays generic text. Clicking opens the same-origin
  notification page, which still requires sign-in in live mode.

This is at-most-once application send behavior, not an exactly-once delivery
guarantee by FCM, the browser or the operating system. A crash between claiming
and sending can lose a push; uncertainty is preferred to duplicate interruptions.
Expired inbox records are displayed as history, not current recommendations.
Automated history pruning/export/deletion remains a later data-lifecycle task.

## Database and background worker

Migration `20261120_0002` adds opt-in schedule flags, `notifications`, encrypted
`push_devices`, and `push_deliveries`. Migration reversal was tested on an
isolated database. Run migrations before starting the API/worker:

```powershell
cd backend
.venv/Scripts/python -m pip install -r requirements.txt -r requirements-dev.txt
# Configure the existing PostgreSQL/Firebase environment; do not create another Site.
.venv/Scripts/python -m alembic upgrade head
$env:NOTIFICATIONS_ENABLED = 'true'
.venv/Scripts/python -m uvicorn nexus_api.main:app --host 127.0.0.1 --port 8000
```

Start a **separate process** from `backend`, with the same database/environment:

```powershell
$env:NOTIFICATIONS_ENABLED = 'true'
.venv/Scripts/python -m nexus_api.notification_worker
# Or one tick for a job runner:
.venv/Scripts/python -m nexus_api.notification_worker --once
```

The worker polls every 30 seconds, survives process restarts through the durable
queue, and outputs aggregate counts only. It never starts in the web process.
For Railway or another host, configure a separate worker service/process using
this command; the existing API deployment configuration is unchanged. No worker
or recurring job was installed on the owner's machine or external account.

## Opt-in Firebase web push and Android foundation

Use the existing Firebase project. Set `NOTIFICATIONS_ENABLED=true`,
`PUSH_ENABLED=true`, the existing Firebase Admin credentials, and:

| Setting | Where | Purpose |
| --- | --- | --- |
| `PUSH_TOKEN_ENCRYPTION_KEY` | Backend/worker only | Fernet key encrypting FIDs at rest; never public |
| `FCM_WEB_VAPID_PUBLIC_KEY` | Backend | Public Web Push certificate key supplied to the signed-in browser |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Frontend/Worker public binding | Firebase project sender number |

The other public Firebase fields remain those used by identity sign-in. The
Fernet key must be backed up securely; changing it without migrating encrypted
registrations makes old devices require re-registration. Generate a key through
your normal secret-management process, and never commit it or place it in a
`NEXT_PUBLIC_*` variable. The existing internal encrypted-column/setting names
contain “token”; their new payload is a Firebase Installation ID, not the
deprecated FCM registration-token API.

Firebase JS 13.4 and Admin 7.5 use `register`/`onRegistered`/`unregister` and
`Message.fid`. The service worker uses the matching pinned compatibility SDK
from Firebase's CDN. Browser permission starts only from the explicit Enable
browser push action. Foreground messages refresh the inbox; background messages
show the generic notification. A server registration is associated with the
owning account, capped at five active devices, and can be revoked individually.
Device identifiers are never returned in inbox/device responses or logs.

Signing out attempts server revocation and Firebase unregistration with a
bounded wait. If revocation cannot be confirmed, the sign-in screen warns that
browser site permissions can block push. Network/provider failures cannot prove
revocation or device receipt. If Firebase rotates an installation registration,
re-enable browser push; automatic FID-rotation reconciliation is not implemented.
The `android` device platform and Android TTL/collapse configuration establish
the server contract; no Android application or device delivery is claimed.

Official contracts: [Firebase web registration](https://firebase.google.com/docs/cloud-messaging/web/get-started),
[web receive/service workers](https://firebase.google.com/docs/cloud-messaging/web/receive-messages),
[Admin SDK sends](https://firebase.google.com/docs/cloud-messaging/send/admin-sdk).
FCM HTTP v1, Web Push keys, HTTPS/localhost, browser support and valid project
configuration are required. The owner still needs to restore deployment access.

## API surface

All endpoints use existing Firebase identity, owner isolation and request/error
envelopes. They fail explicitly when the feature or database is unavailable.

| Endpoint | Operation |
| --- | --- |
| `GET/PUT /api/v1/notifications/preferences` | Read/save brief schedules and channel preferences |
| `GET /api/v1/notifications` | Latest 50 owned brief/history records and push outcomes |
| `PATCH /api/v1/notifications/{id}/read` | Idempotently mark an owned available brief read |
| `POST /api/v1/notifications/test` | Queue a user-requested test with an idempotency key; at most three/hour |
| `GET/POST /api/v1/notifications/devices` | List safe device metadata or explicitly register `{ fid, platform }` |
| `DELETE /api/v1/notifications/devices/{id}` | Revoke an owned device and pending sends |

The server controls ownership, timing, queue status and delivery authority; a
client cannot inject a user ID, provider receipt or delivered status. No public
“run worker” endpoint or unauthenticated notification-send endpoint exists.

## Verification and remaining gates

Tests cover opt-in behavior, timezone/DST, quiet hours, cooldown, expiry, changed
schedules, duplicate suppression, owner isolation, test-request limits, encryption,
revocation, invalid registrations, uncertain/interrupted sends, persistence across
restart, actual worker subprocess delivery, migrations and FCM payload encoding.
CI uses an isolated PostgreSQL schema created by real Alembic migrations to test
two concurrent workers claiming one brief and one push. Provider sends in tests
use recording adapters; **no actual FCM notification is sent**.

Browser checks exercise the labeled sample UI, preference editing, read state,
reload reset and mobile layout. Backend integration tests exercise real
authenticated API handling with a test-only verifier plus the real queue/worker.
These are separate verification paths; deployed Firebase/browser/OS delivery is
not established by them. Cube-enabled layouts are inspected locally; CI uses
the existing Focus mode for functional checks.

Full Phase 8 acceptance remains open until one real signed-in user receives an
explainable scheduled brief in the deployed system, confirms browser/device push,
and verifies deployed revocation, quiet-hour and duplicate behavior. Earlier
cloud gates, broader Phase 7 traffic/context work and the retained build-tool
advisories remain open. Phase 9 is Calendar and timetable; it is not implemented
by this change.
