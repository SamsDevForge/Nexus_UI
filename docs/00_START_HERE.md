# NEXUS AI Build Kit

## The decision this kit implements

NEXUS AI will eventually include the complete feature vision discussed for the
pitch. Features are not being discarded to make a small permanent product.
They are being introduced in dependency order so each new capability has a
stable interface, data source, permission model, and testable purpose.

The build order is:

1. Design the complete website experience using typed mock data.
2. Establish the backend, accounts, data contracts, and integration layer.
3. Connect simple public APIs.
4. Add user-authorized services such as Calendar, email, Notion, and Drive.
5. Add the conversational assistant, RAG, and bounded agents.
6. Add proactive reasoning, notifications, permissions, and automations.
7. Build the Android companion and device-aware features.
8. Add health, advanced personalization, family, professional, and business capabilities.
9. Harden, evaluate, pilot, and scale the complete system.

## What NEXUS AI actually is

NEXUS is not a chatbot with many plugins. It is a permissioned personal context
system:

> Observe signals → understand context → decide whether help is useful →
> explain the recommendation → request the appropriate authority → act → learn
> from the result.

Chat is one interface to that system. RAG is one memory mechanism. n8n is one
orchestration tool. None of them alone is the product.

## How to use these files

Read the documents in numerical order before starting implementation.

| File | Purpose |
| --- | --- |
| `01_PRODUCT_BLUEPRINT.md` | Complete product definition and feature families |
| `02_FULL_PHASE_ROADMAP.md` | Step-by-step implementation order through the final product |
| `03_INFORMATION_ARCHITECTURE.md` | Routes, screens, navigation, objects, and user flows |
| `04_DESIGN_SYSTEM.md` | Visual language, tokens, components, cube behaviour, and motion |
| `05_TECHNICAL_ARCHITECTURE.md` | Applications, services, databases, events, and deployment boundaries |
| `06_DATA_CONNECTIONS.md` | APIs, OAuth, webhooks, device data, and n8n responsibilities |
| `07_AI_RAG_AGENTS.md` | LLM, RAG, memory, agent, and decision-engine design |
| `08_SECURITY_PRIVACY.md` | Permission ladder, privacy, action safety, and auditability |
| `09_UI_IMPROVEMENT_PLAYBOOK.md` | Repeatable method for improving Codex-generated UI |
| `10_CODEX_EXECUTION_PROTOCOL.md` | How to work through phases with Codex |
| `11_COMPLETE_FEATURE_MATRIX.md` | Every promised and added feature mapped to a phase |
| `12_ACCEPTANCE_GATES.md` | Definition of done for UI, backend, AI, and release work |
| `15_DECISIONS.md` | Durable product and engineering decisions |
| `PROGRESS.md` | Current implementation status; update after every phase |
| `prompts/PHASE_01_CODEX_PROMPT.md` | The first implementation prompt |
| `prompts/UI_REDESIGN_PROMPT.md` | A reusable visual-audit and redesign prompt |

## Important distinction: UI first does not mean fake architecture

The complete UI is built first, but every mock object must use the shape intended
for the later backend. Screens should call a mock service adapter rather than
importing random JSON directly. Replacing mock adapters with live adapters
should not require rewriting the page.

## Working rule

Use one implementation phase per Codex session or branch. Do not paste a prompt
asking Codex to build the entire platform in one attempt. Large prompts often
produce broad but shallow work, inconsistent components, missing states, and
unverified claims.

The first prompt in this kit establishes the foundation, design system, route
shell, typed contracts, and first complete product screen. Later UI phases fill
the entire product before backend integration begins.
