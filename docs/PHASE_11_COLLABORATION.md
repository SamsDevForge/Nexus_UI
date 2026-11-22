# Phase 11 — Selected Notion and Teams sources

Development follows D-041 after PR #6 merged at `e5665d11`. The new route is
`/app/collaboration` (Sources & notes), reached from the sidebar and mobile More
navigation. It uses the existing workspace design and preserves the locked
large cube. Existing Knowledge, Notes, Connections and Activity prototypes are
still separate mock experiences; this phase does not claim unified retrieval.

## Visible workflow

1. Sign in to a configured live account, then grant **separate** provider consent.
2. Discover metadata and explicitly select a Notion page/data source or a Teams
   team/channel. Discovery alone does not ingest its content.
3. Request sync and run the collaboration worker. Open an excerpt to revalidate
   provider access before reading it or using it to prepare a note.
4. Enable approval-gated writes on a selected Notion destination. This setting
   does not publish anything. Teams has no write control.
5. Prepare class or meeting notes. These are deterministic templates with an
   excerpt and source citation; conclusions, owners and dates remain for the
   user to supply. Source content cannot authorize a tool action.
6. Edit and save the preview. Explicitly approve its current revision to create
   one page or append one paragraph to a selected page. A published draft can
   update only its own recorded paragraph, after checking its parent and text
   against the previous confirmed version.
7. Remove sources or disconnect to erase their encrypted local evidence and
   dependent drafts. Published Notion notes remain. Withdraw the provider app's
   account grant separately when desired.

Default mode contains fictional examples. Drafts, source removals, destination
changes and approvals are screen-local and reset on reload. Connect buttons
are disabled and sample approvals make no provider requests.

## Server setup

Keep all secrets in `backend/.env` or the backend's secret manager. See the root
`.env.example`. The frontend continues to use existing Firebase sign-in and
`NEXT_PUBLIC_NEXUS_API_BASE_URL`; no provider secret enters browser configuration.

- `COLLABORATION_ENABLED=true`
- `COLLABORATION_ENCRYPTION_KEY`: separate Fernet key. Generate using the
  installed backend interpreter:
  `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
- `COLLABORATION_API_PUBLIC_URL` and `COLLABORATION_WEB_URL`: exact HTTPS origins,
  or localhost HTTP in development. No paths, query strings or credentials.
- `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`
- `TEAMS_CLIENT_ID`, `TEAMS_CLIENT_SECRET`

Apply `python -m alembic upgrade head` from `backend/`; head is
`20261122_0005`. The migration adds six collaboration tables with owner-bound
composite foreign keys. Production uses PostgreSQL. SQLite schema creation is
test-only. Do not run migrations against an unrelated database.

Run the API normally and start a separate worker from `backend/`:

```sh
python -m nexus_api.collaboration_worker
python -m nexus_api.collaboration_worker --once
```

The worker does not start inside the web process. It checks every 30 seconds,
polls each connection about every five minutes, uses conditional ten-minute
leases and bounds a connection's work to four minutes. Credentials rotate under
a database row lock. Failed reads retain a still-unexpired snapshot, except
known revocation/deletion, which purges affected evidence and derived drafts.

## Provider registrations

Notion pins `Notion-Version: 2026-03-11`. Register a public REST integration
with read content, insert content and update content capabilities, and callback:

`<API_ORIGIN>/api/v1/collaboration/oauth/notion/callback`

Its documented REST OAuth flow uses one-use owner-bound state and Basic-auth
JSON token exchange; it does not document PKCE for this flow. The provider's
page picker may grant a parent and its children. Local selections still limit
ingestion. Reconnecting clears selections and derived copies before requiring
fresh selection. Refresh tokens and all content are encrypted at rest.

Register a separate Microsoft work/school web application with callback:

`<API_ORIGIN>/api/v1/collaboration/oauth/teams/callback`

Delegated scopes: `Team.ReadBasic.All`, `Channel.ReadBasic.All`,
`ChannelMessage.Read.All`, `offline_access`. The organization may require admin
consent. These are broader than a selected channel; the UI explains that scope
and the server only ingests explicit selections. Organizations-only consent
uses S256 PKCE; sign-in and existing Mail/Calendar consent grant no Teams access.
No chat, send, file or transcript permission is requested. Meeting context means
channel message/system-event text, not meeting attendance or transcript APIs.

## Notion webhook verification

Create a subscription in the Notion developer portal pointing to:

`<API_ORIGIN>/api/v1/collaboration/webhooks/notion`

Use a public HTTPS endpoint. Notion initially posts a `verification_token` that
the operator must confirm in the portal. A public request must never silently
establish the server's trusted signing key:

1. Set a separate strong `COLLABORATION_WEBHOOK_ADMIN_KEY` for bootstrap.
2. The endpoint stores up to five short-lived encrypted challenge candidates.
3. Retrieve candidates server-to-server through
   `GET /api/v1/collaboration/webhooks/notion/challenges` with
   `X-Webhook-Admin-Key`. This response is private/no-store; normal Firebase
   sign-in alone does not expose candidates. Never paste the operator key into
   a frontend variable, public URL, issue or log.
4. Confirm the correct token in Notion's portal, then set that exact value as
   `NOTION_WEBHOOK_VERIFICATION_TOKEN` in the backend secret manager and restart.
   Delete or rotate the bootstrap admin key after verification.

Subsequent events must have a valid `X-Notion-Signature` HMAC-SHA256 over the
**original request bytes**, keyed by the configured verification token. Replayed
event IDs are deduplicated for two days; event timestamps must be within the
previous 24 hours and not more than five minutes ahead. Only matching workspace
connections are queued. Payloads are invalidation hints, never ingested content.
Known deletion events immediately erase affected documents/drafts and increment
source generations. Polling recovers from missed or delayed events. No Teams
webhook subscription is created in this phase.

## API boundary

All routes below have prefix `/api/v1/collaboration`. Except callbacks and the
signed/operator webhook routes, Firebase authentication and active ownership
are required. Responses are private/no-store with no-referrer policy; OAuth
query credentials are removed before access logging. Request bodies are capped
at 64 KB. Client bodies reject unknown fields.

| Method and suffix | Purpose |
| --- | --- |
| `GET /` | Own connections, source health, unexpired document/draft metadata |
| `POST /oauth/{notion\|teams}/start` | Start separate one-use consent |
| `GET /oauth/{provider}/callback` | Consume bound state and store encrypted grant |
| `GET /connections/{id}/discover?query=&team=` | Metadata-only source discovery |
| `POST /connections/{id}/sources` | Select `{kind, resource_id, team_id?, writable?}` |
| `POST /connections/{id}/sync` | Queue selected-source reads |
| `DELETE /connections/{id}` | Disconnect and erase local copies/pending consent |
| `PATCH /sources/{id}` | Set `{writable: boolean}` for a Notion destination |
| `DELETE /sources/{id}` | Remove selection and derived local copies |
| `GET /documents/{id}` | Revalidate source access, then return plain-text excerpt |
| `POST /drafts` | Prepare `{document_id, destination_id, template, operation}` |
| `GET /drafts/{id}` | Revalidate source, then open preview |
| `PUT /drafts/{id}` | Save `{revision, title, body, operation}` and increment revision |
| `POST /drafts/{id}/execute` | Explicit `{revision, approved: true}` for one write |
| `DELETE /drafts/{id}` | Remove local record; never delete a remote note |
| `POST /webhooks/notion` | Verify challenge/event and invalidate selected copies |
| `GET /webhooks/notion/challenges` | Operator-only encrypted bootstrap candidates |

Revision claims serialize through PostgreSQL row locks. A duplicate approval
cannot repeat a completed or in-progress write. Approval is recorded before the
remote attempt; success is audited after provider confirmation. Uncertain
responses and interrupted writes are final for automatic retry purposes. Check
Notion directly before preparing another action. Writes have no automatic retry
and do not invoke n8n or a model.

## Bounds and remaining acceptance

- At most eight sources per provider, 20 drafts per account, 200 visible
  document references (with an explicit truncation notice).
- Notion: ten data-source rows, 50 top-level blocks per page, 8,000 characters
  per encrypted text snapshot. Nested blocks, files, rich rendering and full
  database pagination are excluded. Source URLs are fixed Notion URLs.
- Teams: 20 root messages per selected channel; no replies, chats, attachment
  bytes or transcripts. Only fixed official Teams source-link hosts are allowed.
- Snapshots expire after 15 minutes without confirmed refresh. Drafts expire
  within 24 hours and disappear earlier when the originating source expires or
  is removed. Cleanup runs with the worker; API reads filter expiry immediately.
- Updates are limited to the paragraph recorded after create/append. External
  edits or moves observed before writing cause a conflict. Notion does not offer
  an atomic compare-and-swap here: a collaborator can still edit between the
  preflight read and patch. In-flight provider requests cannot be recalled after
  revocation. No broad page replacement or remote rollback is attempted.
- A create response whose block cannot be confirmed is still recorded as a
  successful creation, with update disabled, so creation is never resent merely
  to discover its block. Updates change the managed paragraph, not page titles.
- Optional Drive is not selected. LLM synthesis, embeddings, RAG, unified search
  and n8n orchestration remain future phases.
- No real provider grant, webhook delivery, Notion write, hosted sign-in or
  persistence acceptance has been performed. Existing Site credentials remain
  lost; no replacement identity or Site was created. Earlier phase gates remain.

## Verification

Fixture-backed API tests cover separate consent, encryption, ownership, unselected
source exclusion, current Notion data-source endpoints, Teams normalization,
source revalidation/deletion, approval revisions, create/append/update, edited
and moved block conflicts, uncertain outcomes, pause controls, signed webhook
deduplication, operator bootstrap, and disconnect during token exchange.

PostgreSQL CI applies real migrations in isolated schemas and checks concurrent
approval, overlapping worker claims and disconnect during an in-flight read.
Frontend tests cover API contracts and sample isolation; desktop/mobile browser
tests exercise read → template → edit → save → explicit approval → source removal.
Visual captures at 1440×900, 1280×720 and 390×844 inspect reading, note and source
permissions states with the unchanged cube. Reproduce against a local frontend:

`node scripts/capture-collaboration-review.mjs http://127.0.0.1:3102`

Final check counts and CI links belong to the phase PR. Local checks are not
substitutes for real provider/hosting acceptance.

### UI review

Captured states: empty reading pane with two selected references; populated
excerpt and draft; disconnected provider controls and selected permissions.
Screenshots are local artifacts under ignored `ui-review/collaboration/`.
Playwright separately checks the edited/approved state, source removal and
desktop/mobile navigation. One heading, no horizontal overflow and no page
errors were observed at all three visual widths, with reduced motion enabled.
The original cube is visibly retained; its three source-file hashes are locked
by the existing regression suite.

| Rubric | Score / evidence |
| --- | --- |
| Product clarity | 4 — reference, reading and approval stages are named |
| Focal hierarchy | 4 — reading pane first; one explicit approval action |
| Brand specificity | 4 — existing NEXUS typography, tokens and preserved cube |
| Composition | 4 — asymmetric reading layout with divided source rows |
| Typography | 4 — distinct title, section, reference and metadata levels |
| Material | 4 — consistent dark surfaces and readable disabled buttons |
| Depth | 4 — bounded editor foreground over the existing atmospheric cube |
| Motion | 4 — restrained shared button feedback; reduced-motion respected |
| Content | 4 — excerpt and destination precede the approved write |
| Interaction | 4 — save-before-approve, confirmations, visible local deletion |
| State coverage | 4 — sample, disconnected, paused, stale expiry and failure paths |
| Accessibility | 4 — named native controls, keyboard focus and semantic regions |
| Responsiveness | 4 — full-width mobile reading/editor with the existing More dock |
| Performance | Unrated — no new GPU work, but physical-device profiling remains open |

Corrections from the first capture: disabled-button opacity made connector labels
hard to read over the cube, so disabled states now use explicit contrasting text;
published drafts no longer become dirty merely by opening their update control.
Remaining compromise: the retained cube's physical-device frame-time budget has
not been measured here. Existing Focus mode removes it from rendering; profile
on target hardware before production acceptance rather than claiming a score.

## Official references

- [Notion authorization](https://developers.notion.com/guides/authorization/overview)
- [Notion webhook verification](https://developers.notion.com/reference/webhooks)
- [Notion data-source query](https://developers.notion.com/reference/query-a-data-source)
- [Teams joined teams](https://learn.microsoft.com/en-us/graph/api/user-list-joinedteams?view=graph-rest-1.0)
- [Teams channel metadata](https://learn.microsoft.com/en-us/graph/api/channel-list?view=graph-rest-1.0)
- [Teams channel messages](https://learn.microsoft.com/en-us/graph/api/channel-list-messages?view=graph-rest-1.0)

Next phase: **Phase 12 — n8n orchestration layer**, only after explicit progression;
not implemented on this branch.
