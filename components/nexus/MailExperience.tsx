"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useNexusAuth } from "@/lib/auth/AuthProvider";
import { createLiveMailService, createSampleMailService, mailIsImportant, type MailSnapshot } from "@/lib/services/mail-service";
import { MailReviewForm } from "./MailReviewForm";
import { WorkspaceHeader, WorkspaceNotice } from "./WorkspaceChrome";
import "./MailExperience.css";

const format = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const errors: Record<string, string> = { consent_required: "Read access expired. Reconnect to resume.", paused_or_revoked: "Observation is paused or access was revoked.", provider_unavailable: "The provider is unavailable. Last confirmed data is retained.", invalid_provider_response: "The provider response could not be safely processed.", mail_sync_unavailable: "The sync could not be completed. Last confirmed data is retained.", provider_limit: "A message exceeded the processing limits. The previous snapshot is retained.", oauth_unavailable: "Credentials could not be refreshed. Reconnect or try again." };

export function MailExperience() {
  const auth = useNexusAuth();
  return <MailWorkspace key={`${auth.mode}:${auth.firebaseUser?.uid ?? "signed-out"}`} />;
}

function MailWorkspace() {
  const auth = useNexusAuth(), params = useSearchParams();
  const service = useMemo(() => auth.apiClient ? createLiveMailService(auth.apiClient) : auth.mode === "mock" ? createSampleMailService() : null, [auth.apiClient, auth.mode]);
  const [snapshot, setSnapshot] = useState<MailSnapshot | null>(null), [selected, setSelected] = useState("");
  const [filter, setFilter] = useState("all"), [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false), [reset, setReset] = useState(0);
  const [error, setError] = useState(""), [message, setMessage] = useState(""), [clock, setClock] = useState(0);
  const pending = useRef(false), edited = useRef(false), version = useRef(0);
  const sample = auth.mode === "mock";
  const markDirty = () => { version.current++; edited.current = true; setDirty(true); };
  const discard = () => { edited.current = false; setDirty(false); setReset(n => n+1); };

  useEffect(() => {
    let active = true;
    async function refresh() {
      if (!service || pending.current || edited.current) return;
      const request = ++version.current;
      try { const value = await service.load(); if (active && request === version.current) { setSnapshot(value); setClock(Date.now()); setError(""); } }
      catch (failure) { if (active && request === version.current) setError(failure instanceof Error ? failure.message : "Mail could not be loaded."); }
    }
    void refresh();
    const timer = window.setInterval(() => { setClock(Date.now()); if (document.visibilityState === "visible") void refresh(); }, 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [service]);

  async function act(work: () => Promise<string>): Promise<boolean> {
    if (pending.current) return false;
    pending.current = true; version.current++; setBusy(true); setError(""); setMessage("");
    try { const result = await work(); if (service) { setSnapshot(await service.load()); setClock(Date.now()); } setMessage(result); return true; }
    catch (failure) { setError(failure instanceof Error ? failure.message : "The result could not be confirmed. Refresh before retrying."); return false; }
    finally { pending.current = false; setBusy(false); }
  }
  const messages = (snapshot?.items ?? []).filter(m => Date.parse(m.expiresAt) > clock && (filter === "all" || (filter === "important" ? mailIsImportant(m) : !m.correction || m.sourceChanged)));
  const current = messages.find(m => m.id === selected) ?? messages[0];
  function choose(id: string) {
    if (edited.current && !window.confirm("Discard unsaved review edits?")) return;
    discard(); setSelected(id);
    window.requestAnimationFrame(() => document.getElementById("mail-detail-title")?.focus());
  }
  const consent = params.get("consent");
  return <div className="mail-page workspace-page"><WorkspaceHeader eyebrow="Mail & evidence" title="Signal in the inbox." description="Review the message before it becomes a commitment." mode={sample ? "Demonstration" : "Read-only Inbox"} />
    <WorkspaceNotice>{sample ? "Demonstration mode. These are fictional messages; reviews stay on this screen and reset on reload. No mailbox is connected." : "Read-only Inbox review · up to 50 messages per source from the past 14 days. Pattern matches need your review. No message is sent, marked read, or changed."}</WorkspaceNotice>
    {consent && <p role="status">{consent === "connected" ? "Mail consent saved. Waiting for the first confirmed sync." : consent === "denied" ? "Mail consent declined. No new mailbox access was granted." : "Mail connection could not be completed. Start consent again."}</p>}
    {error && <p role="alert" className="mail-warning">{error}</p>}{message && <p role="status">{message}</p>}
    {!service && <p role="alert">Sign in to a configured live account to review your mail.</p>}
    {service && <><div className="mail-toolbar"><label>Review filter<select value={filter} disabled={dirty || busy} onChange={e => setFilter(e.target.value)}><option value="all">All messages</option><option value="important">Important</option><option value="unreviewed">Needs review</option></select></label>
      <button disabled={busy || dirty} onClick={() => void act(async () => "Mail review refreshed.")}>Refresh review</button></div>
      {dirty && <p className="mail-warning">Unsaved edits pause automatic refresh. Save or discard them before refreshing.{!current && <button type="button" onClick={discard}>Discard unsaved edits</button>}</p>}
      {!snapshot && !error && <p role="status">Loading mail review…</p>}
      {snapshot && <>{snapshot.paused && <p className="mail-warning">Observation or automations are paused. New provider reads are blocked. Existing evidence remains visible until expiry or disconnection.</p>}
        <div className="mail-workbench"><section className="mail-queue" aria-label="Messages to review"><h2>{messages.length} {messages.length === 1 ? "message" : "messages"} to consider</h2>
          {!messages.length && <p>No messages in this view. Connect a source or choose another filter.</p>}
          <ul>{messages.map(m => <li key={m.id}><button className={current?.id === m.id ? "mail-message is-selected" : "mail-message"} aria-pressed={current?.id === m.id} disabled={busy} onClick={() => choose(m.id)}><span>{mailIsImportant(m) ? "Important" : "Normal priority"} · {m.sourceChanged ? "Source changed" : m.correction ? "Reviewed" : "Needs review"}</span><strong>{m.original.subject}</strong><small>{m.original.sender}</small><small>{format(m.receivedAt)}</small></button></li>)}</ul>
        </section><section className="mail-detail" aria-label="Message evidence">
          {current ? <><p className="mail-kicker">{sample ? "SAMPLE EVIDENCE" : "SOURCE EVIDENCE"}</p><h2 id="mail-detail-title" tabIndex={-1}>{current.original.subject}</h2><p className="mail-meta">{current.original.sender} · {format(current.receivedAt)}</p>
            {current.original.mailbox && <p className="mail-meta">Mailbox: {current.original.mailbox}</p>}
            {current.original.sourceUrl ? <a href={current.original.sourceUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Open original message ↗</a> : <p className="mail-meta">Fictional sample · no mailbox link</p>}
            <details><summary>Why this priority?</summary><ul>{current.original.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul><p>Pattern matches are suggestions. They do not establish truth or authority to act.</p></details>
            {current.sourceChanged && <p className="mail-warning">The source changed after your review. Previous corrections are retained for reference; review the current suggestions again.</p>}
            {current.sourceChanged && current.correction && <details><summary>Previous review</summary><p>{current.correction.important ? "Marked important" : "Marked normal priority"}</p><ul>{current.correction.items.map(item => <li key={item.id}>{item.title} · {item.value ?? "No value"} · {item.status}</li>)}</ul></details>}
            {(current.original.textLimited || current.original.attachmentsIncomplete) && <p className="mail-warning">Processing limits may omit text or attachment metadata. Check the original message.</p>}
            <h3>What might need your attention</h3><MailReviewForm key={`${current.id}:${current.revision}:${reset}`} message={current} busy={busy} sample={sample} dirty={dirty} markDirty={markDirty} discard={discard} save={async value => { const saved = await act(async () => { await service.correct(current.id, value); return sample ? "Sample review saved for this screen." : "Review saved. No task or event was created."; }); if (saved) discard(); }} />
            <section className="mail-attachments" aria-label="Discovered attachments"><h3>Attachments at the source</h3>{current.original.attachments.length ? <ul>{current.original.attachments.map((file, i) => <li key={`${file.name}:${i}`}><strong>{file.name}</strong><span>{file.mimeType || "Unknown type"} · {Math.ceil(file.size/1024)} KB</span></li>)}</ul> : <p>No attachment metadata found in this bounded read.</p>}<p className="mail-meta">Metadata only. Files are not downloaded or inspected. Open the source message to access them.</p></section>
            <p className="mail-meta">Evidence expires {format(current.expiresAt)}. Full bodies are not stored; short excerpts supporting suggestions are encrypted with the structured review.</p>
          </> : <p>Select a message when a source has synced. Your review queue stays empty until real data is confirmed.</p>}
        </section></div>
        <section className="mail-sources" aria-label="Mail sources"><h2>Mail sources, on your terms.</h2><p>Mail consent is separate from sign-in and Calendar. The provider grants read access to message content; NEXUS limits processing to the Inbox window above. No send or write permission is requested.</p>
          {(["google", "microsoft"] as const).map(provider => { const conn = snapshot.connections.find(c => c.provider === provider); return <div className="mail-source" key={provider}><div><h3>{provider === "google" ? "Gmail" : "Outlook mail"}</h3><p className="mail-meta">{conn?.status === "connected" ? conn.lastSyncedAt ? `${conn.freshUntil && Date.parse(conn.freshUntil) < clock ? "Stale copy" : "Last confirmed copy"} · ${format(conn.lastSyncedAt)}` : "Waiting for first sync" : conn?.status === "reauthorize" ? "Access expired. Reconnect to resume." : "Disconnected"}</p>
            {conn?.truncated && <p className="mail-warning">More messages exist than this 50-message read includes. This is an incomplete view.</p>}{conn?.error && <p className="mail-warning">{errors[conn.error] ?? "The latest sync could not be confirmed."}</p>}
            {!snapshot.providers[provider] && <p className="mail-meta">{sample ? "Unavailable in demonstration mode." : "Provider configuration is unavailable."}</p>}</div><div className="mail-actions">
              <button disabled={busy || dirty || snapshot.paused || !snapshot.providers[provider]} onClick={() => void act(async () => { window.location.assign(await service.connect(provider)); return "Opening read-only mail consent…"; })}>{conn?.status === "connected" ? "Reconnect" : "Connect"} {provider === "google" ? "Gmail" : "Outlook mail"}</button>
              {conn?.status === "connected" && <button disabled={busy || dirty || snapshot.paused} onClick={() => void act(async () => { await service.sync(conn.id); return "Mail sync queued. Results change only after a confirmed provider read."; })}>Request mail sync</button>}
              {conn && conn.status !== "revoked" && <button disabled={busy} onClick={() => { if (window.confirm("Disconnect mail and erase its NEXUS evidence and corrections? Withdraw the app’s provider grant in your account settings too if desired.")) { discard(); void act(async () => { setSnapshot(null); await service.disconnect(conn.id); return "Mail disconnected. NEXUS credentials, evidence and corrections removed. Provider account consent can be withdrawn separately."; }); } }}>Disconnect &amp; erase copies</button>}
            </div></div>; })}
          <p className="mail-meta">Connected sources refresh about every five minutes. Older evidence expires after 14 days. Check the last confirmed sync before relying on a suggestion. These reviews stay separate from your notification briefs.</p>
        </section>
      </>}
    </>}
  </div>;
}
