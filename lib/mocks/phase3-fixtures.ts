import type {
  ActivityEvent,
  AutomationDefinition,
  ConnectionRecord,
  ControlViewState,
  MemoryItem,
  NexusScenario,
  PermissionGrant,
  UserPreferences,
} from "@/lib/domain/contracts";

export interface Phase3FixtureState {
  scenario: NexusScenario;
  observationPaused: boolean;
  automationsPaused: boolean;
  automations: AutomationDefinition[];
  templates: AutomationDefinition[];
  connections: ConnectionRecord[];
  availableSetups: ConnectionRecord[];
  permissions: PermissionGrant[];
  memories: MemoryItem[];
  activity: ActivityEvent[];
  preferences: UserPreferences;
}

export function controlViewStateForScenario(
  scenario: NexusScenario,
): ControlViewState {
  if (scenario === "loading") return "loading";
  if (scenario === "first-use") return "empty";
  if (scenario === "partial-connections") return "partial";
  if (scenario === "connection-stale") return "stale";
  if (scenario === "permission-denied") return "permission-denied";
  if (scenario === "offline") return "offline";
  if (scenario === "action-failed") return "error";
  if (scenario === "privacy-paused") return "privacy-paused";
  return "populated";
}

export function controlNoticeForScenario(scenario: NexusScenario) {
  if (scenario === "partial-connections") {
    return "Calendar and route context are available. Course material and email remain disconnected.";
  }
  if (scenario === "connection-stale") {
    return "Notion course material needs reconnection. Dependent preparation is paused.";
  }
  if (scenario === "permission-denied") {
    return "Calendar read permission was revoked. Dependent automations are blocked by policy.";
  }
  if (scenario === "offline") {
    return "Offline: controls show the last prepared state. Provider changes are unavailable.";
  }
  if (scenario === "action-failed") {
    return "One prepared action failed safely and can be retried. No provider state changed.";
  }
  if (scenario === "privacy-paused") {
    return "Observation and automations are paused. NEXUS is not reading or preparing new context.";
  }
  if (scenario === "reduced-motion") {
    return "Reduced motion is active. Every state change remains available through text.";
  }
  return undefined;
}

const automationSeed: AutomationDefinition[] = [
  {
    id: "automation-morning-brief",
    name: "Morning brief",
    description: "A quiet summary of the day, preparation gaps, and one priority.",
    status: "active",
    trigger: {
      kind: "schedule",
      label: "Every study day at 7:30 AM",
      cadence: "Weekdays",
    },
    conditions: [
      {
        id: "condition-calendar-fresh",
        label: "Calendar observed within 30 minutes",
        source: "Calendar",
        satisfied: true,
      },
      {
        id: "condition-quiet-hours-ended",
        label: "Quiet hours have ended",
        source: "Notification policy",
        satisfied: true,
      },
    ],
    proposedAction: "Suggest one morning brief in NEXUS.",
    authority: "suggest",
    dataUsed: ["Calendar", "Tasks", "Selected course notes"],
    dependencies: [
      {
        id: "connection-calendar",
        kind: "connection",
        label: "Calendar demo",
        state: "available",
      },
      {
        id: "permission-calendar-read",
        kind: "permission",
        label: "Read calendar for daily planning",
        state: "available",
      },
    ],
    lastRunAt: "2026-07-25T07:30:00+05:30",
    nextEligibleAt: "2026-07-27T07:30:00+05:30",
    runHistory: [
      {
        id: "run-morning-0725",
        automationId: "automation-morning-brief",
        startedAt: "2026-07-25T07:30:00+05:30",
        outcome: "succeeded",
        summary: "Suggested one brief; no external action was taken.",
        authorityUsed: "suggest",
        reversible: false,
      },
    ],
  },
  {
    id: "automation-rain-commute",
    name: "Rain-aware commute",
    description: "Checks route pressure before fixed campus commitments.",
    status: "active",
    trigger: {
      kind: "event-window",
      label: "Before an off-campus event",
      cadence: "90 minutes before",
    },
    conditions: [
      {
        id: "condition-rain",
        label: "Rain probability is above 60%",
        source: "Weather",
        satisfied: true,
      },
      {
        id: "condition-route-delay",
        label: "Route delay exceeds 12 minutes",
        source: "Route estimate",
        satisfied: true,
      },
    ],
    proposedAction: "Suggest a safer departure time and prepare the route.",
    authority: "ask",
    dataUsed: ["Calendar", "Weather", "Home and campus"],
    dependencies: [
      {
        id: "connection-calendar",
        kind: "connection",
        label: "Calendar demo",
        state: "available",
      },
      {
        id: "connection-maps",
        kind: "connection",
        label: "Maps and weather demo",
        state: "available",
      },
    ],
    lastRunAt: "2026-07-25T09:08:00+05:30",
    nextEligibleAt: "2026-07-25T09:18:00+05:30",
    runHistory: [
      {
        id: "run-rain-0908",
        automationId: "automation-rain-commute",
        startedAt: "2026-07-25T09:08:00+05:30",
        outcome: "succeeded",
        summary: "Suggested leaving at 9:12. Route preparation awaits approval.",
        authorityUsed: "ask",
        reversible: false,
      },
    ],
  },
  {
    id: "automation-deadline-focus",
    name: "Deadline-risk focus block",
    description: "Looks for the last low-conflict work block before a deadline.",
    status: "needs-attention",
    trigger: {
      kind: "deadline-risk",
      label: "When deadline risk becomes high",
      cadence: "At most once every 12 hours",
    },
    conditions: [
      {
        id: "condition-progress",
        label: "Remaining work exceeds recent session length",
        source: "Task progress",
        satisfied: true,
      },
      {
        id: "condition-calendar-space",
        label: "A 60-minute open block exists",
        source: "Calendar",
        satisfied: true,
      },
    ],
    proposedAction: "Prepare a focus block for explicit approval.",
    authority: "prepare",
    dataUsed: ["Task progress", "Calendar"],
    dependencies: [
      {
        id: "permission-calendar-action",
        kind: "permission",
        label: "Prepare calendar blocks",
        state: "available",
      },
    ],
    lastRunAt: "2026-07-25T08:51:00+05:30",
    nextEligibleAt: "2026-07-25T20:51:00+05:30",
    attentionReason: "The last preparation attempt timed out safely.",
    runHistory: [
      {
        id: "run-focus-failed",
        automationId: "automation-deadline-focus",
        startedAt: "2026-07-25T08:51:00+05:30",
        outcome: "failed",
        summary: "Preparation timed out. Calendar was not changed.",
        authorityUsed: "prepare",
        reversible: false,
      },
    ],
  },
  {
    id: "automation-class-pack",
    name: "Class preparation pack",
    description: "Collects permitted notes and unresolved questions before class.",
    status: "paused",
    trigger: {
      kind: "event-window",
      label: "Before a class with permitted material",
      cadence: "45 minutes before",
    },
    conditions: [
      {
        id: "condition-course-material",
        label: "Selected course material is fresh",
        source: "Notion and Drive",
        satisfied: false,
      },
    ],
    proposedAction: "Prepare a local class pack for review.",
    authority: "prepare",
    dataUsed: ["Calendar", "Selected course notes"],
    dependencies: [
      {
        id: "connection-notion",
        kind: "connection",
        label: "Notion course material",
        state: "stale",
      },
    ],
    lastRunAt: "2026-07-24T18:40:00+05:30",
    attentionReason: "Paused until selected course material is fresh.",
    runHistory: [],
  },
  {
    id: "automation-evening-prep",
    name: "Evening preparation",
    description: "Reviews tomorrow without sending a notification during quiet hours.",
    status: "draft",
    trigger: {
      kind: "schedule",
      label: "Every evening at 8:30 PM",
      cadence: "Daily",
    },
    conditions: [
      {
        id: "condition-tomorrow",
        label: "Tomorrow has at least one commitment",
        source: "Calendar",
        satisfied: true,
      },
    ],
    proposedAction: "Suggest a preparation checklist in NEXUS.",
    authority: "suggest",
    dataUsed: ["Calendar", "Tasks"],
    dependencies: [
      {
        id: "permission-calendar-read",
        kind: "permission",
        label: "Read calendar for daily planning",
        state: "available",
      },
    ],
    nextEligibleAt: "2026-07-25T20:30:00+05:30",
    runHistory: [],
  },
];

const templateSeed: AutomationDefinition[] = [
  {
    ...automationSeed[0],
    id: "template-morning-brief",
    name: "Morning brief template",
    status: "draft",
    runHistory: [],
    isTemplate: true,
  },
  {
    ...automationSeed[4],
    id: "template-evening-prep",
    name: "Evening preparation template",
    isTemplate: true,
  },
];

const connectionSeed: ConnectionRecord[] = [
  {
    id: "connection-calendar",
    identity: {
      provider: "Calendar demo",
      accountLabel: "Aadi's study calendar",
      accountHint: "aadi.student@example.test",
      family: "calendar",
    },
    status: "connected",
    capabilities: [
      {
        id: "calendar-events-read",
        label: "Read event times and locations",
        providerScope: "calendar.events.read",
        granted: true,
        purpose: "Build the timeline, conflict checks, and preparation windows.",
      },
      {
        id: "calendar-events-write",
        label: "Prepare event changes",
        providerScope: "calendar.events.write",
        granted: true,
        purpose: "Only prepare a reversible block; NEXUS authority remains Ask.",
      },
    ],
    lastSuccessfulSyncAt: "2026-07-25T09:03:00+05:30",
    freshness: "fresh",
    dependentFeatures: ["Today", "Timeline", "Morning brief"],
    dependentAutomationIds: [
      "automation-morning-brief",
      "automation-rain-commute",
      "automation-deadline-focus",
    ],
    permissionSummary: "Read for planning; prepare blocks only after approval.",
    retentionSummary: "Normalized events retained until disconnected.",
    healthDetail: "Demo sync completed five minutes ago.",
  },
  {
    id: "connection-notion",
    identity: {
      provider: "Notion demo",
      accountLabel: "Aadi's selected course pages",
      accountHint: "3 selected pages",
      family: "knowledge",
    },
    status: "stale",
    capabilities: [
      {
        id: "notion-selected-read",
        label: "Read selected pages",
        providerScope: "read_content",
        granted: true,
        purpose: "Prepare cited class notes and study material.",
      },
      {
        id: "notion-page-create",
        label: "Prepare new notes",
        providerScope: "insert_content",
        granted: false,
        purpose: "Future prepared note creation; no publishing authority.",
      },
    ],
    lastSuccessfulSyncAt: "2026-07-24T18:40:00+05:30",
    freshness: "stale",
    dependentFeatures: ["Knowledge", "Notes", "Class preparation"],
    dependentAutomationIds: ["automation-class-pack"],
    permissionSummary: "Read only from three selected demo pages.",
    retentionSummary: "Extracted note metadata retained for 30 days.",
    healthDetail: "Demo content is 14 hours behind.",
  },
  {
    id: "connection-maps",
    identity: {
      provider: "Maps and weather demo",
      accountLabel: "Bengaluru commute context",
      accountHint: "Home to campus only",
      family: "location",
    },
    status: "connected",
    capabilities: [
      {
        id: "maps-route-read",
        label: "Read route and weather estimates",
        providerScope: "route.read + weather.read",
        granted: true,
        purpose: "Calculate a departure suggestion for a known event.",
      },
    ],
    lastSuccessfulSyncAt: "2026-07-25T09:07:00+05:30",
    freshness: "live",
    dependentFeatures: ["Departure guidance", "Rain-aware commute"],
    dependentAutomationIds: ["automation-rain-commute"],
    permissionSummary: "Read estimates for saved home and campus only.",
    retentionSummary: "Derived commute baseline; no route history.",
    healthDetail: "Live deterministic route and weather fixture.",
  },
];

const availableSetupSeed: ConnectionRecord[] = [
  {
    id: "connection-email",
    identity: {
      provider: "Email demo",
      accountLabel: "Add a student inbox",
      accountHint: "Not configured",
      family: "email",
    },
    status: "disconnected",
    capabilities: [
      {
        id: "email-important-read",
        label: "Read important-message metadata",
        providerScope: "mail.metadata.read",
        granted: false,
        purpose: "Find deadlines and attachments without retaining full bodies.",
      },
    ],
    freshness: "disconnected",
    dependentFeatures: ["Deadline radar", "Attachment discovery"],
    dependentAutomationIds: [],
    permissionSummary: "No access granted.",
    retentionSummary: "No data retained.",
    healthDetail: "Ready for a simulated capability review.",
  },
  {
    id: "connection-device",
    identity: {
      provider: "Device context demo",
      accountLabel: "Add phone readiness",
      accountHint: "Not configured",
      family: "device",
    },
    status: "disconnected",
    capabilities: [
      {
        id: "device-readiness-read",
        label: "Read battery and connectivity summaries",
        providerScope: "device.summary.read",
        granted: false,
        purpose: "Prepare conservative charger and offline-readiness suggestions.",
      },
    ],
    freshness: "disconnected",
    dependentFeatures: ["Offline preparation"],
    dependentAutomationIds: [],
    permissionSummary: "No access granted.",
    retentionSummary: "No data retained.",
    healthDetail: "A future Android capability shown as a safe mock.",
  },
];

const permissionSeed: PermissionGrant[] = [
  {
    id: "permission-calendar-read",
    sourceId: "connection-calendar",
    sourceLabel: "Calendar demo",
    capability: "Event times, titles, and saved locations",
    providerScope: "calendar.events.read",
    dataClass: "personal",
    readAllowed: true,
    readPurpose: "Plan the day, detect conflicts, and calculate preparation time.",
    retention: "until-disconnected",
    modelUse: "allowed-for-purpose",
    notificationsAllowed: true,
    actionAuthority: "suggest",
    dependentFeatures: ["Today", "Timeline", "Insights"],
    dependentAutomations: ["Morning brief", "Rain-aware commute"],
    sensitive: false,
    status: "granted",
    history: [
      {
        id: "permission-history-calendar-1",
        changedAt: "2026-07-21T10:15:00+05:30",
        actor: "user",
        summary: "Allowed calendar reads for planning.",
      },
    ],
  },
  {
    id: "permission-calendar-action",
    sourceId: "connection-calendar",
    sourceLabel: "Calendar demo",
    capability: "Prepare calendar blocks",
    providerScope: "calendar.events.write",
    dataClass: "personal",
    readAllowed: true,
    readPurpose: "Find a safe candidate time before preparing a block.",
    retention: "working-context",
    modelUse: "never",
    notificationsAllowed: false,
    actionAuthority: "ask",
    dependentFeatures: ["Prepared actions"],
    dependentAutomations: ["Deadline-risk focus block"],
    sensitive: false,
    status: "granted",
    history: [
      {
        id: "permission-history-action-1",
        changedAt: "2026-07-21T10:18:00+05:30",
        actor: "nexus-policy",
        summary: "Automatic action disabled; explicit approval required.",
      },
    ],
  },
  {
    id: "permission-knowledge-read",
    sourceId: "connection-notion",
    sourceLabel: "Notion demo",
    capability: "Selected course pages",
    providerScope: "read_content",
    dataClass: "private-content",
    readAllowed: true,
    readPurpose: "Prepare cited study notes from pages Aadi selected.",
    retention: "30-days",
    modelUse: "allowed-for-purpose",
    notificationsAllowed: false,
    actionAuthority: "prepare",
    dependentFeatures: ["Knowledge", "Notes"],
    dependentAutomations: ["Class preparation pack"],
    sensitive: true,
    status: "reduced",
    history: [
      {
        id: "permission-history-notion-1",
        changedAt: "2026-07-22T14:10:00+05:30",
        actor: "user",
        summary: "Limited access to three selected course pages.",
      },
    ],
  },
  {
    id: "permission-route-read",
    sourceId: "connection-maps",
    sourceLabel: "Maps and weather demo",
    capability: "Saved-place route and weather estimates",
    providerScope: "route.read + weather.read",
    dataClass: "sensitive-context",
    readAllowed: true,
    readPurpose: "Estimate departure time for a known commitment.",
    retention: "working-context",
    modelUse: "never",
    notificationsAllowed: true,
    actionAuthority: "suggest",
    dependentFeatures: ["Departure guidance"],
    dependentAutomations: ["Rain-aware commute"],
    sensitive: true,
    status: "granted",
    history: [
      {
        id: "permission-history-route-1",
        changedAt: "2026-07-23T09:20:00+05:30",
        actor: "user",
        summary: "Allowed saved-place estimates; precise route history disabled.",
      },
    ],
  },
];

const memorySeed: MemoryItem[] = [
  {
    id: "memory-name",
    category: "user-stated",
    label: "Preferred name",
    value: "Aadi",
    utility: "Personalizes briefings and confirmation language.",
    origin: { kind: "user-stated", sourceLabel: "Profile settings" },
    evidence: [],
    sensitivity: "personal",
    lastVerifiedAt: "2026-07-21T10:02:00+05:30",
    usedBy: ["Briefings", "NEXUS"],
    persistence: "persistent",
    status: "confirmed",
    inferenceLocked: true,
    reversible: true,
  },
  {
    id: "memory-commute",
    category: "inferred-routine",
    label: "Usual campus commute",
    value: "Koramangala to campus takes about 28 minutes by transit.",
    utility: "Makes departure suggestions useful without retaining a location trail.",
    origin: { kind: "inferred", sourceLabel: "Six confirmed commute outcomes" },
    evidence: [
      {
        id: "memory-evidence-commute-1",
        source: "Confirmed departure feedback",
        detail: "Five weekday trips arrived within the 26–31 minute range.",
        observedAt: "2026-07-24T10:02:00+05:30",
      },
      {
        id: "memory-evidence-commute-2",
        source: "Profile travel preference",
        detail: "Transit is the selected default for campus.",
        observedAt: "2026-07-21T10:06:00+05:30",
      },
    ],
    confidence: 0.88,
    sensitivity: "sensitive-context",
    lastVerifiedAt: "2026-07-24T10:02:00+05:30",
    expiresAt: "2026-08-24T10:02:00+05:30",
    usedBy: ["Departure guidance", "Rain-aware commute"],
    persistence: "persistent",
    status: "unconfirmed",
    inferenceLocked: false,
    reversible: true,
  },
  {
    id: "memory-quiet",
    category: "preference",
    label: "Quiet evening",
    value: "Avoid non-essential notifications after 10:30 PM.",
    utility: "Protects focus and sleep from low-value interruptions.",
    origin: { kind: "user-stated", sourceLabel: "Notification settings" },
    evidence: [],
    sensitivity: "personal",
    lastVerifiedAt: "2026-07-21T10:12:00+05:30",
    usedBy: ["Notification policy", "Evening preparation"],
    persistence: "persistent",
    status: "confirmed",
    inferenceLocked: true,
    reversible: true,
  },
  {
    id: "memory-campus",
    category: "important-place",
    label: "Campus",
    value: "Engineering campus, Bengaluru",
    utility: "Supports event-to-place matching without storing continuous location.",
    origin: { kind: "user-stated", sourceLabel: "Important places" },
    evidence: [],
    sensitivity: "sensitive-context",
    lastVerifiedAt: "2026-07-21T10:06:00+05:30",
    usedBy: ["Timeline", "Departure guidance"],
    persistence: "persistent",
    status: "confirmed",
    inferenceLocked: true,
    reversible: true,
  },
  {
    id: "memory-professor",
    category: "person",
    label: "Dr. Rao",
    value: "Machine Learning Systems instructor",
    utility: "Connects course emails, events, and notes to the right class.",
    origin: { kind: "source-derived", sourceLabel: "Selected timetable" },
    evidence: [
      {
        id: "memory-evidence-person",
        source: "Selected timetable",
        detail: "Listed as instructor for CS301.",
        observedAt: "2026-07-21T10:08:00+05:30",
      },
    ],
    confidence: 0.96,
    sensitivity: "personal",
    lastVerifiedAt: "2026-07-21T10:08:00+05:30",
    usedBy: ["Knowledge grouping"],
    persistence: "persistent",
    status: "confirmed",
    inferenceLocked: false,
    reversible: true,
  },
  {
    id: "memory-working",
    category: "working-memory",
    label: "Current assignment constraint",
    value: "Packet routing analysis needs a 90-minute focus block.",
    utility: "Keeps the active deadline recommendation coherent today.",
    origin: { kind: "inferred", sourceLabel: "Task progress and calendar" },
    evidence: [
      {
        id: "memory-evidence-working",
        source: "Task progress",
        detail: "42% complete with two days remaining.",
        observedAt: "2026-07-25T08:50:00+05:30",
      },
    ],
    confidence: 0.82,
    sensitivity: "personal",
    lastVerifiedAt: "2026-07-25T08:50:00+05:30",
    expiresAt: "2026-07-27T23:59:00+05:30",
    usedBy: ["Deadline radar"],
    persistence: "temporary",
    status: "unconfirmed",
    inferenceLocked: false,
    reversible: true,
  },
];

const activitySeed: ActivityEvent[] = [
  {
    id: "activity-route-read",
    occurredAt: "2026-07-25T09:08:00+05:30",
    dateLabel: "Today",
    type: "source-read",
    title: "Read current route estimate",
    summary: "Used the saved home-to-campus route to check departure timing.",
    source: "Maps and weather demo",
    actor: { kind: "nexus", label: "NEXUS context service" },
    requiredAuthority: "observe",
    grantedAuthority: "observe",
    outcome: "success",
    evidence: [
      {
        id: "activity-evidence-route",
        source: "Route estimate",
        detail: "18–22 minutes slower than usual.",
        observedAt: "2026-07-25T09:07:00+05:30",
        freshness: "live",
      },
    ],
    result: "One departure suggestion was updated.",
    reversible: false,
    reversalState: "not-available",
    relatedHref: "/app/connections",
    technicalDetail: "fixture.route.read / deterministic result / no provider request",
  },
  {
    id: "activity-commute-suggested",
    occurredAt: "2026-07-25T09:08:30+05:30",
    dateLabel: "Today",
    type: "insight",
    title: "Suggested leaving at 9:12",
    summary: "Traffic and rain consumed the usual commute buffer.",
    source: "Rain-aware commute",
    actor: { kind: "nexus", label: "NEXUS decision policy" },
    requiredAuthority: "suggest",
    grantedAuthority: "suggest",
    outcome: "success",
    evidence: [],
    result: "Shown in Today. No notification or provider change occurred.",
    reversible: false,
    reversalState: "not-available",
    relatedHref: "/app/automations",
    technicalDetail: "automation.rain-commute / threshold passed",
  },
  {
    id: "activity-focus-failed",
    occurredAt: "2026-07-25T08:51:00+05:30",
    dateLabel: "Today",
    type: "automation-run",
    title: "Focus block preparation stopped safely",
    summary: "The mock preparation timed out before any calendar change.",
    source: "Deadline-risk focus block",
    actor: { kind: "nexus", label: "NEXUS automation policy" },
    requiredAuthority: "prepare",
    grantedAuthority: "prepare",
    outcome: "failed",
    evidence: [],
    result: "No external state changed.",
    failure: {
      code: "DEMO_PREPARATION_TIMEOUT",
      message: "The deterministic preparation step did not finish.",
      recoverable: true,
    },
    reversible: false,
    reversalState: "not-available",
    relatedHref: "/app/automations",
    technicalDetail: "fixture.action.failed / retry available",
  },
  {
    id: "activity-note-prepared",
    occurredAt: "2026-07-24T18:42:00+05:30",
    dateLabel: "Yesterday",
    type: "prepared-action",
    title: "Prepared a Machine Learning note",
    summary: "Created a local draft from two cited course sources.",
    source: "Notes",
    actor: { kind: "nexus", label: "NEXUS note preparation" },
    requiredAuthority: "prepare",
    grantedAuthority: "prepare",
    outcome: "success",
    evidence: [],
    result: "Local draft only; nothing was published.",
    reversible: true,
    reversalState: "available",
    relatedHref: "/app/notes",
    technicalDetail: "notes.prepare / local demo artifact",
  },
  {
    id: "activity-permission-reduced",
    occurredAt: "2026-07-22T14:10:00+05:30",
    dateLabel: "Wednesday, 22 July",
    type: "permission-change",
    title: "Limited Notion to selected pages",
    summary: "Reduced access to three explicit course pages.",
    source: "Permission Centre",
    actor: { kind: "user", label: "Aadi Sharma" },
    requiredAuthority: "ask",
    grantedAuthority: "ask",
    outcome: "success",
    evidence: [],
    result: "Unselected pages remain unavailable to NEXUS.",
    reversible: true,
    reversalState: "available",
    relatedHref: "/app/settings/permissions",
    technicalDetail: "permission.knowledge.reduced / user confirmed",
  },
];

const preferencesSeed: UserPreferences = {
  displayName: "Aadi Sharma",
  timezone: "Asia/Kolkata",
  locale: "en-IN",
  places: [
    {
      id: "place-home",
      label: "Home",
      address: "Koramangala, Bengaluru",
      travelMode: "transit",
    },
    {
      id: "place-campus",
      label: "Campus",
      address: "Engineering campus, Bengaluru",
      travelMode: "transit",
    },
  ],
  notifications: {
    style: "balanced",
    inApp: true,
    emailDigest: false,
    devicePush: false,
    morningBriefAt: "07:30",
    eveningBriefAt: "20:30",
    quietHours: {
      enabled: true,
      startsAt: "22:30",
      endsAt: "07:00",
    },
  },
  privacy: {
    observationPaused: false,
    automationsPaused: false,
    defaultRetention: "30-days",
    futureModelUse: "allowed-for-purpose",
  },
  accessibility: {
    reducedMotion: false,
    highContrast: false,
    largerText: false,
  },
  personalization: {
    conciseExplanations: true,
    learnFromFeedback: true,
    preferredTravelMode: "transit",
  },
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function createPhase3FixtureState(
  scenario: NexusScenario,
): Phase3FixtureState {
  const state: Phase3FixtureState = {
    scenario,
    observationPaused: false,
    automationsPaused: false,
    automations: clone(automationSeed),
    templates: clone(templateSeed),
    connections: clone(connectionSeed),
    availableSetups: clone(availableSetupSeed),
    permissions: clone(permissionSeed),
    memories: clone(memorySeed),
    activity: clone(activitySeed),
    preferences: clone(preferencesSeed),
  };

  if (scenario === "first-use" || scenario === "loading") {
    state.automations = [];
    state.connections = [];
    state.permissions = [];
    state.memories = [];
    state.activity = [];
  }

  if (scenario === "partial-connections") {
    state.connections = state.connections.filter(
      (connection) => connection.id !== "connection-notion",
    );
    state.availableSetups.unshift(
      clone(connectionSeed.find((item) => item.id === "connection-notion")!),
    );
  }

  if (scenario === "connection-stale") {
    state.connections = state.connections.map((connection) =>
      connection.id === "connection-notion"
        ? { ...connection, status: "reconnect-required" }
        : connection,
    );
    state.automations = state.automations.map((automation) =>
      automation.id === "automation-class-pack"
        ? {
            ...automation,
            status: "needs-attention",
            attentionReason: "Reconnect Notion before preparing another class pack.",
          }
        : automation,
    );
  }

  if (scenario === "permission-denied") {
    state.permissions = state.permissions.map((permission) =>
      permission.id === "permission-calendar-read"
        ? {
            ...permission,
            readAllowed: false,
            status: "revoked",
            retention: "none",
            modelUse: "never",
            notificationsAllowed: false,
          }
        : permission,
    );
    state.connections = state.connections.map((connection) =>
      connection.id === "connection-calendar"
        ? {
            ...connection,
            status: "denied",
            freshness: "disconnected",
            healthDetail: "Calendar read permission was revoked.",
          }
        : connection,
    );
    state.automations = state.automations.map((automation) =>
      automation.dependencies.some(
        (dependency) => dependency.id === "permission-calendar-read",
      ) || automation.id === "automation-rain-commute"
        ? {
            ...automation,
            status: "blocked",
            attentionReason: "Calendar permission is required.",
            dependencies: automation.dependencies.map((dependency) =>
              dependency.id === "permission-calendar-read" ||
              dependency.id === "connection-calendar"
                ? { ...dependency, state: "denied" }
                : dependency,
            ),
          }
        : automation,
    );
    state.memories = state.memories.map((memory) =>
      memory.id === "memory-commute"
        ? {
            ...memory,
            status: "conflicted",
            utility: "Unavailable to new suggestions until Calendar access is restored.",
          }
        : memory,
    );
  }

  if (scenario === "offline") {
    state.connections = state.connections.map((connection) => ({
      ...connection,
      status: "offline",
      freshness: "stale",
      healthDetail: "Showing the last prepared demo state.",
    }));
  }

  if (scenario === "action-failed") {
    state.automations = state.automations.map((automation) =>
      automation.id === "automation-deadline-focus"
        ? { ...automation, status: "needs-attention" }
        : automation,
    );
  }

  if (scenario === "privacy-paused") {
    state.observationPaused = true;
    state.automationsPaused = true;
    state.preferences.privacy.observationPaused = true;
    state.preferences.privacy.automationsPaused = true;
  }

  if (scenario === "reduced-motion") {
    state.preferences.accessibility.reducedMotion = true;
  }

  return state;
}
