import type {
  InsightFeedback,
  KnowledgeSearchResult,
  NoteArtifact,
} from "@/lib/domain/contracts";
import type { InsightsService } from "@/lib/services/insights-service";
import type { KnowledgeService } from "@/lib/services/knowledge-service";
import type { NexusService } from "@/lib/services/nexus-service";
import type { NotesService } from "@/lib/services/notes-service";
import type { SearchService } from "@/lib/services/search-service";
import type { TimelineService } from "@/lib/services/timeline-service";
import {
  buildInsightsSnapshot,
  buildKnowledgeSnapshot,
  buildNexusWorkspaceSnapshot,
  buildNotesSnapshot,
  buildSearchResponse,
  buildTimelineSnapshot,
  findKnowledgeDocument,
  findNote,
  searchKnowledgeDocuments,
} from "@/lib/mocks/phase2-fixtures";
import {
  addSessionNote,
  addSessionTimelineEntry,
  findSessionNote,
  getMockSessionState,
  updateSessionNote,
} from "@/lib/mocks/mock-session-state";

class MockTimelineService implements TimelineService {
  async getTimeline(scenario: Parameters<TimelineService["getTimeline"]>[0], selectedDay?: string) {
    const snapshot = buildTimelineSnapshot(scenario, selectedDay);
    const captured = getMockSessionState(scenario).timeline;
    if (captured.length === 0) return snapshot;

    const groups = structuredClone(snapshot.groups);
    for (const entry of captured) {
      let group = groups.find((item) => item.date === entry.day);
      if (!group) {
        const date = new Date(`${entry.day}T12:00:00+05:30`);
        const long = new Intl.DateTimeFormat("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(date);
        const short = new Intl.DateTimeFormat("en-IN", {
          weekday: "short",
          day: "numeric",
        }).format(date);
        group = {
          id: `timeline-capture-${entry.day}`,
          date: entry.day,
          label: long,
          shortLabel: short,
          entries: [],
        };
        groups.push(group);
      }
      group.entries = [
        entry,
        ...group.entries.filter((item) => item.id !== entry.id),
      ].sort((left, right) => left.startsAt.localeCompare(right.startsAt));
    }

    return {
      ...snapshot,
      viewState: "populated" as const,
      groups: groups.sort((left, right) => left.date.localeCompare(right.date)),
      selectedDay:
        selectedDay && groups.some((group) => group.date === selectedDay)
          ? selectedDay
          : captured[0]?.day ?? snapshot.selectedDay,
    };
  }

  async scheduleManualEvent(
    scenario: Parameters<TimelineService["scheduleManualEvent"]>[0],
    preview: Parameters<TimelineService["scheduleManualEvent"]>[1],
  ) {
    const count = getMockSessionState(scenario).timeline.length + 1;
    const start = `${preview.date}T${preview.startTime}:00+05:30`;
    const end = preview.endTime
      ? `${preview.date}T${preview.endTime}:00+05:30`
      : undefined;
    const entry = {
      id: `capture-event-${count}`,
      day: preview.date,
      startsAt: start,
      endsAt: end,
      timeLabel: preview.startTime,
      endLabel: preview.endTime || undefined,
      title: preview.title,
      detail: [preview.location, preview.description].filter(Boolean).join(" · ") ||
        "Created from manually pasted text.",
      kind: "event" as const,
      status: "confirmed" as const,
      source: preview.source.label
        ? `Manual paste · ${preview.source.label}`
        : "Manual paste",
      freshness: "fresh" as const,
      requiredAuthority: "ask" as const,
      provenance: "manual-paste" as const,
      sourceEvidence: preview.sourceEvidence,
      timezone: preview.timezone,
    };
    addSessionTimelineEntry(scenario, entry);
    return structuredClone(entry);
  }

  async resolveSuggestion(
    _scenario: Parameters<TimelineService["resolveSuggestion"]>[0],
    entryId: string,
    decision: "accept" | "reject" | "reschedule",
  ) {
    const status =
      decision === "accept"
        ? ("accepted" as const)
        : decision === "reject"
          ? ("rejected" as const)
          : ("rescheduled" as const);
    const message =
      decision === "accept"
        ? "Focus block accepted in demo state. No calendar write occurred."
        : decision === "reject"
          ? "Suggestion removed from this demo view."
          : "A 3:45 PM alternative was prepared in demo state.";
    return { entryId, status, message };
  }
}

class MockInsightsService implements InsightsService {
  async getInsights(scenario: Parameters<InsightsService["getInsights"]>[0]) {
    return buildInsightsSnapshot(scenario);
  }

  async recordFeedback(feedback: InsightFeedback) {
    return feedback;
  }

  async resolveAction(insightId: string, decision: "approve" | "reject") {
    return {
      insightId,
      status: decision === "approve" ? ("approved" as const) : ("rejected" as const),
      message:
        decision === "approve"
          ? "Prepared action approved in demo state. No provider was contacted."
          : "Prepared action rejected. Nothing changed.",
    };
  }
}

class MockNexusService implements NexusService {
  async getWorkspace(scenario: Parameters<NexusService["getWorkspace"]>[0]) {
    return buildNexusWorkspaceSnapshot(scenario);
  }

  async runScript(
    scenario: Parameters<NexusService["runScript"]>[0],
    scriptId: string,
  ) {
    const workspace = buildNexusWorkspaceSnapshot(scenario);
    const script = workspace.scripts.find((item) => item.id === scriptId);
    if (!script) throw new Error(`Unknown deterministic script: ${scriptId}`);
    return script;
  }

  async resolvePreparedAction(
    proposalId: string,
    decision: "approve" | "reject" | "retry",
  ) {
    if (decision === "retry") {
      return {
        proposalId,
        status: "succeeded" as const,
        message: "Retry succeeded in demo state. No external tool was run.",
      };
    }
    return {
      proposalId,
      status: decision === "approve" ? ("approved" as const) : ("rejected" as const),
      message:
        decision === "approve"
          ? "Approval recorded in demo state; the calendar remains unchanged."
          : "Prepared action rejected. No tool was run.",
    };
  }
}

class MockKnowledgeService implements KnowledgeService {
  async getKnowledge(scenario: Parameters<KnowledgeService["getKnowledge"]>[0]) {
    return buildKnowledgeSnapshot(scenario);
  }

  async getDocument(
    _scenario: Parameters<KnowledgeService["getDocument"]>[0],
    documentId: string,
  ) {
    return findKnowledgeDocument(documentId);
  }

  async searchKnowledge(
    scenario: Parameters<KnowledgeService["searchKnowledge"]>[0],
    query: string,
  ): Promise<KnowledgeSearchResult[]> {
    if (["first-use", "permission-denied", "loading"].includes(scenario)) return [];
    return searchKnowledgeDocuments(query).map((document, index) => ({
      document,
      matchExcerpt: document.evidenceExcerpt,
      confidence: Math.max(0.72, 0.94 - index * 0.05),
    }));
  }
}

class MockNotesService implements NotesService {
  async getNotes(scenario: Parameters<NotesService["getNotes"]>[0]) {
    const snapshot = buildNotesSnapshot(scenario);
    const captured = getMockSessionState(scenario).notes;
    if (captured.length === 0) return snapshot;
    return {
      ...snapshot,
      viewState: "populated" as const,
      notes: [
        ...captured,
        ...snapshot.notes.filter(
          (note) => !captured.some((capturedNote) => capturedNote.id === note.id),
        ),
      ],
    };
  }

  async createManualCapture(
    scenario: Parameters<NotesService["createManualCapture"]>[0],
    preview: Parameters<NotesService["createManualCapture"]>[1],
  ) {
    const count = getMockSessionState(scenario).notes.length + 1;
    const note: NoteArtifact = {
      id: `capture-note-${count}`,
      title: preview.title,
      group: "Quick Capture",
      state: "draft",
      updatedAt: "2026-07-25T09:30:00+05:30",
      summary: preview.source.label
        ? `Manually pasted from ${preview.source.label}.`
        : "Manually pasted into NEXUS.",
      body: preview.body,
      sourceMaterialAvailable: true,
      citations: [],
      actionItems: [],
      unresolvedQuestions: [],
      confidence: 1,
      provenance: "manual-paste",
      sourceLabel: preview.source.label,
      tags: preview.tags,
    };
    addSessionNote(scenario, note);
    return structuredClone(note);
  }

  async updateNote(
    noteId: string,
    update: Parameters<NotesService["updateNote"]>[1],
  ): Promise<NoteArtifact> {
    const sessionNote = findSessionNote(noteId);
    const note = sessionNote?.note ?? findNote(noteId);
    if (!note) throw new Error(`Unknown deterministic note: ${noteId}`);
    const next = {
      ...note,
      ...update,
      updatedAt: "2026-07-25T09:20:00+05:30",
    };
    if (sessionNote) updateSessionNote(noteId, next);
    return next;
  }

  async resolvePreparation(
    noteId: string,
    decision: "approve" | "reject" | "regenerate",
  ) {
    const status =
      decision === "approve"
        ? ("approved" as const)
        : decision === "reject"
          ? ("rejected" as const)
          : ("regenerated" as const);
    return {
      noteId,
      status,
      message:
        decision === "approve"
          ? "Notion preparation approved in demo state. Nothing was published."
          : decision === "reject"
            ? "Preparation rejected. No provider state changed."
            : "A new deterministic draft was prepared from the same cited sources.",
    };
  }
}

class MockSearchService implements SearchService {
  async search(
    scenario: Parameters<SearchService["search"]>[0],
    query: string,
    filters: Parameters<SearchService["search"]>[2],
  ) {
    return buildSearchResponse(scenario, query, filters);
  }
}

export const timelineService: TimelineService = new MockTimelineService();
export const insightsService: InsightsService = new MockInsightsService();
export const nexusService: NexusService = new MockNexusService();
export const knowledgeService: KnowledgeService = new MockKnowledgeService();
export const notesService: NotesService = new MockNotesService();
export const searchService: SearchService = new MockSearchService();
