import assert from "node:assert/strict";
import test from "node:test";
import { NexusApiClient } from "../lib/api/client";
import { createLiveMailService, createSampleMailService, mailIsImportant } from "../lib/services/mail-service";

test("mail demo corrections are local, versioned and reset with their service", async () => {
  const service = createSampleMailService();
  const snapshot = await service.load(), message = snapshot.items[0];
  assert.equal(snapshot.sample, true);
  assert.equal(message.original.sourceUrl, null);
  const correction = { revision: message.revision, important: false, items: [] };
  const changed = await service.correct(message.id, correction);
  assert.equal(mailIsImportant(changed), false);
  assert.equal(mailIsImportant({ ...changed, sourceChanged: true }), true);
  await assert.rejects(service.correct(message.id, correction), /changed/);
  assert.equal((await createSampleMailService().load()).items[0].correction, null);
  await assert.rejects(service.connect("google"), /live account/);
});

test("mail adapters request only the owned API and include correction revision", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const client = new NexusApiClient({ baseUrl: "https://api.example.test", getToken: async () => "identity",
    fetchImplementation: async (url, init) => {
      calls.push({ url: String(url), init });
      assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer identity");
      return Response.json({ data: { authorizationUrl: "https://accounts.google.com/consent" }, requestId: "request" });
    },
  });
  const service = createLiveMailService(client);
  await service.correct("message/id", { revision: 4, important: true, items: [] });
  await service.connect("google"); await service.sync("source"); await service.disconnect("source");
  assert.equal(calls[0].url, "https://api.example.test/api/v1/mail/messages/message%2Fid/correction");
  assert.equal(JSON.parse(String(calls[0].init?.body)).revision, 4);
  assert.deepEqual(calls.map(c => c.init?.method), ["PUT", "POST", "POST", "DELETE"]);
  assert.ok(calls.every(c => c.url.startsWith("https://api.example.test/api/v1/mail/")));
});
