export type TodayScenario =
  | "first-use"
  | "no-connections"
  | "loading"
  | "empty"
  | "error"
  | "student-normal-day"
  | "rain-and-traffic"
  | "deadline-risk"
  | "partial-connections"
  | "rate-limited"
  | "stale-source"
  | "connection-stale"
  | "permission-revoked"
  | "permission-denied"
  | "offline"
  | "degraded-ai"
  | "action-pending"
  | "action-running"
  | "action-succeeded"
  | "action-recoverable-failure"
  | "action-failed"
  | "privacy-paused"
  | "reduced-motion";

export type DataAvailabilityState =
  | "loading"
  | "populated"
  | "empty"
  | "partial";

export type SourceAvailabilityState =
  | "fresh"
  | "stale"
  | "disconnected"
  | "revoked"
  | "rate-limited"
  | "offline"
  | "error";

export type IntelligenceAvailabilityState =
  | "ready"
  | "degraded"
  | "unavailable";

export type ActionLifecycleState =
  | "idle"
  | "proposed"
  | "pending-approval"
  | "running"
  | "succeeded"
  | "failed-recoverably"
  | "failed-finally"
  | "reversed";

export type ConfigurationState =
  | "first-use"
  | "no-connections"
  | "configured";

export interface ProductStateDimensions {
  data: DataAvailabilityState;
  source: SourceAvailabilityState;
  intelligence: IntelligenceAvailabilityState;
  action: ActionLifecycleState;
  configuration: ConfigurationState;
}

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
  state: ProductStateDimensions;
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
    | "offline"
    | "rate-limited"
    | "error"
    | "revoked";
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
  | "running"
  | "succeeded"
  | "failed"
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
  provenance?: "manual-paste";
  sourceEvidence?: string;
  timezone?: string;
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
  state: ProductStateDimensions;
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
  state: ProductStateDimensions;
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
  status:
    | "prepared"
    | "pending-approval"
    | "running"
    | "succeeded"
    | "approved"
    | "rejected"
    | "failed"
    | "failed-recoverably";
}

export interface RecordedToolResult {
  id: string;
  proposalId: string;
  status: "not-run" | "running" | "succeeded" | "failed";
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
  state: ProductStateDimensions;
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
  state: ProductStateDimensions;
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
  provenance?: "manual-paste";
  sourceLabel?: string;
  tags?: string[];
}

export interface NotesSnapshot {
  scenario: NexusScenario;
  state: ProductStateDimensions;
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
  | "control"
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
  state: ProductStateDimensions;
  viewState: CoreViewState;
  query: string;
  results: UnifiedSearchResult[];
  recentSearches: string[];
  availableTypes: UnifiedSearchResultType[];
  availableSources: string[];
  localOnly: boolean;
  notice?: string;
}

export type ControlViewState =
  | CoreViewState
  | "partial"
  | "privacy-paused";

export type AutomationStatus =
  | "active"
  | "paused"
  | "draft"
  | "needs-attention"
  | "blocked";

export interface AutomationTrigger {
  kind: "schedule" | "context-change" | "deadline-risk" | "event-window";
  label: string;
  cadence: string;
}

export interface AutomationCondition {
  id: string;
  label: string;
  source: string;
  satisfied: boolean;
}

export interface AutomationDependency {
  id: string;
  kind: "connection" | "permission";
  label: string;
  state: "available" | "stale" | "denied" | "disconnected";
}

export interface AutomationRun {
  id: string;
  automationId: string;
  startedAt: string;
  outcome:
    | "pending-approval"
    | "running"
    | "succeeded"
    | "skipped"
    | "failed"
    | "blocked";
  summary: string;
  authorityUsed: AuthorityLevel;
  reversible: boolean;
}

export interface AutomationDryRunResult {
  automationId: string;
  ranAt: string;
  outcome: "would-suggest" | "would-prepare" | "would-ask" | "blocked";
  proposedOutcome: string;
  requiredAuthority: AuthorityLevel;
  trace: ReadonlyArray<{
    id: string;
    label: string;
    result: "passed" | "failed" | "not-run";
    detail: string;
  }>;
}

export interface AutomationDefinition {
  id: string;
  name: string;
  description: string;
  status: AutomationStatus;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  proposedAction: string;
  authority: AuthorityLevel;
  dataUsed: string[];
  dependencies: AutomationDependency[];
  lastRunAt?: string;
  nextEligibleAt?: string;
  attentionReason?: string;
  runHistory: AutomationRun[];
  isTemplate?: boolean;
}

export interface AutomationSnapshot {
  scenario: NexusScenario;
  state: ProductStateDimensions;
  viewState: ControlViewState;
  globallyPaused: boolean;
  summary: string;
  activeCount: number;
  needsAttentionCount: number;
  automations: AutomationDefinition[];
  templates: AutomationDefinition[];
  notice?: string;
}

export type ConnectionStatus =
  | "connected"
  | "disconnected"
  | "syncing"
  | "stale"
  | "denied"
  | "reconnect-required"
  | "offline";

export interface ConnectionCapability {
  id: string;
  label: string;
  providerScope: string;
  granted: boolean;
  purpose: string;
}

export interface ConnectionIdentity {
  provider: string;
  accountLabel: string;
  accountHint: string;
  family:
    | "calendar"
    | "email"
    | "knowledge"
    | "location"
    | "device";
}

export interface ConnectionRecord {
  id: string;
  identity: ConnectionIdentity;
  status: ConnectionStatus;
  capabilities: ConnectionCapability[];
  lastSuccessfulSyncAt?: string;
  freshness: FreshnessState;
  dependentFeatures: string[];
  dependentAutomationIds: string[];
  permissionSummary: string;
  retentionSummary: string;
  healthDetail: string;
}

export interface ConnectionSyncResult {
  connectionId: string;
  status: "succeeded" | "failed" | "offline";
  completedAt: string;
  summary: string;
  changedRecords: number;
}

export interface DependencyImpact {
  title: string;
  detail: string;
  affectedFeatures: string[];
  affectedAutomations: string[];
  reversible: boolean;
}

export interface ConnectionSnapshot {
  scenario: NexusScenario;
  state: ProductStateDimensions;
  viewState: ControlViewState;
  summary: string;
  healthyCount: number;
  attentionCount: number;
  connections: ConnectionRecord[];
  availableSetups: ConnectionRecord[];
  notice?: string;
}

export type DataClass =
  | "public"
  | "personal"
  | "private-content"
  | "sensitive-context"
  | "highly-sensitive";

export type RetentionChoice =
  | "none"
  | "working-context"
  | "30-days"
  | "until-disconnected";

export type ModelUseChoice = "never" | "allowed-for-purpose";

export interface PermissionHistoryEntry {
  id: string;
  changedAt: string;
  actor: "user" | "nexus-policy";
  summary: string;
}

export interface PermissionGrant {
  id: string;
  sourceId: string;
  sourceLabel: string;
  capability: string;
  providerScope: string;
  dataClass: DataClass;
  readAllowed: boolean;
  readPurpose: string;
  retention: RetentionChoice;
  modelUse: ModelUseChoice;
  notificationsAllowed: boolean;
  actionAuthority: AuthorityLevel;
  dependentFeatures: string[];
  dependentAutomations: string[];
  sensitive: boolean;
  status: "granted" | "reduced" | "revoked";
  history: PermissionHistoryEntry[];
}

export interface PermissionSnapshot {
  scenario: NexusScenario;
  state: ProductStateDimensions;
  viewState: ControlViewState;
  observationPaused: boolean;
  automationsPaused: boolean;
  summary: string;
  grants: PermissionGrant[];
  notice?: string;
}

export type MemoryCategory =
  | "user-stated"
  | "inferred-routine"
  | "preference"
  | "important-place"
  | "person"
  | "working-memory";

export interface MemoryEvidence {
  id: string;
  source: string;
  detail: string;
  observedAt: string;
}

export interface MemoryOrigin {
  kind: "user-stated" | "inferred" | "source-derived";
  sourceLabel: string;
}

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  label: string;
  value: string;
  utility: string;
  origin: MemoryOrigin;
  evidence: MemoryEvidence[];
  confidence?: number;
  sensitivity: DataClass;
  lastVerifiedAt: string;
  expiresAt?: string;
  usedBy: string[];
  persistence: "temporary" | "persistent";
  status: "confirmed" | "unconfirmed" | "conflicted" | "deleted";
  inferenceLocked: boolean;
  reversible: boolean;
}

export interface MemoryMutationResult {
  memoryId: string;
  status: "confirmed" | "corrected" | "deleted" | "restored";
  summary: string;
  recordedActivityId: string;
}

export interface MemorySnapshot {
  scenario: NexusScenario;
  state: ProductStateDimensions;
  viewState: ControlViewState;
  summary: string;
  items: MemoryItem[];
  notice?: string;
}

export type ActivityEventType =
  | "source-read"
  | "connection-sync"
  | "insight"
  | "notification"
  | "prepared-action"
  | "approved-action"
  | "rejected-action"
  | "permission-change"
  | "memory-change"
  | "automation-run"
  | "manual-capture";

export type ActivityOutcome =
  | "success"
  | "running"
  | "pending"
  | "denied"
  | "failed"
  | "reversed";

export interface ActivityActor {
  kind: "user" | "nexus" | "provider-mock" | "policy";
  label: string;
}

export interface ActivityEvent {
  id: string;
  occurredAt: string;
  dateLabel: string;
  type: ActivityEventType;
  title: string;
  summary: string;
  source: string;
  actor: ActivityActor;
  requiredAuthority: AuthorityLevel;
  grantedAuthority: AuthorityLevel;
  outcome: ActivityOutcome;
  evidence: Evidence[];
  result: string;
  failure?: {
    code: string;
    message: string;
    recoverable: boolean;
  };
  reversible: boolean;
  reversalState: "available" | "not-available" | "reversed";
  relatedHref: string;
  technicalDetail: string;
}

export interface ActivityFilters {
  query: string;
  types: ActivityEventType[];
  sources: string[];
  authorities: AuthorityLevel[];
  outcomes: ActivityOutcome[];
}

export interface ActivitySnapshot {
  scenario: NexusScenario;
  state: ProductStateDimensions;
  viewState: ControlViewState;
  summary: string;
  events: ActivityEvent[];
  availableSources: string[];
  notice?: string;
}

export interface ImportantPlace {
  id: string;
  label: string;
  address: string;
  travelMode: "walk" | "cycle" | "transit" | "drive";
}

export interface QuietHours {
  enabled: boolean;
  startsAt: string;
  endsAt: string;
}

export interface NotificationPolicy {
  style: "essential" | "balanced" | "proactive";
  inApp: boolean;
  emailDigest: boolean;
  devicePush: boolean;
  morningBriefAt: string;
  eveningBriefAt: string;
  quietHours: QuietHours;
}

export interface PrivacyControls {
  observationPaused: boolean;
  automationsPaused: boolean;
  defaultRetention: RetentionChoice;
  futureModelUse: ModelUseChoice;
}

export interface AccessibilityPreferences {
  reducedMotion: boolean;
  highContrast: boolean;
  largerText: boolean;
}

export interface UserPreferences {
  displayName: string;
  timezone: string;
  locale: string;
  places: ImportantPlace[];
  notifications: NotificationPolicy;
  privacy: PrivacyControls;
  accessibility: AccessibilityPreferences;
  personalization: {
    conciseExplanations: boolean;
    learnFromFeedback: boolean;
    preferredTravelMode: ImportantPlace["travelMode"];
  };
}

export interface SettingsSnapshot {
  scenario: NexusScenario;
  state: ProductStateDimensions;
  viewState: ControlViewState;
  summary: string;
  preferences: UserPreferences;
  notice?: string;
}

export interface MockExportRequest {
  id: string;
  requestedAt: string;
  scope: "all-data" | "activity-filter" | "source-derived";
  status: "prepared" | "failed";
  summary: string;
}

export interface MockDeletionRequest {
  id: string;
  requestedAt: string;
  scope: "source-derived" | "account";
  status: "confirmed" | "cancelled";
  impact: DependencyImpact;
  summary: string;
}

export type QuickCaptureMode = "note" | "event";

export interface ManualPasteSource {
  kind: "manual-paste";
  label?: string;
}

export interface QuickCaptureDraft {
  id: string;
  mode: QuickCaptureMode;
  rawText: string;
  source: ManualPasteSource;
  noteTitle: string;
  tags: string[];
  event: {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    description: string;
  };
}

export interface CaptureValidationIssue {
  field:
    | "rawText"
    | "noteTitle"
    | "eventTitle"
    | "date"
    | "startTime"
    | "endTime";
  code:
    | "required"
    | "ambiguous-date"
    | "invalid-date"
    | "invalid-time"
    | "end-before-start";
  severity: "error" | "review";
  message: string;
}

export interface NoteCapturePreview {
  mode: "note";
  title: string;
  body: string;
  tags: string[];
  source: ManualPasteSource;
  provenance: "manual-paste";
  issues: CaptureValidationIssue[];
}

export interface EventCapturePreview {
  mode: "event";
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  timezone: string;
  sourceEvidence: string;
  source: ManualPasteSource;
  provenance: "manual-paste";
  issues: CaptureValidationIssue[];
}

export type QuickCapturePreview = NoteCapturePreview | EventCapturePreview;

export interface QuickCaptureResult {
  id: string;
  mode: QuickCaptureMode;
  status: "succeeded" | "failed-recoverably" | "blocked";
  summary: string;
  createdItemId?: string;
  activityId?: string;
  href?: string;
  recordedAt: string;
}
