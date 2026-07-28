import type { UserPreferences } from "@/lib/domain/contracts";

export interface NexusUser {
  id: string;
  email: string | null;
  displayName: string | null;
  onboardingCompleted: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Phase6Profile {
  displayName: string;
  timezone: string;
  locale: string;
}

export interface Phase6Place {
  id: string;
  label: string;
  address: string;
  role: "home" | "campus" | "work" | "other";
  travelMode: "walk" | "cycle" | "transit" | "drive";
  latitude?: number | null;
  longitude?: number | null;
  isDefaultOrigin: boolean;
  createdAt: string;
  updatedAt: string;
}

export type Phase6PreferencePayload = Pick<
  UserPreferences,
  "notifications" | "personalization" | "privacy" | "accessibility"
>;

export interface OnboardingPayload {
  profile: Phase6Profile;
  places: Array<
    Omit<Phase6Place, "id" | "createdAt" | "updatedAt">
  >;
  preferences: Phase6PreferencePayload;
}

export interface OnboardingResult {
  user: NexusUser;
  profile: Phase6Profile;
  places: Phase6Place[];
  preferences: Phase6PreferencePayload;
}

export type DurableCaptureKind = "note" | "local-event-draft";

export interface DurableCapture {
  id: string;
  kind: DurableCaptureKind;
  title: string;
  rawText: string;
  sourceLabel: string | null;
  canonicalFields: Readonly<Record<string, unknown>>;
  provenance: "manual-paste";
  status: "saved" | "corrected" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface DurableCaptureInput {
  title: string;
  rawText: string;
  sourceLabel?: string;
  canonicalFields: Readonly<Record<string, unknown>>;
  idempotencyKey: string;
}

export interface Phase6AuditEvent {
  id: string;
  eventType: string;
  requestId: string;
  targetType: string;
  targetId: string | null;
  result: string;
  changedFields: string[];
  createdAt: string;
}

export interface ApiEnvelope<T> {
  data: T;
  requestId: string;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}
