import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { GET } from "../app/firebase-messaging-sw.js/route";

test("web push worker rejects expired payloads and displays generic content only", async () => {
  const keys = { NEXT_PUBLIC_FIREBASE_API_KEY: "public-key", NEXT_PUBLIC_FIREBASE_PROJECT_ID: "test-project",
    NEXT_PUBLIC_FIREBASE_APP_ID: "test-app", NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "public-sender",
    PUSH_TOKEN_ENCRYPTION_KEY: "server-secret-must-not-appear" };
  const previous = Object.fromEntries(Object.keys(keys).map(key => [key, process.env[key]]));
  try {
    Object.assign(process.env, keys);
    const response = await GET();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    const source = await response.text();
    assert.equal(source.includes(keys.PUSH_TOKEN_ENCRYPTION_KEY), false);
    let receive: (payload: unknown) => unknown = () => { throw new Error("Missing receive handler"); };
    const shown: Array<{ title: string; options: Record<string, unknown> }> = [];
    vm.runInNewContext(source, {
      URL, Date, importScripts: () => {},
      self: { location: { origin: "https://nexus.test" }, addEventListener: () => {},
        registration: { showNotification: async (title: string, options: Record<string, unknown>) => { shown.push({ title, options }); } } },
      firebase: { initializeApp: () => {}, messaging: () => ({ onBackgroundMessage: (callback: typeof receive) => { receive = callback; } }) },
    });
    const id = "3d8ed8d0-a1b1-4e86-a5f0-b4358b73ca4f";
    await receive({ data: { notificationId: id, expiresAt: new Date(Date.now() - 1000).toISOString() } });
    await receive({ data: { notificationId: "invalid", expiresAt: new Date(Date.now() + 60000).toISOString() } });
    assert.equal(shown.length, 0);
    await receive({ data: { notificationId: id, expiresAt: new Date(Date.now() + 60000).toISOString(), title: "Private event title", body: "Private event content" } });
    assert.equal(shown.length, 1);
    assert.equal(shown[0].title, "Your brief is ready");
    assert.equal(shown[0].options.body, "Sign in to NEXUS to view your brief.");
    assert.equal(shown[0].options.tag, id);
    assert.equal(shown[0].options.renotify, false);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
