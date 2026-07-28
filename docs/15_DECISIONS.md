# NEXUS AI Durable Decisions

## D-001 — Full scope remains planned

All feature families discussed for NEXUS remain in the long-term roadmap.
Phasing controls dependency order and safety; it does not redefine the final
product as only the initial MVP.

## D-002 — Complete website UI first

Design the complete website and all important states using typed mock adapters
before connecting live services. This validates information architecture and
creates stable frontend contracts.

## D-003 — Website before Android

Build and stabilize the desktop website first. Build the Android application
after the web UI, contracts, and primary product flows are accepted.

## D-004 — Consistent brand, different density

The landing page and product use the same material, lighting, typography, cube,
and motion language. The landing remains cinematic; product screens prioritize
clarity and may scroll.

## D-005 — Cube is a state object

The cube represents Dormant, Observing, Gathering, Processing, Insight Ready,
Approval Needed, Acting, Success, Degraded, and Privacy Paused states. It is
not added as decoration to every screen.

## D-006 — n8n is orchestration, not authority

n8n supports integrations, schedules, prototypes, and cross-service workflows.
The application backend owns canonical user state, permissions, notification
policy, action authority, and audit.

## D-007 — Hybrid intelligence

Use deterministic logic for calculations, conflicts, freshness, permission,
and safety. Use RAG for private knowledge. Use LLMs for interpretation,
synthesis, explanation, drafting, and bounded tool choice. Add statistical
personalization only after sufficient data.

## D-008 — Permission ladder

The action ladder is Observe, Suggest, Prepare, Ask, and Act. New capabilities
default to Suggest or Prepare. Provider write scope does not itself grant NEXUS
automatic-action authority.

## D-009 — Student-first, architecture-broad

Students form the first pilot audience. Professionals, families, businesses,
health, devices, and optional finance remain planned without distorting early
student workflows.

## D-010 — Notion is both source and destination

NEXUS may read selected Notion content and prepare or create structured notes
in user-selected destinations with visible authority and action history.

## D-011 — No foundation-model training claim

Initial investment and engineering are used to build the product, context
engine, evaluations, integrations, and personalization. NEXUS uses existing
models initially rather than claiming to train a foundation model.

## D-012 — Preserve the landing composition while product mode expands

The existing Next.js and React Three Fiber landing implementation remains the
cinematic public surface. Phase 1 changes only its logo asset and the behaviour
of its primary CTA; composition, copy hierarchy, cube, light, motion, and
responsive framing remain intact.

The supplied dark-neumorphic references guide product-mode material, controls,
and elevation. They do not replace the landing-page art direction.

## D-013 — Retain Next.js and add provider-neutral mock boundaries

The existing Next.js foundation is healthy and is retained. Product pages use
provider-neutral TypeScript contracts and a `TodayService` interface. Phase 1
uses a deterministic mock adapter with named scenarios; future live adapters
must implement the same boundary.

The NEXUS wordmark remains live text. The user-supplied SVG is the shared mark
asset on public and product surfaces.

## D-014 — Product decision typography uses three display roles

The Today greeting uses Unbounded Bold for an architectural display character.
The highest-value recommendation uses Anybody ExtraExpanded Black Italic for a
wide, urgent editorial voice. The dominant timing value in the NEXUS state
region retains its Druk Wide-style heavy display treatment. Body copy,
evidence, controls, and metadata retain the established Geist and Geist Mono
hierarchy.

Unbounded and Anybody are self-hosted under the SIL Open Font License. Druk
Wide remains unbundled without licensed webfont files, so the timing role uses
the existing self-hosted open-source visual equivalent.

## D-015 — Product mode uses restrained glass over a cube field

The cinematic landing page remains unchanged. Product mode replaces the
original dark-neumorphic material treatment with restrained dark
glassmorphism while preserving the established information hierarchy,
typography, interaction model, and sparse accent colour.

The product background reuses the landing cube’s rounded obsidian geometry,
physical metal material, blue internal core, edge light, orbiting highlight,
and slow diagonal rotation through a client-only WebGL layer. The decorative
secondary spinning squircle is removed so the landing cube remains the single
animated background object. Higher-transparency glass reveals the cube without
compromising text contrast. Motion stops under reduced-motion preferences and
the deterministic reduced-motion scenario.

Large content surfaces use low background blur so the cube remains visually
present. Smaller controls, evidence chips, and inset decision elements use
stronger localized blur and tighter shadows to establish foreground depth.
The primary interaction surface adds restrained liquid-glass refraction through
static curved highlights and translucent edge light while retaining the dark
glass fill and soft neumorphic elevation.

## D-016 — Daily navigation is label-first and diagnostics are separate

Daily destinations are parallel user tasks, not steps in a sequence. Their
sidebar treatment uses plain-language labels, short purpose cues, and a single
active indicator instead of numeric prefixes.

Prototype scenarios, mocked/live boundaries, and implementation diagnostics
live under `/app/technicals`, reached through “Dive into the technicals” beside
the account area. Technical controls do not compete with the Today screen’s
daily decision hierarchy.

## D-017 — Desktop navigation can collapse without losing meaning

The product sidebar may collapse into a compact rail to return horizontal space
to the active screen. Compact labels, accessible names, focus visibility, and
tooltips preserve destination meaning. Navigation hover and focus use a
contained liquid-glass border and localized blur, while active state remains
distinct from hover.

## D-018 — Cinematic WebGL is browser-only

The landing scene and other Three.js rendering code must load only in the
browser. Cloudflare Worker request modules must not evaluate Three.js at global
scope because its default loading manager creates runtime state that Workers
allow only inside a request handler. The server renders a neutral scene shell,
then the existing cinematic experience hydrates without changing its visual
composition.

## D-019 — Dominant product cube remains

The large cross-screen cube is an intentional part of the NEXUS product identity.

Do not shrink, remove, reposition, mask, fade or confine the existing cube during
future UI phases unless explicitly requested by the product owner.

Future screens must design their content, contrast and surfaces around the cube
rather than weakening its presence.

## D-020 — Phase 2 core screens use six provider-neutral services

Timeline, Insights, NEXUS, Knowledge, Nexus Notes, and Search depend on
`TimelineService`, `InsightsService`, `NexusService`, `KnowledgeService`,
`NotesService`, and `SearchService`. Their deterministic Phase 2 adapters share
canonical contracts while keeping fixtures outside page and component modules.

Future live adapters must preserve these boundaries or record a replacement
decision. Provider payloads, model responses, and fixture imports must not leak
into route components.

## D-021 — One scenario remains coherent across core navigation

The active prototype scenario travels as a query parameter through product
navigation and global search results. This makes the same deadline, event,
knowledge, conversation, and note story inspectable across every Phase 2 route
without introducing persistence or backend state.

The scenario control remains a prototype concern surfaced through Technicals.
It is not a user preference or future production URL contract.

## D-022 — Search is global and Nexus Notes is knowledge-adjacent

Unified Search is available from every product route through `Ctrl/Cmd + K` and
a dedicated `/app/search` experience instead of taking another permanent
sidebar slot. Nexus Notes is discoverable from Knowledge, Search, and contextual
shortcuts without changing the locked daily-versus-control navigation groups.

## D-023 — Phase 3 controls share one provider-neutral policy model

Automations, Connections, Permission Centre, Memory, Activity, and Settings
depend on `AutomationService`, `ConnectionService`, `PermissionService`,
`MemoryService`, `ActivityService`, and `SettingsService`. Their Phase 3 mock
adapters share deterministic session state so a revocation, global pause,
memory correction, retry, reversal, export, or deletion request produces a
coherent result across control surfaces and Activity.

Provider capability, NEXUS read purpose, normalized-data retention, future
model use, notification permission, and action authority remain separate
dimensions. Provider write capability never grants automatic-action authority,
and mocked authority escalation is capped at Ask.

## D-024 — Focus mode may suspend the product cube

The product owner may explicitly enable Focus mode from the shared context bar
to remove the cross-screen cube and its halo from the render tree. Disabling
Focus mode mounts the unchanged locked cube again.

The device preference is stored in a first-party cookie so server rendering can
honour it before the product shell is produced. This avoids mounting WebGL,
allocating a renderer, or briefly showing the cube when Focus mode was already
enabled.

## D-025 — Product glyphs use a native NEXUS geometry language

Interface concepts use a shared semantic asset registry plus CSS-authored
nodes, facets, rails, and signal geometry rather than emoji or letter
placeholders. Provider marks appear only when provider identity matters: the
supplied Google Drive and Notion vectors identify their corresponding sources.
Internal concepts keep the shared ice-blue geometry language, while Nexus Notes
uses its supplied stacked-network mark as a dedicated native feature identity.
The supplied transfer, email, file, folder, date, technical, and save vectors
represent their matching interface objects; the transfer mark rotates 180
degrees when its meaning is upload. Folder marks identify grouped collections
rather than individual files. Internet, GitHub, editor, music, and mobile-store
assets remain registered for matching future surfaces and are not used as
decoration on unrelated screens.

The supplied NEXUS SVG remains the brand asset. Its transparent outer canvas is
normalized to the complete cube bounds, and product chrome renders that full
mark with its natural proportions, without zoom, blend, crop, or a glass tile.

## D-026 — Quick Capture is manual, explicit, and session-bounded

Quick Capture is a persistent manual-input bridge inside the product shell. It
accepts user-pasted plain text from unconnected apps and prepares either a note
or an editable event. It never reads the clipboard automatically, guesses
ambiguous scheduling details, or bypasses action confirmation.

Phase 4 routes captured items through the provider-neutral Notes, Timeline,
Settings, and Activity boundaries. Results persist only for the active
deterministic demo session. Durable storage begins in a later backend phase.

## D-027 — Scrollable product surfaces share one restrained glass treatment

Visible scrollbars use one site-wide dark liquid-glass treatment with a
translucent inset track, softly raised pearl-blue thumb, and distinct hover and
active states. The treatment applies to page content, panels, dialogs, search
results, and previews without changing their layout or overflow behaviour.

Compact navigation rails and horizontal filter strips may continue to hide
their scrollbars when direct touch, wheel, or keyboard scrolling remains
available. Forced-colour environments retain the platform scrollbar instead of
the branded treatment.
