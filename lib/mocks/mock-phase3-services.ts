import type {
  ActivityEvent,
  ActivityFilters,
  AuthorityLevel,
  AutomationDefinition,
  ConnectionRecord,
  DependencyImpact,
  MemoryItem,
  MockDeletionRequest,
  NexusScenario,
  NotificationPolicy,
  PermissionGrant,
  UserPreferences,
} from "@/lib/domain/contracts";
import type { ActivityService } from "@/lib/services/activity-service";
import type { AutomationService } from "@/lib/services/automation-service";
import type { ConnectionService } from "@/lib/services/connection-service";
import type { MemoryService } from "@/lib/services/memory-service";
import type { PermissionService } from "@/lib/services/permission-service";
import type {
  SettingsSection,
  SettingsService,
} from "@/lib/services/settings-service";
import {
  controlNoticeForScenario,
  controlViewStateForScenario,
  createPhase3FixtureState,
  type Phase3FixtureState,
} from "@/lib/mocks/phase3-fixtures";

const NOW = "2026-07-25T09:20:00+05:30";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function findOrThrow<T extends { id: string }>(items: T[], id: string, noun: string) {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Unknown deterministic ${noun}: ${id}`);
  return item;
}

function replaceById<T extends { id: string }>(items: T[], next: T) {
  return items.map((item) => (item.id === next.id ? next : item));
}

function addActivity(
  state: Phase3FixtureState,
  event: Omit<ActivityEvent, "id" | "occurredAt" | "dateLabel" | "technicalDetail"> & {
    technicalDetail?: string;
  },
) {
  const recorded: ActivityEvent = {
    ...event,
    id: `activity-session-${state.activity.length + 1}`,
    occurredAt: NOW,
    dateLabel: "Today",
    technicalDetail: event.technicalDetail ?? "deterministic Phase 3 mock result",
  };
  state.activity.unshift(recorded);
  return recorded;
}

function impactForConnection(connection: ConnectionRecord): DependencyImpact {
  return {
    title: `Disconnect ${connection.identity.provider}?`,
    detail:
      "New reads stop immediately. Dependent automations pause and retained demo data follows the selected retention policy.",
    affectedFeatures: connection.dependentFeatures,
    affectedAutomations: connection.dependentAutomationIds,
    reversible: true,
  };
}

function impactForPermission(permission: PermissionGrant): DependencyImpact {
  return {
    title: `Revoke ${permission.capability}?`,
    detail:
      "NEXUS stops new reads for this capability. Connected provider scope and action authority remain separate controls.",
    affectedFeatures: permission.dependentFeatures,
    affectedAutomations: permission.dependentAutomations,
    reversible: true,
  };
}

function blockDependencies(state: Phase3FixtureState, sourceId: string) {
  state.automations = state.automations.map((automation) => {
    const affected = automation.dependencies.some(
      (dependency) =>
        dependency.id === sourceId ||
        (sourceId === "connection-calendar" &&
          dependency.id === "permission-calendar-read"),
    );
    if (!affected) return automation;
    return {
      ...automation,
      status: "blocked",
      attentionReason: "A required connection or permission is unavailable.",
      dependencies: automation.dependencies.map((dependency) =>
        dependency.id === sourceId ||
        (sourceId === "connection-calendar" &&
          dependency.id === "permission-calendar-read")
          ? { ...dependency, state: "denied" }
          : dependency,
      ),
    };
  });
}

function createAutomationService(state: Phase3FixtureState): AutomationService {
  return {
    async getAutomations() {
      const active = state.automations.filter(
        (automation) => automation.status === "active",
      ).length;
      return clone({
        scenario: state.scenario,
        viewState: controlViewStateForScenario(state.scenario),
        globallyPaused: state.automationsPaused,
        summary: state.automationsPaused
          ? "Every proactive recipe is paused at the policy gate."
          : "Each proactive behaviour exposes its trigger, evidence, dependencies, and authority.",
        activeCount: active,
        needsAttentionCount: state.automations.filter((automation) =>
          ["needs-attention", "blocked"].includes(automation.status),
        ).length,
        automations: state.automations,
        templates: state.templates,
        notice: controlNoticeForScenario(state.scenario),
      });
    },
    async createFromTemplate(templateId) {
      const template = findOrThrow(state.templates, templateId, "automation template");
      const next: AutomationDefinition = {
        ...clone(template),
        id: `automation-created-${state.automations.length + 1}`,
        name: template.name.replace(" template", ""),
        status: "draft",
        isTemplate: false,
      };
      state.automations.push(next);
      addActivity(state, {
        type: "automation-run",
        title: `Created ${next.name}`,
        summary: "A draft automation was created from a reviewed template.",
        source: "Automations",
        actor: { kind: "user", label: "Aadi Sharma" },
        requiredAuthority: "ask",
        grantedAuthority: "ask",
        outcome: "success",
        evidence: [],
        result: "Draft only; no proactive behaviour started.",
        reversible: true,
        reversalState: "available",
        relatedHref: "/app/automations",
      });
      return clone(next);
    },
    async createCustom(input) {
      const next: AutomationDefinition = {
        id: `automation-custom-${state.automations.length + 1}`,
        name: input.name,
        description: "A structured custom automation created in this demo session.",
        status: "draft",
        trigger: {
          kind: "context-change",
          label: input.trigger,
          cadence: "At most once every 12 hours",
        },
        conditions: [],
        proposedAction: input.proposedAction,
        authority: "suggest",
        dataUsed: ["Permitted context only"],
        dependencies: [],
        runHistory: [],
      };
      state.automations.push(next);
      return clone(next);
    },
    async updateAutomation(automationId, update) {
      const current = findOrThrow(state.automations, automationId, "automation");
      const next = { ...current, ...update };
      state.automations = replaceById(state.automations, next);
      return clone(next);
    },
    async duplicateAutomation(automationId) {
      const current = findOrThrow(state.automations, automationId, "automation");
      const next: AutomationDefinition = {
        ...clone(current),
        id: `${current.id}-copy`,
        name: `${current.name} copy`,
        status: "draft",
        lastRunAt: undefined,
        nextEligibleAt: undefined,
        runHistory: [],
      };
      state.automations.push(next);
      return clone(next);
    },
    async setPaused(automationId, paused) {
      const current = findOrThrow(state.automations, automationId, "automation");
      const next: AutomationDefinition = {
        ...current,
        status: paused ? "paused" : "active",
        attentionReason: paused ? "Paused by Aadi." : undefined,
      };
      state.automations = replaceById(state.automations, next);
      return clone(next);
    },
    async runDryRun(automationId) {
      const automation = findOrThrow(state.automations, automationId, "automation");
      const blocked =
        state.automationsPaused ||
        automation.status === "blocked" ||
        state.scenario === "offline";
      const trace = [
        {
          id: "trace-trigger",
          label: "Evaluate trigger",
          result: blocked ? ("not-run" as const) : ("passed" as const),
          detail: blocked
            ? "Policy gate stopped the evaluation."
            : automation.trigger.label,
        },
        {
          id: "trace-conditions",
          label: "Check conditions and freshness",
          result: blocked
            ? ("not-run" as const)
            : automation.conditions.every((condition) => condition.satisfied)
              ? ("passed" as const)
              : ("failed" as const),
          detail: blocked
            ? "No data was read."
            : `${automation.conditions.filter((condition) => condition.satisfied).length} of ${automation.conditions.length} conditions passed.`,
        },
        {
          id: "trace-authority",
          label: "Apply authority policy",
          result: blocked ? ("not-run" as const) : ("passed" as const),
          detail: `Maximum authority: ${automation.authority}.`,
        },
      ];
      const result = {
        automationId,
        ranAt: NOW,
        outcome: blocked
          ? ("blocked" as const)
          : automation.authority === "prepare"
            ? ("would-prepare" as const)
            : automation.authority === "ask"
              ? ("would-ask" as const)
              : ("would-suggest" as const),
        proposedOutcome: blocked
          ? "Nothing would run until the policy or dependency is restored."
          : automation.proposedAction,
        requiredAuthority: automation.authority,
        trace,
      };
      addActivity(state, {
        type: "automation-run",
        title: `Dry-run: ${automation.name}`,
        summary: result.proposedOutcome,
        source: automation.name,
        actor: { kind: "user", label: "Aadi Sharma" },
        requiredAuthority: "observe",
        grantedAuthority: "observe",
        outcome: blocked ? "denied" : "success",
        evidence: [],
        result: "Dry-run only; no provider state changed.",
        reversible: false,
        reversalState: "not-available",
        relatedHref: "/app/automations",
      });
      return clone(result);
    },
    async changeAuthority(automationId, authority) {
      const safeAuthority: AuthorityLevel = authority === "act" ? "ask" : authority;
      const current = findOrThrow(state.automations, automationId, "automation");
      const next = { ...current, authority: safeAuthority };
      state.automations = replaceById(state.automations, next);
      return clone(next);
    },
    async recoverAutomation(automationId) {
      const current = findOrThrow(state.automations, automationId, "automation");
      const dependencyBlocked = current.dependencies.some((dependency) =>
        ["denied", "disconnected"].includes(dependency.state),
      );
      const next: AutomationDefinition = {
        ...current,
        status: dependencyBlocked ? "blocked" : "paused",
        attentionReason: dependencyBlocked
          ? "Restore the required dependency first."
          : "Recovered safely and left paused for review.",
      };
      state.automations = replaceById(state.automations, next);
      return clone(next);
    },
    async deleteAutomation(automationId) {
      findOrThrow(state.automations, automationId, "automation");
      state.automations = state.automations.filter(
        (automation) => automation.id !== automationId,
      );
      return { id: automationId, deleted: true };
    },
    async setGlobalPause(paused) {
      state.automationsPaused = paused;
      state.preferences.privacy.automationsPaused = paused;
      const activity = addActivity(state, {
        type: "permission-change",
        title: paused ? "Paused all automations" : "Resumed automation policy",
        summary: paused
          ? "No proactive recipe can suggest, prepare, ask, or act."
          : "Eligible recipes may evaluate again within their authority.",
        source: "Automation policy",
        actor: { kind: "user", label: "Aadi Sharma" },
        requiredAuthority: "ask",
        grantedAuthority: "ask",
        outcome: "success",
        evidence: [],
        result: "Global policy changed in this demo session.",
        reversible: true,
        reversalState: "available",
        relatedHref: "/app/settings/permissions",
      });
      return { paused, activityId: activity.id };
    },
  };
}

function createConnectionService(state: Phase3FixtureState): ConnectionService {
  return {
    async getConnections() {
      return clone({
        scenario: state.scenario,
        viewState: controlViewStateForScenario(state.scenario),
        summary:
          "Provider capability, NEXUS purpose, retention, and action authority remain separate.",
        healthyCount: state.connections.filter(
          (connection) => connection.status === "connected",
        ).length,
        attentionCount: state.connections.filter((connection) =>
          ["stale", "denied", "reconnect-required", "offline"].includes(
            connection.status,
          ),
        ).length,
        connections: state.connections,
        availableSetups: state.availableSetups,
        notice: controlNoticeForScenario(state.scenario),
      });
    },
    async setupConnection(connectionId) {
      const candidate = findOrThrow(
        state.availableSetups,
        connectionId,
        "connection setup",
      );
      const next: ConnectionRecord = {
        ...clone(candidate),
        status: "connected",
        freshness: "fresh",
        lastSuccessfulSyncAt: NOW,
        capabilities: candidate.capabilities.map((capability) => ({
          ...capability,
          granted: true,
        })),
        permissionSummary:
          "Minimum reviewed demo capability granted; action authority remains separate.",
        retentionSummary: "Working context only.",
        healthDetail: "Mock setup completed without credentials or provider calls.",
      };
      state.availableSetups = state.availableSetups.filter(
        (connection) => connection.id !== connectionId,
      );
      state.connections.push(next);
      return clone(next);
    },
    async resyncConnection(connectionId) {
      const connection = findOrThrow(state.connections, connectionId, "connection");
      const failed =
        state.scenario === "offline" || state.scenario === "action-failed";
      if (!failed) {
        const next: ConnectionRecord = {
          ...connection,
          status: "connected",
          freshness: "fresh",
          lastSuccessfulSyncAt: NOW,
          healthDetail: "Deterministic demo sync completed.",
        };
        state.connections = replaceById(state.connections, next);
      }
      return {
        connectionId,
        status: state.scenario === "offline" ? "offline" : failed ? "failed" : "succeeded",
        completedAt: NOW,
        summary: failed
          ? "The mock sync stopped safely; retained data is unchanged."
          : "Sync completed against deterministic fixtures.",
        changedRecords: failed ? 0 : 3,
      };
    },
    async reconnectConnection(connectionId) {
      const connection = findOrThrow(state.connections, connectionId, "connection");
      const next: ConnectionRecord = {
        ...connection,
        status: "connected",
        freshness: "fresh",
        lastSuccessfulSyncAt: NOW,
        healthDetail: "Reconnected to the deterministic demo source.",
      };
      state.connections = replaceById(state.connections, next);
      state.automations = state.automations.map((automation) => ({
        ...automation,
        dependencies: automation.dependencies.map((dependency) =>
          dependency.id === connectionId
            ? { ...dependency, state: "available" }
            : dependency,
        ),
      }));
      return clone(next);
    },
    async previewDisconnect(connectionId) {
      return impactForConnection(
        findOrThrow(state.connections, connectionId, "connection"),
      );
    },
    async disconnectConnection(connectionId) {
      const connection = findOrThrow(state.connections, connectionId, "connection");
      const next: ConnectionRecord = {
        ...connection,
        status: "disconnected",
        freshness: "disconnected",
        healthDetail: "Disconnected in this demo session. No provider was contacted.",
      };
      state.connections = replaceById(state.connections, next);
      state.permissions = state.permissions.map((permission) =>
        permission.sourceId === connectionId
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
      blockDependencies(state, connectionId);
      addActivity(state, {
        type: "permission-change",
        title: `Disconnected ${connection.identity.provider}`,
        summary: "New reads stopped and dependent automations were blocked.",
        source: "Connections",
        actor: { kind: "user", label: "Aadi Sharma" },
        requiredAuthority: "ask",
        grantedAuthority: "ask",
        outcome: "success",
        evidence: [],
        result: "Mock connection is disconnected.",
        reversible: true,
        reversalState: "available",
        relatedHref: "/app/connections",
      });
      return clone(next);
    },
    async setCapability(connectionId, capabilityId, granted) {
      const connection = findOrThrow(state.connections, connectionId, "connection");
      const next: ConnectionRecord = {
        ...connection,
        capabilities: connection.capabilities.map((capability) =>
          capability.id === capabilityId ? { ...capability, granted } : capability,
        ),
        permissionSummary: granted
          ? "Reviewed capability granted in demo state."
          : "Capability reduced; dependent reads stop.",
      };
      state.connections = replaceById(state.connections, next);
      return clone(next);
    },
  };
}

function createPermissionService(state: Phase3FixtureState): PermissionService {
  return {
    async getPermissions() {
      return clone({
        scenario: state.scenario,
        viewState: controlViewStateForScenario(state.scenario),
        observationPaused: state.observationPaused,
        automationsPaused: state.automationsPaused,
        summary:
          "Provider scope, read purpose, retention, future model use, notifications, and action authority are controlled separately.",
        grants: state.permissions,
        notice: controlNoticeForScenario(state.scenario),
      });
    },
    async updatePermission(permissionId, update) {
      const current = findOrThrow(state.permissions, permissionId, "permission");
      const safeUpdate = {
        ...update,
        ...(update.actionAuthority
          ? {
              actionAuthority:
                update.actionAuthority === "act"
                  ? ("ask" as const)
                  : update.actionAuthority,
            }
          : {}),
      };
      const next: PermissionGrant = {
        ...current,
        ...safeUpdate,
        status:
          safeUpdate.readAllowed === false ||
          safeUpdate.retention === "none" ||
          safeUpdate.modelUse === "never"
            ? "reduced"
            : current.status === "revoked"
              ? "granted"
              : current.status,
        history: [
          {
            id: `permission-history-${current.history.length + 1}`,
            changedAt: NOW,
            actor: "user",
            summary: "Changed one permission dimension in the control centre.",
          },
          ...current.history,
        ],
      };
      state.permissions = replaceById(state.permissions, next);
      return clone(next);
    },
    async previewRevocation(permissionId) {
      return impactForPermission(
        findOrThrow(state.permissions, permissionId, "permission"),
      );
    },
    async revokePermission(permissionId) {
      const current = findOrThrow(state.permissions, permissionId, "permission");
      const next: PermissionGrant = {
        ...current,
        readAllowed: false,
        retention: "none",
        modelUse: "never",
        notificationsAllowed: false,
        actionAuthority: "observe",
        status: "revoked",
        history: [
          {
            id: `permission-history-${current.history.length + 1}`,
            changedAt: NOW,
            actor: "user",
            summary: "Revoked after reviewing dependent features and automations.",
          },
          ...current.history,
        ],
      };
      state.permissions = replaceById(state.permissions, next);
      if (current.sourceId === "connection-calendar") {
        state.connections = state.connections.map((connection) =>
          connection.id === "connection-calendar"
            ? {
                ...connection,
                status: "denied",
                freshness: "disconnected",
                healthDetail: "Calendar permission was revoked.",
              }
            : connection,
        );
        state.memories = state.memories.map((memory) =>
          memory.id === "memory-commute"
            ? { ...memory, status: "conflicted" }
            : memory,
        );
      }
      blockDependencies(state, permissionId);
      addActivity(state, {
        type: "permission-change",
        title: `Revoked ${current.capability}`,
        summary: "New reads stopped and affected automations were blocked.",
        source: "Permission Centre",
        actor: { kind: "user", label: "Aadi Sharma" },
        requiredAuthority: "ask",
        grantedAuthority: "ask",
        outcome: "success",
        evidence: [],
        result: "Revocation recorded in demo activity.",
        reversible: true,
        reversalState: "available",
        relatedHref: "/app/settings/permissions",
      });
      return clone(next);
    },
    async restorePermission(permissionId) {
      const current = findOrThrow(state.permissions, permissionId, "permission");
      const next: PermissionGrant = {
        ...current,
        readAllowed: true,
        retention: "working-context",
        modelUse: "never",
        notificationsAllowed: false,
        actionAuthority: "suggest",
        status: "reduced",
        history: [
          {
            id: `permission-history-${current.history.length + 1}`,
            changedAt: NOW,
            actor: "user",
            summary: "Restored minimum read access with conservative defaults.",
          },
          ...current.history,
        ],
      };
      state.permissions = replaceById(state.permissions, next);
      if (current.sourceId === "connection-calendar") {
        state.connections = state.connections.map((connection) =>
          connection.id === "connection-calendar"
            ? {
                ...connection,
                status: "connected",
                freshness: "fresh",
                healthDetail: "Minimum calendar read restored.",
              }
            : connection,
        );
      }
      return clone(next);
    },
    async setObservationPaused(paused) {
      state.observationPaused = paused;
      state.preferences.privacy.observationPaused = paused;
      const activity = addActivity(state, {
        type: "permission-change",
        title: paused ? "Paused observation" : "Resumed observation",
        summary: paused
          ? "NEXUS will not read new provider context."
          : "NEXUS may read permitted context again.",
        source: "Privacy controls",
        actor: { kind: "user", label: "Aadi Sharma" },
        requiredAuthority: "ask",
        grantedAuthority: "ask",
        outcome: "success",
        evidence: [],
        result: "Global observation policy updated.",
        reversible: true,
        reversalState: "available",
        relatedHref: "/app/settings/permissions",
      });
      return { paused, activityId: activity.id };
    },
    async setAutomationsPaused(paused) {
      return createAutomationService(state).setGlobalPause(paused);
    },
  };
}

function createMemoryService(state: Phase3FixtureState): MemoryService {
  return {
    async getMemory() {
      return clone({
        scenario: state.scenario,
        viewState: controlViewStateForScenario(state.scenario),
        summary:
          "Every memory explains its origin, usefulness, sensitivity, verification, and expiry.",
        items: state.memories,
        notice: controlNoticeForScenario(state.scenario),
      });
    },
    async confirmMemory(memoryId) {
      const current = findOrThrow(state.memories, memoryId, "memory");
      state.memories = replaceById(state.memories, {
        ...current,
        status: "confirmed",
        lastVerifiedAt: NOW,
      });
      const activity = addActivity(state, {
        type: "memory-change",
        title: `Confirmed ${current.label}`,
        summary: current.value,
        source: "Memory",
        actor: { kind: "user", label: "Aadi Sharma" },
        requiredAuthority: "ask",
        grantedAuthority: "ask",
        outcome: "success",
        evidence: [],
        result: "Memory confidence may be used by dependent features.",
        reversible: true,
        reversalState: "available",
        relatedHref: "/app/memory",
      });
      return {
        memoryId,
        status: "confirmed",
        summary: "Confirmed and verification time updated.",
        recordedActivityId: activity.id,
      };
    },
    async correctMemory(memoryId, value) {
      const current = findOrThrow(state.memories, memoryId, "memory");
      state.memories = replaceById(state.memories, {
        ...current,
        value,
        status: "confirmed",
        confidence: 1,
        lastVerifiedAt: NOW,
      });
      const activity = addActivity(state, {
        type: "memory-change",
        title: `Corrected ${current.label}`,
        summary: value,
        source: "Memory",
        actor: { kind: "user", label: "Aadi Sharma" },
        requiredAuthority: "ask",
        grantedAuthority: "ask",
        outcome: "success",
        evidence: [],
        result: "Dependent mock features now receive the corrected value.",
        reversible: true,
        reversalState: "available",
        relatedHref: "/app/memory",
      });
      return {
        memoryId,
        status: "corrected",
        summary: "Correction recorded and dependent features updated.",
        recordedActivityId: activity.id,
      };
    },
    async updateMemory(memoryId, update) {
      const current = findOrThrow(state.memories, memoryId, "memory");
      const next: MemoryItem = { ...current, ...update };
      state.memories = replaceById(state.memories, next);
      return clone(next);
    },
    async previewDeletion(memoryId) {
      const memory = findOrThrow(state.memories, memoryId, "memory");
      return {
        title: `Forget ${memory.label}?`,
        detail:
          "This removes the memory from new decisions. A reversible demo deletion remains available in Activity.",
        affectedFeatures: memory.usedBy,
        affectedAutomations: memory.usedBy.filter((item) =>
          item.toLowerCase().includes("commute"),
        ),
        reversible: memory.reversible,
      };
    },
    async deleteMemory(memoryId) {
      const current = findOrThrow(state.memories, memoryId, "memory");
      state.memories = replaceById(state.memories, {
        ...current,
        status: "deleted",
      });
      const activity = addActivity(state, {
        type: "memory-change",
        title: `Forgot ${current.label}`,
        summary: "The memory is excluded from new demo decisions.",
        source: "Memory",
        actor: { kind: "user", label: "Aadi Sharma" },
        requiredAuthority: "ask",
        grantedAuthority: "ask",
        outcome: "success",
        evidence: [],
        result: "Reversible mock deletion recorded.",
        reversible: current.reversible,
        reversalState: current.reversible ? "available" : "not-available",
        relatedHref: "/app/memory",
      });
      return {
        memoryId,
        status: "deleted",
        summary: "Memory excluded from new decisions.",
        recordedActivityId: activity.id,
      };
    },
    async restoreMemory(memoryId) {
      const current = findOrThrow(state.memories, memoryId, "memory");
      state.memories = replaceById(state.memories, {
        ...current,
        status: "unconfirmed",
      });
      return {
        memoryId,
        status: "restored",
        summary: "Memory restored for review.",
        recordedActivityId: `activity-restore-${memoryId}`,
      };
    },
  };
}

function matchesActivityFilters(
  event: ActivityEvent,
  filters: Partial<ActivityFilters>,
) {
  const query = filters.query?.trim().toLowerCase();
  if (
    query &&
    ![event.title, event.summary, event.source]
      .join(" ")
      .toLowerCase()
      .includes(query)
  ) {
    return false;
  }
  if (filters.types?.length && !filters.types.includes(event.type)) return false;
  if (filters.sources?.length && !filters.sources.includes(event.source)) return false;
  if (
    filters.authorities?.length &&
    !filters.authorities.includes(event.requiredAuthority)
  ) {
    return false;
  }
  if (filters.outcomes?.length && !filters.outcomes.includes(event.outcome)) {
    return false;
  }
  return true;
}

function createActivityService(state: Phase3FixtureState): ActivityService {
  return {
    async getActivity(_scenario, filters = {}) {
      return clone({
        scenario: state.scenario,
        viewState: controlViewStateForScenario(state.scenario),
        summary:
          "A human-readable record of what NEXUS read, proposed, asked, attempted, or changed.",
        events: state.activity.filter((event) =>
          matchesActivityFilters(event, filters),
        ),
        availableSources: [...new Set(state.activity.map((event) => event.source))],
        notice: controlNoticeForScenario(state.scenario),
      });
    },
    async retryEvent(eventId) {
      const current = findOrThrow(state.activity, eventId, "activity event");
      if (!current.failure?.recoverable) {
        throw new Error(`Activity event is not recoverable: ${eventId}`);
      }
      const next: ActivityEvent = {
        ...current,
        outcome: "success",
        result: "Retry completed in demo state. No external provider was contacted.",
        failure: undefined,
      };
      state.activity = replaceById(state.activity, next);
      return clone(next);
    },
    async reverseEvent(eventId) {
      const current = findOrThrow(state.activity, eventId, "activity event");
      if (!current.reversible || current.reversalState !== "available") {
        throw new Error(`Activity event is not reversible: ${eventId}`);
      }
      const next: ActivityEvent = {
        ...current,
        outcome: "reversed",
        reversalState: "reversed",
        result: "Reversal recorded in deterministic demo state.",
      };
      state.activity = replaceById(state.activity, next);
      return clone(next);
    },
    async exportActivity() {
      return {
        id: "export-activity-001",
        requestedAt: NOW,
        scope: "activity-filter",
        status: "prepared",
        summary: "A deterministic filtered activity summary is ready in demo state.",
      };
    },
  };
}

function createSettingsService(state: Phase3FixtureState): SettingsService {
  const baseline = createPhase3FixtureState("student-normal-day").preferences;
  return {
    async getSettings() {
      return clone({
        scenario: state.scenario,
        viewState: controlViewStateForScenario(state.scenario),
        summary:
          "Everyday preferences stay separate from privacy, permission, and account-level controls.",
        preferences: state.preferences,
        notice: controlNoticeForScenario(state.scenario),
      });
    },
    async saveSection(_section, update) {
      state.preferences = {
        ...state.preferences,
        ...clone(update),
      };
      state.observationPaused = state.preferences.privacy.observationPaused;
      state.automationsPaused = state.preferences.privacy.automationsPaused;
      return clone(state.preferences);
    },
    async resetSection(section: SettingsSection) {
      const next = clone(state.preferences);
      if (section === "profile") {
        next.displayName = baseline.displayName;
        next.timezone = baseline.timezone;
        next.locale = baseline.locale;
      } else if (section === "places") {
        next.places = clone(baseline.places);
      } else {
        const key = section as keyof Pick<
          UserPreferences,
          "notifications" | "personalization" | "privacy" | "accessibility"
        >;
        Object.assign(next, { [key]: clone(baseline[key]) });
      }
      state.preferences = next;
      return clone(next);
    },
    async previewNotification(policy: NotificationPolicy) {
      return {
        title: "Leave by 9:12",
        body:
          policy.style === "essential"
            ? "Traffic threatens your lecture buffer."
            : "Traffic and rain add about 20 minutes to your campus commute.",
        delivery: policy.quietHours.enabled
          ? `Held during ${policy.quietHours.startsAt}–${policy.quietHours.endsAt} unless urgent.`
          : "Delivered immediately when the interruption threshold is met.",
      };
    },
    async requestExport() {
      return {
        id: "export-all-001",
        requestedAt: NOW,
        scope: "all-data",
        status: "prepared",
        summary:
          "A deterministic export manifest was prepared. No real archive was created.",
      };
    },
    async requestDeletion(scope) {
      const request: MockDeletionRequest = {
        id: `deletion-${scope}-001`,
        requestedAt: NOW,
        scope,
        status: "confirmed",
        impact: {
          title:
            scope === "account"
              ? "Delete the demo account?"
              : "Delete source-derived demo data?",
          detail:
            scope === "account"
              ? "All profile, memory, permission, and activity fixtures would be cleared."
              : "Source-derived memories and normalized records would be removed.",
          affectedFeatures: ["Today", "Timeline", "Insights", "Knowledge"],
          affectedAutomations: state.automations.map((automation) => automation.name),
          reversible: false,
        },
        summary:
          "Deletion was recorded in demo state only. No account or provider data exists.",
      };
      addActivity(state, {
        type: "permission-change",
        title:
          scope === "account"
            ? "Confirmed demo account deletion"
            : "Confirmed source-derived data deletion",
        summary: request.summary,
        source: "Settings",
        actor: { kind: "user", label: "Aadi Sharma" },
        requiredAuthority: "ask",
        grantedAuthority: "ask",
        outcome: "success",
        evidence: [],
        result: "Mock request recorded; no real data was deleted.",
        reversible: false,
        reversalState: "not-available",
        relatedHref: "/app/activity",
      });
      return request;
    },
  };
}

export interface Phase3Services {
  automationService: AutomationService;
  connectionService: ConnectionService;
  permissionService: PermissionService;
  memoryService: MemoryService;
  activityService: ActivityService;
  settingsService: SettingsService;
}

export function createMockPhase3Services(
  scenario: NexusScenario = "rain-and-traffic",
): Phase3Services {
  const state = createPhase3FixtureState(scenario);
  return {
    automationService: createAutomationService(state),
    connectionService: createConnectionService(state),
    permissionService: createPermissionService(state),
    memoryService: createMemoryService(state),
    activityService: createActivityService(state),
    settingsService: createSettingsService(state),
  };
}

const defaultServices = createMockPhase3Services();

export const automationService = defaultServices.automationService;
export const connectionService = defaultServices.connectionService;
export const permissionService = defaultServices.permissionService;
export const memoryService = defaultServices.memoryService;
export const activityService = defaultServices.activityService;
export const settingsService = defaultServices.settingsService;
