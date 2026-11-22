import type { NexusApiClient } from "@/lib/api/client";

export type CalendarSource = "manual" | "ics" | "timetable" | "google" | "microsoft";
export interface CalendarEvent {
  id: string; title: string; location: string; startsAt: string; endsAt: string;
  timezone: string; allDay: boolean; startsOn: string | null; endsOn: string | null;
  busy: boolean; status: "confirmed" | "tentative" | "declined";
  preparationMinutes: number; prepareAt: string | null; source: CalendarSource;
  collectionId: string | null; connectionId: string | null; sourceUpdatedAt: string | null;
}
export interface CalendarConnection {
  id: string; provider: "google" | "microsoft"; status: "connected" | "revoked" | "reauthorize";
  error: string | null; scopes: string[]; lastSyncedAt: string | null;
  freshUntil: string | null; watchExpiresAt: string | null;
}
export interface CalendarConflict { firstId: string; secondId: string; kind: "overlap" | "preparation"; message: string }
export interface CalendarSnapshot {
  timezone: string; startDate: string; endDateExclusive: string; items: CalendarEvent[];
  conflicts: CalendarConflict[]; truncated: boolean; paused: boolean;
  providers: Record<"google" | "microsoft", boolean>;
  connections: CalendarConnection[]; collections: Array<{ id: string; kind: string; name: string }>;
  serverTime: string; sample: boolean;
}
export interface ManualCalendarInput {
  title: string; location: string; starts_at: string; ends_at: string;
  preparation_minutes: number; idempotency_key: string;
}
export interface TimetableInput {
  name: string; title: string; location: string; timezone: string; weekdays: number[];
  starts_on: string; ends_on: string; start_time: string; end_time: string;
  preparation_minutes: number; replace: boolean;
}
export interface CalendarService {
  load(start: string): Promise<CalendarSnapshot>;
  save(value: ManualCalendarInput, id?: string): Promise<CalendarEvent>;
  remove(id: string): Promise<void>;
  preparation(id: string, minutes: number): Promise<void>;
  importIcs(value: { name: string; timezone: string; contents: string; replace: boolean }): Promise<{ imported: number }>;
  timetable(value: TimetableInput): Promise<{ imported: number }>;
  removeCollection(id: string): Promise<void>;
  connect(provider: "google" | "microsoft"): Promise<string>;
  sync(id: string): Promise<void>;
  disconnect(id: string): Promise<void>;
}

export function calendarConflicts(items: CalendarEvent[]): CalendarConflict[] {
  const sorted = items.filter(e => e.busy && e.status !== "declined").toSorted((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const output: CalendarConflict[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const first = sorted[i];
    for (const second of sorted.slice(i + 1)) {
      const start = Date.parse(second.startsAt), end = Date.parse(first.endsAt);
      if (start - 240 * 60000 >= end) break;
      if (start - (second.allDay ? 0 : second.preparationMinutes) * 60000 < end && Date.parse(first.startsAt) < Date.parse(second.endsAt)) {
        const kind = start < end ? "overlap" : "preparation";
        output.push({ firstId: first.id, secondId: second.id, kind, message: kind === "overlap" ? "Busy events overlap." : "The suggested preparation buffer overlaps an earlier event." });
      }
      if (output.length >= 200) return output;
    }
  }
  return output;
}

export function createLiveCalendarService(client: NexusApiClient): CalendarService {
  const base = "/api/v1/calendar", id = encodeURIComponent;
  const write = async <T>(path: string, value: unknown, method = "POST") => (await client.request<T>(base + path, { method, body: JSON.stringify(value) })).data;
  const remove = async (path: string) => { await client.request(base + path, { method: "DELETE" }); };
  return {
    async load(start) { return { ...(await client.request<Omit<CalendarSnapshot, "sample">>(`${base}?start=${id(start)}&days=7`)).data, sample: false }; },
    save: (value, identifier) => write<CalendarEvent>(identifier ? `/events/${id(identifier)}` : "/events", value, identifier ? "PUT" : "POST"),
    remove: identifier => remove(`/events/${id(identifier)}`),
    async preparation(identifier, minutes) { await write(`/events/${id(identifier)}/preparation`, { minutes }, "PATCH"); },
    importIcs: value => write("/imports/ics", value), timetable: value => write("/imports/timetable", value),
    removeCollection: identifier => remove(`/collections/${id(identifier)}`),
    async connect(provider) { return (await write<{ authorizationUrl: string }>(`/oauth/${provider}/start`, {})).authorizationUrl; },
    async sync(identifier) { await write(`/connections/${id(identifier)}/sync`, {}); },
    disconnect: identifier => remove(`/connections/${id(identifier)}`),
  };
}

export function createSampleCalendarService(): CalendarService {
  let items: CalendarEvent[] = [];
  const unavailable = async (): Promise<never> => { throw new Error("This action requires a configured live account. No data was sent or imported."); };
  return {
    async load(start) {
      // This explicit sample account uses Kolkata, which has no DST transitions.
      const begins = Date.parse(`${start}T00:00:00+05:30`), ends = begins + 7 * 86400_000;
      const endDate = new Date(`${start}T00:00:00Z`); endDate.setUTCDate(endDate.getUTCDate() + 7);
      const visible = items.filter(e => Date.parse(e.startsAt) < ends && (Date.parse(e.endsAt) > begins || (e.startsAt === e.endsAt && Date.parse(e.startsAt) >= begins)))
        .toSorted((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
      return structuredClone({ timezone: "Asia/Kolkata", startDate: start, endDateExclusive: endDate.toISOString().slice(0, 10),
        items: visible, conflicts: calendarConflicts(visible), truncated: false, paused: false, providers: { google: false, microsoft: false },
        connections: [], collections: [], serverTime: new Date().toISOString(), sample: true });
    },
    async save(value, id) {
      if (Date.parse(value.ends_at) <= Date.parse(value.starts_at)) throw new Error("Choose an end after the start.");
      const identifier = id ?? value.idempotency_key;
      const event: CalendarEvent = { id: identifier, title: value.title, location: value.location,
        startsAt: value.starts_at, endsAt: value.ends_at, timezone: "Asia/Kolkata", allDay: false, startsOn: null, endsOn: null,
        busy: true, status: "confirmed", preparationMinutes: value.preparation_minutes,
        prepareAt: new Date(Date.parse(value.starts_at) - value.preparation_minutes * 60000).toISOString(),
        source: "manual", collectionId: null, connectionId: null, sourceUpdatedAt: null };
      items = [...items.filter(e => e.id !== identifier), event]; return structuredClone(event);
    },
    async remove(id) { items = items.filter(e => e.id !== id); },
    async preparation(id, minutes) { items = items.map(e => e.id === id ? { ...e, preparationMinutes: minutes, prepareAt: new Date(Date.parse(e.startsAt) - minutes * 60000).toISOString() } : e); },
    importIcs: unavailable, timetable: unavailable, removeCollection: unavailable,
    connect: unavailable, sync: unavailable, disconnect: unavailable,
  };
}
