# Phase 10 — Email development

The owner requested merging PR #4 and continuing development. PR #4 is merged
into the reconciliation development branch at `61779bc4`. D-039 defines this
phase's bounded scope; earlier cloud/provider acceptance gates remain open.

## Review before action

`/app/mail` is a source-linked review queue, not a replacement email client.
Gmail is the first adapter, followed by Outlook mail. Each message displays
classification reasons, extracted deadline/event suggestions, the supporting
excerpt, source location, attachment metadata and expiry. Direct links open the
original message. Gmail links include the consented account's address from its
profile so a different default browser account does not silently become the
evidence source. Outlook links are restricted to Microsoft mail hosts.

Detection is deterministic English keyword/pattern matching within the retained
excerpt window around each keyword. Dates outside that evidence window are not
inferred. Only ISO dates
(`YYYY-MM-DD`) and explicit offset timestamps are normalized. Relative dates,
ambiguous numeric dates, invalid dates and multiple competing dates remain
unresolved. Date-only events still need time/duration review. Everything starts
as a suggestion. No model, RAG, task creation, Calendar write, automatic send,
mark-read action or attachment download is added.

Users can change importance, edit an extracted title/date and confirm or dismiss
individual suggestions. Confirmed corrections require an explicit ISO date or
offset timestamp. Corrections preserve original evidence and are encrypted.
Revision checks reject stale saves; changed source text marks earlier corrections
as needing review instead of silently applying them. Unsaved edits pause polling
and manual refresh; switching messages asks before discarding them.

The default mock runtime uses fictional, screen-local examples with no mailbox
links. It supports corrections and resets on reload. Live providers are disabled
in that mode. Account changes destroy the previous workspace. Other daily screens,
general Connections/Permissions and notification brief reasoning keep their
existing boundaries; mail evidence is not silently inserted into those features.

## Data and retention

- Each connected source reads **up to 50 Inbox messages from the past 14 days**.
  More messages cause an incomplete-coverage warning. This is not a complete
  mailbox search, archive sync, spam review, Sent view or attachment index.
- Gmail uses a bounded message list followed by full-message reads. Outlook uses
  a bounded Inbox read with text bodies; attachment requests select metadata only.
- Bodies and raw provider responses are transient process memory only. No raw
  body, provider payload, attachment bytes or file-access token is persisted.
  Text processing is limited to 32,000 characters, MIME depth 12/200 parts,
  12 suggestions and 20 attachment entries per message. Provider responses over
  2 MB or unsupported oversized MIME parts fail the snapshot safely.
- Stored data consists of subject/sender, source link, timestamps, priority
  reasons, structured suggestions, supporting excerpts (up to 240 characters
  each), attachment names/types/sizes, source fingerprint and explicit corrections.
  All message content/corrections are encrypted; owned keys and received/expiry
  timestamps remain database metadata. Credentials use the same separate mail
  Fernet key, independently from Calendar and push keys.
- Retention ends 14 days after receipt, including reviewed items. The API excludes
  expired records immediately; the UI rechecks expiry every 30 seconds. The
  explicitly running worker physically deletes expired copies even while
  observation is paused. A stopped worker delays physical cleanup, not API expiry.
  Operators must run it or an equivalent cleanup process. Encrypted backups have
  their separately managed retention; immediate backup erasure is not claimed.
- A successful poll replaces the bounded snapshot, removing messages no longer
  present in it (including removals from Inbox). Failed/partial provider reads
  preserve the previous confirmed snapshot and show stale/error status.
- Email is untrusted text. HTML is converted to plain text, hidden executable
  content is ignored, quoted history is bounded, and no message instruction,
  URL, image or attachment is executed. React renders evidence as text.

## Configuration

Use the existing Firebase verification and PostgreSQL setup. In `backend`, run
`alembic upgrade head`; head is `20261120_0004`. Set `MAIL_ENABLED=true` and a
separate `MAIL_ENCRYPTION_KEY`, generated with:

```powershell
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Keep the key in the backend secret store and preserve it across restarts. This
release does not implement in-place key rotation: disconnect/erase existing mail
sources before changing it. Losing the key makes stored evidence unreadable.

Set `MAIL_API_PUBLIC_URL` and `MAIL_WEB_URL` to fixed origins with no path/query.
HTTPS is required except localhost HTTP in development/test. Configure provider
registrations and exact callbacks:

- `{API_ORIGIN}/api/v1/mail/oauth/google/callback`
- `{API_ORIGIN}/api/v1/mail/oauth/microsoft/callback`

Set `GOOGLE_MAIL_CLIENT_ID/SECRET` and/or `MICROSOFT_MAIL_CLIENT_ID/SECRET` on the
backend. Calendar consent is not reused. Authlib performs S256 PKCE with a
one-use owner-bound state expiring after ten minutes. Redirects and token hosts
are fixed. Initial consent must return the intended scope and refresh credentials.

Gmail requests `https://www.googleapis.com/auth/gmail.readonly`; Outlook requests
delegated `Mail.Read` and `offline_access`. Metadata-only scopes cannot support
body-based extraction. These scopes technically permit reading more of the
mailbox than this release processes; the application purpose is explicitly limited
to the Inbox window. No send, modify or Calendar-write scope is requested. Enable
the Gmail API and configure provider consent/test-account/tenant access as needed.
No real provider registration or new hosting identity was created here.

OAuth callback queries are stripped before application access logging. Calendar
and mail responses carry no-store/no-referrer headers. Existing HTTPX, HTTPcore
and Authlib logging guards also apply. An upstream reverse proxy must separately
redact callback queries; application middleware cannot redact upstream logs.

## Worker and revocation

Start the independent process, never implicitly in the web server:

```powershell
python -m nexus_api.mail_worker
python -m nexus_api.mail_worker --once
```

It checks due sources every 30 seconds and polls each active source every five
minutes. This phase uses bounded polling, not mail webhooks or a full history
cursor. Each read has a four-minute overall timeout; requests have ten-second
timeouts, fixed provider hosts and no redirects. Conditional ten-minute leases
and owner/source generations prevent competing workers and revoked writes.
Pause controls block reads; expiring credentials refresh server-side. Revoked
provider consent clears local credentials and evidence and requires reconnection.

Manual sync only queues work. Disconnect commits credential/evidence/correction
deletion and invalidates pending OAuth states/in-flight persistence. An already
in-flight provider request cannot be recalled; subsequent reads and stale-result
commits are blocked. The provider's global application grant must be withdrawn
separately in its account settings if desired. No provider-side mutation is made.

## API and verification

Routes under `/api/v1/mail`:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/` | Owned current evidence and source health |
| PUT | `/messages/{id}/correction` | Version-checked user review |
| POST | `/oauth/{provider}/start` | Separate read-only consent |
| GET | `/oauth/{provider}/callback` | Consume bound one-use state |
| POST | `/connections/{id}/sync` | Queue bounded polling |
| DELETE | `/connections/{id}` | Stop local access and erase copies |

Personal routes use verified Firebase bearer identity. Composite owner/source
foreign keys add a database boundary. Request bodies are bounded before parsing.
Audit events contain IDs and changed-field names, never message content.

Tests cover conservative/ambiguous dates, malicious HTML/instructions, attachment
metadata, account-specific evidence links, distinct read-only scopes, PKCE/replay,
encryption, owner isolation, optimistic corrections, source-change review,
failed-snapshot retention, pause/expiry cleanup and disconnect during a read.
CI runs actual PostgreSQL migrations and competing workers in an isolated schema.
Browser checks cover desktop/mobile review, evidence, corrections, dirty-state
protection, source boundaries and reload reset. The cube remains byte-locked.

Real Gmail/Outlook consent and mailbox processing, deployed persistence,
provider-side revocation and production retention/logging operation are **not
accepted** by fixture tests. Existing hosting credentials are lost. Prior cloud,
Calendar and device acceptance gaps stay open; no replacement Site or successful
deployed acceptance is claimed.

Next: **Phase 11 — Notion and Microsoft Teams**, selected-source consent,
permission-aware ingestion, source-linked notes and approval-gated creation.
That phase is not implemented here.

Provider references: [Gmail list](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list),
[Gmail get](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get),
[Microsoft messages](https://learn.microsoft.com/en-us/graph/api/user-list-messages?view=graph-rest-1.0).
