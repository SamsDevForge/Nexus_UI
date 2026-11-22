import type { NexusApiClient } from "@/lib/api/client";

export type CollaborationProvider = "notion" | "teams";
export type NoteOperation = "create" | "append" | "update";
export interface SourceSelection { kind: "page" | "data_source" | "channel"; resource_id: string; team_id?: string | null; writable?: boolean }
export interface SourceChoice extends Omit<SourceSelection, "kind"> { kind: SourceSelection["kind"] | "team"; label: string }
export interface CollaborationSource { id: string; connectionId: string; kind: SourceSelection["kind"]; label: string; writable: boolean; limited: boolean; error: string | null; lastSyncedAt: string | null }
export interface CollaborationDocument { id: string; sourceId: string; title: string; sourceUrl: string | null; kind: string; limited: boolean; expiresAt: string; text?: string }
export interface NoteDraft { id: string; documentId: string; destinationId: string; title: string; body?: string; sourceUrl?: string | null; operation: NoteOperation; revision: number; status: "prepared" | "executing" | "succeeded" | "failed" | "uncertain"; error: string | null; expiresAt: string; resultUrl: string | null; canUpdate: boolean }
export interface CollaborationSnapshot { providers: Record<CollaborationProvider, boolean>; paused: boolean; serverTime: string; sample: boolean; limited: boolean; connections: Array<{ id: string; provider: CollaborationProvider; status: string; error: string | null; lastSyncedAt: string | null }>; sources: CollaborationSource[]; documents: CollaborationDocument[]; drafts: NoteDraft[] }
export interface NoteEdit { revision: number; title: string; body: string; operation: NoteOperation }
export interface CollaborationService {
  load(): Promise<CollaborationSnapshot>;
  connect(provider: CollaborationProvider): Promise<string>;
  discover(connection: string, query?: string, team?: string): Promise<{ items: SourceChoice[]; limited: boolean }>;
  select(connection: string, source: SourceSelection): Promise<void>;
  writable(source: string, enabled: boolean): Promise<void>;
  remove(source: string): Promise<void>;
  disconnect(connection: string): Promise<void>;
  sync(connection: string): Promise<void>;
  document(id: string): Promise<CollaborationDocument>;
  prepare(document: string, destination: string, template: "class" | "meeting", operation: "create" | "append"): Promise<NoteDraft>;
  draft(id: string): Promise<NoteDraft>;
  edit(id: string, value: NoteEdit): Promise<NoteDraft>;
  execute(id: string, revision: number, approved: true): Promise<void>;
  discard(id: string): Promise<void>;
}

export function createLiveCollaborationService(client: NexusApiClient): CollaborationService {
  const base = "/api/v1/collaboration", encode = encodeURIComponent;
  const read = async <T>(path = "", method = "GET", value?: unknown): Promise<T> => (await client.request<T>(base+path, { method, ...(value === undefined ? {} : { body: JSON.stringify(value) }) })).data;
  return {
    async load() { return { ...await read<Omit<CollaborationSnapshot,"sample">>(), sample: false }; },
    async connect(provider) { return (await read<{ authorizationUrl: string }>(`/oauth/${provider}/start`, "POST")).authorizationUrl; },
    discover: (id, query = "", team) => read(`/connections/${encode(id)}/discover?${new URLSearchParams({ query, ...(team ? { team } : {}) })}`),
    async select(id, source) { await read(`/connections/${encode(id)}/sources`, "POST", source); },
    async writable(id, writable) { await read(`/sources/${encode(id)}`, "PATCH", { writable }); },
    async remove(id) { await read(`/sources/${encode(id)}`, "DELETE"); },
    async disconnect(id) { await read(`/connections/${encode(id)}`, "DELETE"); },
    async sync(id) { await read(`/connections/${encode(id)}/sync`, "POST"); },
    document: id => read(`/documents/${encode(id)}`),
    prepare: (document_id, destination_id, template, operation) => read("/drafts", "POST", { document_id, destination_id, template, operation }),
    draft: id => read(`/drafts/${encode(id)}`),
    edit: (id, value) => read(`/drafts/${encode(id)}`, "PUT", value),
    async execute(id, revision, approved) { await read(`/drafts/${encode(id)}/execute`, "POST", { revision, approved }); },
    async discard(id) { await read(`/drafts/${encode(id)}`, "DELETE"); },
  };
}

export function createSampleCollaborationService(): CollaborationService {
  const now = new Date().toISOString(), expiry = new Date(Date.now()+86400_000).toISOString();
  let sources: CollaborationSource[] = [
    { id: "sample-notion", connectionId: "notion", label: "Field notebook", kind: "page", writable: true, limited: false, error: null, lastSyncedAt: now },
    { id: "sample-teams", connectionId: "teams", label: "Research · field work", kind: "channel", writable: false, limited: true, error: null, lastSyncedAt: now },
  ];
  let documents: CollaborationDocument[] = [
    { id: "sample-field", sourceId: "sample-notion", title: "Before the next field visit", text: "Calibrate soil sensors before comparing readings. Record the crop, sampling depth and time alongside each observation.", sourceUrl: null, kind: "notion-page", limited: false, expiresAt: expiry },
    { id: "sample-meeting", sourceId: "sample-teams", title: "Field test debrief", text: "We reviewed the sensor calibration plan. Bring the field log to the next discussion. Owners and dates still need to be agreed.", sourceUrl: null, kind: "teams-message", limited: true, expiresAt: expiry },
  ];
  let drafts: NoteDraft[] = [];
  const unavailable = async (): Promise<never> => { throw new Error("Connect a configured live account to access a provider. These are fictional sources."); };
  const get = (id: string) => { const draft = drafts.find(d => d.id === id); if (!draft) throw new Error("That sample draft is unavailable."); return structuredClone(draft); };
  return {
    async load() { return structuredClone({ providers: { notion: false, teams: false }, sample: true, paused: false, limited: false, serverTime: new Date().toISOString(), sources, documents: documents.map(({ text: _text, ...metadata }) => { void _text; return metadata; }), drafts: drafts.map(({ body: _body, ...metadata }) => { void _body; return metadata; }), connections: [] }); },
    connect: unavailable, discover: unavailable, select: unavailable, sync: unavailable, disconnect: unavailable,
    async writable(id, writable) { sources = sources.map(s => s.id === id ? { ...s, writable } : s); drafts = drafts.filter(d => d.destinationId !== id); },
    async remove(id) { const removed = documents.filter(d => d.sourceId === id).map(d => d.id); sources = sources.filter(s => s.id !== id); documents = documents.filter(d => d.sourceId !== id); drafts = drafts.filter(d => d.destinationId !== id && !removed.includes(d.documentId)); },
    async document(id) { const value = documents.find(d => d.id === id); if (!value) throw new Error("That sample source was removed."); return structuredClone(value); },
    async prepare(documentId, destinationId, template, operation) {
      const source = documents.find(d => d.id === documentId), destination = sources.find(s => s.id === destinationId && s.writable && s.kind !== "channel");
      if (!source || !destination) throw new Error("Choose an available source and allowed Notion destination.");
      const draft: NoteDraft = { id: `sample-${crypto.randomUUID()}`, documentId, destinationId, title: `${template === "class" ? "Class" : "Meeting"} notes: ${source.title}`, body: `Reference excerpt (fictional sample):\n${source.text}\n\nMy notes\n\n${template === "class" ? "Key concepts\n\nQuestions\n\nNext steps" : "Decisions\n\nAction items (add owner and due date)\n\nOpen questions"}`, sourceUrl: null, operation, revision: 1, status: "prepared", error: null, expiresAt: expiry, resultUrl: null, canUpdate: false };
      drafts.unshift(draft); return structuredClone(draft);
    },
    async draft(id) { return get(id); },
    async edit(id, value) { const draft = get(id); if (draft.revision !== value.revision || ["executing","uncertain"].includes(draft.status)) throw new Error("Refresh this preview before editing."); const next = { ...draft, ...value, revision: draft.revision+1, status: "prepared" as const }; drafts = drafts.map(d => d.id === id ? next : d); return structuredClone(next); },
    async execute(id, revision, approved) { const draft = get(id); if (!approved || draft.revision !== revision || draft.status !== "prepared") throw new Error("Review the current revision first."); drafts = drafts.map(d => d.id === id ? { ...d, status: "succeeded", canUpdate: true } : d); },
    async discard(id) { drafts = drafts.filter(d => d.id !== id); },
  };
}
