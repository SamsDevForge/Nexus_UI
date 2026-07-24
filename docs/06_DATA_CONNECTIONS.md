# NEXUS AI Data and Connections

## Data acquisition methods

NEXUS requires more than APIs.

| Method | Use |
| --- | --- |
| OAuth API | User-authorized Calendar, Gmail, Outlook, Notion, and Drive data |
| Webhook/change notification | Near-real-time source changes |
| Incremental polling | Recovery and providers without suitable webhooks |
| Scheduled public API call | Weather, routes, public holidays |
| Mobile SDK | Location, network, battery, Health Connect |
| Desktop companion | Laptop battery, selected local files, connectivity |
| Manual entry/import | Timetable, places, preferences, ICS, fallback tasks |
| User feedback | Relevance, timing, corrections, and memory confidence |

n8n can coordinate several of these methods, but it cannot access information
that a provider or operating system does not expose.

## Connection order

### Group 1 — No user OAuth

- Weather
- Geocoding
- Routes and traffic
- Timezone
- Public holidays

### Group 2 — Core student context

- Google Calendar
- Manual or ICS timetable
- Gmail
- Notion
- Google Drive

### Group 3 — Provider alternatives

- Outlook Calendar
- Outlook mail
- OneDrive
- Other note systems
- Learning-management systems with supported APIs

### Group 4 — Device context

- Android location
- Network state
- Battery state
- Offline storage
- Push-token registration

### Group 5 — Sensitive and advanced context

- Health Connect
- Wearables
- Finance providers
- Family/shared data
- Organization systems

## Feature-to-source map

| Feature | Required sources | Notes |
| --- | --- | --- |
| Morning brief | Calendar, tasks, weather, preferences | Useful before email is connected |
| Leave-time advice | Event location, origin, travel mode, Routes API | Refresh near departure |
| Umbrella reminder | Rain forecast during travel window | Do not use daily rain alone |
| Deadline radar | Tasks plus progress signals | Due date without progress is weak evidence |
| Class preparation | Calendar plus Notion/Drive/email files | Link evidence |
| Offline lecture pack | File source plus mobile cache | Website alone cannot guarantee offline phone access |
| Charger reminder | Laptop companion or explicit heuristic | Do not pretend phone data reveals laptop battery |
| Poor-sleep adjustment | Health Connect/wearable | Separate sensitive consent |
| Campus Wi-Fi warning | Device/companion connection history | Requires on-device observation |
| Important email | Email connection and correction feedback | Preserve source link |
| Notion note creation | Source material plus Notion write permission | Prepare or ask by default |

## OAuth and permissions

For every provider:

1. Explain the user value before showing consent.
2. Request the minimum scopes needed for the selected capability.
3. Store refresh credentials encrypted.
4. Track granted scopes separately from intended product authority.
5. Display account, permissions, last sync, and revoke controls.
6. Stop jobs and delete or isolate derived data when the connection is revoked.

Provider permission and NEXUS authority are different:

- Provider permission may technically allow writing.
- NEXUS still must not write unless the user granted that action authority.

## Webhook and sync pattern

Use both event notifications and reconciliation:

1. Perform initial full or bounded sync.
2. Store the provider cursor or sync token.
3. Register a webhook/change subscription.
4. Verify incoming requests.
5. Queue processing and acknowledge quickly.
6. Fetch the actual change.
7. Normalize and deduplicate.
8. Advance the cursor transactionally.
9. Periodically reconcile missed changes.
10. Renew expiring subscriptions.

Never assume webhook delivery alone is complete or ordered.

## Canonical normalization examples

Provider events become:

- `calendar.event.created`
- `calendar.event.updated`
- `calendar.event.deleted`
- `mail.message.received`
- `mail.attachment.discovered`
- `task.deadline.changed`
- `knowledge.page.updated`
- `connection.permission.revoked`
- `device.location.entered`
- `health.sleep.completed`

Pages and agents consume canonical events, not provider payloads.

## n8n responsibilities

Good uses:

- Prototype a Calendar-to-brief workflow
- Receive Notion webhooks
- Run test schedules
- Fetch weather
- Call backend endpoints
- Create a draft Notion page after backend authorization
- Expose observable workflow steps during development

Do not delegate:

- Canonical user state
- Token ownership
- Final permission decisions
- Notification ranking
- Permanent personal memory
- Automatic-action authority
- The only copy of an audit trail

## Notion design

Initial supported structures:

- Selected Notes database
- Selected Tasks/Assignments database
- Selected pages

Suggested Notes properties:

- Title
- Course/project
- Date
- Calendar event
- Source links
- Status
- NEXUS confidence
- User reviewed

Workflow:

1. A lecture or meeting finishes.
2. NEXUS discovers permitted source material.
3. It retrieves relevant context.
4. It drafts structured notes and action items.
5. It shows sources and uncertainty.
6. The user approves or corrects.
7. NEXUS creates or updates the selected Notion destination.
8. The action is logged.

## Data freshness

Every context item needs a freshness state:

- Live
- Recent
- Stale
- Unknown
- Disconnected

The UI must not show a stale traffic estimate as current or an old email-derived
deadline as confirmed.

## Fallbacks

- No Calendar: manual timetable
- No location: selected origin
- No traffic provider: static travel time plus warning
- No email: manual task capture
- No Notion: internal notes
- No health permission: omit health reasoning entirely
- Offline: last-known data with clear timestamp

## Source links

Whenever possible, preserve a deep link back to the source event, email, page,
or document. NEXUS should reduce navigation effort without hiding provenance.
