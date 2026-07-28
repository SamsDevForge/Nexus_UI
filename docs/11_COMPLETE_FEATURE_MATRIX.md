# Complete NEXUS AI Feature Matrix

This matrix prevents later phases from forgetting functionality promised in the
pitch or added during product planning.

| Capability | Primary data | Main engine | First real phase | Platform |
| --- | --- | --- | --- | --- |
| Cinematic landing | None | Three.js/UI | 1 | Web |
| Full product shell | Mock contracts | UI | 1 | Web |
| Cross-product state coverage | Mock contracts and source health | Deterministic UI state | 4 | Web |
| Quick Capture manual note/event bridge | User-pasted plain text | Deterministic parsing and service composition | UI 4, durable storage 6+ | Web-first |
| Today intelligence screen | All current context | Ranking/UI | 2, live 16–17 | Both |
| Timeline | Calendar, tasks, travel | Deterministic | 2, live 9 | Both |
| Insight feed | Context events | Ranking | 2, live 17 | Both |
| NEXUS chat | Context and tools | LLM | 13 | Both |
| “Why?” explanations | Evidence and rule result | LLM/template | 13 | Both |
| Unified knowledge search | Notion, Drive, email, documents | RAG | 14 | Both |
| Morning brief | Calendar, tasks, weather | Agent/rules | 8, 15 | Both |
| Evening preparation | Tomorrow’s context | Agent/rules | 15 | Both |
| Weather advice | Weather API, location | Rules | 7 | Both |
| Umbrella reminder | Travel window and rain | Rules | 7–8 | Both |
| Traffic-aware departure | Event, route, buffer | Deterministic | 7, richer 9 | Both |
| Timetable import | Calendar, ICS, manual | Connector | 9 | Both |
| Calendar conflict | Calendar | Deterministic | 9 | Both |
| Preparation buffers | Events and preference | Rules/personalization | 9, 24 | Both |
| Smart rescheduling | Calendar, tasks, policy | Planning agent | 18, 25 | Both |
| Late-running recovery | Location, events, route | Rules/planning | 21, 25 | Mobile-first |
| Important email detection | Gmail/Outlook | Classifier/LLM | 10 | Both |
| Deadline extraction | Email and documents | Structured LLM | 10 | Both |
| Follow-up detection | Email and tasks | Rules/LLM | 10, 15 | Both |
| Email drafting | Email context | LLM | 13 | Both |
| Approval-gated sending | Draft and provider | Action engine | 18+ | Both |
| Assignment tracking | Tasks, Notion, LMS | Structured state | 11 | Both |
| Deadline-risk detection | Due date, effort, progress | Rules/model | 15, 24 | Both |
| Focus-block suggestion | Risk and free time | Planning | 15 | Both |
| Progress inference | Notion, Drive, Git, timers | Feature aggregation | 16, 24 | Both |
| Class preparation pack | Event, email, files, notes | Retrieval agent | 15 | Both |
| Offline preparation pack | Selected files | Action/mobile cache | 18, 21 | Mobile-first |
| Notion notes | Sources and template | RAG/LLM/action | 11, 14–15 | Both |
| Study guide and flashcards | Notes and documents | RAG/LLM | 14 | Both |
| Related-knowledge discovery | Knowledge graph/index | Retrieval | 14+ | Both |
| Automations | Events, rules, actions | Policy/action engine | 18 | Both |
| Observe/Suggest/Ask/Act | Permission policy | Deterministic | UI 3, live 18 | Both |
| Action dry-run | Proposed action | Action engine | 18 | Web-first |
| Action history | All actions | Audit | 6, UI 3 | Both |
| Connection health | Provider status | Connector service | UI 3, live 9 | Both |
| Memory editor | Profile/inferences | Memory service | UI 3, live 19 | Both |
| Routine detection | Context-event history | Statistical model | 24 | Both |
| Reminder timing learning | Feedback/history | Statistical model | 24 | Both |
| Notification batching | Candidate insights | Ranking | 8, 17 | Both |
| Push notifications | Notification service | FCM/web push | 8 | Both |
| Location reminders | Android location | Rules | 21 | Mobile |
| Current commute detection | Android location/routes | Rules/model | 21, 24 | Mobile |
| Phone connectivity | Android device | Native SDK | 21 | Mobile |
| Phone battery context | Android device | Native SDK | 21 | Mobile |
| Laptop charger reminder | Laptop companion/battery | Rules | 23 | Cross-device |
| Campus Wi-Fi reliability | Device/companion history | Feature model | 23–24 | Cross-device |
| Health-aware planning | Health Connect | Rules/agent | 22 | Mobile |
| Poor-sleep adjustment | Sleep summary | Conservative agent | 22 | Mobile |
| Weekly review | History, tasks, feedback | Agent | 15 | Both |
| Goal tracking | User goals and tasks | Structured/planning | 19, 25 | Both |
| “What am I forgetting?” | Unresolved context | Agent/rules | 15–17 | Both |
| Packing checklist | Event, weather, history | Agent | 15, 24 | Both |
| Family coordination | Shared data and roles | Policy/planning | 26 | Both |
| Professional workflows | Work connectors | Agents/actions | 27 | Both |
| Enterprise administration | Organization policy | Admin services | 27 | Web |
| Budget context | Compliant finance provider | Rules/LLM | 28 | Both |
| Fitness context | Health provider | Rules/agent | 22, 28 | Mobile |
| Export and deletion | Stored user data | Privacy service | 6 onward | Web-first |
| Automation kill switch | Action policy | Deterministic | 18 | Both |
| Security and evaluation | Entire platform | Tests/operations | Every phase, final 29 | All |

## Feature-state convention

In UI phases, every listed feature may appear as a designed mock state. The
matrix’s “first real phase” marks when it receives live data or execution
capability.

Never label a mocked capability as connected or autonomous in a real-user
environment.
