import type { NexusApiClient } from "@/lib/api/client";

export interface MailItem { id: string; kind: "deadline" | "event"; title: string; value: string | null; evidence: string; location: string; reason: string; status: "suggested"; confidence: "explicit-pattern" | "needs-review" }
export interface CorrectedMailItem { id: string; title: string; value: string | null; status: "confirmed" | "dismissed" }
export interface MailCorrection { revision: number; important: boolean; items: CorrectedMailItem[] }
export interface MailMessage {
  id: string; connectionId: string; receivedAt: string; expiresAt: string; revision: number; sourceChanged: boolean;
  original: { subject: string; sender: string; mailbox?: string; sourceUrl: string | null; important: boolean; reasons: string[]; items: MailItem[];
    attachments: Array<{ name: string; mimeType: string; size: number }>; textLimited: boolean; attachmentsIncomplete?: boolean; method: string; fingerprint: string };
  correction: { important: boolean; items: CorrectedMailItem[]; basis: string; reviewedAt: string } | null;
}
export interface MailConnection {
  id: string; provider: "google" | "microsoft"; status: "connected" | "revoked" | "reauthorize";
  scopes: string[]; error: string | null; truncated: boolean; lastSyncedAt: string | null; freshUntil: string | null;
}
export interface MailSnapshot { items: MailMessage[]; connections: MailConnection[]; providers: Record<"google" | "microsoft", boolean>; paused: boolean; serverTime: string; sample: boolean }
export interface MailService {
  load(): Promise<MailSnapshot>;
  correct(id: string, value: MailCorrection): Promise<MailMessage>;
  connect(provider: "google" | "microsoft"): Promise<string>;
  sync(id: string): Promise<void>;
  disconnect(id: string): Promise<void>;
}
export const mailIsImportant = (message: MailMessage) => message.correction && !message.sourceChanged ? message.correction.important : message.original.important;

export function createLiveMailService(client: NexusApiClient): MailService {
  const base = "/api/v1/mail", encode = encodeURIComponent;
  return {
    async load() { return { ...(await client.request<Omit<MailSnapshot, "sample">>(base)).data, sample: false }; },
    async correct(id, value) { return (await client.request<MailMessage>(`${base}/messages/${encode(id)}/correction`, { method: "PUT", body: JSON.stringify(value) })).data; },
    async connect(provider) { return (await client.request<{ authorizationUrl: string }>(`${base}/oauth/${provider}/start`, { method: "POST" })).data.authorizationUrl; },
    async sync(id) { await client.request(`${base}/connections/${encode(id)}/sync`, { method: "POST" }); },
    async disconnect(id) { await client.request(`${base}/connections/${encode(id)}`, { method: "DELETE" }); },
  };
}

export function createSampleMailService(): MailService {
  const now = new Date(), due = new Date(now.getTime()+7*86400_000).toISOString().slice(0,10);
  const make = (id: string, subject: string, important: boolean, items: MailItem[], attachments: MailMessage["original"]["attachments"] = []): MailMessage => ({
    id, connectionId: "sample", receivedAt: now.toISOString(), expiresAt: new Date(now.getTime()+14*86400_000).toISOString(), revision: 1, sourceChanged: false, correction: null,
    original: { subject, sender: "course-team@example.test", sourceUrl: null, important, reasons: important ? ["A deadline or event phrase was found."] : ["No priority rule matched. You can correct this."], items, attachments, textLimited: false, method: "demonstration", fingerprint: id },
  });
  let messages: MailMessage[] = [
    make("sample-deadline", "Project submission window", true, [{ id: "deadline", kind: "deadline", title: "Submit the field report", value: due, evidence: `Submit the field report by ${due}.`, location: "body line 1", reason: "Date found; no exact time or timezone inferred.", status: "suggested", confidence: "explicit-pattern" }], [{ name: "field-report-rubric.pdf", mimeType: "application/pdf", size: 24576 }]),
    make("sample-event", "Workshop time needs a check", true, [{ id: "workshop", kind: "event", title: "Workshop next Friday", value: null, evidence: "Workshop next Friday. Please confirm a suitable time.", location: "body line 1", reason: "No unambiguous ISO date found. Review at the source.", status: "suggested", confidence: "needs-review" }]),
    make("sample-update", "Weekly course update", false, []),
  ];
  const unavailable = async (): Promise<never> => { throw new Error("Connectors require a configured live account. No mailbox was accessed."); };
  return {
    async load() { return structuredClone({ items: messages, connections: [], providers: { google: false, microsoft: false }, paused: false, serverTime: new Date().toISOString(), sample: true }); },
    async correct(id, value) {
      const message = messages.find(m => m.id === id);
      if (!message || message.revision !== value.revision) throw new Error("This message changed. Refresh before reviewing.");
      const changed = { ...message, revision: message.revision+1, correction: { important: value.important, items: structuredClone(value.items), basis: message.original.fingerprint, reviewedAt: new Date().toISOString() } };
      messages = messages.map(m => m.id === id ? changed : m); return structuredClone(changed);
    },
    connect: unavailable, sync: unavailable, disconnect: unavailable,
  };
}
