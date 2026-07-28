# Codex Prompt — Phase 4 Complete UI State Coverage + Quick Capture

Use this prompt in a **new Codex chat** opened at the root of the existing
NEXUS AI repository.

---

Implement **NEXUS AI Phase 4: Complete UI State Coverage**, including the
product-owner-approved **Quick Capture notepad** addition.

This is an implementation task. Inspect the current repository, complete the
cross-product state system, implement Quick Capture with deterministic mocks,
validate the rendered product, update documentation, commit the completed
phase, and deploy a new private Sites version. Do not stop after returning a
plan.

If `$build-nexus-ai` is available, use it. If it is unavailable, do not search
for it, install it, or treat its absence as a blocker. The repository documents
and this prompt are the authoritative fallback.

Do not invoke a broad UI-redesign or polishing workflow. The product owner is
happy with the current interface after manually reviewing it and requesting
changes. Preserve the approved visual composition and limit visual changes to
the new Quick Capture surface and corrections required for state usability.

## Current verified handoff

Phase 3 is complete:

- Commit: `288ceca63d44e02315cfacf942be6f68446e0e96`
- Private Sites deployment: version 12 with owner-only access
- Automations, Connections, Permissions, Memory, Activity, Settings, and
  permission-settings routes are complete.
- Create, pause/resume, dry-run, reconnect, revoke, kill-switch, correct,
  restore, retry, reverse, export, reset, and delete interactions work through
  deterministic mocks.
- Provider-neutral TypeScript contracts and six Phase 3 service interfaces
  exist.
- Scenario-aware mock services produce coherent cross-control effects.
- Responsive layouts, keyboard/focus behaviour, reduced motion, and existing
  loading/error/offline/permission states work.
- TypeScript, ESLint, 27/27 tests, Next.js production build, Sites build,
  repository integrity, and diff checks passed.
- All providers, account operations, action execution, and persistence remain
  typed deterministic mocks.
- The locked cube remains unchanged with its original SHA-256.
- All Phase 0–2 behaviour is preserved.
- `exfonts/` remains user-owned, untracked, untouched, and contains 22 files.
- Screenshot artifacts are intentionally omitted.

Before editing, inspect the current branch and working tree. Preserve
intentional user changes and unrelated untracked files.

## Locked product-owner decisions

### Approved interface

The current UI has been manually reviewed and approved by the product owner.

- Do not redesign existing screens.
- Do not reorganize navigation.
- Do not replace the design system.
- Do not perform generic “make it cleaner/premium” changes.
- Do not rewrite working Phase 0–3 components merely for consistency.
- Make only state-coverage fixes, accessibility fixes directly required by new
  states, and the new Quick Capture interface.

### Dominant cube

The existing cross-screen cube remains an intentional dominant product
identity element.

- Keep its tracked implementation byte-for-byte unchanged.
- Do not shrink, move, mask, fade, simplify, contain, or replace it.
- Do not modify its material, lighting, camera, animation, scale, position, or
  responsive behaviour.
- Build foreground state messages and Quick Capture around it.

Identify the tracked cube source files before editing and verify their hashes
or tracked diffs again at completion.

## Required icon asset

The product owner will provide the final Quick Capture launcher SVG.

Expected project path:

`public/icons/nexus-notepad.svg`

Requirements:

- Use the supplied SVG as the bottom-right launcher icon.
- Preserve the supplied SVG artwork.
- Do not replace it with an emoji, emoji SVG, Unicode glyph, AI-generated icon,
  or unrelated icon.
- Do not redesign the SVG.
- Size and position it through the surrounding component rather than editing
  its paths unnecessarily.
- Give the rendered icon an accessible text label through the button.

If the file is missing, continue implementing and validating the feature using
an existing neutral icon from the project’s approved icon system as a temporary
development fallback. Report the missing final asset clearly. Do not invent a
new permanent icon. Phase 4 should use the provided SVG before final
product-owner acceptance.

## Bounded discovery

Finish discovery within ten minutes.

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
- `prompts/PHASE_04_CODEX_PROMPT.md` when present

Then inspect only relevant tracked files inside:

- `app/`
- `components/nexus/`
- `lib/domain/`
- `lib/services/`
- `lib/mocks/`
- `tests/`
- package scripts
- existing Sites configuration

Do not recursively inspect:

- `node_modules/`
- `.next/`
- `dist/`
- `coverage/`
- `.git/`
- `exfonts/`
- generated screenshot/output directories
- bundled font directories
- OneDrive metadata

Use targeted searches. If a discovery command runs longer than three minutes,
interrupt it and use a narrower command. Never leave a development server as a
blocking foreground command.

## Phase objective

Phase 4 has two bounded deliverables:

1. Complete the applicable state coverage of every existing product route.
2. Add Quick Capture as a globally accessible manual-input bridge for content
   from apps that are not connected to NEXUS.

Do not add other feature families.

## Deliverable A — Canonical cross-product state system

Audit these existing product experiences:

- Today
- Timeline
- Insights
- NEXUS
- Knowledge
- Notes
- Search / command palette
- Automations
- Connections
- Permission Centre
- Memory
- Activity
- Settings
- `/app/technicals`

Support all applicable states from the Phase 4 roadmap:

- First use
- No connections
- Partial connections
- Loading
- Empty
- Error
- Rate limited
- Stale source
- Revoked permission
- Offline
- Degraded AI
- Action pending approval
- Action running
- Action succeeded
- Action failed and recoverable

Not every state belongs on every screen. Create a route-to-state applicability
matrix, then implement every applicable cell. Do not create nonsensical states
only to increase a count.

### Separate state dimensions

Do not encode the entire product condition in one giant string union.
Represent separate concerns where compatible with the existing architecture:

- Data availability: loading, populated, empty, partial
- Source health: fresh, stale, disconnected, revoked, rate-limited, offline,
  error
- Intelligence availability: ready, degraded, unavailable
- Action lifecycle: idle, proposed, pending approval, running, succeeded,
  failed recoverably, failed finally, reversed
- Onboarding/configuration: first use, no connections, configured

Extend existing contracts rather than duplicating them. Keep service responses
provider-neutral and fixtures outside route components.

### State behaviour principles

For every applicable degraded state:

- Lead with what the user can still do.
- Explain the effect in plain language.
- Show source and last-updated time when relevant.
- Preserve safe last-known data when appropriate.
- Distinguish stale information from current information.
- Do not expose stack traces, provider payloads, raw HTTP codes, or internal
  exception text in product UI.
- Offer one useful recovery action where recovery exists.
- Disable or guard unsafe actions while allowing harmless inspection.
- Do not claim an action succeeded until a recorded result exists.
- Do not claim fresh data when the source is stale or unavailable.
- Restore keyboard focus after recovery dialogs or drawers close.
- Respect existing reduced-motion behaviour.

Partial failures should degrade only the affected region or capability rather
than replacing the whole page with a generic error.

### Scenario coherence

Reuse the established deterministic scenario system. Avoid creating multiple
competing scenario selectors.

Ensure a selected scenario remains coherent across routes. Examples:

- `no-connections` removes provider-derived content while retaining manual
  notes and Quick Capture.
- `partial-connections` keeps permitted sources useful and identifies missing
  context.
- `stale-source` shows last-known data with freshness warnings.
- `permission-revoked` blocks dependent actions and links to Permissions.
- `offline` preserves inspectable cached/demo content but never claims a live
  sync or action.
- `degraded-ai` keeps deterministic and manual functionality available while
  explaining that generated assistance is unavailable.
- action lifecycle scenarios appear consistently in Today, Timeline, NEXUS,
  Automations, Activity, and Quick Capture where applicable.

Add a development-only state coverage matrix to `/app/technicals` showing:

- Route
- Applicable states
- Implemented states
- Mock service responsible
- Recovery interaction
- Any intentionally non-applicable state with a short reason

## Deliverable B — Quick Capture notepad

Add a persistent floating launcher at the **bottom right of the authenticated
product shell**, visually similar in placement and compactness to a framework
development launcher but fully styled as NEXUS product UI.

Do not show it on:

- The public landing page
- Authentication/onboarding routes not using the product shell
- Full-screen critical confirmation surfaces where it would obstruct action

At narrow widths, position it above compact/bottom navigation and safe-area
insets. It must not cover toasts, primary actions, scrollbars, dialogs, or
important content.

Use a product-facing name such as **Quick Capture**. It is a manual-input
bridge, not a provider connection and not an AI chatbot.

### Core purpose

Allow a user to copy text from an unconnected app and paste it into NEXUS, then
choose:

1. **Save as note**
2. **Schedule event**

The user must always paste manually. Do not read the clipboard automatically,
monitor other apps, request background clipboard access, or imply that NEXUS
is connected to the source app.

### Launcher and panel

Build:

- Bottom-right floating icon button using `nexus-notepad.svg`
- Accessible label: “Open Quick Capture”
- Tooltip on pointer devices
- Clear active/open state
- Compact popover/panel on desktop
- Bottom sheet or appropriately sized panel on narrow screens
- Paste area accepting plain text
- Optional manual source label, such as “College portal” or “WhatsApp”
- Choice between note and event
- Close, reset, and discard-draft controls
- Unsaved-draft confirmation where required
- Success confirmation with links to the created mock Note or Timeline item

Do not use emoji or text glyphs for controls.

### Save as note

Support:

- Raw pasted text
- Editable note title
- Optional tags
- Optional source label
- Manual-paste provenance
- Preview before saving
- Deterministic session save through the existing Notes boundary
- New note visible in Notes immediately during the active demo session
- Activity entry recording a manual note capture
- Link to open the created note

Render pasted content strictly as text. Do not inject or render pasted HTML.

### Schedule event

Support:

- Raw pasted text retained as source evidence
- Editable title
- Date
- Start time
- Optional end time or duration
- Optional location
- Optional description
- Timezone from existing Settings
- Manual-paste provenance
- Preview and explicit confirmation before scheduling
- New event visible in Timeline during the active demo session
- Activity entry recording the prepared and confirmed mock event
- Link to open the created Timeline item

Use deterministic local extraction only when text is unambiguous. Examples
include clearly formatted dates, times, and labelled locations.

If information is missing or ambiguous:

- Do not guess.
- Mark the field as needing review.
- Let the user edit it.
- Require confirmation.
- Explain ambiguous numeric dates rather than silently choosing a format.

Do not call an LLM, external parser, calendar API, or provider.

### Architecture

Create or extend canonical contracts for concepts such as:

- `QuickCaptureDraft`
- `QuickCaptureMode`
- `ManualPasteSource`
- `NoteCapturePreview`
- `EventCapturePreview`
- `CaptureValidationIssue`
- `QuickCaptureResult`

Use the project’s naming conventions rather than duplicating equivalent types.

Add a provider-neutral `QuickCaptureService` only if orchestration cannot be
cleanly expressed through the existing Notes, Timeline, Activity, and Settings
service boundaries. Prefer composition over bypassing existing services.

Quick Capture must:

- Use the existing shared deterministic mock-session state.
- Create notes through the Notes service boundary.
- Create events through the Timeline service boundary.
- Read timezone through the Settings service boundary.
- Record results through the Activity service boundary.
- Reset predictably when the selected global scenario changes.
- Avoid direct fixture imports inside the component.

No durable backend persistence is expected in Phase 4. Do not add localStorage,
IndexedDB, a database, authentication, or fake provider writes merely to make
the mock survive a refresh. Clearly document that captured items persist only
for the active deterministic demo session until the later backend phase.

### Quick Capture states

Implement and test:

- Closed
- Open and empty
- Draft entered
- Note preview
- Event extraction/preview
- Ambiguous or incomplete event
- Validation failure
- Saving/preparing
- Awaiting event confirmation
- Success
- Recoverable failure
- Offline
- Permission/authority blocked where applicable
- Unsaved draft on close
- Reduced motion

Quick Capture should remain useful in `no-connections` and `degraded-ai`
scenarios because it is manual. Offline behaviour must be honest: allow draft
editing and preview where safe, but do not claim a durable save or scheduled
result without an available mock result.

## Explicitly out of scope

Do not add:

- Authentication or real accounts
- Backend, database, or durable persistence
- OAuth or provider SDKs
- Live calendar, email, Notion, Drive, maps, health, device, or clipboard
  connections
- OpenAI API calls
- LLM extraction
- RAG, embeddings, or vector storage
- n8n workflows
- Push notifications
- Android code
- Real calendar writes
- Automatic clipboard monitoring
- File or image attachments in Quick Capture
- Rich-text editor complexity
- Voice capture
- New major routes unrelated to state coverage
- Phase 5 responsive/accessibility/performance redesign
- Unrequested UI redesign

## Visual and interaction constraints

- Match the approved glass, liquid-glass, and restrained dark neumorphic
  system.
- Do not change the established typography, spacing, layout hierarchy, or cube.
- Keep the launcher visually quiet when closed and clearly discoverable.
- Keep the open panel focused and compact rather than turning it into a second
  Notes page.
- Preserve existing Ctrl/Cmd+K behaviour.
- Avoid shortcut conflicts with the browser or command palette.
- Do not add a global keyboard shortcut unless it is clearly discoverable,
  conflict-free, and tested.
- Use 44 px minimum touch targets where applicable.
- Trap focus inside modal/bottom-sheet variants and restore focus to the
  launcher on close.
- Escape closes only when doing so cannot silently discard a draft.
- Include accessible names, status announcements, and non-colour state labels.
- Respect reduced motion.
- Prevent horizontal overflow at all existing tested widths.

## Required tests

Add tests following current conventions for:

- Route-to-state coverage matrix completeness
- First use and no-connections behaviour
- Partial-data regional degradation
- Rate-limited recovery
- Stale-source freshness display
- Revoked-permission dependency block and recovery link
- Offline behaviour
- Degraded-AI fallback
- Full action lifecycle: pending, running, succeeded, recoverable failure
- Existing normal populated scenarios remaining unchanged
- Quick Capture launcher open/close and focus restoration
- Unsaved-draft protection
- Save-as-note preview and session result
- Scheduled-event preview, confirmation, and Timeline result
- Ambiguous date/time requiring correction
- Manual-paste provenance
- Activity entries for both capture paths
- Plain-text rendering of pasted markup
- Quick Capture behaviour in no-connections, degraded-AI, offline, failure, and
  reduced-motion scenarios

Prefer domain and interaction assertions over brittle decorative snapshots.

## Verification order

Do not deploy or begin broad browser inspection until implementation and static
validation pass.

1. Run targeted tests during implementation.
2. Run typecheck.
3. Run lint.
4. Run the complete test suite.
5. Run the production build.
6. Run `git diff --check`.
7. Run the application without leaving a blocking foreground command.
8. Inspect all existing routes in their normal scenario to confirm no visual
   regression.
9. Inspect representative state scenarios across daily-use and control routes,
   including every Phase 4 state at least once where applicable.
10. Inspect Quick Capture at approximately 1440 × 900, laptop width, and 390 px.
11. Verify the launcher does not overlap navigation, toasts, dialogs, important
    controls, or safe-area content.
12. Verify keyboard navigation, focus trapping/restoration, screen-reader
    labels/statuses, and reduced motion.
13. Verify there are no unexplained browser console warnings or errors.
14. Verify tracked cube implementation and hashes remain unchanged.
15. Confirm all 22 `exfonts/` files remain untouched and uncommitted.

The known non-blocking JavaScript chunk warning does not require work unless
Phase 4 materially worsens it. Record any regression.

## Documentation

Update:

- `docs/PROGRESS.md`
- `docs/03_INFORMATION_ARCHITECTURE.md`
- `docs/11_COMPLETE_FEATURE_MATRIX.md`
- `docs/15_DECISIONS.md`

Record Quick Capture as a durable product decision:

> Quick Capture is a persistent manual-input bridge inside the product shell.
> It accepts user-pasted plain text from unconnected apps and prepares either a
> note or an editable event. It never reads the clipboard automatically,
> guesses ambiguous scheduling details, or bypasses action confirmation.

Document:

- The final route-to-state applicability matrix
- Phase 4 completion
- Quick Capture mock/session behaviour
- What remains mocked
- Validation results
- Known limitations
- Exact next phase: Phase 5 — Responsive, Accessible, and Motion-Complete
  Website

Do not add routine implementation details to `15_DECISIONS.md`.

## Git and deployment

- Preserve unrelated user changes.
- Do not use `git add .`.
- Do not stage `exfonts/`, screenshot artifacts, or unrelated untracked prompts.
- If `prompts/PHASE_04_CODEX_PROMPT.md` is present, include it intentionally in
  the Phase 4 commit.
- Commit only after all required validation passes.

Then:

- Reuse the existing Sites project identifier from `.openai/hosting.json`.
- Do not create a second site.
- Push the exact validated source state.
- Save a new Sites version.
- Deploy privately using the existing owner-only access model.
- Inspect deployment health.

Do not deploy partial work.

## Acceptance criteria

Phase 4 is complete only when:

- Every existing product route handles all applicable Phase 4 states.
- The technical coverage matrix identifies implemented and intentionally
  non-applicable states.
- No screen depends solely on a perfect populated response.
- Recovery language is useful and does not expose implementation details.
- Partial failures remain appropriately localized.
- Scenario behaviour is deterministic and coherent across routes.
- Quick Capture is globally available in the product shell without obstructing
  the approved UI.
- Pasted plain text can produce a mock session note or a confirmed mock
  Timeline event through provider-neutral boundaries.
- Ambiguous scheduling data is never guessed.
- Manual-paste provenance and Activity results are visible.
- No real provider connection, clipboard monitoring, LLM call, or durable
  persistence is added.
- Existing Phase 0–3 behaviour and approved UI remain intact.
- The locked cube is unchanged.
- The supplied SVG is used when available.
- Typecheck, lint, tests, production build, visual checks, accessibility checks,
  and repository integrity checks pass.
- Documentation, intentional commit, and private deployment are complete.

## Completion report

Stop after Phase 4. Do not begin Phase 5.

Report:

1. Outcome
2. Commit hash
3. Private Sites version and deployment health
4. State coverage matrix summary
5. Quick Capture behaviour and icon asset status
6. Important contracts and service boundaries
7. Files changed
8. Tests and validation results
9. Mock/live and session-persistence boundaries
10. Confirmation that approved UI, cube files, and `exfonts/` remain unchanged
11. Known limitations
12. Exact recommended next phase
