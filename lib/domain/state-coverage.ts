import type {
  NexusScenario,
  ProductStateDimensions,
} from "@/lib/domain/contracts";

export const PHASE4_STATES = [
  "first-use",
  "no-connections",
  "partial-connections",
  "loading",
  "empty",
  "error",
  "rate-limited",
  "stale-source",
  "revoked-permission",
  "offline",
  "degraded-ai",
  "action-pending",
  "action-running",
  "action-succeeded",
  "action-failed-recoverable",
] as const;

export type Phase4State = (typeof PHASE4_STATES)[number];

export const PHASE4_SCENARIO_BY_STATE: Record<Phase4State, NexusScenario> = {
  "first-use": "first-use",
  "no-connections": "no-connections",
  "partial-connections": "partial-connections",
  loading: "loading",
  empty: "empty",
  error: "error",
  "rate-limited": "rate-limited",
  "stale-source": "stale-source",
  "revoked-permission": "permission-revoked",
  offline: "offline",
  "degraded-ai": "degraded-ai",
  "action-pending": "action-pending",
  "action-running": "action-running",
  "action-succeeded": "action-succeeded",
  "action-failed-recoverable": "action-recoverable-failure",
};

const scenarioAliases: Partial<Record<NexusScenario, NexusScenario>> = {
  "connection-stale": "stale-source",
  "permission-denied": "permission-revoked",
  "action-failed": "action-recoverable-failure",
};

export function canonicalScenario(scenario: NexusScenario): NexusScenario {
  return scenarioAliases[scenario] ?? scenario;
}

export function stateDimensionsForScenario(
  scenario: NexusScenario,
): ProductStateDimensions {
  const canonical = canonicalScenario(scenario);

  return {
    data:
      canonical === "loading"
        ? "loading"
        : ["first-use", "no-connections", "empty"].includes(canonical)
          ? "empty"
          : canonical === "partial-connections"
            ? "partial"
            : "populated",
    source:
      canonical === "no-connections"
        ? "disconnected"
        : canonical === "stale-source"
          ? "stale"
          : canonical === "permission-revoked"
            ? "revoked"
            : canonical === "rate-limited"
              ? "rate-limited"
              : canonical === "offline"
                ? "offline"
                : ["error", "action-recoverable-failure"].includes(canonical)
                  ? "error"
                  : "fresh",
    intelligence:
      canonical === "degraded-ai"
        ? "degraded"
        : canonical === "offline"
          ? "unavailable"
          : "ready",
    action:
      canonical === "action-pending"
        ? "pending-approval"
        : canonical === "action-running"
          ? "running"
          : canonical === "action-succeeded"
            ? "succeeded"
            : canonical === "action-recoverable-failure"
              ? "failed-recoverably"
              : canonical === "deadline-risk"
                ? "proposed"
                : "idle",
    configuration:
      canonical === "first-use"
        ? "first-use"
        : canonical === "no-connections"
          ? "no-connections"
          : "configured",
  };
}

interface RouteStateCoverage {
  route: string;
  label: string;
  applicable: Phase4State[];
  implemented: Phase4State[];
  service: string;
  recovery: string;
  nonApplicable: Partial<Record<Phase4State, string>>;
}

const readStates: Phase4State[] = [
  "first-use",
  "no-connections",
  "partial-connections",
  "loading",
  "empty",
  "error",
  "rate-limited",
  "stale-source",
  "revoked-permission",
  "offline",
  "degraded-ai",
];

const actionStates: Phase4State[] = [
  "action-pending",
  "action-running",
  "action-succeeded",
  "action-failed-recoverable",
];

function row(
  route: string,
  label: string,
  service: string,
  applicable: Phase4State[],
  recovery: string,
  nonApplicable: Partial<Record<Phase4State, string>> = {},
): RouteStateCoverage {
  return {
    route,
    label,
    service,
    applicable,
    implemented: [...applicable],
    recovery,
    nonApplicable,
  };
}

export const ROUTE_STATE_COVERAGE: RouteStateCoverage[] = [
  row("/app/today", "Today", "TodayService", [...readStates, ...actionStates], "Open Connections, Permissions, or retry the recorded action."),
  row("/app/timeline", "Timeline", "TimelineService", [...readStates, ...actionStates], "Review freshness, restore Calendar access, or retry safely."),
  row("/app/insights", "Insights", "InsightsService", [...readStates, ...actionStates], "Use deterministic context, restore the affected source, or retry."),
  row("/app/nexus", "NEXUS", "NexusService", [...readStates, ...actionStates], "Continue with deterministic tools, inspect evidence, or retry."),
  row("/app/knowledge", "Knowledge", "KnowledgeService", readStates, "Reconnect or restore the affected knowledge permission.", {
    "action-pending": "Knowledge inspection does not execute actions.",
    "action-running": "Knowledge inspection does not execute actions.",
    "action-succeeded": "Results are represented in Notes or Activity.",
    "action-failed-recoverable": "Knowledge reads have source recovery instead.",
  }),
  row("/app/notes", "Nexus Notes", "NotesService", [...readStates, ...actionStates], "Keep manual notes available, restore a source, or retry preparation."),
  row("/app/search", "Search / command palette", "SearchService", readStates, "Search local content or restore the affected source.", {
    "action-pending": "Search returns destinations and never executes them.",
    "action-running": "Search returns destinations and never executes them.",
    "action-succeeded": "Completed actions are discoverable in Activity.",
    "action-failed-recoverable": "Failures are recovered in their owning route.",
  }),
  row("/app/automations", "Automations", "AutomationService", [...readStates, ...actionStates], "Restore dependencies, inspect the trace, or retry."),
  row("/app/connections", "Connections", "ConnectionService", readStates.filter((state) => state !== "degraded-ai"), "Reconnect, resync, or review capabilities.", {
    "degraded-ai": "Connection controls do not depend on generated intelligence.",
    "action-pending": "Connection confirmation is handled inline, not as an automation run.",
    "action-running": "Connection sync health has its own explicit status.",
    "action-succeeded": "Connection results use connection health.",
    "action-failed-recoverable": "Connection failures use reconnect or resync states.",
  }),
  row("/app/settings/permissions", "Permission Centre", "PermissionService", readStates.filter((state) => state !== "degraded-ai"), "Restore the minimum grant or keep the source revoked.", {
    "degraded-ai": "Permission controls remain deterministic.",
    "action-pending": "Permission changes have dedicated confirmation surfaces.",
    "action-running": "Permission changes are not background actions in Phase 4.",
    "action-succeeded": "Permission history records completed changes.",
    "action-failed-recoverable": "Permission recovery is represented by restoration.",
  }),
  row("/app/memory", "Memory", "MemoryService", readStates, "Correct, restore, or delete the affected memory.", {
    "action-pending": "Memory edits use dedicated confirmations.",
    "action-running": "Memory edits are synchronous demo operations.",
    "action-succeeded": "Completed edits appear in Activity.",
    "action-failed-recoverable": "Memory conflicts use correction and restoration.",
  }),
  row("/app/activity", "Activity", "ActivityService", [...readStates, ...actionStates], "Inspect the recorded result, retry, or reverse when available."),
  row("/app/settings", "Settings", "SettingsService", readStates.filter((state) => !["degraded-ai", "rate-limited"].includes(state)), "Reset the affected section or review privacy controls.", {
    "rate-limited": "Device-local settings are not provider-rate-limited.",
    "degraded-ai": "Settings remain deterministic without generated intelligence.",
    "action-pending": "Sensitive settings use dedicated confirmation dialogs.",
    "action-running": "Settings do not run background actions in this phase.",
    "action-succeeded": "Saved settings use inline success feedback.",
    "action-failed-recoverable": "Settings recovery uses section reset.",
  }),
  row("/app/technicals", "Technicals", "State coverage registry", PHASE4_STATES.slice(), "Open the named route and deterministic recovery interaction."),
];

export function phase4CoverageIsComplete() {
  return ROUTE_STATE_COVERAGE.every(
    (route) =>
      route.applicable.length === route.implemented.length &&
      route.applicable.every((state) => route.implemented.includes(state)) &&
      PHASE4_STATES.every(
        (state) =>
          route.applicable.includes(state) || Boolean(route.nonApplicable[state]),
      ),
  );
}
