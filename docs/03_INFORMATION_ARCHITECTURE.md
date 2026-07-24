# NEXUS AI Information Architecture

## Platform roles

### Public website

Purpose:

- Explain the promise
- Demonstrate the intelligence metaphor
- Establish trust
- Move the visitor into onboarding or the product

The landing route may use a cinematic no-scroll presentation.

### Desktop product

Purpose:

- Plan and review
- Search knowledge
- Configure integrations and automations
- Inspect memory, permissions, and activity
- Perform focused work

Product routes may scroll. Forcing the entire application into a no-scroll
layout would damage usability.

### Android product

Purpose:

- Deliver timely help
- Capture location and device context with permission
- Support fast approvals
- Cache important files
- Provide the primary daily-use surface

## Website sitemap

### Public routes

| Route | Purpose |
| --- | --- |
| `/` | Cinematic NEXUS landing page |
| `/how-it-works` | Context, permissions, and action explanation |
| `/security` | Trust and data-control explanation |
| `/sign-in` | Authentication |
| `/onboarding` | Goals, connections, places, timetable, and preferences |

### Product routes

| Route | Primary purpose |
| --- | --- |
| `/app/today` | Immediate context and next best actions |
| `/app/timeline` | Calendar, tasks, travel, and preparation in time order |
| `/app/insights` | Ranked proactive recommendations |
| `/app/nexus` | Conversation, explanations, and prepared actions |
| `/app/knowledge` | Search and browse connected knowledge |
| `/app/notes` | NEXUS-created and connected notes |
| `/app/automations` | Recipes, authority, runs, and dry-runs |
| `/app/connections` | Accounts, permissions, health, and sync state |
| `/app/memory` | What NEXUS knows, inferred routines, and corrections |
| `/app/activity` | Reads, insights, actions, approvals, and failures |
| `/app/settings` | Profile, places, notification policy, privacy, and account |

## Desktop navigation

Primary navigation:

- Today
- Timeline
- Insights
- NEXUS
- Knowledge

Control navigation:

- Automations
- Connections
- Memory
- Activity
- Settings

Do not give all destinations equal visual weight. The first group supports daily
use; the second controls the system.

## Android navigation

Use five primary destinations:

- Today
- Timeline
- NEXUS
- Knowledge
- Settings

Insights appear within Today and through notifications. Automations,
Connections, Memory, and Activity live under Settings or secondary navigation.

## Screen requirements

### Today

Hierarchy:

1. Current NEXUS state
2. One highest-value insight
3. Next event and leave/preparation time
4. Today’s timeline
5. Deadline risks
6. Prepared files and notes
7. Lower-priority context

Avoid a grid of equally weighted statistic cards.

### Timeline

Combine:

- Calendar events
- Travel blocks
- Preparation blocks
- Focus blocks
- Deadlines
- Suggested changes

Differentiate confirmed, inferred, and suggested items.

### Insights

Every insight includes:

- Title
- Recommendation
- Evidence
- Source list
- Confidence
- Freshness
- Expiry
- Suggested action
- Permission required
- Feedback controls

### NEXUS

The assistant is context-aware but must not dominate the product.

Include:

- Conversation
- Suggested questions
- Tool-action preview
- Source panel
- “Why?” explanation
- Confirmation state
- Tool result
- Failure and recovery

Do not use an empty full-screen chat box as the default experience.

### Knowledge

Include:

- Unified search
- Source filters
- Recent material
- Related items
- Citation preview
- Sync state
- Permission boundaries
- Delete-from-index action

### Automations

Each automation displays:

- Human-readable trigger
- Conditions
- Proposed action
- Authority level
- Data used
- Last run
- Next possible run
- Dry-run
- Pause
- History

### Connections

Each connection displays:

- Provider
- Account
- Capabilities granted
- Last successful sync
- Current health
- Reconnect
- Change permissions
- Disconnect

### Memory

Separate:

- User-stated facts
- Inferred routines
- Preferences
- Important places
- People and relationships
- Expiring working memory

Every inferred memory needs confidence, evidence, correction, and deletion.

### Activity

Filter by:

- Source reads
- Insights
- Notifications
- Prepared actions
- Approved actions
- Automatic actions
- Failures

The log should be understandable to a normal user, with technical details
available only through expansion.

## Canonical UI objects

All mock and live adapters should return common domain types:

- `ContextSignal`
- `CalendarEvent`
- `Task`
- `DeadlineRisk`
- `TravelEstimate`
- `Insight`
- `Evidence`
- `KnowledgeSource`
- `Automation`
- `PermissionGrant`
- `MemoryItem`
- `ActionProposal`
- `ActionRun`
- `ConnectionHealth`
- `NotificationPreference`

Provider-specific payloads must not leak into page components.

## Onboarding flow

1. Explain value before requesting data.
2. Ask the user’s initial goals.
3. Set timezone and notification style.
4. Add home, campus/work, and travel mode.
5. Import or enter timetable.
6. Connect Calendar.
7. Optionally connect email and Notion.
8. Review exactly what NEXUS may read.
9. Choose default action level.
10. Generate the first useful Today screen.

Do not request every permission on the first screen.

## Essential state matrix

Each screen must be testable in:

- First-use empty state
- Loading state
- Populated state
- Partial-data state
- Stale-data state
- Error state
- Permission-denied state
- Disconnected state
- Offline state
- Reduced-motion state

## Content language

- Lead with the decision, not the data dump.
- Use exact times and sources.
- Distinguish “will,” “likely,” and “might.”
- Never claim NEXUS observed something it only inferred.
- Avoid robotic filler such as “Based on my analysis.”
- Prefer: “Leave by 9:12. Traffic adds 18 minutes to your usual route.”
