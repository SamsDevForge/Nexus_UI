# NEXUS AI Progress

## Current phase

Phase 0 and Phase 1 implemented: repository foundation, shared product design
system, application shell, and mocked Today reference experience.

## Completed

- Product blueprint
- Complete phase roadmap
- Information architecture
- Design system direction
- Technical architecture
- Connection strategy
- AI, RAG, memory, and agent design
- Security and permission model
- UI improvement playbook
- Codex workflow
- Complete feature matrix
- Acceptance gates
- First implementation prompt
- Existing Next.js and React Three Fiber landing page preserved
- User-supplied SVG mark integrated while keeping the NEXUS AI wordmark as text
- Shared product-mode colour, type, spacing, radius, elevation, and motion tokens
- High-transparency dark-glass product theme with the landing page’s obsidian
  WebGL cube behind the interface and a static reduced-motion fallback
- Depth-tiered glass with sharper low-blur content surfaces and stronger
  localized blur on buttons, chips, and inset decision elements
- Primary Today interaction surface refined as a restrained hybrid of liquid
  glass, dark glassmorphism, and soft neumorphic elevation
- Snooze and Dismiss now use compact outlined glass controls that stay close to
  their text width on desktop and narrow layouts
- Desktop product shell with grouped daily and system-control navigation
- Collapsible desktop sidebar with accessible compact labels and liquid-glass
  hover capsules for navigation destinations
- Decorative secondary spinning squircle removed so the landing cube remains
  the only animated background object in product mode
- Narrow-width context bar and five-destination bottom navigation
- Label-first daily navigation with short purpose cues instead of sequence
  numbers, plus a dedicated Technicals utility beside the account area
- Provider-neutral TypeScript contracts and `TodayService` boundary
- Deterministic mock adapter with ten named Today scenarios
- Today screen with one dominant insight, evidence, confidence, freshness,
  authority, next-event timing, timeline, deadline risk, prepared assets, and
  lower-priority signals
- Working Why, snooze, dismiss, approval, success, retry, and prototype-state
  interactions
- Prototype-state controls and mocked/live boundaries consolidated under
  `/app/technicals` so the Today screen remains user-focused
- Unbounded display typography for the Today greeting, Anybody
  ExtraExpanded Black Italic for the primary recommendation, and a Druk
  Wide-style treatment for the dominant departure time
- Loading, first-use, populated, stale, permission-denied, offline,
  recoverable-error, and reduced-motion states
- Typecheck, lint, fixture tests, and production build scripts

## Current implementation assumptions

- The existing cinematic landing page is the accepted public visual baseline.
- Phase 1 student data is deterministic and set in Bengaluru/IST.
- Later screens remain intentionally labelled placeholders until their phase.

## Mock/live status

- UI: landing, application shell, and Today reference screen implemented
- Backend: not implemented
- Integrations: not implemented
- AI: not implemented
- Android: not implemented

All Phase 1 Calendar, route, weather, task, Notion, device, approval, and action
results are deterministic mocks behind the `TodayService` boundary.

## Known limitations

- No live providers, authentication, backend, OAuth, or model calls exist.
- Only Today is implemented as a complete product screen; other destinations
  are deliberate placeholders.
- The supplied `.svg` contains an embedded PNG rather than native vector paths,
  so its scaling quality is limited by the embedded raster.
- The browser viewport tool validated 1280 × 720 and 390 × 844. The product
  layout is fluid beyond 1280, but an exact 1440 × 900 capture remains to be
  added to visual regression coverage.

## Next phase

Phase 2 — Core product screens with typed mock data: complete Timeline,
Insights, NEXUS assistant, Knowledge, Notes, and Search using the Phase 1 shell
and component language. Do not connect live services yet.
