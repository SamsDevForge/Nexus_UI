import assert from "node:assert/strict";
import test from "node:test";
import { NexusApiClient } from "../lib/api/client";
import { calendarConflicts, createLiveCalendarService, createSampleCalendarService, type CalendarEvent } from "../lib/services/calendar-service";

test("sample calendar events are local, editable and reset with their service", async () => {
  const service = createSampleCalendarService();
  const value = { title: "Visit", location: "Farm", starts_at: "2026-11-20T09:00:00Z", ends_at: "2026-11-20T10:00:00Z", preparation_minutes: 15, idempotency_key: "save-12345" };
  await service.save(value); await service.save(value);
  assert.equal((await service.load("2026-11-20")).items.length, 1);
  await service.save({ ...value, title: "Updated" }, value.idempotency_key);
  assert.equal((await service.load("2026-11-20")).items[0].title, "Updated");
  assert.equal((await createSampleCalendarService().load("2026-11-20")).items.length, 0);
  await assert.rejects(service.connect("google"), /live account/);
  await service.remove(value.idempotency_key);
  assert.equal((await service.load("2026-11-20")).items.length, 0);
});

test("conflicts respect half-open intervals, declined events, and preparation buffers", () => {
  const event = (id: string, start: string, end: string, extra: Partial<CalendarEvent> = {}): CalendarEvent => ({
    id, title: id, location: "", startsAt: `2026-11-20T${start}:00Z`, endsAt: `2026-11-20T${end}:00Z`, timezone: "UTC",
    allDay: false, startsOn: null, endsOn: null, busy: true, status: "confirmed", preparationMinutes: 0, prepareAt: null,
    source: "manual", collectionId: null, connectionId: null, sourceUpdatedAt: null, ...extra,
  });
  const first = event("first", "09:00", "10:00"), second = event("second", "10:00", "11:00");
  assert.deepEqual(calendarConflicts([second, first]), []);
  assert.equal(calendarConflicts([first, { ...second, preparationMinutes: 15 }])[0].kind, "preparation");
  assert.equal(calendarConflicts([first, event("overlap", "09:30", "10:30")])[0].kind, "overlap");
  assert.deepEqual(calendarConflicts([first, event("declined", "09:30", "10:30", { status: "declined" })]), []);
});

test("live calendar requests use the authenticated API boundary and do not call providers", async () => {
  const calls: Array<{ url: string; method: string; body: string | null }> = [];
  const client = new NexusApiClient({ baseUrl: "https://api.example.test", getToken: async () => "identity",
    fetchImplementation: async (input, init) => {
      calls.push({ url: String(input), method: init?.method ?? "GET", body: init?.body ? String(init.body) : null });
      assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer identity");
      return Response.json({ data: { authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=state" }, requestId: "test-request" });
    },
  });
  const service = createLiveCalendarService(client);
  await service.connect("google"); await service.sync("connection/id"); await service.disconnect("connection/id");
  assert.deepEqual(calls.map(c => c.method), ["POST", "POST", "DELETE"]);
  assert.ok(calls.every(c => c.url.startsWith("https://api.example.test/api/v1/calendar/")));
  assert.ok(calls[1].url.endsWith("connections/connection%2Fid/sync"));
});
