> Owner-supplied end-product vision. This describes intended capabilities, not live integrations. The source handoff includes an earlier Phase 5 checkpoint; use [PROGRESS.md](PROGRESS.md) for current implementation and acceptance status.

# **NEXUS AI — Complete Final Product Vision**

**The AI That Knows What You Need Before You Ask.**

NEXUS should eventually become something much bigger than a productivity application. It should be a personal intelligence system that understands the different parts of someone's life, connects them, recognises what needs attention and helps the person manage things without having to coordinate everything manually.

I would describe the finished product as:

**One personal intelligence system, accessible from every device, that understands your time, work, education, communication, knowledge, habits and surroundings — and helps you manage all of them together.**

The important distinction is that NEXUS isn't supposed to make users spend their time talking to AI. It should make their lives easier even when they aren't opening the application.

A user should be able to wake up, check NEXUS, understand the day, go through their work, receive relevant assistance, find information, prepare for upcoming commitments and manage their responsibilities without constantly jumping between different applications.

I'll describe the complete intended product, including its interface, features, intelligence, integrations, mobile experience, automation, privacy and eventual expansion.

# **1. What the finished NEXUS would actually look like**


Imagine opening NEXUS on your laptop.

You don't land on a conventional dashboard with 12 statistics, charts and cards. You enter an environment that feels like a single intelligent system.

The interface has three visual characteristics:

- A dark graphite and obsidian environment.
- A distinctive illuminated 3D cube that represents the NEXUS intelligence system.
- A clean, precise interface that places important information and decisions in front of the user.

The cube is a core part of the product identity, not just an illustration. Its state represents what the intelligence system is currently doing.

The existing large cross-screen cube has also been explicitly established as a product-owner decision. Its scale, position, material, lighting and visual dominance are to be preserved. New content should be designed around it rather than replacing or shrinking it.

### **The three layers of the experience**

**1. NEXUS public experience**

The website that introduces the product, demonstrates the intelligence concept and establishes trust.

**2. NEXUS personal workspace**

The central environment where the user manages their day, knowledge, commitments, conversations and actions.

**3. NEXUS mobile and device ecosystem**

An Android application, notifications, device awareness, offline access and cross-device assistance.

These three layers share one identity and one personal context.

The website is not the whole product. It is the main workspace through which the user interacts with a wider intelligence system.

# **2. The central intelligence: How NEXUS understands someone's life**

This is arguably the most important part of the entire project.

NEXUS must not simply collect information and display it. It needs to understand relationships between different pieces of information.

For example:

A calendar tells NEXUS that you have a lecture at 10 AM.

Maps tells it that your journey takes 35 minutes.

Weather indicates that rain is expected.

Your preferences indicate that you generally need 15 minutes to prepare before leaving.

Your previous behaviour may indicate that you typically take longer to get ready on certain days.

NEXUS combines these signals and reaches a useful conclusion:

**You should start preparing at 8:57 AM and leave by 9:12 AM.**

It can also explain why, show which sources contributed and tell you how recent the information is.

This same mechanism should work across everything else in the product.

## **The five intelligence layers**


**Context Collection**

Calendar, emails, notes, weather, maps, devices, user preferences, schedules and other permitted sources.


**Context Engine**

Normalizes information, connects related events, people, places, documents, tasks and commitments.


**Decision and Intelligence Engine**

Evaluates urgency, importance, confidence, missing information, user preferences and whether intervention is useful.


**AI and Knowledge Layer**

Understands natural language, retrieves personal knowledge, synthesizes information, explains decisions and prepares bounded actions.


**Action and Feedback Layer**

Presents recommendations, requests approval, executes authorized actions, records results and learns from corrections.

One important architectural principle is that not everything should be handled by an LLM.

For example:

- Calculating a departure time should use actual route information and deterministic calculations.
- Detecting calendar conflicts should use time-overlap logic.
- Finding lecture notes should use knowledge retrieval.
- Understanding a natural-language request should use an LLM.
- Deciding whether an action is permitted should use the permission system, not the LLM.

This separation is what makes NEXUS a reliable intelligence product rather than a chatbot with access to multiple APIs.

05_TECHNICAL_ARCHITECTURE.md

07_AI_RAG_AGENTS.md

# **3. The complete personal workspace**

This is what users will interact with every day.

## **3.1 Today — The central command centre**

Most important daily screen


Today is the first screen users should see when opening NEXUS.

Its job is to answer:

**What is happening today, what matters most, and what should I do next?**

It should bring together information from every relevant connected source.

### **What it contains**

**A. Current NEXUS status**

The cube and accompanying status text indicate whether NEXUS is observing, gathering information, processing, waiting for approval, acting, degraded or paused for privacy.

**B. The most important thing right now**

One main recommendation occupies the visual focus.

For example:

> Your assignment is approaching its deadline. You have approximately 6 hours of available study time before submission, and two sections still need attention.

This recommendation can lead into a focus plan.

**C. Your next commitment**

The next event appears with:

- Event name
- Start time
- Location
- Preparation time
- Estimated journey
- Recommended departure time
- Relevant documents
- Weather and travel context

**D. Your day at a glance**

A unified timeline of classes, meetings, tasks, preparation sessions and other commitments.

**E. Things requiring attention**

Upcoming deadlines, unanswered important messages, missing documents, schedule conflicts and reminders.

**F. Prepared information**

Lecture notes, meeting summaries, study materials and other files that may be needed soon.

**G. Contextual alerts**

Examples:

- Rain expected during your commute.
- Your next class location has changed.
- A professor has sent an important message.
- An assignment deadline is approaching.
- You may not have enough time to complete a task.
- A necessary document hasn't been downloaded for offline use.

Today should be personalised and prioritised. It should not present everything with equal importance.

## **3.2 Timeline — One connected view of time**


Timeline unifies the user's schedule.

It should combine:

- Google Calendar events
- College timetables
- Meetings
- Personal commitments
- Tasks
- Assignment deadlines
- Focus sessions
- Travel time
- Preparation periods
- Suggested scheduling changes

The interesting feature is that NEXUS can introduce events that aren't directly present in the calendar.

For example:

A lecture begins at 10 AM. NEXUS can propose:

- 8:45 AM — Start getting ready.
- 9:12 AM — Leave for campus.
- 9:47 AM — Expected arrival.
- 9:50 AM — Preparation buffer.
- 10:00 AM — Lecture begins.

The confirmed lecture and the proposed preparation blocks must remain visually distinguishable.

### **Additional capabilities**

- Detect overlapping commitments.
- Identify insufficient travel or preparation time.
- Suggest rescheduling.
- Suggest focus blocks around available time.
- Identify missed commitments.
- Show daily, weekly and monthly views.
- Show travel and preparation blocks.
- Explain suggested changes.

Eventually, NEXUS should be able to recover a disrupted day.

For example, when a meeting runs late, it can examine what else is affected and propose a revised schedule.

Actual changes to external calendars remain governed by action permissions.

## **3.3 Insights — The proactive intelligence feed**


Insights is where the system communicates what it has understood.

This is different from notifications.

Notifications are interruptions. Insights are recommendations that the user can inspect, understand and act on.

Examples:

| Insight                  | What NEXUS could do                       |
| ------------------------ | ----------------------------------------- |
| Deadline approaching     | Identify risks and suggest a focus block  |
| Rain expected            | Suggest travel or preparation changes     |
| Important email received | Extract a deadline or required response   |
| Schedule conflict        | Suggest an alternative arrangement        |
| Missing preparation      | Locate relevant documents                 |
| Unfinished task          | Recommend an available time slot          |
| Connectivity problem     | Suggest downloading important material    |
| Unanswered commitment    | Remind the user about a pending follow-up |

Every insight should show its evidence, source, confidence, freshness and expiry.

The user should also be able to tell NEXUS that an insight was incorrect, irrelevant, too early, too late or helpful.

Over time, this improves the relevance of the system.

## **3.4 NEXUS — The conversational workspace**


This is the natural-language interface to the entire system.

The user shouldn't have to navigate five different screens to ask a question.

They can ask:

- What is happening tomorrow?
- Am I missing anything important?
- What should I work on right now?
- Where are my latest project notes?
- Why did you recommend leaving early?
- Summarize my important emails.
- Prepare me for my next meeting.
- Find the document I discussed last week.
- Create a study plan for my upcoming examination.

The assistant should have access only to the context and sources that the user has permitted.

### **The assistant workspace should contain**

1. Conversation history.
2. Suggested questions based on current context.
3. Context relevant to the current conversation.
4. Source references and evidence.
5. Tool and action previews.
6. Approval or rejection controls.
7. Actual recorded results.
8. Recovery when a tool or connection fails.

### **A particularly important feature: contextual continuity**

Suppose the user asks:

> Find my Machine Learning notes.

NEXUS finds the notes.

The user then asks:

> Prepare a study guide from these.

NEXUS should understand what "these" refers to.

Then:

> Add the three most important concepts to my revision plan.

It should understand the previous output and create a proposed action.

This is where the shared context system becomes much more useful than an ordinary chatbot.

## **3.5 Knowledge — A personal searchable knowledge base**


Knowledge is the place where information from different permitted sources becomes accessible in one system.

### **Sources**

- Notion pages and databases
- Google Drive documents where enabled
- Gmail attachments
- Microsoft Teams material where accessible
- Lecture notes
- PDFs
- Documents
- Internal NEXUS notes
- Other imported material

### **Capabilities**

**Unified search:** Search across different sources without opening each service.

**Semantic search:** Search by meaning rather than requiring the exact words.

For example:

> Find the document explaining how normalization works in databases.

Even when the document title does not contain the word normalization, NEXUS can retrieve relevant content.

**Related knowledge:** Connect related documents, projects, subjects and decisions.

**Source previews:** See original content and where the answer came from.

**Knowledge summaries:** Summarise permitted documents or collections.

**Study material:** Generate study guides, revision notes and flashcards.

**Personal decision history:** Find what was previously decided about a project or task.

**Source management:** Display whether a document is available, stale, restricted or removed.

This is where Retrieval-Augmented Generation (RAG) becomes important. NEXUS retrieves relevant information from permitted personal sources and gives the assistant evidence to use when generating answers.

## **3.6 Notes — An active personal notes workspace**


Notes is more than a basic text editor.

It manages knowledge generated or captured by the user and NEXUS.

Features:

- Manual notes
- Lecture notes
- Meeting notes
- Project notes
- AI-prepared notes
- Study guides
- Revision material
- Action-item extraction
- Source citations
- Note editing and review
- Notion preparation and synchronization
- Grouping by subject, course or project

A useful workflow:

The user attends a lecture and later supplies permitted lecture material. NEXUS prepares an organised set of notes, identifies important topics, extracts action items and points out gaps or uncertainty.

The user reviews the draft and approves it.

NEXUS should never present invented factual content as though it came from the source.

## **3.7 Search — Search everything**

The final product should offer two ways to search.

**Dedicated Search screen**

Search and filter all connected information.

**Global search**

Accessible throughout the application using `Ctrl/Cmd + K`.

It should search:

- Notes
- Documents
- Emails
- Meetings
- Events
- Tasks
- Deadlines
- Conversations
- Insights
- Activity history

Results should be grouped by source and relevance, with an extract showing why each result matched.

# **4. Time, travel and daily-life intelligence**

This is one of the most practical feature families in NEXUS.

The point is not to create another calendar application. It is to make the user's commitments aware of their surroundings.


## **4.1 Calendar and timetable intelligence**

- Connect Google Calendar.
- Support manual timetable entry and calendar imports.
- Display a unified schedule.
- Detect conflicting commitments.
- Calculate preparation buffers.
- Track changes to events.
- Detect approaching commitments.
- Suggest rescheduling.
- Provide event preparation checklists.

The roadmap also considers Outlook Calendar, but the currently approved core integration set prioritises Google Calendar.

## **4.2 Weather intelligence**

Connect a weather provider and use the information in actual planning.

Capabilities:

- Current weather
- Forecasts
- Rain probability
- Temperature
- Severe weather alerts
- Weather-aware departure suggestions
- Umbrella reminders
- Outdoor activity adjustments
- Weather-related schedule suggestions

The key is context.

A rain notification is useful only when it matters. NEXUS should connect the forecast to a relevant journey or commitment.

## **4.3 Maps and travel intelligence**

The Maps integration is intended to support:

- Geocoding
- Route estimation
- Traffic information
- Travel duration
- Distance
- Alternative routes
- Departure-time recommendations

Over time, travel recommendations can be adjusted to the user's permitted travel preferences and observed patterns.

For example:

A meeting is at 11 AM.

The usual journey takes 25 minutes, but current traffic estimates 42 minutes.

NEXUS can recommend leaving earlier and explain the calculation.

## **4.4 Location-based context**

With consented Android location access:

- Detect arrival at important places.
- Detect departure from home or campus.
- Trigger location-based reminders.
- Improve travel estimates.
- Detect potentially missed commitments.
- Provide relevant reminders near places.
- Recognise recurring commute patterns.

Location tracking must be purpose-limited. The product should not retain a permanent detailed location history simply because it can.

## **4.5 Recovery from unexpected changes**

This is a more advanced capability.

Suppose:

- A class gets delayed.
- Traffic becomes worse.
- A meeting is extended.
- An assignment takes longer than expected.

NEXUS can identify which later commitments are affected and propose adjustments.

Instead of informing the user about one isolated event, it should help manage the consequences.

# **5. Communication intelligence**

The goal is not to replace Gmail or Microsoft Teams. It is to make information from these services useful within the user's overall context.


## **5.1 Email intelligence**

The Gmail connection is a major part of the intended product.

NEXUS should be capable of:

- Identifying important messages.
- Classifying messages by relevance.
- Detecting deadlines.
- Identifying meeting invitations.
- Extracting tasks and events.
- Finding attachments.
- Detecting follow-ups.
- Connecting messages to existing projects and commitments.
- Summarising important email conversations.
- Preparing response drafts.

Example:

A professor sends an email:

> The assignment submission deadline is Monday. Please upload the completed document before 5 PM.

NEXUS identifies the deadline, links the original message, adds a proposed task and checks the user's schedule.

If the user approves, it can create the appropriate task or reminder.

### **Email drafting**

The user can ask:

> Draft a reply confirming that I will submit the assignment by Monday.

NEXUS prepares the draft.

Sending is a separate action and requires the appropriate authority and confirmation.

## **5.2 Microsoft Teams integration**

The approved core connection set also includes Microsoft Teams.

The intended direction is to bring relevant work and communication context into NEXUS.

Potential capabilities include:

- Access to permitted Teams conversations and material.
- Finding important information.
- Connecting meeting-related information with projects.
- Extracting commitments and follow-ups where supported.
- Finding relevant shared documents.
- Preparing summaries or response drafts where authorised.

The exact Teams capabilities depend on the API scopes and capabilities available to the connection.

## **5.3 Quick Capture for unsupported applications**

This is especially important.

NEXUS cannot realistically integrate with every application.

WhatsApp and other unsupported applications may remain outside the direct connector ecosystem.

Quick Capture solves this through manual input.

The user copies text from another application and pastes it into NEXUS.

They can choose:

- Save as a note.
- Schedule an event.

The captured material becomes part of the user's NEXUS context with its manual-capture provenance.

It is not automatic clipboard monitoring.

# **6. Student and professional productivity intelligence**

NEXUS begins with students, but the same system should eventually work for working professionals.


## **6.1 Assignments and deadlines**

NEXUS can bring assignments and tasks together from permitted sources.

Features:

- Assignment tracking.
- Project tracking.
- Deadline extraction.
- Deadline reminders.
- Task prioritisation.
- Estimated effort tracking.
- Progress signals.
- Overdue task detection.
- Deadline-risk assessment.

The system should avoid claiming a task is incomplete simply because it has not observed progress. It should distinguish actual evidence from missing information.

## **6.2 Focus planning**

This is where NEXUS can become particularly useful.

Instead of leaving users to plan every study session manually, it can examine:

- Upcoming deadlines
- Available calendar space
- Estimated effort
- Importance
- Existing commitments
- User preferences
- Optional energy context

Then suggest focus sessions.

Example:

> Your database assignment is due tomorrow. Two hours are available between your afternoon classes and evening commitments.

NEXUS proposes a focus block.

The user can accept, edit or reject it.

## **6.3 Class and meeting preparation**

Before an event, NEXUS can prepare:

- Relevant notes
- Necessary documents
- Previous meeting summaries
- Open questions
- Previous action items
- Required materials
- Travel information

For a professional meeting, it can also prepare a summary of earlier discussions and unresolved items.

## **6.4 After-class and post-meeting follow-up**

After a class or meeting, NEXUS can help:

- Organise supplied notes.
- Extract action items.
- Identify pending questions.
- Prepare follow-up tasks.
- Link information to the relevant project.
- Create a reviewed note.

## **6.5 Goals and habits**

Eventually, the product can track:

- Study goals
- Project goals
- Personal targets
- Habits
- Recurring commitments
- Progress against plans
- Weekly consistency

It should not turn this into another intrusive streak-based application.

The purpose is to help users maintain commitments and understand their progress.

# **7. NEXUS AI agents — specialised intelligence instead of one giant chatbot**

One important part of the final architecture is the use of specialised, bounded agents.

These agents have different responsibilities. They all work with the same central context, but each performs a narrower task.

## **The intended agent ecosystem**

**1. Morning Brief Agent**

Reviews the upcoming day, selects the most important changes, and prepares a brief with up to three important items and a preparation suggestion.

**2. Departure Agent**

Examines an upcoming event, location, route, weather and preparation buffer to calculate when the user should leave.

**3. Deadline Radar Agent**

Evaluates upcoming deadlines, effort estimates, available time and actual progress evidence. Suggests focus sessions and identifies risks.

**4. Class Preparation Agent**

Collects relevant course material, notes, attachments and previous action items to prepare for upcoming classes.

**5. Note Maker Agent**

Converts supplied source material into structured notes, study guides and action items, retaining evidence and uncertainty.

**6. Inbox Triage Agent**

Identifies important messages, extracts structured commitments, detects follow-ups and prepares drafts when requested.

**7. Weekly Review Agent**

Examines completed tasks, upcoming commitments, user goals and feedback to prepare a weekly review and suggested adjustments.

**8. Device Readiness Agent**

Eventually considers laptop and phone battery, network reliability, file readiness and the expected duration of the day.

**9. Health-aware Planning Agent**

An optional future agent that uses explicitly authorised sleep and activity summaries for conservative workload suggestions, without making medical diagnoses.

Each agent should return structured results containing:

- Recommendation or proposed action.
- Evidence.
- Confidence.
- Expiry.
- Required permission.
- Missing information.
- Failure or limitation status.

The central NEXUS system then determines whether to show the result, notify the user, prepare an action or request approval.

This prevents individual agents from becoming uncontrolled autonomous systems.

07_AI_RAG_AGENTS.md

# **8. Automations — Let NEXUS handle recurring work**


Automations make NEXUS useful without requiring the user to repeat the same instructions.

Some examples:

### **Morning Brief**

Every morning, NEXUS checks the day's important commitments and prepares a summary.

### **Rain-aware Commute**

Before an upcoming journey, NEXUS checks weather and traffic and prepares an appropriate departure recommendation.

### **Deadline Protection**

When an assignment becomes at risk, NEXUS proposes a focus session.

### **Class Preparation**

Before a lecture, NEXUS finds permitted relevant documents and prepares a study pack.

### **Evening Preparation**

In the evening, NEXUS reviews the next day and highlights necessary preparation.

### **Follow-up Reminder**

When an important communication or task indicates a pending response, NEXUS can prepare a reminder.

## **How automation configuration should work**

Users should not need to program complex workflows.

A structured automation editor is the intended interface.

**Example: Rain-aware Commute**

TRIGGER

Upcoming event within the next few hours

CONDITIONS

Check weather and route conditions

EVALUATION

Determine whether the commute requires additional time

RESULT

Prepare a departure recommendation and notify according to user preferences

Users should be able to:

- Create automations from templates.
- Create basic custom rules.
- Edit or duplicate automations.
- Pause and resume them.
- Run dry-runs.
- See what data they use.
- See their last and next execution.
- See failures and dependencies.
- Change their authority level.
- Delete automations.

A global automation kill switch is important.

n8n can support workflow orchestration, webhooks and integrations, but the NEXUS backend remains responsible for permission and execution authority.

# **9. Memory and personalisation — NEXUS gradually understands the user**

This is another defining feature.

NEXUS should eventually understand the user's preferences and routines well enough to make better suggestions.

However, this memory must be transparent and correctable.

## **The different types of memory**

| Memory type       | What it stores                                      |
| ----------------- | --------------------------------------------------- |
| Profile memory    | Timezone, preferences, places, goals                |
| Working memory    | Current task, upcoming event, temporary context     |
| Episodic memory   | Previous decisions, accepted actions and outcomes   |
| Semantic memory   | Stable, user-approved information and relationships |
| Inferred routines | Patterns NEXUS believes it has identified           |

Examples:

- The user generally prefers studying in the evening.
- The user's regular commute takes approximately 35 minutes.
- The user generally prefers morning notifications.
- A particular project is a high priority.
- A certain preparation activity usually takes longer than expected.

Inferred routines must have confidence, supporting evidence, creation time and expiry.

### **What users can do**

- Inspect what NEXUS remembers.
- Confirm a memory.
- Correct it.
- Edit it.
- Delete it.
- Mark information as temporary or persistent.
- Prevent particular information from being inferred.
- Review conflicting information.

The system should learn from explicit user feedback, rather than silently assuming every observed pattern is a permanent preference.

# **10. Notifications and proactive assistance**


NEXUS should not require users to open the dashboard constantly.

It should communicate important things through:

- In-app notifications.
- Web push notifications.
- Android push notifications.
- Morning brief.
- Evening preparation brief.
- Important change alerts.
- Time-sensitive reminders.

### **Examples of notifications**

**Morning Brief**

7:30 AM

Good morning. You have two classes today, one assignment approaching its deadline and a meeting at 4 PM.

**Weather-aware reminder**

Before leaving

Rain is expected during your commute. Consider carrying an umbrella.

**Departure reminder**

9:05 AM

Leave soon. Traffic is currently adding approximately 18 minutes to your route.

**Deadline update**

2:00 PM

Your assignment deadline is tomorrow. A focus session is available this evening.

### **Notification intelligence**

The notification engine should decide:

- Whether something deserves an interruption.
- Whether it can wait.
- Whether multiple alerts should be combined.
- Whether the user is within quiet hours.
- Whether the information has become outdated.
- Whether a similar notification has already been sent.

The underlying principle is that NEXUS should sometimes choose not to notify the user at all.

# **11. Device awareness and cross-device intelligence**

This is where NEXUS eventually moves beyond a browser-based assistant.


## **11.1 Android application**

The mobile application should provide:

- Today.
- Timeline.
- NEXUS assistant.
- Knowledge.
- Settings.
- Notifications.
- Fast approvals.
- Location-based reminders.
- Device context.
- Offline access.
- Cross-device handoff.

The phone is particularly useful because it travels with the user.

It becomes the primary place for timely assistance and fast interaction.

## **11.2 Phone awareness**

With explicit consent, NEXUS can use:

- Current battery level.
- Connectivity status.
- Network availability.
- Location context.
- Relevant device state.

Examples:

- Remind the user to charge their phone before a long day.
- Identify connectivity issues that may affect upcoming work.
- Prepare important material when network access is available.
- Keep selected information accessible offline.

## **11.3 Laptop companion**

This is a later expansion, but an important one.

A lightweight Windows/macOS companion could provide:

- Laptop battery status.
- Charger reminders.
- Network/connectivity information.
- Selected local-file readiness.
- Cross-device handoff.
- Campus or workplace Wi-Fi reliability history.

For example:

The user has a long day at college and their laptop battery is low. NEXUS knows that a lecture requiring the laptop is approaching and reminds them to carry the charger.

The important thing is that recommendations should be based on actual device evidence rather than invented assumptions.

## **11.4 Offline preparation**

NEXUS should eventually prepare selected files for offline use.

Examples:

- Lecture notes.
- Meeting documents.
- Study materials.
- Preparation packs.
- Important reference information.

The app can make these available when the user has weak or no connectivity.

# **12. Optional health, energy and fitness context**

[medium.com](https://medium.com/%40subhraj07/the-rise-of-ai-powered-personal-assistants-how-theyre-transforming-everyday-life-in-2025-8bb05af2aa2b?utm_source=chatgpt.com)

The long-term vision includes optional integrations with health and wearable data through supported providers such as Android Health Connect.

Potential features:

- Sleep summaries.
- Activity summaries.
- Recovery information.
- Fitness context.
- Energy-sensitive planning.
- Conservative workload suggestions.

Example:

A user has a particularly demanding day after a poor night's sleep.

NEXUS may suggest moving an optional focus session or distributing work differently.

This must remain optional, use separate consent and avoid medical diagnoses or treatment recommendations.

Health information should never silently become part of every general-purpose AI conversation.

# **13. Family, professional and business expansion**

The student-first strategy does not mean NEXUS remains a student application permanently.

Its underlying architecture is broad enough to support several types of users.

**Family NEXUS**

Shared calendars, errands, household reminders, delegated tasks and caregiver coordination with explicit visibility controls.

**Professional NEXUS**

Meetings, projects, emails, deadlines, preparation and follow-ups.

**Business NEXUS**

Team workflows, shared commitments, operational planning, administration and organisational policies.

**Personal finance context**

Optional spending summaries, bills, budget goals and reminders through compliant providers and separate consent.

These are long-term product editions, not requirements for the initial student experience.

### **Family coordination**

- Shared calendars.
- Household reminders.
- Errands.
- Delegated responsibilities.
- Shared planning.
- Caregiver coordination.

### **Professional workflows**

- Meeting preparation.
- Project tracking.
- Email context.
- Document search.
- Action-item extraction.
- Meeting follow-ups.
- Workload planning.

### **Business and enterprise**

- Team workflows.
- Shared operational context.
- Organisation permissions.
- Administration.
- Audit and retention policies.
- Enterprise connectors.
- Licensing and billing.

### **Optional finance and fitness**

- Budget tracking.
- Spending summaries.
- Bill reminders.
- Fitness planning.

Highly sensitive information requires separate consent and strict isolation.

# **14. Connections — The services that make NEXUS useful**

The finished system depends on connecting relevant sources.

The currently approved core integration set is:

## **NEXUS connection ecosystem**

**Google Calendar**

Events, schedules, conflicts and timetable context

Core

**Gmail**

Important messages, deadlines, attachments and follow-ups

Core

**Notion**

Personal knowledge, project material and notes

Core

**Microsoft Teams**

Permitted communication and collaborative material

Core

**Maps API**

Geocoding, routing, traffic and journey estimation

Core

**Weather API**

Forecasts and weather-aware decisions

Core

**Quick Capture**

Manual input for WhatsApp and other unsupported applications

Core

**Google Drive**

Additional document discovery and retrieval

Optional

The integration approach is important:

- Each connection must be independently authorised.
- Access must be revocable.
- NEXUS should request only the capabilities it needs.
- Provider data must be converted into common NEXUS data structures.
- Source information must remain traceable.
- Failed or stale connections must not silently generate misleading recommendations.

Google sign-in for a NEXUS account is separate from permission to read a user's Gmail or Calendar.

PHASE_06_CODEX_PROMPT.md

# **15. Trust, permissions and user control**

This is a foundational feature, not something to add at the end.

NEXUS will potentially have access to very personal information. It must make that access understandable.

## **The permission ladder**

**Observe**

Read

NEXUS can access an explicitly permitted source.

**Suggest**

Recommend

NEXUS can make recommendations without changing anything.

**Prepare**

Draft

NEXUS can prepare notes, tasks, drafts and other uncommitted items.

**Ask**

Approval

NEXUS presents a proposed action and asks for permission.

**Act**

Authorised execution

NEXUS performs actions explicitly authorised by the user.

The user must be able to change these permissions.

### **Important controls**

- Pause all observation.
- Pause notifications.
- Pause all automations.
- Disconnect individual accounts.
- Revoke access.
- View connection dependencies.
- Inspect stored memory.
- Correct or delete memory.
- Export personal data.
- Delete source-derived data.
- Delete the NEXUS account.
- View activity logs.
- Use an emergency action kill switch.

### **Action safety**

Consider different risk levels:

| Action                           | Expected handling                                                        |
| -------------------------------- | ------------------------------------------------------------------------ |
| Display a recommendation         | Can happen without approval                                              |
| Search permitted documents       | Follow existing read permissions                                         |
| Prepare a note                   | Prepare permission                                                       |
| Create a task                    | Appropriate action authority                                             |
| Send an email                    | Fresh explicit approval unless separately authorised under a safe policy |
| Delete data                      | Explicit confirmation                                                    |
| Change permissions               | Explicit confirmation                                                    |
| Finance or health-related action | Additional safeguards and consent                                        |

The AI model cannot decide its own permissions. It proposes an action, the backend validates it, the authority system decides whether it is allowed, and the UI presents the result appropriately.

Every actual execution should be recorded.

08_SECURITY_PRIVACY.md

# **16. What the entire day with NEXUS would look like**

This is perhaps the best way to understand the actual final product.

Imagine a student who uses NEXUS as their main personal intelligence system.

7:30 AM · MORNING

**NEXUS understands the day.**

It reviews the user's calendar, upcoming assignments, important emails and weather. It sends a short morning brief with the three most important things to know.

8:30 AM · PREPARATION

**Everything is prepared.**

NEXUS identifies the documents needed for the first lecture, checks their availability and suggests downloading them before leaving.

9:05 AM · COMMUTE

**NEXUS helps with the journey.**

Traffic and weather have changed. The Departure Agent recommends leaving earlier or adjusting the route.

11:00 AM · CLASS

**The knowledge system stays connected.**

Lecture material, notes and previous references are searchable together. The user can ask NEXUS to explain a topic or find related material.

1:00 PM · COMMUNICATION

**Important information doesn't get lost.**

NEXUS identifies an email about an assignment deadline, extracts the relevant details and proposes adding it to the user's task list.

4:00 PM · WORK

**NEXUS helps organise the workload.**

Deadline Radar identifies an approaching assignment. NEXUS suggests a realistic focus session based on the remaining commitments and available time.

8:30 PM · EVENING

**NEXUS prepares tomorrow.**

It reviews unfinished tasks, upcoming events, necessary documents and important changes. The user gets an evening preparation summary.

What makes this powerful is that none of these experiences needs to exist in isolation.

The email can create a task.

The task can influence the deadline-risk assessment.

The deadline risk can produce an insight.

The insight can suggest a focus block.

The focus block can appear in the timeline.

The assistant can explain the entire chain.

The user can review everything in Activity.

That is the connected experience NEXUS should deliver.

# **17. What makes the final product different from existing applications?**

NEXUS will inevitably overlap with functionality already available in calendars, email clients, note-taking applications, AI assistants and automation tools.

The differentiation must come from the way all these capabilities work together.

| Conventional application    | NEXUS approach                                               |
| --------------------------- | ------------------------------------------------------------ |
| Calendar shows events       | Calendar context influences travel, preparation and planning |
| Email displays messages     | Important messages become actionable context                 |
| Notes stores information    | Knowledge connects notes with commitments and projects       |
| Task manager tracks tasks   | Tasks influence the user's overall schedule and priorities   |
| Chatbot answers questions   | NEXUS understands existing context and can prepare actions   |
| Automation runs workflows   | NEXUS evaluates usefulness, authority and consequences       |
| Reminder app sends alerts   | NEXUS prioritises and times interruptions                    |
| Memory feature stores facts | NEXUS maintains inspectable, correctable personal context    |

The most important difference is **contextual continuity**.

The user shouldn't have to tell NEXUS what they have already connected, what their upcoming event is, which assignment they are discussing or which document they previously opened.

The system should have access to that context when appropriate.

It must also understand when it does not have enough information.

# **18. How the complete platform would be built**

This is the technical structure behind the end product. The stack is not the product itself, but it enables the features above.

## **NEXUS platform architecture**

**User interfaces**

Desktop website · Android app · Laptop companion · Push notifications

**Application API and identity**

FastAPI · Pydantic · Authentication · User profiles · Typed contracts

**Context Engine**

Events, relationships, timeline, freshness

**Knowledge Engine**

Documents, RAG, embeddings, retrieval

**Decision Engine**

Rules, prioritisation, notifications

**Agent Runtime**

LLMs, bounded tools, agent orchestration

**Permission and Action Engine**

Approval · Execution · Dry-runs · Action history · Kill switch

**Connected services and devices**

Google · Microsoft · Notion · Weather · Maps · Android · Laptop

### **Planned underlying technology**

| Area                   | Intended technology                                                               |
| ---------------------- | --------------------------------------------------------------------------------- |
| Web frontend           | Existing React/TypeScript application, with Next.js in the approved Phase 6 setup |
| 3D experience          | Three.js / existing cube implementation                                           |
| Mobile                 | React Native / Expo, with native functionality where required                     |
| Backend                | FastAPI                                                                           |
| API validation         | Pydantic                                                                          |
| Database               | PostgreSQL through Neon                                                           |
| Authentication         | Firebase Authentication                                                           |
| Database models        | SQLAlchemy                                                                        |
| Migrations             | Alembic                                                                           |
| Semantic retrieval     | Embeddings and pgvector                                                           |
| Cache and job handling | Redis                                                                             |
| Background work        | Worker framework such as Celery or Dramatiq                                       |
| Workflow orchestration | n8n                                                                               |
| Documents              | Object storage                                                                    |
| AI                     | Existing foundation models accessed through controlled integrations               |

The system should not claim to train its own foundation model. The engineering work is in building the context engine, integrations, retrieval, agents, evaluations, personalisation and action safety around existing models.

05_TECHNICAL_ARCHITECTURE.md

15_DECISIONS.md

# **19. The complete final feature inventory**

To bring all of the above together, this is the eventual product scope.

| Product area       | Final capabilities                                                 |
| ------------------ | ------------------------------------------------------------------ |
| Daily intelligence | Morning brief, evening brief, important changes, daily priorities  |
| Calendar           | Unified schedule, conflicts, buffers, timetable                    |
| Travel             | Maps, traffic, departure planning, weather-aware journeys          |
| Tasks              | Assignments, projects, deadlines, priorities, progress             |
| Focus              | Focus sessions, scheduling, workload planning                      |
| Email              | Important messages, extraction, attachments, drafting, follow-ups  |
| Teams              | Permitted communications and collaborative context                 |
| Knowledge          | RAG, semantic search, documents, related material                  |
| Notes              | Manual notes, AI drafts, study guides, citations, flashcards       |
| Assistant          | Context-aware conversation, explanations and action preparation    |
| Search             | Global search over all permitted information                       |
| Automations        | Templates, triggers, conditions, dry-runs and execution            |
| Memory             | Profile, routines, preferences, episodic and semantic memory       |
| Notifications      | Smart timing, batching, push notifications, quiet hours            |
| Device awareness   | Phone state, location, battery, connectivity                       |
| Laptop companion   | Battery, charger, network and file readiness                       |
| Offline            | Selected documents, cached data and preparation packs              |
| Health             | Optional sleep, activity and recovery context                      |
| Personalisation    | Reminder timing, routine detection, feedback, behavioural patterns |
| Family             | Shared calendars, household tasks and coordination                 |
| Professional       | Projects, meetings, communication and work planning                |
| Business           | Team workflows, operations and organisational control              |
| Finance            | Optional budget and bill context                                   |
| Fitness            | Optional activity and fitness planning                             |
| Trust and safety   | Permissions, audit, revocation, export and deletion                |

02_FULL_PHASE_ROADMAP.md

07_AI_RAG_AGENTS.md

# **20. What the final NEXUS product should not become**

I think this is just as important as the feature list.

NEXUS should not become:

- A generic dashboard with hundreds of cards.
- A chatbot that users must constantly message.
- An automation builder that requires technical knowledge.
- A notification application that interrupts people all day.
- An AI that silently sends emails or modifies calendars.
- A memory system that users cannot inspect or correct.
- A collection of disconnected integrations.
- A system that invents missing information to appear intelligent.

The product should feel calm when nothing needs attention, useful when something changes, transparent when it recommends something and controlled when it wants to take action.

It should not require the user to understand its internal architecture.

# **21. The actual final vision**

Think about NEXUS as a personal operating layer sitting above the applications and services people already use.

It does not need to replace Google Calendar, Gmail, Notion, Microsoft Teams or other tools.

It connects them.

It understands information across them.

It remembers what the user has permitted it to remember.

It recognises relationships that individual applications cannot see in isolation.

It prepares information before it is needed.

It identifies problems before they become urgent.

It helps users make decisions.

And when authorised, it can perform actions on their behalf.

The final product has three fundamental responsibilities:

**Understand:** Know what is happening across the user's permitted personal context.

**Anticipate:** Recognise what is likely to matter next and provide useful assistance at the appropriate time.

**Execute:** Turn decisions into actions, with clear authority, evidence and user control.

The ultimate objective is that users don't have to constantly manage their applications, schedules, reminders, notes, communication and responsibilities separately.

They interact with one system that connects all of them.

**NEXUS should not become another application that people need to manage. It should become the system that helps them manage everything else.**

## **Where this stands today**

One distinction worth preserving: this is the complete intended end product, not a claim that every capability has already been built.

The saved NEXUS handoff documents Phase 5 as the completed website-quality stage, with Phase 6 — Backend, Identity and User Profile — identified as the next implementation milestone. The Phase 6 prompt and setup documentation also establish the future integration direction. I have not treated the existence of those documents as proof that subsequent implementation has been completed.

PHASE_5_QUALITY_REPORT.md

PHASE_06_CODEX_PROMPT.md

The entire product vision remains broader than the initial student-oriented release. No feature family above should be interpreted as an already-live integration or autonomous capability.
