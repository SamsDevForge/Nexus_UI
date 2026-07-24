# NEXUS AI Product Blueprint

## Product statement

**NEXUS AI is a personal context and action layer that connects the tools,
routines, devices, knowledge, and commitments in a user’s life to surface the
right help before it is requested.**

Tagline:

> The AI That Knows What You Need Before You Ask.

The initial audience is students because their days combine timetables,
deadlines, commutes, projects, documents, communication, and changing routines.
The architecture must remain broad enough for professionals, families, and
organizations later.

## The product loop

1. **Observe:** Receive permitted events from connected services and devices.
2. **Normalize:** Convert provider-specific payloads into common NEXUS objects.
3. **Understand:** Relate time, place, people, tasks, knowledge, routines, and constraints.
4. **Evaluate:** Estimate urgency, usefulness, confidence, and interruption cost.
5. **Explain:** Show the evidence and reasoning in plain language.
6. **Authorize:** Apply the user’s action policy.
7. **Act:** Notify, prepare, ask, or execute.
8. **Learn:** Use explicit feedback and observed outcomes to improve timing and relevance.

## Product principles

### Proactive, not noisy

The best NEXUS action may be to remain silent. A suggestion must clear a
usefulness threshold before interrupting the user.

### Contextual, not merely conversational

The product should calculate and retrieve the answer before writing prose. Live
facts come from APIs and structured state, private knowledge comes through
retrieval, and the LLM communicates the result.

### Transparent, not mysterious

Every meaningful insight must answer:

- What happened?
- Why does it matter now?
- Which sources were used?
- How confident is NEXUS?
- What will happen if the user approves?

### Permissioned, not presumptuous

Reading a calendar does not grant permission to move an event. Reading Notion
does not grant permission to publish a note. Authority is specific to an action
type and can be revoked.

### Correctable, not permanently opinionated

The user can inspect, edit, expire, and delete inferred memories and routines.

### Useful before sophisticated

Start with deterministic rules where they are reliable. Add statistical
personalization after the system has consented feedback and enough history.

## Complete capability families

### Daily intelligence

- Morning brief
- Evening preparation brief
- “What am I forgetting?” check
- Important-change detection
- Context-aware notification batching
- Daily priority selection
- Weekly planning and reflection

### Time, calendar, and travel

- Unified calendar and timetable
- Conflict detection
- Preparation buffers
- Traffic-aware departure time
- Weather-aware travel advice
- Travel-mode learning
- Smart rescheduling
- Late-running recovery
- Location-based reminders
- Packing and preparation checklists

### Email and communication

- Important-message detection
- Deadline and event extraction
- Attachment discovery
- Follow-up detection
- Draft preparation
- Communication summaries
- Approval-gated sending

### Student and work execution

- Assignment and project tracking
- Deadline-risk detection
- Focus-block suggestions
- Progress-signal aggregation
- Class and meeting preparation packs
- Post-class or post-meeting follow-up
- Task creation from emails, notes, and transcripts
- Goal and habit tracking

### Knowledge and notes

- Notion synchronization
- Drive and document ingestion
- Semantic search
- Source-grounded answers
- Lecture-note drafting
- Study guides and flashcards
- Knowledge connections across classes and projects
- Offline document packs
- Personal decision history

### Devices and ambient context

- Phone battery and connectivity
- Optional laptop companion
- Charger and file-readiness reminders
- Campus Wi-Fi reliability history
- Offline prefetch
- Cross-device handoff
- Device-aware action delivery

### Health and energy

- Sleep-informed planning
- Energy-sensitive reminder timing
- Recovery-aware workload suggestions
- Fitness context
- Strictly optional health-data access

### Automations and actions

- Suggested automation recipes
- Observe, suggest, ask, and act permission modes
- Calendar actions
- Notion and task actions
- File preparation
- Notification actions
- Draft and send actions with separate authority
- Reversible execution where possible
- Complete action history

### Memory and personalization

- Explicit profile and preferences
- Routine detection
- Preferred timing and communication style
- Place and travel habits
- Helpful/dismissed feedback
- Memory inspection and correction
- Confidence and expiry for inferred memory

### Later market expansion

- Professional project and meeting workflows
- Family calendars, errands, and shared reminders
- Caregiver coordination with explicit consent
- Team workload and operational planning
- Organization-admin policies
- Enterprise connectors and licensing
- Optional budgeting and finance context through compliant providers

## Permission ladder

| Level | Meaning | Example |
| --- | --- | --- |
| Observe | Read a permitted source | Read today’s Calendar events |
| Suggest | Produce a recommendation | Suggest leaving at 9:12 |
| Prepare | Create a draft without committing | Draft a Notion note |
| Ask | Present a ready action for approval | Ask to move a focus block |
| Act | Execute a specifically authorized action | Create notes in an approved database |

The default for new capabilities is **Suggest** or **Prepare**, never Act.

## Product success

NEXUS succeeds when it reduces forgotten commitments and unnecessary mental
coordination without becoming another source of interruption.

Primary measures:

- Useful-insight acceptance rate
- Incorrect or annoying notification rate
- Deadlines caught before crisis
- Late arrivals prevented
- Preparation actions completed
- User corrections required
- Time saved
- Retained users who keep at least two connections active

Raw message count and chatbot conversation length are not success metrics.
