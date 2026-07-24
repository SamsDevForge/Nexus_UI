export type TodayScenario =
  | "first-use"
  | "loading"
  | "student-normal-day"
  | "rain-and-traffic"
  | "deadline-risk"
  | "connection-stale"
  | "permission-denied"
  | "offline"
  | "action-failed"
  | "reduced-motion";

export type TodayViewState =
  | "populated"
  | "loading"
  | "first-use"
  | "permission-denied"
  | "offline"
  | "error";

export type SystemState =
  | "dormant"
  | "observing"
  | "gathering"
  | "processing"
  | "insight-ready"
  | "approval-needed"
  | "success"
  | "degraded"
  | "privacy-paused";

export type AuthorityLevel = "observe" | "suggest" | "prepare" | "ask" | "act";

export type FreshnessState = "live" | "fresh" | "stale" | "disconnected";

export interface Evidence {
  id: string;
  source: string;
  detail: string;
  observedAt: string;
  freshness: FreshnessState;
}

export interface Insight {
  id: string;
  kind: "departure" | "deadline" | "calm-day";
  eyebrow: string;
  title: string;
  recommendation: string;
  explanation: string;
  confidence: number;
  freshUntil: string;
  requiredAuthority: AuthorityLevel;
  evidence: Evidence[];
  proposedAction?: ActionProposal;
}

export interface ActionProposal {
  id: string;
  label: string;
  tool: string;
  reason: string;
  requiredAuthority: AuthorityLevel;
  expiresAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  course: string;
  startsAt: string;
  endsAt: string;
  place: string;
  preparationMinutes: number;
  leaveAt?: string;
  status: "confirmed" | "inferred" | "suggested";
}

export interface TimelineItem {
  id: string;
  time: string;
  title: string;
  detail: string;
  kind: "prepare" | "travel" | "event" | "focus" | "deadline";
  status: "confirmed" | "inferred" | "suggested";
}

export interface DeadlineRisk {
  id: string;
  title: string;
  course: string;
  dueAt: string;
  remainingLabel: string;
  progress: number;
  risk: "low" | "medium" | "high";
  recommendation: string;
}

export interface PreparedAsset {
  id: string;
  name: string;
  kind: "note" | "file" | "offline-pack";
  detail: string;
  preparedAt: string;
}

export interface ContextSignal {
  id: string;
  label: string;
  value: string;
  source: string;
  freshness: FreshnessState;
}

export interface ConnectionHealth {
  id: string;
  provider: string;
  capability: string;
  health: "healthy" | "stale" | "disconnected" | "permission-denied";
  lastSyncAt?: string;
}

export interface TodaySnapshot {
  scenario: TodayScenario;
  viewState: TodayViewState;
  systemState: SystemState;
  greeting: string;
  dateLabel: string;
  locationLabel: string;
  summary: string;
  insight: Insight | null;
  nextEvent: CalendarEvent | null;
  timeline: TimelineItem[];
  deadlines: DeadlineRisk[];
  preparedAssets: PreparedAsset[];
  signals: ContextSignal[];
  connections: ConnectionHealth[];
  notice?: {
    tone: "info" | "warning" | "danger";
    title: string;
    detail: string;
  };
}
