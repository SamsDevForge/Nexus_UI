# NEXUS AI, RAG, and Agent Architecture

## Core rule

Do not use an LLM to replace information that can be calculated, fetched, or
validated deterministically.

Examples:

- Traffic duration comes from a routes provider.
- Calendar conflicts come from time-overlap logic.
- Permission comes from policy.
- Source freshness comes from timestamps.
- RAG retrieves private knowledge.
- The LLM combines, explains, asks clarifying questions, and chooses among
  approved tools.

## Intelligence layers

### Deterministic layer

Handles:

- Time arithmetic
- Travel buffers
- Weather thresholds
- Conflicts
- Deadlines
- Cooldowns
- Notification limits
- Permission checks
- Idempotency
- Data retention

### Retrieval layer

Handles:

- Relevant notes
- Documents
- Email evidence
- Past decisions
- Related tasks
- Lecture material
- User-approved long-term knowledge

### LLM layer

Handles:

- Natural-language understanding
- Synthesis
- Summaries
- Explanations
- Drafting
- Tool selection from an allowlist
- Structured plan generation
- Conversational correction

### Statistical personalization layer

Added after enough data:

- Best reminder timing
- Typical preparation duration
- Deadline risk
- Routine likelihood
- Notification usefulness
- Anomaly detection

## RAG is appropriate for

- “What did my lecturer say about normalization?”
- “Find the document I need for tomorrow.”
- “Summarize my notes and the related email.”
- “Create a study guide from these sources.”
- “What did I decide about this project last week?”

RAG is not the primary solution for:

- “When should I leave?”
- “Is there a calendar conflict?”
- “May NEXUS send this email?”
- “Has this task actually been completed?”
- “Should this notification interrupt the user?”

## RAG pipeline

1. Receive an authorized source change.
2. Fetch and parse content.
3. Preserve provider, account, document, section, timestamps, and permissions.
4. Chunk by document structure rather than arbitrary equal lengths where possible.
5. Generate embeddings.
6. Store lexical and vector indexes.
7. Retrieve with metadata and permission filters.
8. Rerank when useful.
9. Return passages and source links.
10. Generate an answer that cites the retrieved evidence.
11. Delete derived chunks when source access is removed.

Begin with PostgreSQL and pgvector unless scale proves a separate vector
database necessary.

## Memory model

### Working memory

Current time, current location, active task, upcoming events, device state, and
fresh alerts. Short-lived.

### Profile memory

User-stated timezone, places, travel mode, quiet hours, goals, and preferences.

### Episodic memory

Past actions, accepted insights, corrections, and outcomes.

### Semantic memory

Stable user-approved facts and relationships.

### Inferred routine

Pattern-derived beliefs with:

- Confidence
- Supporting observations
- Created and last-confirmed time
- Expiry
- User correction

Do not put every memory into a vector store and hope similarity search produces
correct behaviour. Structured memory remains structured.

## Agent contract

Every agent must have:

- Narrow responsibility
- Typed input
- Typed output
- Explicit tool allowlist
- Time and cost budget
- Evidence
- Confidence
- Required authority
- Expiry
- Failure result
- Evaluation cases

Suggested output:

```json
{
  "status": "proposed",
  "insight": {},
  "evidence": [],
  "confidence": 0.0,
  "requiredAuthority": "suggest",
  "actionProposal": null,
  "expiresAt": "ISO-8601",
  "limitations": []
}
```

## Agent catalogue

### Morning Brief Agent

Inputs:

- Today’s events and tasks
- Weather
- Travel estimates
- Important changes
- Preferences

Output:

- Maximum three high-value items
- One preparation action
- Evidence and freshness

### Departure Agent

Inputs:

- Event start and destination
- Current or selected origin
- Travel mode
- Live route
- User preparation buffer
- Weather

Output:

- Leave time
- Confidence
- Route freshness
- Travel and packing advice

Core calculation remains deterministic.

### Deadline Radar Agent

Inputs:

- Due dates
- Estimated effort
- Progress signals
- Available time
- User priorities

Output:

- Risk level
- Evidence
- Suggested focus block
- Missing information

Do not claim low progress from a due date alone.

### Class Preparation Agent

Inputs:

- Calendar event
- Course
- Recent notes
- Email attachments
- Drive files
- Previous action items

Output:

- Preparation pack
- Missing materials
- Suggested offline downloads

### Note Maker Agent

Inputs:

- Transcript, rough notes, slides, audio transcript, or source documents
- Notion template
- Calendar context

Output:

- Draft note
- Action items
- Questions or uncertainty
- Source citations
- Prepared Notion action

It cannot create factual notes from no source.

### Inbox Triage Agent

Inputs:

- New permitted messages
- Known projects and events
- Sender relevance

Output:

- Importance
- Extracted task/deadline/event
- Evidence
- Draft follow-up when requested

### Weekly Review Agent

Inputs:

- Completed and missed tasks
- Accepted and dismissed insights
- Upcoming commitments
- User goals

Output:

- Concise reflection
- Suggested adjustments
- Memory corrections for approval

### Device Readiness Agent

Later inputs:

- Phone and laptop state
- Expected day length
- File readiness
- Network history

Output:

- Charger, offline-file, or connectivity preparation

### Health-aware Planning Agent

Later inputs:

- User-authorized sleep and activity summary
- Day demands
- Preferences

Output:

- Conservative scheduling suggestion
- No diagnosis or medical claim

## Insight scoring

Use a transparent scoring system such as:

```text
usefulness =
  urgency
  × importance
  × confidence
  × preference_fit
  - interruption_cost
  - recent_notification_penalty
```

The exact model may evolve, but every notification should be explainable using
these concepts.

## Tool execution

Tool lifecycle:

1. Model proposes a structured tool call.
2. Backend validates schema.
3. Backend checks source freshness.
4. Permission engine determines authority.
5. UI previews side effects when approval is required.
6. Backend executes with idempotency.
7. Result is recorded.
8. Model may explain only the recorded result.

The model never marks its own tool call successful.

## Evaluation

Maintain fixed scenario sets for:

- Correct retrieval
- Citation accuracy
- Deadline extraction
- Travel advice
- Notification usefulness
- Tool selection
- Permission refusal
- Missing-data honesty
- Prompt injection from documents or emails
- Agent timeout and provider failure

Evaluate structured correctness before judging prose quality.
