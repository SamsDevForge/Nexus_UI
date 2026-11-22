import assert from "node:assert/strict";
import test from "node:test";
import { NexusApiClient } from "../lib/api/client";
import { createLiveCollaborationService, createSampleCollaborationService } from "../lib/services/collaboration-service";

test("sample note drafts require a saved revision and never reach a provider", async () => {
  const service = createSampleCollaborationService(), state = await service.load();
  assert.equal(state.sample,true); assert.equal(state.documents[0].text,undefined);
  const source = await service.document(state.documents[0].id);
  assert.equal(source.sourceUrl,null);
  const draft = await service.prepare(source.id,"sample-notion","meeting","create");
  assert.match(draft.body ?? "",/Action items/);
  const edited = await service.edit(draft.id,{ revision:1,title:"Reviewed notes",body:"My notes",operation:"create" });
  await assert.rejects(service.execute(draft.id,1,true),/current revision/);
  await service.execute(edited.id,edited.revision,true);
  assert.equal((await service.draft(draft.id)).status,"succeeded");
  await assert.rejects(service.execute(edited.id,edited.revision,true),/current revision/);
  assert.equal((await createSampleCollaborationService().load()).drafts.length,0);
  await assert.rejects(service.connect("teams"),/live account/);
});

test("removing sample sources erases dependent notes and destinations", async () => {
  const service = createSampleCollaborationService();
  await service.prepare("sample-meeting","sample-notion","class","create");
  await service.remove("sample-teams");
  assert.equal((await service.load()).drafts.length,0);
  await service.prepare("sample-field","sample-notion","class","append");
  await service.writable("sample-notion",false);
  assert.equal((await service.load()).drafts.length,0);
  await assert.rejects(service.prepare("sample-field","sample-notion","class","create"),/allowed Notion destination/);
});

test("live collaboration adapter sends explicit revision approval to owned API", async () => {
  const calls: Array<{ url:string; init?:RequestInit }> = [];
  const client = new NexusApiClient({ baseUrl:"https://api.example.test",getToken:async () => "identity",fetchImplementation:async (url,init) => {
    calls.push({ url:String(url),init });
    assert.equal(new Headers(init?.headers).get("Authorization"),"Bearer identity");
    return Response.json({ data:{ authorizationUrl:"https://provider.example.test/consent" },requestId:"fixture" });
  } });
  const service = createLiveCollaborationService(client);
  await service.discover("conn/id","soil & rain","team");
  await service.prepare("document","destination","class","create");
  await service.edit("note/id",{ revision:2,title:"Reviewed",body:"Notes",operation:"append" });
  await service.execute("note/id",3,true);
  assert.ok(calls[0].url.includes("conn%2Fid/discover?query=soil+%26+rain&team=team"));
  assert.deepEqual(JSON.parse(String(calls[1].init?.body)),{ document_id:"document",destination_id:"destination",template:"class",operation:"create" });
  assert.deepEqual(JSON.parse(String(calls[3].init?.body)),{ revision:3,approved:true });
  assert.ok(calls.every(c => c.url.startsWith("https://api.example.test/api/v1/collaboration/")));
});
