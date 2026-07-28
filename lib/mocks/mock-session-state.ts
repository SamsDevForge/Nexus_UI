import type {
  ActivityEvent,
  NexusScenario,
  NoteArtifact,
  TimelineEntry,
} from "@/lib/domain/contracts";

interface MockSessionState {
  notes: NoteArtifact[];
  timeline: TimelineEntry[];
  activity: ActivityEvent[];
}

const sessions = new Map<NexusScenario, MockSessionState>();

function emptySession(): MockSessionState {
  return {
    notes: [],
    timeline: [],
    activity: [],
  };
}

export function getMockSessionState(scenario: NexusScenario): MockSessionState {
  const existing = sessions.get(scenario);
  if (existing) return existing;
  const created = emptySession();
  sessions.set(scenario, created);
  return created;
}

export function resetMockSessionState(scenario: NexusScenario) {
  sessions.set(scenario, emptySession());
  notifyMockSessionChange(scenario);
}

export function notifyMockSessionChange(scenario: NexusScenario) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("nexus:mock-session-change", {
      detail: { scenario },
    }),
  );
}

export function addSessionNote(scenario: NexusScenario, note: NoteArtifact) {
  const state = getMockSessionState(scenario);
  state.notes = [note, ...state.notes.filter((item) => item.id !== note.id)];
  notifyMockSessionChange(scenario);
}

export function findSessionNote(noteId: string) {
  for (const [scenario, state] of sessions) {
    const note = state.notes.find((item) => item.id === noteId);
    if (note) return { scenario, note };
  }
  return null;
}

export function updateSessionNote(noteId: string, next: NoteArtifact) {
  const found = findSessionNote(noteId);
  if (!found) return false;
  const state = getMockSessionState(found.scenario);
  state.notes = state.notes.map((item) => (item.id === noteId ? next : item));
  notifyMockSessionChange(found.scenario);
  return true;
}

export function addSessionTimelineEntry(
  scenario: NexusScenario,
  entry: TimelineEntry,
) {
  const state = getMockSessionState(scenario);
  state.timeline = [
    entry,
    ...state.timeline.filter((item) => item.id !== entry.id),
  ];
  notifyMockSessionChange(scenario);
}

export function addSessionActivity(
  scenario: NexusScenario,
  event: ActivityEvent,
) {
  const state = getMockSessionState(scenario);
  state.activity = [
    event,
    ...state.activity.filter((item) => item.id !== event.id),
  ];
  notifyMockSessionChange(scenario);
}
