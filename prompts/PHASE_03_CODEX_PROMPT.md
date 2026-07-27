# Codex Prompt — Phase 3 Control and Configuration

Use this prompt in a **new Codex chat** opened at the root of the existing
NEXUS AI repository.

---

Implement **NEXUS AI Phase 3: Control and Configuration Screens**.

This is an implementation task. Inspect the current repository, implement the
complete Phase 3 website UI using typed deterministic mocks, validate the
rendered product, update project documentation, commit the completed phase, and
deploy a new private Sites version. Do not stop after returning a plan.

If `$build-nexus-ai` or `$polish-nexus-ui` is available, use it. If either skill
is unavailable, do not search for it, install it, or treat its absence as a
blocker. Follow the repository documents and this prompt as the authoritative
fallback.

## Current verified handoff

Phase 2 is complete:

- Commit: `61225a2`
- Private Sites deployment: version 11
- Today, Timeline, Insights, NEXUS, Knowledge, Notes, and Search are complete
  mocked experiences.
- Global Ctrl/Cmd+K search, keyboard navigation, and focus restoration work.
- Typed domain contracts and provider-neutral service interfaces exist.
- Cross-screen deterministic scenarios cover success and degraded states.
- Mock approval, rejection, rescheduling, feedback, note-review, and assistant
  interactions work.
- Desktop and 390 px layouts have no horizontal overflow.
- Typecheck, lint, 14 tests, production build, visual checks, console checks,
  and `git diff --check` passed.
- All product data, assistant responses, search results, integrations,
  approvals, and action outcomes are still deterministic mocks.
- No authentication, backend, database, live APIs, RAG, n8n, or OpenAI
  integration exists.
- The existing JavaScript chunk warning above 500 KB is non-blocking.
- `exfonts/` is user-owned, untracked, and contains 22 files.
- The Phase 2 prompt may still be an untracked user file.

Before editing, confirm the current branch and working tree. Preserve
intentional user changes and do not automatically add unrelated untracked
files.

## Locked product-owner decision

The existing large cross-screen cube is a deliberate, dominant NEXUS product
identity element.

- Keep its implementation byte-for-byte unchanged.
- Do not shrink, move, mask, fade, simplify, contain, or replace it.
- Do not reduce its overlap or visual dominance.
- Do not modify its material, lighting, camera, animation, scale, position, or
  responsive behaviour.
- Build Phase 3 foreground content and contrast around the cube.

Later generic design guidance about reducing the cube or decorative atmosphere
does not override this explicit decision.

Identify the tracked cube implementation files before editing and verify at
completion that none changed.

## Bounded discovery rules

Complete repository discovery within ten minutes.

Read completely:

- `AGENTS.md`
- `docs/00_START_HERE.md`
- `docs/02_FULL_PHASE_ROADMAP.md`
- `docs/03_INFORMATION_ARCHITECTURE.md`
- `docs/04_DESIGN_SYSTEM.md`
- `docs/05_TECHNICAL_ARCHITECTURE.md`
- `docs/08_SECURITY_PRIVACY.md`
- `docs/11_COMPLETE_FEATURE_MATRIX.md`
- `docs/12_ACCEPTANCE_GATES.md`
- `docs/15_DECISIONS.md`
- `docs/PROGRESS.md`
- `prompts/PHASE_03_CODEX_PROMPT.md` when present

Then inspect only the relevant tracked source files inside:

- `app/`
- `components/nexus/`
- `lib/domain/`
- `lib/services/`
- `lib/mocks/`
- `tests/`
- the package scripts and existing Sites configuration

Do not recursively inspect:

- `node_modules/`
- `.next/`
- `dist/`
- `coverage/`
- `.git/`
- `exfonts/`
- generated assets
- bundled font directories
- OneDrive metadata

Use targeted file searches. If a discovery command runs for more than three
minutes, interrupt it and replace it with a narrower command. Never leave the
development server as a blocking foreground command.

Project files and explicit product-owner decisions override older generic
guidance.

## Phase objective

Replace the remaining control-navigation placeholders with complete,
interactive mocked experiences:

1. Automations
2. Connections
3. Permission Centre
4. Memory
5. Activity
6. Settings

At the end of the phase, a user must be able to understand:

- What NEXUS can read
- Why it may use that data
- What NEXUS remembers
- What it may suggest, prepare, or act on
- Which automations depend on each permission or connection
- What NEXUS previously read, proposed, approved, rejected, or failed to do
- How to pause, revoke, correct, export, or delete mocked data

Everything remains behind provider-neutral service interfaces and
deterministic mock adapters.

## Explicitly out of scope

Do not add:

- Authentication or real accounts
- Backend services
- Database or real persistence
- OAuth or provider SDKs
- Live Google, Microsoft, Notion, Drive, email, calendar, maps, health, or
  device connections
- OpenAI API calls
- Real assistant inference or tool execution
- RAG, embeddings, vector storage, or document ingestion
- n8n workflows
- Push notifications
- Android code
- Real export archives
- Real account or provider deletion
- Phase 4 cross-product state completion
- Phase 5 global accessibility/performance rewrite
- Phase 6 identity/backend work
- Unrelated landing-page or Phase 0–2 redesigns

Do not pretend any mock provider is genuinely connected. Technical surfaces
must identify demo/mock boundaries without placing distracting development
labels throughout the polished product UI.

## Architecture requirements

Extend the existing canonical domain contracts and provider-neutral service
pattern. Do not import fixture objects directly into route components.

Create or extend canonical contracts for:

- Automation definition, trigger, condition, proposed action, authority,
  dependency, status, run, and dry-run result
- Connection identity, capability, granted scope, purpose, health, freshness,
  sync result, and dependent feature
- Permission grant, data class, purpose, retention choice, model-use choice,
  action authority, and revocation impact
- Memory item, memory category, origin, evidence, confidence, sensitivity,
  verification time, and expiry
- Inferred routine, correction, confirmation, and deletion result
- Activity event, actor, evidence, authority, outcome, failure, and reversible
  action state
- User preferences, places, quiet hours, notification policy, privacy controls,
  accessibility preferences, and global pause controls
- Mock export and deletion requests

Create or extend service boundaries following the established conventions:

- `AutomationService`
- `ConnectionService`
- `PermissionService`
- `MemoryService`
- `ActivityService`
- `SettingsService`

For every service:

- Provide a deterministic mock adapter.
- Keep fixtures separate from components.
- Return canonical types rather than provider payloads.
- Support relevant loading, empty, stale, denied, offline, failure, and success
  results.
- Never use randomness.
- Make interactions stateful for the active demo session where useful.
- Reset predictably when the selected scenario changes or the page reloads.
- Keep a future live adapter possible without rewriting route components.

Extend `/app/technicals` with Phase 3 contracts, mock/live boundaries,
scenario coverage, permission states, and action-safety states.

Update global Ctrl/Cmd+K search so it can navigate to the new control
destinations and relevant settings without weakening existing search
behaviour.

## Permission and authority model

The UI must visibly distinguish:

1. Provider capability or OAuth scope
2. NEXUS read purpose
3. Permission to retain normalized data
4. Permission to expose data to future model processing
5. Permission to notify
6. Authority to suggest, prepare, ask, or act

A provider theoretically allowing write access must not imply NEXUS may perform
an action automatically.

Use the product’s established authority language. Default side-effecting
behaviour to **Suggest** or **Ask/Prepare**, not automatic execution.

Every mocked destructive or high-impact action must show:

- What will change
- Which dependent features or automations will be affected
- Whether the action is reversible
- A clear confirmation step
- A recorded mock activity result

## Shared Phase 3 scenarios

Reuse the existing global scenario system and keep stories coherent across
routes. Add only scenarios that do not already exist.

Support at least:

- Normal student configuration
- First use with no connections or memories
- Partial connections
- Stale or reconnect-required connection
- Permission denied or revoked
- Offline
- Recoverable action failure
- Privacy paused
- Reduced motion

Examples of cross-screen consistency:

- Revoking Calendar permission marks Calendar disconnected, pauses dependent
  automations, explains missing memories, and creates an activity event.
- Pausing all automations updates Automations, Settings, Today indicators, and
  Activity consistently.
- Correcting a commute routine changes its Memory state and records the
  correction in Activity.

Do not attempt the exhaustive all-route state matrix reserved for Phase 4.
Implement the states directly relevant to these control screens.

## 1. Automations

Route: `/app/automations`

Purpose:

> Let users understand, test, and control proactive behaviour without hiding
> it behind opaque AI.

Build:

- One dominant automation-control summary
- Global mocked pause/kill-switch state
- Active, paused, draft, needs-attention, and blocked automations
- Human-readable trigger
- Conditions
- Proposed action
- Authority level
- Data and connections used
- Last run
- Next eligible run
- Failure or skipped reason
- Dependent permissions

Provide representative deterministic recipes such as:

- Morning brief
- Rain-aware commute
- Deadline-risk focus block
- Class preparation pack
- Evening preparation

Interactions:

- Create from a template
- Create a simple custom automation through a structured editor
- Edit
- Duplicate
- Pause and resume
- Run a dry-run
- Review the dry-run trace and proposed outcome
- Change authority within safe mocked limits
- Open run history
- Delete with confirmation
- Recover a blocked or failed automation

Do not build a free-form node graph or drag-and-drop workflow engine.

## 2. Connections

Route: `/app/connections`

Purpose:

> Show what sources may contribute context, what capabilities were granted,
> and whether each source is healthy.

Build:

- Connection overview and health summary
- Connected, disconnected, syncing, stale, denied, reconnect-required, and
  offline states
- Provider/account identity using safe fictional demo data
- Capabilities granted
- Purpose for access
- Last successful sync
- Freshness
- Dependent NEXUS features
- Permission summary
- Data-retention summary

Use plausible future connection families such as:

- Calendar and timetable
- Email
- Notion and Drive
- Maps, location, and weather
- Device or smartwatch context

Interactions:

- Open a provider detail
- Run a mock connection setup
- Review requested capabilities before mock approval
- Change a mocked permission
- Trigger a deterministic resync
- Reconnect a stale provider
- Disconnect with dependency-impact preview and confirmation
- Navigate to the Permission Centre

Do not implement OAuth, request real credentials, or call provider APIs.

## 3. Permission Centre

Use a nested control route such as `/app/settings/permissions`, following the
repository’s existing route conventions. Do not give it equal visual weight in
the main daily-use navigation. Link to it from Connections, Automations,
Memory, and Settings.

Purpose:

> Make NEXUS data use and action authority understandable before users trust it
> with real accounts.

Build:

- Permission overview by data source and capability
- Read-purpose controls
- Retention controls
- Future model-use controls
- Notification permission
- Per-action authority
- Sensitive-data labels
- Dependent features and automations
- Revocation impact
- Permission history
- Global observation pause
- Global automation kill switch

Interactions:

- Inspect details
- Grant or reduce a mocked permission
- Change authority
- Pause observation
- Pause all automations
- Preview revocation impact
- Confirm revocation
- Restore a safe mocked permission

Do not collapse all of these concerns into a single “Allow everything” toggle.

## 4. Memory

Route: `/app/memory`

Purpose:

> Let users see, verify, correct, and remove what NEXUS believes about them.

Separate:

- User-stated facts
- Inferred routines
- Preferences
- Important places
- People and relationships
- Expiring working memory

Every inferred item must show:

- What NEXUS inferred
- Evidence or source
- Confidence
- Last verified time
- Expiry where applicable
- Sensitivity
- Which feature uses it

Interactions:

- Confirm
- Correct
- Edit user-stated information
- Mark temporary or persistent
- Lock against future inference where appropriate
- Delete/forget with dependency preview
- Review conflicting evidence
- Restore a reversible mocked deletion where supported

Avoid presenting memory as a mysterious list of surveillance facts. Explain
utility, origin, expiry, and user control.

## 5. Activity

Route: `/app/activity`

Purpose:

> Provide a human-readable audit trail of what NEXUS observed, proposed, asked,
> approved, rejected, attempted, or failed to do.

Include:

- Source reads
- Connection syncs
- Insights
- Notifications
- Prepared actions
- Approved or rejected actions
- Automatic actions represented only as future/mock states
- Permission changes
- Memory corrections
- Automation dry-runs and failures

Build:

- Chronological activity composition
- Search
- Filters by event type, source, authority, and outcome
- Date grouping
- Clear success, pending, denied, failed, and reversed states
- Detail drawer/panel
- Evidence and source
- Actor
- Required and granted authority
- Mock action result
- Reversal state when appropriate
- Expandable technical details that are not dominant

Interactions:

- Filter and search
- Open details
- Follow links to the relevant automation, connection, memory, or permission
- Retry a recoverable mocked failure
- Reverse a reversible mocked action
- Export a mock filtered activity summary

## 6. Settings

Route: `/app/settings`

Purpose:

> Configure NEXUS behaviour, privacy, notifications, accessibility, and
> account-level controls without becoming a generic settings dump.

Organize clearly:

- Profile and timezone
- Important places and travel preference
- Notification style and channels
- Quiet hours and briefing schedule
- Personalization preferences
- Observation and automation pause controls
- Privacy and retention
- Permission Centre entry
- Data export
- Source-derived data deletion
- Account deletion surface
- Appearance and accessibility
- Reduced motion
- Demo/development scenario controls only where the existing product already
  exposes them

Interactions:

- Edit and save
- Validate changes
- Reset a section
- Preview notification behaviour
- Request a deterministic mock export
- Review and confirm mocked deletion
- Navigate to related Connections, Permissions, Memory, and Activity records

High-risk controls must be separated from ordinary preferences and require
clear confirmation.

## Visual requirements

Continue the established premium dark glass, liquid-glass, and restrained
neumorphic design language.

- Preserve the dominant cube exactly.
- Give each screen one clear focal point.
- Use grouped rows, structured flows, and deliberate hierarchy rather than an
  equal-weight card grid.
- Keep connection health, permission, memory provenance, authority, and action
  status readable without overwhelming the screen.
- Avoid generic SaaS settings layouts.
- Use accent colour sparingly.
- Use the project’s icon system.
- Do not use emoji, emoji-like Unicode symbols, or text glyphs as interface
  icons.
- Do not introduce a new visual library without a demonstrated need.
- Maintain 44 px minimum touch targets at narrow widths.
- Preserve semantic headings, labelled controls, visible focus, dialog focus
  trapping, focus restoration, and reduced-motion behaviour.
- No horizontal overflow at desktop or 390 px.

The cube’s cross-screen overlap is intentional. Fix foreground contrast and
composition around it rather than modifying the cube.

## Required behavioural tests

Add tests following existing conventions for at least:

- Automation creation or template flow
- Automation pause/resume and deterministic dry-run
- Blocked automation after permission revocation
- Mock connection setup, resync, reconnect, and disconnect impact
- Permission reduction and authority change
- Global automation pause/kill switch
- Memory confirmation, correction, and deletion
- Activity filtering and recoverable retry/reversal
- Settings save/reset
- Keyboard and focus behaviour for major dialogs or drawers
- Scenario consistency across at least two Phase 3 services

Tests must assert domain behaviour, not fragile decorative implementation
details.

## Verification order

Do not deploy or begin broad browser inspection until implementation and static
validation are complete.

1. Run targeted tests while implementing.
2. Run typecheck.
3. Run lint.
4. Run the complete test suite.
5. Run the production build.
6. Run `git diff --check`.
7. Run the application without leaving a blocking foreground command.
8. Inspect rendered populated states for all Phase 3 routes at approximately
   1440 × 900 and 390 px width.
9. Inspect representative empty, denied/revoked, stale, offline, failure, and
   reduced-motion states.
10. Verify keyboard navigation, visible focus, dialog focus trapping and
    restoration, and global search navigation.
11. Verify there are no unexplained browser console warnings or errors.
12. Verify tracked cube files are unchanged.
13. Confirm `exfonts/` still has the original 22 untouched files.

The known non-blocking JavaScript chunk-size warning does not need to be fixed
unless Phase 3 causes a material regression. Record any change in the warning.

## Sites deployment

After all validation passes:

- Follow the repository’s existing Sites workflow.
- Read and reuse the existing `.openai/hosting.json` project identifier.
- Do not create a second site.
- Push the exact validated source state.
- Save a new Sites version from that state.
- Deploy it privately with the existing owner-only access model.
- Inspect deployment health.

Do not deploy partial work.

## Documentation and git

Update `docs/PROGRESS.md` with:

- Phase 3 completion
- Implemented routes and interactions
- Validation results
- What remains mocked
- Known limitations
- Exact next phase: Phase 4 — Complete UI State Coverage

Update `docs/15_DECISIONS.md` only for durable product or architecture choices.
Do not add routine implementation notes.

Preserve unrelated and user-owned files. Do not use `git add .`. Stage Phase 3
files intentionally.

If `prompts/PHASE_03_CODEX_PROMPT.md` exists in the repository, preserve and
include it in the Phase 3 documentation commit. Do not add the untracked Phase
2 prompt or `exfonts/` unless the product owner explicitly requests it.

Commit the validated Phase 3 work with a clear commit message.

## Acceptance criteria

Phase 3 is complete only when:

- Automations, Connections, Permission Centre, Memory, Activity, and Settings
  are complete product experiences rather than placeholders.
- Every future data read and action represented in the UI has an understandable
  control surface.
- A normal user can understand what NEXUS knows and what it may do.
- Provider capability, NEXUS purpose, retention, model use, notification
  permission, and action authority are visibly distinct.
- Revocation and destructive actions show dependency impact and confirmation.
- Phase 3 pages consume provider-neutral services rather than fixture imports.
- Mock scenarios are deterministic and coherent across screens.
- Existing Phase 0–2 behaviour remains healthy.
- The dominant cross-screen cube is unchanged.
- Desktop and narrow layouts pass visual and interaction verification.
- Typecheck, lint, tests, production build, and `git diff --check` pass.
- No secrets, real credentials, or live integrations are added.
- Documentation, commit, and private deployment are complete.

## Completion report

Stop after Phase 3. Do not begin Phase 4.

Report:

1. Outcome
2. Commit hash
3. Private Sites version and deployment health
4. Visible routes and interactions implemented
5. Important contracts and service boundaries
6. Files changed
7. Tests and validation results
8. Mock/live boundaries
9. Confirmation that cube files and `exfonts/` were unchanged
10. Known limitations
11. Exact recommended next phase
