import type { NexusApiClient } from "@/lib/api/client";

export interface BriefPreferences {
  style: "essential" | "balanced" | "proactive";
  inApp: boolean;
  devicePush: boolean;
  emailDigest: boolean;
  morningEnabled: boolean;
  eveningEnabled: boolean;
  morningBriefAt: string;
  eveningBriefAt: string;
  quietHours: { enabled: boolean; startsAt: string; endsAt: string };
}
export interface BriefConfiguration extends BriefPreferences {
  timezone: string;
  paused: boolean;
  pushAvailable: boolean;
  webVapidPublicKey: string | null;
}
export interface BriefItem {
  id: string;
  kind: "morning" | "evening" | "test";
  title: string;
  body: string;
  status: "queued" | "delivered" | "suppressed";
  reason: string | null;
  dueAt: string;
  expiresAt: string;
  deliveredAt: string | null;
  readAt: string | null;
  evidence: { source?: string; targetDate?: string; generatedAt?: string; eventCount?: number };
  push: Array<{ status: string; reason: string | null }>;
}
export interface PushDevice { id: string; platform: "web" | "android" }
export interface BriefSnapshot {
  preferences: BriefConfiguration;
  items: BriefItem[];
  devices: PushDevice[];
  sample: boolean;
}
export interface NotificationService {
  load(): Promise<BriefSnapshot>;
  save(preferences: BriefPreferences): Promise<BriefConfiguration>;
  queueTest(key: string): Promise<BriefItem>;
  read(id: string): Promise<void>;
  register(fid: string): Promise<PushDevice>;
  revoke(id: string): Promise<void>;
}

export function writablePreferences(value: BriefPreferences): BriefPreferences {
  const { style, inApp, devicePush, emailDigest, morningEnabled, eveningEnabled,
    morningBriefAt, eveningBriefAt, quietHours } = value;
  return { style, inApp, devicePush, emailDigest, morningEnabled, eveningEnabled,
    morningBriefAt, eveningBriefAt, quietHours };
}

export function createLiveNotificationService(client: NexusApiClient): NotificationService {
  const base = "/api/v1/notifications";
  return {
    async load() {
      const [preferences, inbox, devices] = await Promise.all([
        client.request<BriefConfiguration>(`${base}/preferences`),
        client.request<{ items: BriefItem[] }>(base),
        client.request<PushDevice[]>(`${base}/devices`),
      ]);
      return { preferences: preferences.data, items: inbox.data.items, devices: devices.data, sample: false };
    },
    async save(preferences) {
      return (await client.request<BriefConfiguration>(`${base}/preferences`, {
        method: "PUT", body: JSON.stringify(writablePreferences(preferences)),
      })).data;
    },
    async queueTest(key) {
      return (await client.request<BriefItem>(`${base}/test`, {
        method: "POST", body: JSON.stringify({ idempotencyKey: key }),
      })).data;
    },
    async read(id) { await client.request(`${base}/${encodeURIComponent(id)}/read`, { method: "PATCH" }); },
    async register(fid) {
      return (await client.request<PushDevice>(`${base}/devices`, {
        method: "POST", body: JSON.stringify({ fid, platform: "web" }),
      })).data;
    },
    async revoke(id) { await client.request(`${base}/devices/${encodeURIComponent(id)}`, { method: "DELETE" }); },
  };
}

export function createSampleNotificationService(): NotificationService {
  let preferences: BriefConfiguration = {
    style: "balanced", inApp: true, devicePush: false, emailDigest: false,
    morningEnabled: false, eveningEnabled: false, morningBriefAt: "07:30", eveningBriefAt: "20:30",
    quietHours: { enabled: true, startsAt: "22:30", endsAt: "07:00" },
    timezone: "Asia/Kolkata", paused: false, pushAvailable: false, webVapidPublicKey: null,
  };
  let items: BriefItem[] = [];
  const unavailable = async (): Promise<never> => { throw new Error("Push requires a configured live account."); };
  return {
    async load() { return structuredClone({ preferences, items, devices: [], sample: true }); },
    async save(value) { preferences = { ...preferences, ...structuredClone(writablePreferences(value)) }; return structuredClone(preferences); },
    async queueTest(key) {
      const existing = items.find(item => item.id === key);
      if (existing) return structuredClone(existing);
      const now = new Date().toISOString();
      const item: BriefItem = { id: key, kind: "test", title: "Sample morning brief",
        body: "Sample: two saved NEXUS event drafts for today. External calendars are not connected.",
        status: "delivered", reason: null, dueAt: now, expiresAt: new Date(Date.now() + 7200_000).toISOString(),
        deliveredAt: now, readAt: null, evidence: { source: "Demonstration data", eventCount: 2 }, push: [] };
      items = [item, ...items];
      return structuredClone(item);
    },
    async read(id) { items = items.map(item => item.id === id ? { ...item, readAt: new Date().toISOString() } : item); },
    register: unavailable, revoke: unavailable,
  };
}
