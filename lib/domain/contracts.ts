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

export type NexusScenario = TodayScenario;

export type CoreViewState =
  | "populated"
  | "loading"
  | "empty"
  | "stale"
  | "permission-denied"
  | "offline"
  | "error";

export interface SourceHealth {
  id: string;
  source: string;
  capability: string;
  state:
    | "healthy"
    | "stale"
    | "disconnected"
    | "permission-denied"
    | "offline";
  freshness: FreshnessState;
  lastObservedAt?: string;
  detail: string;
}

export type TimelineEntryKind =
  | "event"
  | "task"
  | "travel"
  | "preparation"
  | "focus"
  | "deadline";

export type TimelineEntryStatus =
  | "confirmed"
  | "inferred"
  | "suggested"
  | "pending-approval"
  | "completed"
  | "missed"
  | "at-risk";

export interface TimelineEntry {
  id: string;
  day: string;
  startsAt: string;
  endsAt?: string;
  timeLabel: string;
  endLabel?: string;
  title: string;
  detail: string;
  kind: TimelineEntryKind;
  status: TimelineEntryStatus;
  source: string;
  freshness: FreshnessState;
  confidence?: number;
  reasoning?: string;
  requiredAuthority: AuthorityLevel;
  proposedAction?: ToolActionProposal;
}

export interface TimelineGroup {
  id: string;
  date: string;
  label: string;
  shortLabel: string;
  entries: TimelineEntry[];
}

export interface TimelineSnapshot {
  scenario: NexusScenario;
  viewState: CoreViewState;
  currentTime: string;
  currentTimeLabel: string;
  selectedDay: string;
  summary: string;
  groups: TimelineGroup[];
  sourceHealth: SourceHealth[];
  notice?: string;
}

export type InsightCategory =
  | "travel"
  | "deadline"
  | "preparation"
  | "knowledge"
  | "quiet";

export type InsightLifecycle =
  | "active"
  | "snoozed"
  | "acted"
  | "expired"
  | "dismissed";

export interface RankedInsight {
  id: string;
  rank: number;
  category: InsightCategory;
  urgency: "now" | "today" | "soon" | "quiet";
  lifecycle: InsightLifecycle;
  title: string;
  recommendation: string;
  explanation: string;
  evidence: Evidence[];
  confidence: number;
  freshUntil: string;
  expiresAt: string;
  requiredAuthority: AuthorityLevel;
  proposedAction?: ToolActionProposal;
  quiet: boolean;
}

export interface InsightFeedback {
  insightId: string;
  value: "helpful" | "not-useful" | "dismissed" | "snoozed";
  recordedAt: string;
}

export interface InsightsSnapshot {
  scenario: NexusScenario;
  viewState: CoreViewState;
  summary: string;
  primary: RankedInsight | null;
  stream: RankedInsight[];
  history: RankedInsight[];
  sourceHealth: SourceHealth[];
  notice?: string;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "nexus" | "system";
  content: string;
  createdAt: string;
  evidence: Evidence[];
  state: "complete" | "prepared" | "failed";
}

export interface ConversationThread {
  id: string;
  title: string;
  updatedAt: string;
  messages: ConversationMessage[];
}

export interface ToolActionProposal {
  id: string;
  tool: string;
  label: string;
  reason: string;
  parameters: Readonly<Record<string, string>>;
  evidenceRefs: string[];
  requiredAuthority: AuthorityLevel;
  expiresAt: string;
  status: "prepared" | "pending-approval" | "approved" | "rejected" | "failed";
}

export interface RecordedToolResult {
  id: string;
  proposalId: string;
  status: "not-run" | "succeeded" | "failed";
  recordedAt: string;
  summary: string;
  reversible: boolean;
}

export interface ScriptedConversation {
  id: string;
  prompt: string;
  contextLabel: string;
  messages: ConversationMessage[];
  proposal?: ToolActionProposal;
  toolResult?: RecordedToolResult;
}

export interface NexusWorkspaceSnapshot {
  scenario: NexusScenario;
  viewState: CoreViewState;
  contextSummary: string;
  contextSignals: ContextSignal[];
  threads: ConversationThread[];
  scripts: ScriptedConversation[];
  selectedScriptId: string;
  sourceHealth: SourceHealth[];
  notice?: string;
}

export type KnowledgeSourceKind =
  | "notion"
  | "drive"
  | "email-attachment"
  | "internal-note"
  | "lecture-material";

export interface KnowledgeSource {
  id: string;
  name: string;
  kind: KnowledgeSourceKind;
  status: "available" | "stale" | "permission-denied" | "disconnected";
  freshness: FreshnessState;
  permission: string;
  documentCount: number;
  detail: string;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  course: string;
  sourceId: string;
  sourceLabel: string;
  kind: KnowledgeSourceKind;
  updatedAt: string;
  freshness: FreshnessState;
  excerpt: string;
  evidenceExcerpt: string;
  permission: string;
  relatedDocumentIds: string[];
  noteId?: string;
}

export interface KnowledgeSearchResult {
  document: KnowledgeDocument;
  matchExcerpt: string;
  confidence: number;
}

export interface KnowledgeSnapshot {
  scenario: NexusScenario;
  viewState: CoreViewState;
  summary: string;
  sources: KnowledgeSource[];
  recent: KnowledgeDocument[];
  related: KnowledgeDocument[];
  sourceHealth: SourceHealth[];
  notice?: string;
}

export type NoteReviewState =
  | "draft"
  | "needs-review"
  | "reviewed"
  | "mock-synced";

export interface NoteCitation {
  id: string;
  sourceDocumentId: string;
  sourceLabel: string;
  excerpt: string;
}

export interface NoteArtifact {
  id: string;
  title: string;
  group: string;
  state: NoteReviewState;
  updatedAt: string;
  summary: string;
  body: string;
  sourceMaterialAvailable: boolean;
  citations: NoteCitation[];
  actionItems: string[];
  unresolvedQuestions: string[];
  confidence: number;
  preparedAction?: ToolActionProposal;
}

export interface NotesSnapshot {
  scenario: NexusScenario;
  viewState: CoreViewState;
  summary: string;
  notes: NoteArtifact[];
  sourceHealth: SourceHealth[];
  notice?: string;
}

export type UnifiedSearchResultType =
  | "event"
  | "task"
  | "insight"
  | "conversation"
  | "knowledge"
  | "note"
  | "email-derived";

export interface UnifiedSearchResult {
  id: string;
  type: UnifiedSearchResultType;
  title: string;
  excerpt: string;
  source: string;
  freshness: FreshnessState;
  updatedAt: string;
  href: string;
  permission: "available" | "restricted";
  keywords: string[];
}

export interface SearchFilters {
  types: UnifiedSearchResultType[];
  sources: string[];
}

export interface SearchResponse {
  scenario: NexusScenario;
  viewState: CoreViewState;
  query: string;
  results: UnifiedSearchResult[];
  recentSearches: string[];
  availableTypes: UnifiedSearchResultType[];
  availableSources: string[];
  localOnly: boolean;
  notice?: string;
}
