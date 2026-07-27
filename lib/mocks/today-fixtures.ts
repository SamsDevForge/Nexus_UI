import type {
  CalendarEvent,
  ContextSignal,
  DeadlineRisk,
  Evidence,
  PreparedAsset,
  TimelineItem,
  TodayScenario,
  TodaySnapshot,
} from "@/lib/domain/contracts";

export const TODAY_SCENARIOS: ReadonlyArray<{
  value: TodayScenario;
  label: string;
  description: string;
}> = [
  {
    value: "rain-and-traffic",
    label: "Rain + traffic",
    description: "Commute pressure with weather, route and calendar evidence.",
  },
  {
    value: "student-normal-day",
    label: "Normal day",
    description: "A calm day where no urgent intervention is needed.",
  },
  {
    value: "deadline-risk",
    label: "Deadline risk",
    description: "A time-sensitive study recommendation with clear evidence.",
  },
  {
    value: "partial-connections",
    label: "Partial connections",
    description: "Calendar is available while email and course pages remain disconnected.",
  },
  {
    value: "connection-stale",
    label: "Stale source",
    description: "A connected source that needs refreshing.",
  },
  {
    value: "first-use",
    label: "First use",
    description: "No connections yet, with one clear first step.",
  },
  {
    value: "loading",
    label: "Loading",
    description: "Context is still being gathered.",
  },
  {
    value: "permission-denied",
    label: "Permission denied",
    description: "Calendar access is paused without inventing context.",
  },
  {
    value: "offline",
    label: "Offline",
    description: "The last prepared view, clearly marked as not live.",
  },
  {
    value: "action-failed",
    label: "Action failed",
    description: "A recoverable preparation failure and retry path.",
  },
  {
    value: "privacy-paused",
    label: "Privacy paused",
    description: "Observation and proactive preparation are paused globally.",
  },
  {
    value: "reduced-motion",
    label: "Reduced motion",
    description: "The same core experience without continuous motion.",
  },
];

const weatherEvidence: Evidence = {
  id: "evidence-weather-bengaluru",
  source: "Weather",
  detail: "Rain probability rises to 78% near campus at 9:35 AM.",
  observedAt: "2026-07-25T09:06:00+05:30",
  freshness: "live",
};

const trafficEvidence: Evidence = {
  id: "evidence-traffic-route",
  source: "Route estimate",
  detail: "Koramangala to campus is taking 18–22 minutes longer than usual.",
  observedAt: "2026-07-25T09:07:00+05:30",
  freshness: "live",
};

const calendarEvidence: Evidence = {
  id: "evidence-calendar-lecture",
  source: "Calendar",
  detail: "CS301 lecture is confirmed for 10:00 AM in Lecture Hall 4.",
  observedAt: "2026-07-25T09:03:00+05:30",
  freshness: "fresh",
};

const nextEvent: CalendarEvent = {
  id: "event-cs301",
  title: "Machine Learning Systems",
  course: "CS301",
  startsAt: "2026-07-25T10:00:00+05:30",
  endsAt: "2026-07-25T11:00:00+05:30",
  place: "Lecture Hall 4",
  preparationMinutes: 12,
  leaveAt: "2026-07-25T09:12:00+05:30",
  status: "confirmed",
};

const timeline: TimelineItem[] = [
  {
    id: "timeline-prepare",
    time: "9:00",
    title: "Review lecture outline",
    detail: "12 min · offline notes prepared",
    kind: "prepare",
    status: "suggested",
  },
  {
    id: "timeline-travel",
    time: "9:12",
    title: "Leave for campus",
    detail: "48 min · rain and traffic buffer included",
    kind: "travel",
    status: "suggested",
  },
  {
    id: "timeline-lecture",
    time: "10:00",
    title: "Machine Learning Systems",
    detail: "Lecture Hall 4 · confirmed",
    kind: "event",
    status: "confirmed",
  },
  {
    id: "timeline-focus",
    time: "2:00",
    title: "Networks assignment focus block",
    detail: "90 min · inferred from your usual Saturday routine",
    kind: "focus",
    status: "inferred",
  },
];

const deadline: DeadlineRisk = {
  id: "deadline-networks",
  title: "Packet routing analysis",
  course: "Computer Networks",
  dueAt: "2026-07-27T23:59:00+05:30",
  remainingLabel: "2 days left",
  progress: 42,
  risk: "medium",
  recommendation: "Protect today’s 2:00 PM focus block to finish the analysis.",
};

const preparedAssets: PreparedAsset[] = [
  {
    id: "asset-lecture-pack",
    name: "ML Systems · Lecture 06",
    kind: "offline-pack",
    detail: "Slides, reading and your last two notes",
    preparedAt: "2026-07-25T08:54:00+05:30",
  },
  {
    id: "asset-question-note",
    name: "Questions for Dr. Mehta",
    kind: "note",
    detail: "3 open questions carried forward",
    preparedAt: "2026-07-25T08:55:00+05:30",
  },
];

const signals: ContextSignal[] = [
  {
    id: "signal-rain",
    label: "Weather",
    value: "Rain from 9:35",
    source: "Weather",
    freshness: "live",
  },
  {
    id: "signal-traffic",
    label: "Route",
    value: "+20 min",
    source: "Route estimate",
    freshness: "live",
  },
  {
    id: "signal-device",
    label: "Laptop",
    value: "84% · files ready",
    source: "Device mock",
    freshness: "fresh",
  },
];

function baseSnapshot(scenario: TodayScenario): TodaySnapshot {
  return {
    scenario,
    viewState: "populated",
    systemState: "insight-ready",
    greeting: "Good morning, Aadi.",
    dateLabel: "Saturday, 25 July",
    locationLabel: "Bengaluru · IST",
    summary: "NEXUS found one change worth making before your first lecture.",
    insight: {
      id: "insight-departure",
      kind: "departure",
      eyebrow: "Highest-value change",
      title: "Leave by 9:12.",
      recommendation:
        "Rain will reach campus during your commute, and traffic is adding about 20 minutes.",
      explanation:
        "Your 10:00 AM lecture is fixed. The current route is 18–22 minutes slower than usual and rain begins near campus before you arrive. Leaving at 9:12 preserves your normal 12-minute preparation buffer.",
      confidence: 0.91,
      freshUntil: "2026-07-25T09:22:00+05:30",
      requiredAuthority: "suggest",
      evidence: [weatherEvidence, trafficEvidence, calendarEvidence],
      proposedAction: {
        id: "action-prepare-commute",
        label: "Prepare commute",
        tool: "commute.prepare",
        reason: "Pin the route and make the lecture pack available offline.",
        requiredAuthority: "ask",
        expiresAt: "2026-07-25T09:22:00+05:30",
      },
    },
    nextEvent,
    timeline,
    deadlines: [deadline],
    preparedAssets,
    signals,
    connections: [
      {
        id: "connection-calendar",
        provider: "Calendar",
        capability: "Today’s schedule",
        health: "healthy",
        lastSyncAt: "2026-07-25T09:03:00+05:30",
      },
      {
        id: "connection-notion",
        provider: "Notion",
        capability: "Selected course pages",
        health: "stale",
        lastSyncAt: "2026-07-24T18:40:00+05:30",
      },
    ],
  };
}

export function buildTodaySnapshot(scenario: TodayScenario): TodaySnapshot {
  const snapshot = baseSnapshot(scenario);

  if (scenario === "student-normal-day") {
    return {
      ...snapshot,
      systemState: "observing",
      summary: "Your morning is on track. NEXUS is watching for meaningful changes.",
      insight: {
        ...snapshot.insight!,
        kind: "calm-day",
        eyebrow: "Day on track",
        title: "No change needed.",
        recommendation:
          "Your 10:00 AM lecture, commute and preparation time all fit comfortably.",
        explanation:
          "Calendar timing and your usual route leave a 14-minute buffer. No source currently crosses the interruption threshold.",
        confidence: 0.94,
        requiredAuthority: "observe",
        proposedAction: undefined,
        evidence: [calendarEvidence],
      },
      signals: signals.map((signal) =>
        signal.id === "signal-rain"
          ? { ...signal, value: "Clear until noon", freshness: "fresh" }
          : signal.id === "signal-traffic"
            ? { ...signal, value: "Normal", freshness: "fresh" }
            : signal,
      ),
    };
  }

  if (scenario === "deadline-risk") {
    return {
      ...snapshot,
      systemState: "approval-needed",
      summary: "One deadline is likely to become urgent without a protected block.",
      insight: {
        ...snapshot.insight!,
        id: "insight-deadline",
        kind: "deadline",
        eyebrow: "Deadline risk",
        title: "Protect 2:00–3:30 PM.",
        recommendation:
          "Your Networks analysis is 42% complete with two days left and no other long focus block scheduled.",
        explanation:
          "The remaining work is larger than your recent 45-minute sessions. Today’s inferred 90-minute window is the last low-conflict block before Monday.",
        confidence: 0.86,
        requiredAuthority: "ask",
        proposedAction: {
          id: "action-hold-focus",
          label: "Hold focus block",
          tool: "calendar.prepare_hold",
          reason: "Prepare a calendar hold without committing it.",
          requiredAuthority: "ask",
          expiresAt: "2026-07-25T13:30:00+05:30",
        },
        evidence: [
          {
            id: "evidence-task-progress",
            source: "Task progress",
            detail: "Packet routing analysis is 42% complete.",
            observedAt: "2026-07-25T08:50:00+05:30",
            freshness: "fresh",
          },
          calendarEvidence,
        ],
      },
    };
  }

  if (scenario === "connection-stale") {
    return {
      ...snapshot,
      systemState: "degraded",
      notice: {
        tone: "warning",
        title: "Notion is 14 hours behind",
        detail:
          "The departure recommendation is current. Prepared-note details may be incomplete until Notion reconnects.",
      },
      connections: snapshot.connections.map((connection) =>
        connection.id === "connection-notion"
          ? { ...connection, health: "stale" }
          : connection,
      ),
      preparedAssets: preparedAssets.slice(0, 1),
    };
  }

  if (scenario === "partial-connections") {
    return {
      ...snapshot,
      systemState: "degraded",
      notice: {
        tone: "info",
        title: "Some context is unavailable",
        detail:
          "Calendar and route guidance remain useful. Email and selected course pages are not connected.",
      },
      connections: snapshot.connections.map((connection) =>
        connection.id === "connection-notion"
          ? { ...connection, health: "disconnected" }
          : connection,
      ),
      preparedAssets: preparedAssets.slice(0, 1),
    };
  }

  if (scenario === "first-use") {
    return {
      ...snapshot,
      viewState: "first-use",
      systemState: "dormant",
      summary: "Connect one source to create your first useful Today view.",
      insight: null,
      nextEvent: null,
      timeline: [],
      deadlines: [],
      preparedAssets: [],
      signals: [],
      connections: [],
    };
  }

  if (scenario === "loading") {
    return {
      ...snapshot,
      viewState: "loading",
      systemState: "gathering",
      insight: null,
      nextEvent: null,
      timeline: [],
      deadlines: [],
      preparedAssets: [],
      signals: [],
    };
  }

  if (scenario === "permission-denied") {
    return {
      ...snapshot,
      viewState: "permission-denied",
      systemState: "privacy-paused",
      summary: "Calendar access is paused, so NEXUS cannot verify your next event.",
      insight: null,
      nextEvent: null,
      timeline: [],
      connections: [
        {
          id: "connection-calendar",
          provider: "Calendar",
          capability: "Today’s schedule",
          health: "permission-denied",
        },
      ],
    };
  }

  if (scenario === "offline") {
    return {
      ...snapshot,
      viewState: "offline",
      systemState: "degraded",
      notice: {
        tone: "warning",
        title: "You’re offline",
        detail:
          "Showing the last prepared view from 8:54 AM. Live rain and traffic advice is unavailable.",
      },
      signals: snapshot.signals.map((signal) => ({
        ...signal,
        freshness: signal.id === "signal-device" ? "fresh" : "stale",
      })),
    };
  }

  if (scenario === "action-failed") {
    return {
      ...snapshot,
      viewState: "error",
      systemState: "degraded",
      notice: {
        tone: "danger",
        title: "The offline pack did not finish",
        detail:
          "Your schedule is unchanged. Retry the preparation action when the connection is stable.",
      },
    };
  }

  if (scenario === "privacy-paused") {
    return {
      ...snapshot,
      systemState: "privacy-paused",
      summary:
        "Observation and automations are paused. Your last prepared view remains visible.",
      notice: {
        tone: "info",
        title: "Privacy pause is active",
        detail:
          "NEXUS is not reading new provider context or evaluating automations until you resume.",
      },
      signals: [],
    };
  }

  if (scenario === "reduced-motion") {
    return {
      ...snapshot,
      summary:
        "Motion is reduced. All state changes remain available through text and status labels.",
    };
  }

  return snapshot;
}
