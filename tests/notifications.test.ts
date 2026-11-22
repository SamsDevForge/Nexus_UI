import assert from "node:assert/strict";
import test from "node:test";
import { NexusApiClient } from "../lib/api/client";
import { createLiveNotificationService, createSampleNotificationService, writablePreferences } from "../lib/services/notification-service";
import { getNexusPublicRuntimeConfig } from "../lib/runtime/config";

test("sample notifications remain local, explicit and separate from live delivery", async () => {
  const service = createSampleNotificationService();
  const initial = await service.load();
  assert.equal(initial.sample, true);
  assert.equal(initial.preferences.morningEnabled, false);
  assert.deepEqual(initial.items, []);
  const sample = await service.queueTest("sample-key");
  assert.equal(sample.title, "Sample morning brief");
  await service.queueTest("sample-key");
  assert.equal((await service.load()).items.length, 1);
  await service.read(sample.id);
  assert.ok((await service.load()).items[0].readAt);
  await assert.rejects(() => service.register("test"), /configured live account/);
  assert.equal((await createSampleNotificationService().load()).items.length, 0);
});

test("live notification saves send writable preferences only and keep server metadata out", async () => {
  const config = (await createSampleNotificationService().load()).preferences;
  let sent: Record<string, unknown> = {};
  const client = new NexusApiClient({ baseUrl: "https://api.nexus.test", getToken: async () => "identity",
    fetchImplementation: async (url, init) => {
      assert.equal(String(url), "https://api.nexus.test/api/v1/notifications/preferences");
      sent = JSON.parse(String(init?.body));
      return Response.json({ data: config, requestId: "test" });
    } });
  await createLiveNotificationService(client).save(config);
  assert.deepEqual(sent, writablePreferences(config));
  assert.equal("timezone" in sent, false);
  assert.equal("pushAvailable" in sent, false);
  assert.equal("webVapidPublicKey" in sent, false);
});

test("only the public Firebase sender id is added to browser configuration", () => {
  const config = getNexusPublicRuntimeConfig({ NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "public-sender" });
  assert.equal(config.firebase.messagingSenderId, "public-sender");
  assert.equal("pushTokenEncryptionKey" in config, false);
});
