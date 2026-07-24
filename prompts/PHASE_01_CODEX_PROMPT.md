# Codex Prompt — Phase 0 and Phase 1

Paste the text below into Codex while it is opened at the root of the actual
NEXUS AI project.

---

Use `$build-nexus-ai` if that skill is available.

Implement **NEXUS AI Phase 0 and Phase 1: repository foundation, design system,
application shell, and reference Today experience**.

This is an implementation task. Inspect the repository, make the changes, run
the project, visually inspect the result, and validate it. Do not stop after
returning a plan.

## Read first

Read these files completely before editing:

- `AGENTS.md`
- `docs/00_START_HERE.md`
- `docs/01_PRODUCT_BLUEPRINT.md`
- `docs/02_FULL_PHASE_ROADMAP.md`
- `docs/03_INFORMATION_ARCHITECTURE.md`
- `docs/04_DESIGN_SYSTEM.md`
- `docs/05_TECHNICAL_ARCHITECTURE.md`
- `docs/09_UI_IMPROVEMENT_PLAYBOOK.md`
- `docs/12_ACCEPTANCE_GATES.md`
- `docs/15_DECISIONS.md`
- `docs/PROGRESS.md`

If one of these files is missing, report it as a limitation but continue using
the available source of truth.

## Inspect before changing

1. Inspect the current framework, routing, styling, component structure,
   dependencies, scripts, and any existing 3D implementation.
2. Run the current application.
3. Capture or inspect the current landing page at approximately 1440 × 900 and
   390 × 844.
4. Identify useful existing work that must be preserved.
5. Identify the causes of any visibly bland or generic output.
6. Check for unrelated user changes and do not overwrite them.

Do not migrate frameworks merely because another stack is fashionable. If the
existing React/Vite or similar foundation is healthy, build on it. Record any
material architecture decision in `docs/15_DECISIONS.md`.

## Phase objective

Create a maintainable frontend foundation that proves how the cinematic NEXUS
identity becomes a usable product.

By the end of this phase, the repository must contain:

- The existing or improved cinematic landing page at `/`
- A clear transition or CTA from the landing page into the product
- A product application shell
- A fully designed mocked Today screen
- Shared design tokens
- Reusable product components
- Provider-neutral TypeScript domain contracts
- Scenario-based mock service adapters
- Navigation prepared for later product screens
- Complete state coverage for the Today screen

Do not connect live APIs, create the production backend, implement OAuth, or
add a real LLM in this phase.

## Visual direction

Preserve the NEXUS identity:

- Near-black graphite environment
- Obsidian/polished-dark-metal cube
- Pearl-white and restrained icy-blue intelligence light
- Dark sculpted neumorphism
- Precise typography
- State-driven motion
- High negative space
- Clear evidence and permission language

Avoid:

- Generic admin-dashboard layout
- Equal-weight KPI card grid
- Blue-purple AI gradients
- Excessive bloom or glow
- Heavy glassmorphism
- Decorative charts with no product purpose
- Emoji
- AI brains, robots, and circuit imagery
- A large chat box as the main experience

The cube must be a system-state object. On the landing page it may be cinematic
and dominant. Inside the application it should become smaller and calmer while
still communicating Observing, Processing, Insight Ready, and other states.

## Landing page

Preserve useful current landing behaviour, but materially improve it if visual
inspection shows weak hierarchy, generic composition, disconnected animation,
or poor responsive behaviour.

Requirements:

- Fits the primary presentation viewport without page scrolling
- Strong asymmetric composition
- One dominant cube
- Product name and tagline
- One proactive example
- One primary CTA into `/app/today`
- Moving overhead light visibly changes the cube’s highlights and shadows
- Diagonal rotation remains slow and controlled
- Camera movement is cinematic but not disorienting
- Reduced-motion fallback
- Narrow layout is recomposed rather than merely stacked

Do not spend the whole phase polishing the landing page while neglecting the
product foundation.

## Product application shell

Create a desktop-first shell that can later support:

- Today
- Timeline
- Insights
- NEXUS
- Knowledge
- Automations
- Connections
- Memory
- Activity
- Settings

Daily-use destinations and control destinations must be visually grouped.
Navigation items may route to clearly marked phase placeholders for screens not
implemented yet, but do not fabricate shallow feature-complete pages.

The shell should include:

- Product identity
- Current system state
- Primary navigation
- Secondary control navigation
- Current context/date region
- Account/settings access
- Responsive narrow-width behaviour

## Today screen

Make `/app/today` the reference product screen.

Hierarchy:

1. Current NEXUS state
2. One highest-value proactive insight
3. Next event with preparation and leave time
4. Today’s combined timeline
5. Deadline risk
6. Prepared files or notes
7. Lower-priority signals

Use a realistic student scenario based in India, but keep data clearly mocked.
Suggested populated scenario:

- A 10:00 AM lecture
- Rain likely during the commute
- Traffic adds approximately 20 minutes
- A prepared lecture-note file
- An approaching assignment
- One disconnected or stale secondary source

The user should immediately understand what NEXUS recommends, why, how current
the evidence is, and whether an action requires approval.

## Required Today states

Implement deterministic fixtures or a development scenario switch for:

- First use/no connections
- Loading
- Normal populated day
- Rain and traffic
- Deadline risk
- Partial or stale connection
- Permission denied
- Offline
- Recoverable action failure
- Reduced motion

Do not scatter arbitrary JSON through components. Create typed mock service
adapters behind domain interfaces that later live API adapters can implement.

## Foundation components

Build only components justified by the current shell and Today screen, but
establish the correct families:

- Button variants
- Icon button
- Surface and inset surface
- NEXUS state indicator
- Insight hero
- Context signal
- Timeline item
- Evidence/source chip
- Confidence and freshness indicator
- Connection-health indicator
- Action preview/approval surface
- Skeleton
- Empty, error, offline, and permission state
- Tooltip or accessible detail disclosure

Use design tokens for colour, spacing, typography, radius, elevation, and
motion. Avoid one-off styling that cannot support later screens.

## Interaction requirements

- The primary insight exposes a clear “Why?” interaction.
- Evidence names its source and freshness.
- Proposed side effects show required authority.
- Snooze, dismiss, or feedback controls may be mocked but must behave
  consistently.
- Keyboard and focus behaviour must work.
- Core information remains available if the 3D canvas fails.
- Respect `prefers-reduced-motion`.

## Visual verification

Use `$polish-nexus-ui` if available.

After the first implementation:

1. Run the app.
2. Capture the landing and Today screen at 1440 × 900.
3. Capture the Today screen around 1280 × 720 and 390 × 844.
4. Audit them against `docs/04_DESIGN_SYSTEM.md` and
   `docs/09_UI_IMPROVEMENT_PLAYBOOK.md`.
5. Identify and implement the highest-impact P0 and P1 corrections.
6. Capture the same views again.
7. Continue until no UI rubric category scores below 4/5, or record a concrete
   technical limitation.

Do not declare success from source inspection alone.

## Engineering verification

Run the repository’s relevant:

- Typecheck
- Lint
- Tests
- Production build

Fix errors introduced by this phase. Check console errors, overflow, route
failures, and expensive uncontrolled animation.

## Documentation updates

Update:

- `docs/PROGRESS.md`
- `docs/15_DECISIONS.md` only for durable decisions

Record what is still mocked and state that the next phase is Phase 2 core
product screens. Do not implement Phase 2.

## Completion response

Lead with the completed visible outcome. Then report:

1. Important files changed
2. Current routes
3. Mock scenarios
4. Visual checks performed
5. Engineering validation
6. Known limitations
7. Exactly what remains for Phase 2

Do the work now without asking for confirmation unless an actual destructive
conflict or missing critical user choice blocks safe implementation.
