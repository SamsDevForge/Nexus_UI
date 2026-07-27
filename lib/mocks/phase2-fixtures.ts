import type {
  CoreViewState,
  Evidence,
  InsightsSnapshot,
  KnowledgeDocument,
  KnowledgeSnapshot,
  NexusScenario,
  NexusWorkspaceSnapshot,
  NoteArtifact,
  NotesSnapshot,
  RankedInsight,
  SearchFilters,
  SearchResponse,
  SourceHealth,
  TimelineEntry,
  TimelineGroup,
  TimelineSnapshot,
  UnifiedSearchResult,
  UnifiedSearchResultType,
} from "@/lib/domain/contracts";

export const DEFAULT_NEXUS_SCENARIO: NexusScenario = "rain-and-traffic";

export function parseNexusScenario(value?: string | string[]): NexusScenario {
  const candidate = Array.isArray(value) ? value[0] : value;
  const scenarios: NexusScenario[] = [
    "first-use",
    "loading",
    "student-normal-day",
    "rain-and-traffic",
    "deadline-risk",
    "connection-stale",
    "permission-denied",
    "offline",
    "action-failed",
    "reduced-motion",
  ];

  return scenarios.includes(candidate as NexusScenario)
    ? (candidate as NexusScenario)
    : DEFAULT_NEXUS_SCENARIO;
}

export function scenarioHref(path: string, scenario: NexusScenario) {
  return `${path}?scenario=${scenario}`;
}

function viewStateForScenario(scenario: NexusScenario): CoreViewState {
  if (scenario === "loading") return "loading";
  if (scenario === "first-use") return "empty";
  if (scenario === "connection-stale") return "stale";
  if (scenario === "permission-denied") return "permission-denied";
  if (scenario === "offline") return "offline";
  if (scenario === "action-failed") return "error";
  return "populated";
}

const calendarEvidence: Evidence = {
  id: "evidence-calendar-ml",
  source: "Calendar",
  detail: "Machine Learning Systems is confirmed for 10:00 AM in Lecture Hall 4.",
  observedAt: "2026-07-25T09:03:00+05:30",
  freshness: "fresh",
};

const routeEvidence: Evidence = {
  id: "evidence-route-campus",
  source: "Route estimate",
  detail: "The campus route is 18 to 22 minutes slower than usual.",
  observedAt: "2026-07-25T09:07:00+05:30",
  freshness: "live",
};

const weatherEvidence: Evidence = {
  id: "evidence-weather-rain",
  source: "Weather",
  detail: "Rain probability reaches 78% near campus at 9:35 AM.",
  observedAt: "2026-07-25T09:06:00+05:30",
  freshness: "live",
};

const assignmentEvidence: Evidence = {
  id: "evidence-task-networks",
  source: "Task progress",
  detail: "Packet routing analysis is 42% complete and due Monday at 11:59 PM.",
  observedAt: "2026-07-25T08:50:00+05:30",
  freshness: "fresh",
};

const noteEvidence: Evidence = {
  id: "evidence-note-routing",
  source: "Internal NEXUS note",
  detail: "The latest routing note contains three unresolved analysis questions.",
  observedAt: "2026-07-24T18:40:00+05:30",
  freshness: "fresh",
};

const baseSourceHealth: SourceHealth[] = [
  {
    id: "health-calendar",
    source: "Calendar",
    capability: "Events and free time",
    state: "healthy",
    freshness: "fresh",
    lastObservedAt: "2026-07-25T09:03:00+05:30",
    detail: "Demo calendar fixture is available.",
  },
  {
    id: "health-route",
    source: "Route estimate",
    capability: "Travel timing",
    state: "healthy",
    freshness: "live",
    lastObservedAt: "2026-07-25T09:07:00+05:30",
    detail: "Demo route fixture is current.",
  },
  {
    id: "health-knowledge",
    source: "Knowledge sources",
    capability: "Selected course material",
    state: "healthy",
    freshness: "fresh",
    lastObservedAt: "2026-07-25T08:58:00+05:30",
    detail: "Permitted demo documents are available.",
  },
];

function sourceHealthForScenario(scenario: NexusScenario): SourceHealth[] {
  if (scenario === "permission-denied") {
    return baseSourceHealth.map((health) =>
      health.id === "health-calendar"
        ? {
            ...health,
            state: "permission-denied",
            freshness: "disconnected",
            detail: "Calendar read access is paused.",
          }
        : health,
    );
  }

  if (scenario === "connection-stale") {
    return baseSourceHealth.map((health) =>
      health.id === "health-knowledge"
        ? {
            ...health,
            state: "stale",
            freshness: "stale",
            detail: "Course material is 14 hours behind.",
          }
        : health,
    );
  }

  if (scenario === "offline") {
    return baseSourceHealth.map((health) => ({
      ...health,
      state: "offline",
      freshness: "stale",
      detail: "Showing the last locally prepared demo state.",
    }));
  }

  return baseSourceHealth;
}

function noticeForScenario(scenario: NexusScenario) {
  if (scenario === "connection-stale") {
    return "Knowledge material is 14 hours behind. Calendar and local notes remain usable.";
  }
  if (scenario === "permission-denied") {
    return "Calendar access is paused. NEXUS will not infer missing event times.";
  }
  if (scenario === "offline") {
    return "Offline: showing local results prepared at 8:54 AM. Live sources are unavailable.";
  }
  if (scenario === "action-failed") {
    return "A prepared demo action failed safely. No calendar or provider state changed.";
  }
  if (scenario === "reduced-motion") {
    return "Reduced motion is active. State changes remain available through text.";
  }
  return undefined;
}

const focusProposal = {
  id: "proposal-focus-networks",
  tool: "calendar.prepare_focus_block",
  label: "Prepare focus block",
  reason: "Protect 2:00 to 3:30 PM for the Packet routing analysis.",
  parameters: {
    startsAt: "2026-07-25T14:00:00+05:30",
    endsAt: "2026-07-25T15:30:00+05:30",
    title: "Packet routing analysis",
  },
  evidenceRefs: [assignmentEvidence.id, calendarEvidence.id],
  requiredAuthority: "ask" as const,
  expiresAt: "2026-07-25T13:30:00+05:30",
  status: "pending-approval" as const,
};

const timelineToday: TimelineEntry[] = [
  {
    id: "timeline-lecture-prep",
    day: "2026-07-25",
    startsAt: "2026-07-25T09:00:00+05:30",
    endsAt: "2026-07-25T09:12:00+05:30",
    timeLabel: "9:00",
    endLabel: "9:12",
    title: "Review ML lecture outline",
    detail: "Offline slides and two recent notes are ready.",
    kind: "preparation",
    status: "completed",
    source: "Knowledge",
    freshness: "fresh",
    confidence: 0.96,
    reasoning: "The pack uses the confirmed lecture and your permitted course material.",
    requiredAuthority: "observe",
  },
  {
    id: "timeline-campus-travel",
    day: "2026-07-25",
    startsAt: "2026-07-25T09:12:00+05:30",
    endsAt: "2026-07-25T09:48:00+05:30",
    timeLabel: "9:12",
    endLabel: "9:48",
    title: "Leave for campus",
    detail: "Rain and traffic buffer included.",
    kind: "travel",
    status: "suggested",
    source: "Route estimate",
    freshness: "live",
    confidence: 0.91,
    reasoning: "Current traffic adds about 20 minutes and rain begins before arrival.",
    requiredAuthority: "suggest",
  },
  {
    id: "timeline-ml-lecture",
    day: "2026-07-25",
    startsAt: "2026-07-25T10:00:00+05:30",
    endsAt: "2026-07-25T11:00:00+05:30",
    timeLabel: "10:00",
    endLabel: "11:00",
    title: "Machine Learning Systems",
    detail: "CS301, Lecture Hall 4",
    kind: "event",
    status: "confirmed",
    source: "Calendar",
    freshness: "fresh",
    requiredAuthority: "observe",
  },
  {
    id: "timeline-networks-focus",
    day: "2026-07-25",
    startsAt: "2026-07-25T14:00:00+05:30",
    endsAt: "2026-07-25T15:30:00+05:30",
    timeLabel: "2:00",
    endLabel: "3:30",
    title: "Packet routing analysis",
    detail: "90-minute focus block before Monday's deadline.",
    kind: "focus",
    status: "pending-approval",
    source: "NEXUS plan",
    freshness: "fresh",
    confidence: 0.86,
    reasoning: "This is the last low-conflict 90-minute window before the deadline.",
    requiredAuthority: "ask",
    proposedAction: focusProposal,
  },
  {
    id: "timeline-networks-deadline",
    day: "2026-07-25",
    startsAt: "2026-07-25T18:00:00+05:30",
    timeLabel: "6:00",
    title: "Check assignment progress",
    detail: "Packet routing analysis remains at 42%.",
    kind: "deadline",
    status: "at-risk",
    source: "Task progress",
    freshness: "fresh",
    confidence: 0.86,
    reasoning: "The due date, remaining work, and available focus time produce medium risk.",
    requiredAuthority: "suggest",
  },
];

const timelineGroups: TimelineGroup[] = [
  {
    id: "timeline-yesterday",
    date: "2026-07-24",
    label: "Friday, 24 July",
    shortLabel: "Fri 24",
    entries: [
      {
        id: "timeline-lab-complete",
        day: "2026-07-24",
        startsAt: "2026-07-24T15:00:00+05:30",
        endsAt: "2026-07-24T16:00:00+05:30",
        timeLabel: "3:00",
        endLabel: "4:00",
        title: "Networks lab review",
        detail: "Captured three unresolved routing questions.",
        kind: "event",
        status: "completed",
        source: "Calendar",
        freshness: "fresh",
        requiredAuthority: "observe",
      },
    ],
  },
  {
    id: "timeline-today",
    date: "2026-07-25",
    label: "Saturday, 25 July",
    shortLabel: "Today",
    entries: timelineToday,
  },
  {
    id: "timeline-tomorrow",
    date: "2026-07-26",
    label: "Sunday, 26 July",
    shortLabel: "Sun 26",
    entries: [
      {
        id: "timeline-sunday-focus",
        day: "2026-07-26",
        startsAt: "2026-07-26T10:30:00+05:30",
        endsAt: "2026-07-26T11:30:00+05:30",
        timeLabel: "10:30",
        endLabel: "11:30",
        title: "Assignment polish",
        detail: "Fallback hour if today's focus block is not approved.",
        kind: "focus",
        status: "inferred",
        source: "NEXUS plan",
        freshness: "fresh",
        confidence: 0.74,
        reasoning: "This is the next open hour before the deadline.",
        requiredAuthority: "suggest",
      },
    ],
  },
];

export function buildTimelineSnapshot(
  scenario: NexusScenario,
  selectedDay = "2026-07-25",
): TimelineSnapshot {
  const viewState = viewStateForScenario(scenario);
  const hideSchedule =
    viewState === "loading" ||
    viewState === "empty" ||
    viewState === "permission-denied";

  const groups = hideSchedule
    ? []
    : timelineGroups.map((group) => ({
        ...group,
        entries: group.entries.map((entry) => {
          if (scenario === "student-normal-day" && entry.id === "timeline-campus-travel") {
            return {
              ...entry,
              timeLabel: "9:30",
              startsAt: "2026-07-25T09:30:00+05:30",
              detail: "Usual route timing leaves a comfortable buffer.",
              confidence: 0.94,
            };
          }
          if (scenario === "offline") {
            return { ...entry, freshness: "stale" as const };
          }
          return entry;
        }),
      }));

  return {
    scenario,
    viewState,
    currentTime: "2026-07-25T09:08:00+05:30",
    currentTimeLabel: "9:08 AM",
    selectedDay,
    summary:
      scenario === "deadline-risk"
        ? "One protected block keeps the Networks assignment out of the danger zone."
        : "Confirmed commitments, preparation and proposed changes in one time order.",
    groups,
    sourceHealth: sourceHealthForScenario(scenario),
    notice: noticeForScenario(scenario),
  };
}

function departureInsight(): RankedInsight {
  return {
    id: "insight-departure",
    rank: 1,
    category: "travel",
    urgency: "now",
    lifecycle: "active",
    title: "Leave by 9:12.",
    recommendation: "Traffic and rain consume the usual commute buffer.",
    explanation:
      "Your lecture is fixed at 10:00 AM. Current route conditions add about 20 minutes, and rain reaches campus before arrival.",
    evidence: [weatherEvidence, routeEvidence, calendarEvidence],
    confidence: 0.91,
    freshUntil: "2026-07-25T09:22:00+05:30",
    expiresAt: "2026-07-25T09:30:00+05:30",
    requiredAuthority: "suggest",
    quiet: false,
  };
}

function deadlineInsight(): RankedInsight {
  return {
    id: "insight-deadline",
    rank: 1,
    category: "deadline",
    urgency: "today",
    lifecycle: "active",
    title: "Protect 2:00 to 3:30 PM.",
    recommendation: "Use the last low-conflict block for Packet routing analysis.",
    explanation:
      "The assignment is 42% complete with two days left. Recent sessions were shorter than the remaining work requires.",
    evidence: [assignmentEvidence, calendarEvidence],
    confidence: 0.86,
    freshUntil: "2026-07-25T13:30:00+05:30",
    expiresAt: "2026-07-25T14:00:00+05:30",
    requiredAuthority: "ask",
    proposedAction: focusProposal,
    quiet: false,
  };
}

const secondaryInsights: RankedInsight[] = [
  {
    id: "insight-questions",
    rank: 2,
    category: "preparation",
    urgency: "today",
    lifecycle: "active",
    title: "Carry three questions into the lecture.",
    recommendation: "Your latest ML note still has three open questions.",
    explanation:
      "The questions are grounded in your internal note and linked to today's confirmed lecture.",
    evidence: [noteEvidence, calendarEvidence],
    confidence: 0.82,
    freshUntil: "2026-07-25T10:00:00+05:30",
    expiresAt: "2026-07-25T11:00:00+05:30",
    requiredAuthority: "suggest",
    quiet: false,
  },
  {
    id: "insight-offline-pack",
    rank: 3,
    category: "knowledge",
    urgency: "soon",
    lifecycle: "snoozed",
    title: "Lecture pack is ready offline.",
    recommendation: "Slides, reading and recent notes are available for the commute.",
    explanation: "NEXUS prepared only locally available demo material.",
    evidence: [noteEvidence],
    confidence: 0.95,
    freshUntil: "2026-07-25T11:00:00+05:30",
    expiresAt: "2026-07-25T11:00:00+05:30",
    requiredAuthority: "observe",
    quiet: true,
  },
  {
    id: "insight-quiet",
    rank: 4,
    category: "quiet",
    urgency: "quiet",
    lifecycle: "active",
    title: "No interruption needed after 4:00 PM.",
    recommendation: "The rest of the day remains flexible.",
    explanation: "No permitted source crosses the usefulness threshold.",
    evidence: [calendarEvidence],
    confidence: 0.9,
    freshUntil: "2026-07-25T16:00:00+05:30",
    expiresAt: "2026-07-25T20:00:00+05:30",
    requiredAuthority: "observe",
    quiet: true,
  },
];

const insightHistory: RankedInsight[] = [
  {
    ...secondaryInsights[0],
    id: "insight-history-acted",
    rank: 5,
    lifecycle: "acted",
    title: "ML lecture pack prepared.",
    recommendation: "The local pack was recorded as prepared at 8:54 AM.",
  },
  {
    ...secondaryInsights[1],
    id: "insight-history-expired",
    rank: 6,
    lifecycle: "expired",
    title: "Review yesterday's lab notes.",
    recommendation: "This suggestion expired after the lab ended.",
  },
];

export function buildInsightsSnapshot(scenario: NexusScenario): InsightsSnapshot {
  const viewState = viewStateForScenario(scenario);
  const hideInsights =
    viewState === "loading" ||
    viewState === "empty" ||
    viewState === "permission-denied";
  const primary =
    scenario === "deadline-risk" ? deadlineInsight() : departureInsight();

  return {
    scenario,
    viewState,
    summary: hideInsights
      ? "NEXUS needs permitted, current sources before ranking recommendations."
      : "One recommendation deserves attention; the rest can wait.",
    primary: hideInsights ? null : primary,
    stream: hideInsights ? [] : [deadlineInsight(), ...secondaryInsights].filter(
      (insight) => insight.id !== primary.id,
    ),
    history: hideInsights ? [] : insightHistory,
    sourceHealth: sourceHealthForScenario(scenario),
    notice: noticeForScenario(scenario),
  };
}

const conversationScripts = [
  {
    id: "script-departure",
    prompt: "Why should I leave at 9:12?",
    contextLabel: "Travel reasoning",
    messages: [
      {
        id: "message-departure-user",
        role: "user" as const,
        content: "Why should I leave at 9:12?",
        createdAt: "2026-07-25T09:08:00+05:30",
        evidence: [],
        state: "complete" as const,
      },
      {
        id: "message-departure-nexus",
        role: "nexus" as const,
        content:
          "Your 10:00 AM lecture is fixed. The route is 18 to 22 minutes slower than usual, and rain begins near campus before you arrive. Leaving at 9:12 preserves a 12-minute preparation buffer.",
        createdAt: "2026-07-25T09:08:01+05:30",
        evidence: [calendarEvidence, routeEvidence, weatherEvidence],
        state: "complete" as const,
      },
    ],
  },
  {
    id: "script-tomorrow",
    prompt: "What do I need for tomorrow?",
    contextLabel: "Preparation summary",
    messages: [
      {
        id: "message-tomorrow-user",
        role: "user" as const,
        content: "What do I need for tomorrow?",
        createdAt: "2026-07-25T09:09:00+05:30",
        evidence: [],
        state: "complete" as const,
      },
      {
        id: "message-tomorrow-nexus",
        role: "nexus" as const,
        content:
          "Finish the Packet routing analysis, review the three unresolved questions, and keep the lab brief available. I found source material for each item; no provider action has been taken.",
        createdAt: "2026-07-25T09:09:01+05:30",
        evidence: [assignmentEvidence, noteEvidence],
        state: "complete" as const,
      },
    ],
  },
  {
    id: "script-forgetting",
    prompt: "What am I forgetting?",
    contextLabel: "Unresolved context",
    messages: [
      {
        id: "message-forgetting-user",
        role: "user" as const,
        content: "What am I forgetting?",
        createdAt: "2026-07-25T09:10:00+05:30",
        evidence: [],
        state: "complete" as const,
      },
      {
        id: "message-forgetting-nexus",
        role: "nexus" as const,
        content:
          "The Networks analysis still needs a protected work block, and your ML note has three questions that have not been reviewed. Those are the only unresolved items supported by current demo sources.",
        createdAt: "2026-07-25T09:10:01+05:30",
        evidence: [assignmentEvidence, noteEvidence],
        state: "complete" as const,
      },
    ],
  },
  {
    id: "script-find-notes",
    prompt: "Find my latest Machine Learning notes.",
    contextLabel: "Knowledge retrieval",
    messages: [
      {
        id: "message-find-user",
        role: "user" as const,
        content: "Find my latest Machine Learning notes.",
        createdAt: "2026-07-25T09:11:00+05:30",
        evidence: [],
        state: "complete" as const,
      },
      {
        id: "message-find-nexus",
        role: "nexus" as const,
        content:
          "The newest permitted item is “ML Systems · Lecture 06”, updated yesterday at 6:40 PM. It links the lecture outline, two earlier notes, and three open questions.",
        createdAt: "2026-07-25T09:11:01+05:30",
        evidence: [noteEvidence],
        state: "complete" as const,
      },
    ],
  },
  {
    id: "script-focus",
    prompt: "Prepare a focus block for the assignment.",
    contextLabel: "Prepared action",
    messages: [
      {
        id: "message-focus-user",
        role: "user" as const,
        content: "Prepare a focus block for the assignment.",
        createdAt: "2026-07-25T09:12:00+05:30",
        evidence: [],
        state: "complete" as const,
      },
      {
        id: "message-focus-nexus",
        role: "nexus" as const,
        content:
          "I prepared a 2:00 to 3:30 PM focus block for Packet routing analysis. It is only a preview and needs your approval before any calendar action could be recorded.",
        createdAt: "2026-07-25T09:12:01+05:30",
        evidence: [assignmentEvidence, calendarEvidence],
        state: "prepared" as const,
      },
    ],
    proposal: focusProposal,
    toolResult: {
      id: "tool-result-focus",
      proposalId: focusProposal.id,
      status: "not-run" as const,
      recordedAt: "2026-07-25T09:12:01+05:30",
      summary: "No tool was run. This is a deterministic Phase 2 preview.",
      reversible: true,
    },
  },
];

export function buildNexusWorkspaceSnapshot(
  scenario: NexusScenario,
): NexusWorkspaceSnapshot {
  const viewState = viewStateForScenario(scenario);
  const hideConversation =
    viewState === "loading" ||
    viewState === "empty" ||
    viewState === "permission-denied";
  const scripts = hideConversation
    ? []
    : conversationScripts.map((script) => {
        if (scenario === "action-failed" && script.id === "script-focus") {
          return {
            ...script,
            messages: script.messages.map((message) =>
              message.role === "nexus"
                ? {
                    ...message,
                    content:
                      "The focus-block preview could not be recorded. Your calendar is unchanged, and the action can be retried safely.",
                    state: "failed" as const,
                  }
                : message,
            ),
            toolResult: {
              id: "tool-result-focus-failed",
              proposalId: focusProposal.id,
              status: "failed" as const,
              recordedAt: "2026-07-25T09:12:02+05:30",
              summary: "Mock action failed before any external change.",
              reversible: true,
            },
          };
        }
        return script;
      });

  return {
    scenario,
    viewState,
    contextSummary:
      scenario === "deadline-risk"
        ? "Packet routing analysis is 42% complete, due Monday, and has one viable 90-minute block today."
        : "A 10:00 AM ML lecture, a rain-affected commute, and one Networks deadline shape the day.",
    contextSignals: hideConversation
      ? []
      : [
          {
            id: "context-next-event",
            label: "Next event",
            value: "ML Systems · 10:00",
            source: "Calendar",
            freshness: "fresh",
          },
          {
            id: "context-deadline",
            label: "Deadline",
            value: "Packet routing · 2 days",
            source: "Task progress",
            freshness: "fresh",
          },
          {
            id: "context-route",
            label: "Route",
            value: "+20 min",
            source: "Route estimate",
            freshness: scenario === "offline" ? "stale" : "live",
          },
        ],
    threads: hideConversation
      ? []
      : [
          {
            id: "thread-today",
            title: "Today and the Networks deadline",
            updatedAt: "2026-07-25T09:12:01+05:30",
            messages: scripts[0]?.messages ?? [],
          },
          {
            id: "thread-notes",
            title: "Machine Learning notes",
            updatedAt: "2026-07-24T18:42:00+05:30",
            messages: scripts[3]?.messages ?? [],
          },
        ],
    scripts,
    selectedScriptId: scenario === "deadline-risk" ? "script-focus" : "script-departure",
    sourceHealth: sourceHealthForScenario(scenario),
    notice: noticeForScenario(scenario),
  };
}

const knowledgeDocuments: KnowledgeDocument[] = [
  {
    id: "document-ml-lecture-06",
    title: "ML Systems · Lecture 06",
    course: "Machine Learning Systems",
    sourceId: "source-internal",
    sourceLabel: "Internal NEXUS notes",
    kind: "internal-note",
    updatedAt: "2026-07-24T18:40:00+05:30",
    freshness: "fresh",
    excerpt: "Serving-time feature pipelines, skew checks, and monitoring boundaries.",
    evidenceExcerpt:
      "Three open questions remain around training-serving skew and rollback thresholds.",
    permission: "Available from internal demo notes",
    relatedDocumentIds: ["document-ml-slides", "document-routing-brief"],
    noteId: "note-ml-lecture-06",
  },
  {
    id: "document-routing-brief",
    title: "Packet routing lab brief",
    course: "Computer Networks",
    sourceId: "source-drive",
    sourceLabel: "Google Drive demo",
    kind: "drive",
    updatedAt: "2026-07-24T17:20:00+05:30",
    freshness: "fresh",
    excerpt: "Compare link-state and distance-vector convergence under failure.",
    evidenceExcerpt:
      "The analysis requires one failure trace, a convergence comparison, and a short conclusion.",
    permission: "Selected document preview only",
    relatedDocumentIds: ["document-routing-email", "document-ml-lecture-06"],
    noteId: "note-routing-analysis",
  },
  {
    id: "document-ml-slides",
    title: "Lecture 06 slides",
    course: "Machine Learning Systems",
    sourceId: "source-notion",
    sourceLabel: "Notion demo",
    kind: "notion",
    updatedAt: "2026-07-24T16:05:00+05:30",
    freshness: "fresh",
    excerpt: "System reliability, data validation, model rollout, and observability.",
    evidenceExcerpt:
      "Rollback criteria should be specified before a new model version is released.",
    permission: "Selected course page preview only",
    relatedDocumentIds: ["document-ml-lecture-06"],
    noteId: "note-ml-lecture-06",
  },
  {
    id: "document-routing-email",
    title: "Networks assignment clarification",
    course: "Computer Networks",
    sourceId: "source-email",
    sourceLabel: "Email attachment demo",
    kind: "email-attachment",
    updatedAt: "2026-07-23T13:10:00+05:30",
    freshness: "fresh",
    excerpt: "The conclusion may use either simulated or measured convergence data.",
    evidenceExcerpt:
      "Include your assumptions and label the failure point in the trace.",
    permission: "Attachment metadata and excerpt preview only",
    relatedDocumentIds: ["document-routing-brief"],
    noteId: "note-routing-analysis",
  },
];

export function buildKnowledgeSnapshot(scenario: NexusScenario): KnowledgeSnapshot {
  const viewState = viewStateForScenario(scenario);
  const hideKnowledge =
    viewState === "loading" ||
    viewState === "empty" ||
    viewState === "permission-denied";
  const documents = hideKnowledge
    ? []
    : knowledgeDocuments.map((document) =>
        scenario === "connection-stale" && document.sourceId === "source-notion"
          ? { ...document, freshness: "stale" as const }
          : scenario === "offline"
            ? { ...document, freshness: "stale" as const }
            : document,
      );

  return {
    scenario,
    viewState,
    summary: hideKnowledge
      ? "Knowledge retrieval starts only after source material is permitted."
      : "Permitted course material, recent notes and related evidence in one view.",
    sources: hideKnowledge
      ? []
      : [
          {
            id: "source-notion",
            name: "Notion demo",
            kind: "notion",
            status: scenario === "connection-stale" ? "stale" : "available",
            freshness: scenario === "connection-stale" ? "stale" : "fresh",
            permission: "Selected course pages",
            documentCount: 1,
            detail: "Future connector shape; no account is connected.",
          },
          {
            id: "source-drive",
            name: "Google Drive demo",
            kind: "drive",
            status: "available",
            freshness: scenario === "offline" ? "stale" : "fresh",
            permission: "Selected document previews",
            documentCount: 1,
            detail: "Deterministic document fixture.",
          },
          {
            id: "source-email",
            name: "Email attachment demo",
            kind: "email-attachment",
            status: "available",
            freshness: scenario === "offline" ? "stale" : "fresh",
            permission: "Attachment excerpt only",
            documentCount: 1,
            detail: "No mailbox access exists.",
          },
          {
            id: "source-internal",
            name: "Internal NEXUS notes",
            kind: "internal-note",
            status: "available",
            freshness: "fresh",
            permission: "Local demo content",
            documentCount: 1,
            detail: "Stored only in the deterministic fixture.",
          },
        ],
    recent: documents,
    related: documents.filter((document) =>
      ["document-routing-brief", "document-ml-slides"].includes(document.id),
    ),
    sourceHealth: sourceHealthForScenario(scenario),
    notice: noticeForScenario(scenario),
  };
}

const notes: NoteArtifact[] = [
  {
    id: "note-routing-analysis",
    title: "Packet routing analysis",
    group: "Computer Networks",
    state: "needs-review",
    updatedAt: "2026-07-25T08:42:00+05:30",
    summary: "Draft structure for the assignment due Monday.",
    body:
      "Compare convergence after a link failure.\n\n1. Label the failure point.\n2. Compare link-state and distance-vector recovery.\n3. State assumptions before the conclusion.",
    sourceMaterialAvailable: true,
    citations: [
      {
        id: "citation-routing-brief",
        sourceDocumentId: "document-routing-brief",
        sourceLabel: "Packet routing lab brief",
        excerpt: "Compare link-state and distance-vector convergence under failure.",
      },
      {
        id: "citation-routing-email",
        sourceDocumentId: "document-routing-email",
        sourceLabel: "Networks assignment clarification",
        excerpt: "Include assumptions and label the failure point.",
      },
    ],
    actionItems: [
      "Add one failure trace",
      "Write the convergence comparison",
      "Finish the conclusion",
    ],
    unresolvedQuestions: ["Which trace best shows count-to-infinity?"],
    confidence: 0.86,
    preparedAction: {
      id: "proposal-note-notion",
      tool: "notion.prepare_note",
      label: "Prepare for Notion",
      reason: "Preview a structured note in the selected course destination.",
      parameters: {
        title: "Packet routing analysis",
        destination: "Computer Networks",
      },
      evidenceRefs: ["document-routing-brief", "document-routing-email"],
      requiredAuthority: "ask",
      expiresAt: "2026-07-25T20:00:00+05:30",
      status: "prepared",
    },
  },
  {
    id: "note-ml-lecture-06",
    title: "ML Systems · Lecture 06",
    group: "Machine Learning Systems",
    state: "draft",
    updatedAt: "2026-07-24T18:40:00+05:30",
    summary: "Source-grounded lecture outline with three open questions.",
    body:
      "Serving-time pipelines must make skew visible.\n\nReview rollback thresholds before the next lecture.",
    sourceMaterialAvailable: true,
    citations: [
      {
        id: "citation-ml-slides",
        sourceDocumentId: "document-ml-slides",
        sourceLabel: "Lecture 06 slides",
        excerpt: "Rollback criteria should be specified before release.",
      },
    ],
    actionItems: ["Ask about rollback thresholds"],
    unresolvedQuestions: [
      "How is online skew measured?",
      "When does a feature require backfill?",
      "Who owns rollback approval?",
    ],
    confidence: 0.82,
  },
  {
    id: "note-lab-retro",
    title: "Networks lab retrospective",
    group: "Computer Networks",
    state: "reviewed",
    updatedAt: "2026-07-24T16:10:00+05:30",
    summary: "Reviewed observations from the routing lab.",
    body: "The failure trace is cleanest when the link drops after convergence.",
    sourceMaterialAvailable: true,
    citations: [
      {
        id: "citation-lab-brief",
        sourceDocumentId: "document-routing-brief",
        sourceLabel: "Packet routing lab brief",
        excerpt: "Compare convergence under failure.",
      },
    ],
    actionItems: [],
    unresolvedQuestions: [],
    confidence: 0.94,
  },
  {
    id: "note-study-plan",
    title: "Weekend study plan",
    group: "Personal",
    state: "mock-synced",
    updatedAt: "2026-07-24T12:00:00+05:30",
    summary: "A reviewed local plan represented as mock-synced.",
    body: "Saturday: lecture and Networks focus block. Sunday: polish and submit.",
    sourceMaterialAvailable: true,
    citations: [],
    actionItems: ["Protect Saturday focus block"],
    unresolvedQuestions: [],
    confidence: 0.9,
  },
];

export function buildNotesSnapshot(scenario: NexusScenario): NotesSnapshot {
  const viewState = viewStateForScenario(scenario);
  const hideNotes =
    viewState === "loading" ||
    viewState === "empty" ||
    viewState === "permission-denied";

  return {
    scenario,
    viewState,
    summary: hideNotes
      ? "NEXUS cannot prepare factual notes without permitted source material."
      : "Review source-grounded drafts before any future provider preparation.",
    notes: hideNotes ? [] : notes,
    sourceHealth: sourceHealthForScenario(scenario),
    notice: noticeForScenario(scenario),
  };
}

const unifiedResults: UnifiedSearchResult[] = [
  {
    id: "search-event-ml",
    type: "event",
    title: "Machine Learning Systems",
    excerpt: "Saturday at 10:00 AM · Lecture Hall 4",
    source: "Calendar",
    freshness: "fresh",
    updatedAt: "2026-07-25T09:03:00+05:30",
    href: "/app/timeline",
    permission: "available",
    keywords: ["machine", "learning", "ml", "lecture", "today"],
  },
  {
    id: "search-task-routing",
    type: "task",
    title: "Packet routing analysis",
    excerpt: "42% complete · due Monday · focus block pending",
    source: "Task progress",
    freshness: "fresh",
    updatedAt: "2026-07-25T08:50:00+05:30",
    href: "/app/timeline",
    permission: "available",
    keywords: ["packet", "routing", "networks", "assignment", "deadline"],
  },
  {
    id: "search-insight-focus",
    type: "insight",
    title: "Protect 2:00 to 3:30 PM",
    excerpt: "The last low-conflict block before the Networks deadline.",
    source: "NEXUS insight",
    freshness: "fresh",
    updatedAt: "2026-07-25T08:51:00+05:30",
    href: "/app/insights",
    permission: "available",
    keywords: ["focus", "assignment", "networks", "deadline"],
  },
  {
    id: "search-conversation-forgetting",
    type: "conversation",
    title: "What am I forgetting?",
    excerpt: "The Networks block and three ML questions remain unresolved.",
    source: "NEXUS conversation",
    freshness: "fresh",
    updatedAt: "2026-07-25T09:10:00+05:30",
    href: "/app/nexus",
    permission: "available",
    keywords: ["forgetting", "questions", "networks", "machine", "learning"],
  },
  {
    id: "search-knowledge-ml",
    type: "knowledge",
    title: "ML Systems · Lecture 06",
    excerpt: "Serving-time pipelines, skew checks, and rollback thresholds.",
    source: "Internal NEXUS notes",
    freshness: "fresh",
    updatedAt: "2026-07-24T18:40:00+05:30",
    href: "/app/knowledge",
    permission: "available",
    keywords: ["machine", "learning", "ml", "notes", "lecture", "skew"],
  },
  {
    id: "search-note-routing",
    type: "note",
    title: "Packet routing analysis",
    excerpt: "Draft structure, two citations, and three action items.",
    source: "Internal NEXUS notes",
    freshness: "fresh",
    updatedAt: "2026-07-25T08:42:00+05:30",
    href: "/app/notes",
    permission: "available",
    keywords: ["packet", "routing", "analysis", "draft", "note"],
  },
  {
    id: "search-email-routing",
    type: "email-derived",
    title: "Networks assignment clarification",
    excerpt: "Attachment excerpt: label the failure point and state assumptions.",
    source: "Email attachment demo",
    freshness: "fresh",
    updatedAt: "2026-07-23T13:10:00+05:30",
    href: "/app/knowledge",
    permission: "available",
    keywords: ["email", "networks", "assignment", "clarification", "attachment"],
  },
  {
    id: "search-restricted",
    type: "knowledge",
    title: "Private project archive",
    excerpt: "Permission is required before this source can be searched.",
    source: "Drive demo",
    freshness: "disconnected",
    updatedAt: "2026-07-20T12:00:00+05:30",
    href: "/app/knowledge",
    permission: "restricted",
    keywords: ["private", "archive", "project"],
  },
];

export function buildSearchResponse(
  scenario: NexusScenario,
  query = "",
  filters: Partial<SearchFilters> = {},
): SearchResponse {
  const viewState = viewStateForScenario(scenario);
  const normalized = query.trim().toLowerCase();
  const selectedTypes = filters.types ?? [];
  const selectedSources = filters.sources ?? [];
  const restrictedScenario = scenario === "permission-denied";

  let results = unifiedResults.filter((result) => {
    if (selectedTypes.length > 0 && !selectedTypes.includes(result.type)) return false;
    if (selectedSources.length > 0 && !selectedSources.includes(result.source)) return false;
    if (!normalized) return result.permission === "available";
    const haystack = [
      result.title,
      result.excerpt,
      result.source,
      ...result.keywords,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });

  if (restrictedScenario) {
    results = unifiedResults.filter((result) => result.permission === "restricted");
  } else if (scenario === "first-use" || scenario === "loading") {
    results = [];
  } else if (scenario === "offline") {
    results = results
      .filter((result) =>
        ["conversation", "knowledge", "note"].includes(result.type),
      )
      .map((result) => ({ ...result, freshness: "stale" as const }));
  }

  const availableTypes: UnifiedSearchResultType[] = [
    "event",
    "task",
    "insight",
    "conversation",
    "knowledge",
    "note",
    "email-derived",
  ];

  return {
    scenario,
    viewState,
    query,
    results,
    recentSearches: [
      "Machine Learning notes",
      "Packet routing analysis",
      "What am I forgetting?",
    ],
    availableTypes,
    availableSources: [...new Set(unifiedResults.map((result) => result.source))],
    localOnly: scenario === "offline",
    notice: noticeForScenario(scenario),
  };
}

export function findKnowledgeDocument(documentId: string) {
  return knowledgeDocuments.find((document) => document.id === documentId) ?? null;
}

export function searchKnowledgeDocuments(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return knowledgeDocuments;

  return knowledgeDocuments.filter((document) =>
    [
      document.title,
      document.course,
      document.excerpt,
      document.evidenceExcerpt,
      document.sourceLabel,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );
}

export function findNote(noteId: string) {
  return notes.find((note) => note.id === noteId) ?? null;
}
