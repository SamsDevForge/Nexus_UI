# Codex Prompt — Phase 2 Core Product Experience

Paste the text below into Codex while it is opened at the root of the existing
NEXUS AI project.

---

Use `$build-nexus-ai`. Use `$polish-nexus-ui` for the visual verification pass.

Implement **NEXUS AI Phase 2: the complete mocked core product experience**.

This is an implementation task. Inspect the current repository and Phase 1
handoff, implement the screens, run the application, visually inspect the
actual result, test it, and update project progress. Do not stop after returning
a plan.

## Current verified handoff

Phase 0 and Phase 1 are complete enough to proceed. Preserve:

- The existing cinematic landing page and client-only WebGL behaviour
- The responsive product shell and collapsible navigation
- The complete mocked Today experience
- The current glass, liquid-glass and neumorphic design system
- The ten deterministic Today scenarios
- Existing Why, Snooze, Dismiss, approval, retry and scenario interactions
- Evidence, confidence, freshness and permission displays
- Existing domain contracts and provider-neutral Today service boundary
- The mock/live adapter separation
- `/app/technicals`
- Existing tests and production build health
- The private deployment configuration
- The user-owned, untracked `exfonts/` directory

The latest locally committed Snooze/Dismiss sizing may not yet be deployed.
Inspect the current branch and working tree before editing. Preserve intentional
user changes and do not overwrite `exfonts/`.

## Locked product-owner decision

The existing large cross-screen cube remains exactly as a dominant product
element.

- Do not shrink it.
- Do not remove it.
- Do not reposition it.
- Do not mask, fade or confine it.
- Do not reduce its visual dominance.
- Do not replace it with a smaller product-state icon.
- Do not treat its overlap or cross-screen presence as a UI defect.

Build every new screen around the existing cube. Preserve its scale, material,
lighting, camera, position and behaviour unless a technical correction is
strictly required to preserve its current appearance.

Add this decision to `docs/15_DECISIONS.md` if it is not already recorded:

> **D-012 — Dominant product cube remains.** The large cross-screen cube is an
> intentional NEXUS product identity decision. Future interfaces must build
> their content and contrast around it rather than weakening its presence.

## Read before editing

Read completely:

- `AGENTS.md`
- `docs/00_START_HERE.md`
- `docs/01_PRODUCT_BLUEPRINT.md`
- `docs/02_FULL_PHASE_ROADMAP.md`
- `docs/03_INFORMATION_ARCHITECTURE.md`
- `docs/04_DESIGN_SYSTEM.md`
- `docs/05_TECHNICAL_ARCHITECTURE.md`
- `docs/07_AI_RAG_AGENTS.md`
- `docs/09_UI_IMPROVEMENT_PLAYBOOK.md`
- `docs/11_COMPLETE_FEATURE_MATRIX.md`
- `docs/12_ACCEPTANCE_GATES.md`
- `docs/15_DECISIONS.md`
- `docs/PROGRESS.md`

Then inspect:

- Existing domain contracts
- Today service interface
- Mock Today service
- Scenario fixtures
- Today UI
- Application shell and route structure
- `/app/technicals`
- Current test conventions
- Existing shared components and design tokens

Project files and explicit product-owner decisions override older generic
guidance.

## Phase objective

Replace the Phase 2 placeholders with six complete, interactive, visually
distinct core experiences:

1. Timeline
2. Insights
3. NEXUS
4. Knowledge
5. Notes
6. Search

Everything remains powered by deterministic mock services. The purpose is to
complete and validate the core website experience before backend integration.

## Explicitly out of scope

Do not add:

- Authentication
- Accounts or real profiles
- Database
- FastAPI backend
- Live weather, traffic or geocoding
- Google Calendar or Outlook synchronization
- Gmail or Outlook email access
- Notion or Drive access
- Real RAG
- Embeddings or vector database
- OpenAI API calls
- Real tool execution
- n8n workflows
- Web push or FCM
- Android application
- Phase 3 control screens beyond preserving their current placeholders

No screen may pretend a real provider or AI model is connected. Mock data must
be visibly represented as development/demo data inside technical surfaces,
without adding intrusive “mock” labels to the polished product view.

## Architecture requirements

Extend the existing provider-neutral pattern rather than importing fixture JSON
directly into pages.

Create or extend canonical contracts for:

- Timeline entries and groups
- Ranked insights
- Insight evidence and feedback
- Conversation threads and messages
- Tool or action proposals
- Recorded mock tool results
- Knowledge sources and documents
- Knowledge search results
- Notes and note-review state
- Unified search results
- Source health, confidence and freshness

Create service boundaries following the existing Today convention:

- `TimelineService`
- `InsightsService`
- `NexusService`
- `KnowledgeService`
- `NotesService`
- `SearchService`

Use the project’s established naming and folder structure rather than blindly
creating duplicate conventions.

For every service:

- Provide a deterministic mock adapter.
- Keep fixtures separate from UI components.
- Support relevant loading, empty, stale, denied, offline and error results.
- Never use randomness for scenario behaviour.
- Make future live adapters possible without rewriting the page.
- Keep provider-specific payloads outside components.

Extend `/app/technicals` to expose the new mock boundaries, scenario coverage,
source states and service contracts.

## Shared scenario system

Reuse and extend the current scenario switch. It should remain consistent while
navigating between routes.

At minimum support coherent cross-screen versions of:

- Normal student day
- Rain and traffic
- Deadline risk
- First use/no connected sources
- Loading
- Partial or stale sources
- Permission denied
- Offline
- Recoverable service/action failure
- Reduced motion

The same scenario should tell one consistent story across Today, Timeline,
Insights, NEXUS, Knowledge, Notes and Search.

Example: in `deadline-risk`, the assignment shown as risky in Today should
appear in Timeline, Insights, relevant NEXUS suggestions, Knowledge sources and
Search results.

## 1. Timeline

Route: `/app/timeline`

Purpose:

> Show what is happening, what preparation surrounds it, and what NEXUS
> proposes to change.

Build a distinctive time-based composition containing:

- Current-time marker
- Confirmed calendar events
- Preparation blocks
- Travel blocks
- Focus blocks
- Deadlines
- Suggested schedule changes
- Conflicts or insufficient preparation time
- Source, freshness and confidence when an item is inferred

Clearly distinguish:

- Confirmed
- Inferred
- Suggested
- Pending approval
- Completed
- Missed or at risk

Interactions:

- Open item detail
- Show source and reasoning
- Accept or reject a suggested block
- Mock reschedule
- Switch the visible day
- Return to the current time
- Filter event/task/travel/preparation types

Avoid turning Timeline into a collection of unrelated event cards.

## 2. Insights

Route: `/app/insights`

Purpose:

> Show what NEXUS recommends, why it matters now, and what authority is needed.

Build:

- Ranked primary insight
- Lower-priority insight stream
- Urgency or category filters
- Quiet/in-app-only items
- Expired and acted-on history
- Evidence
- Confidence
- Freshness
- Expiry
- Required permission
- Proposed action

Interactions:

- Why
- Open evidence
- Snooze
- Dismiss
- Helpful/not useful feedback
- Approve or reject prepared mock action
- Filter active, snoozed, acted and expired items

Reuse the existing insight language and components where appropriate, but do
not make the screen look like repeated copies of the Today hero.

## 3. NEXUS

Route: `/app/nexus`

Purpose:

> Ask, understand, explain and approve—without becoming a generic chatbot.

Build a composed assistant workspace containing:

- Current context summary
- Conversation history
- Suggested context-aware questions
- Main conversation
- Sources/evidence used by a response
- Prepared action preview
- Required-authority display
- Approval and rejection
- Recorded mock tool result
- Failure and retry state

Include deterministic scripted conversations for:

- “Why should I leave at 9:12?”
- “What do I need for tomorrow?”
- “What am I forgetting?”
- “Find my latest Machine Learning notes.”
- “Prepare a focus block for the assignment.”

Mock response streaming may be implemented, but it must:

- Be deterministic
- Respect reduced motion
- Be testable without fragile real-time delays
- Never imply a real model or tool was used

Do not make an empty full-screen chat input the dominant first impression.
Context, evidence and prepared actions are essential parts of the screen.

## 4. Knowledge

Route: `/app/knowledge`

Purpose:

> Browse and understand the permitted sources NEXUS can retrieve from.

Build:

- Unified knowledge overview
- Recent material
- Source categories
- Related material
- Source-health state
- Freshness
- Permission boundary
- Document preview
- Evidence excerpts
- Route into Notes
- Route into full Search

Use clearly mocked future sources such as:

- Notion
- Google Drive
- Email attachments
- Internal NEXUS notes
- Lecture material

Do not imply those providers are actually connected. The service contract
should anticipate them without coupling components to their API responses.

## 5. Notes

Route: `/app/notes`

Purpose:

> Review knowledge artifacts NEXUS has prepared from permitted source material.

Build:

- Draft notes
- Needs-review notes
- Reviewed notes
- Mock-synced notes
- Course/project grouping
- Source citations
- Extracted action items
- Confidence and unresolved questions
- Note detail or editor-preview surface

Interactions:

- Open note
- Edit mock draft state
- Mark reviewed
- Approve mock Notion preparation
- Reject or request regeneration
- Open cited source
- Create a manual internal note

The interface must make it obvious that NEXUS cannot create factual lecture
notes without source material.

## 6. Search

Provide:

- A dedicated `/app/search` result experience
- A global keyboard-accessible command/search surface using `Ctrl/Cmd + K`

Search across:

- Events
- Tasks and deadlines
- Insights
- Conversations
- Knowledge documents
- Notes
- Mock email-derived items

Build:

- Query input
- Recent searches
- Type and source filters
- Grouped results
- Match excerpts
- Freshness and source
- Empty state
- Permission-restricted state
- Offline/local-results state

Interactions:

- Keyboard navigation
- Open result
- Filter
- Clear search
- Return to the originating screen

Search must use a service interface, not page-level filtering of imported
fixtures.

## Navigation

- Replace Timeline, Insights, NEXUS and Knowledge placeholders with the real
  Phase 2 screens.
- Make Notes discoverable through Knowledge and appropriate shortcuts.
- Make Search globally discoverable without overcrowding the sidebar.
- Preserve the separation between daily intelligence and system controls.
- Keep Automations, Connections, Memory, Activity and Settings as Phase 3
  placeholders.

## Visual requirements

- Preserve the existing cube scene exactly.
- Preserve the current visual identity and product shell.
- Keep one dominant purpose per screen.
- Do not create equal-weight card grids.
- Use grouped rows, timelines, layered panels and progressive disclosure.
- Let every screen have a distinct composition while sharing tokens and
  components.
- Use proper icons from the existing icon system.
- Never use emoji as icons, status markers, logos or decoration.
- Do not create emoji-derived SVG files.
- Keep cinematic intensity controlled by existing behaviour; do not introduce
  another competing background effect.
- Maintain readable text and functional contrast over the cube without
  weakening or modifying the cube itself.

## Interaction and accessibility

- Preserve keyboard navigation and visible focus.
- Keep `Ctrl/Cmd + K` accessible and dismissible.
- Ensure dialogs/drawers trap and restore focus.
- Maintain semantic headings and labelled controls.
- Respect `prefers-reduced-motion`.
- Keep mobile/narrow controls at least 44px in interaction area.
- Do not rely on colour alone for statuses.
- Preserve usable core information if WebGL fails.

## Testing

Add or update:

- Contract tests for every new service
- Fixture/scenario consistency tests
- Route render tests
- Timeline interaction tests
- Insight feedback and approval tests
- NEXUS scripted-conversation and action-preview tests
- Knowledge and Notes state tests
- Search keyboard and filtering tests
- Reduced-motion behaviour
- Offline, denied and error scenarios

Avoid snapshot-only tests for important behaviour.

## Visual verification

Run the application and inspect the rendered product.

Capture or inspect at 1440 × 900:

- Timeline
- Insights
- NEXUS
- Knowledge
- Notes
- Search

Inspect narrow layouts around 390 × 844 for at least:

- Timeline
- NEXUS
- Knowledge
- Global search

Also inspect:

- One normal populated scenario
- One stale/denied/offline scenario
- Reduced-motion mode

Audit with `$polish-nexus-ui`. Implement P0 and P1 findings, then inspect the
same routes again. Do not classify the existing cube scale, location, overlap
or dominance as a problem.

## Engineering verification

Run:

- Typecheck
- Lint
- Full test suite
- Production build

Check:

- Console errors
- Route failures
- Hydration issues
- Horizontal overflow
- Focus behaviour
- Scenario consistency
- Unnecessary 3D remounting during navigation
- Performance on ordinary hardware

## Documentation

Update:

- `docs/PROGRESS.md`
- `docs/15_DECISIONS.md`
- `/app/technicals`

Record:

- Phase 2 completion status
- New domain contracts and service boundaries
- Routes completed
- Scenario coverage
- What remains mocked
- Validation
- Known limitations
- Exact Phase 3 starting point

Do not begin Phase 3.

## Deployment

After validation, use the established private deployment workflow if it is
already part of this project. Update the existing NEXUS AI deployment; do not
create a second site or change its access level.

If deployment is unavailable or blocked, preserve the completed local work and
report the exact blocker.

## Acceptance criteria

Phase 2 is complete only when:

- No core Phase 2 route remains a placeholder.
- All six experiences are interactive with deterministic mock services.
- Screens consume provider-neutral contracts.
- One cross-screen scenario tells a consistent story.
- Evidence, confidence, freshness and authority remain visible where relevant.
- Search works from keyboard and dedicated route.
- The existing cube remains unchanged.
- `exfonts/` remains untouched.
- Typecheck, lint, tests and production build pass.
- Representative desktop and narrow layouts are visually inspected.
- Progress and durable decisions are updated.
- Backend, live providers and real AI remain unimplemented.

## Completion response

Lead with the visible Phase 2 outcome. Then report:

1. Routes completed
2. New domain contracts and services
3. Shared scenarios
4. Important interactions
5. Visual verification
6. Engineering validation
7. Deployment status
8. What remains mocked
9. Known limitations
10. Exact Phase 3 starting point

Implement Phase 2 now without asking for confirmation unless an actual
destructive conflict or critical missing product decision blocks safe work.
