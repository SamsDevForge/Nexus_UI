"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useNexusAuth } from "@/lib/auth/AuthProvider";
import { createLiveCollaborationService, createSampleCollaborationService, type CollaborationDocument, type CollaborationSnapshot, type NoteDraft, type SourceChoice, type SourceSelection } from "@/lib/services/collaboration-service";
import { WorkspaceHeader, WorkspaceNotice } from "./WorkspaceChrome";
import { CollaborationDraftEditor } from "./CollaborationDraftEditor";
import "./CollaborationExperience.css";

const time = (value: string | null) => value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Waiting for first sync";

export function CollaborationExperience() {
  const auth = useNexusAuth();
  return <CollaborationWorkspace key={`${auth.mode}:${auth.firebaseUser?.uid ?? "signed-out"}`} />;
}

function CollaborationWorkspace() {
  const auth = useNexusAuth(), params = useSearchParams(), sample = auth.mode === "mock";
  const service = useMemo(() => auth.apiClient ? createLiveCollaborationService(auth.apiClient) : sample ? createSampleCollaborationService() : null,[auth.apiClient,sample]);
  const [snapshot,setSnapshot] = useState<CollaborationSnapshot | null>(null), [document,setDocument] = useState<CollaborationDocument | null>(null), [draft,setDraft] = useState<NoteDraft | null>(null);
  const [destination,setDestination] = useState(""), [template,setTemplate] = useState<"class" | "meeting">("meeting");
  const [connection,setConnection] = useState(""), [query,setQuery] = useState(""), [team,setTeam] = useState(""), [choices,setChoices] = useState<{ items: SourceChoice[]; limited: boolean } | null>(null);
  const [busy,setBusy] = useState(false), [dirty,setDirty] = useState(false), [error,setError] = useState(""), [message,setMessage] = useState(""), [clock,setClock] = useState(0);
  const pending = useRef(false), edited = useRef(false), version = useRef(0);
  const markDirty = useCallback((value: boolean) => { edited.current = value; setDirty(value); if (value) version.current++; },[]);
  const apply = useCallback((value: CollaborationSnapshot) => {
    setSnapshot(value); setClock(Date.now());
    setDocument(current => current && value.documents.some(d => d.id === current.id) ? current : null);
    setDraft(current => current && value.drafts.some(d => d.id === current.id) ? current : null);
  },[]);
  useEffect(() => {
    let active = true;
    async function refresh() {
      if (!service || pending.current || edited.current) return;
      const revision = ++version.current;
      try { const value = await service.load(); if (active && version.current === revision) { apply(value); setError(""); } }
      catch (failure) { if (active && version.current === revision) { setError(failure instanceof Error ? failure.message : "Sources could not be loaded."); setDocument(null); setDraft(null); } }
    }
    void refresh();
    const timer = window.setInterval(() => { setClock(Date.now()); if (window.document.visibilityState === "visible") void refresh(); },30_000);
    return () => { active = false; window.clearInterval(timer); };
  },[service,apply]);
  const allowed = snapshot?.sources.filter(s => s.writable && s.kind !== "channel") ?? [];
  const destinationId = allowed.some(s => s.id === destination) ? destination : allowed[0]?.id ?? "";
  const available = snapshot?.documents.filter(d => Date.parse(d.expiresAt) > clock) ?? [];
  const currentDocument = document && Date.parse(document.expiresAt) > clock && available.some(d => d.id === document.id) ? document : null;
  const currentDraft = draft && Date.parse(draft.expiresAt) > clock && available.some(d => d.id === draft.documentId) ? draft : null;

  async function act(work: () => Promise<string>) {
    if (!service || pending.current) return;
    pending.current = true; version.current++; setBusy(true); setError(""); setMessage("");
    try { const result = await work(); apply(await service.load()); setMessage(result); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "The result was not confirmed. Refresh before continuing."); setDocument(null); setDraft(null); try { apply(await service.load()); } catch { /* Preserve the failure; no provider result is inferred. */ } }
    finally { pending.current = false; setBusy(false); }
  }
  function closeDraft() { setDraft(null); markDirty(false); }
  const selectedConnection = snapshot?.connections.find(c => c.id === connection && c.status === "connected");
  const consent = params.get("consent");
  return <div className="collaboration-page workspace-page">
    <WorkspaceHeader eyebrow="Sources & notes" title="Keep the source. Add your thinking." description="Turn selected workspace evidence into notes you review and approve." mode={sample ? "Demonstration" : "Selected sources"} action={<button disabled={busy || dirty || !service} onClick={() => void act(async () => "Source list refreshed.")}>Refresh workspace</button>} />
    <WorkspaceNotice>{sample ? "Fictional Notion and Teams examples. Drafts and approvals stay on this screen and reset on reload. No provider is connected and nothing is published." : "Only sources you select are ingested. Note templates include reference excerpts; you add conclusions and approve each saved revision before a Notion write."}</WorkspaceNotice>
    {consent && <p role="status">{consent === "connected" ? "Consent saved. Select the pages or channels you want NEXUS to read." : consent === "denied" ? "Consent declined. No new source was connected." : "Consent could not be completed. Start again."}</p>}
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {!service && <p role="alert">Sign in to a configured live account to access your sources.</p>}
    {service && !snapshot && !error && <p role="status">Loading selected sources…</p>}
    {snapshot && service && <>
      {snapshot.paused && <p role="alert">Observation or automations are paused. Provider reads and note publishing are blocked.</p>}
      {snapshot.limited && <p role="status">This workspace displays 200 document references. More exist in the selected sources; open the providers to see the complete material.</p>}
      {document && !currentDocument && <p role="status">The open excerpt expired or its source was removed. Open an available reference to recheck access.</p>}
      {dirty && <p role="status">Unsaved edits pause workspace refresh. Save the preview or close it to discard your edits.</p>}
      <div className="collaboration-workbench">
        <section className="collaboration-library" aria-label="Selected evidence"><div className="collaboration-section-heading"><div><p className="collaboration-kicker">01 · Reference</p><h2>Selected evidence</h2></div><span className="collaboration-count">{available.length}</span></div>
          <p className="collaboration-meta">Open an excerpt to recheck access at the provider.</p>
          {!available.length && <div className="collaboration-empty"><h3>Your sources start here.</h3><p>Connect a provider, explicitly select a page or channel, then request a sync. Evidence appears after a confirmed read.</p></div>}
          <ul className="collaboration-document-list">{available.map(doc => <li key={doc.id}><button disabled={busy || dirty || snapshot.paused} aria-pressed={currentDocument?.id === doc.id} onClick={() => void act(async () => { setDocument(await service.document(doc.id)); closeDraft(); return sample ? "Fictional source opened." : "Source access rechecked."; })}><span>{doc.kind.startsWith("teams") ? "Teams" : "Notion"}{doc.limited ? " · Partial excerpt" : ""}</span><strong>{doc.title}</strong><small>{snapshot.sources.find(s => s.id === doc.sourceId)?.label}</small><span aria-hidden="true">↗</span></button></li>)}</ul>
        </section>
        <section className="collaboration-reading" aria-label="Source excerpt"><p className="collaboration-kicker">02 · Understand</p>
          {currentDocument ? <><h2>{currentDocument.title}</h2><p className="collaboration-meta">{sample ? "Fictional reference" : `Checked copy · expires ${time(currentDocument.expiresAt)}`}</p>{currentDocument.limited && <p className="collaboration-warning">This is a bounded excerpt. Nested blocks, older messages or replies may be missing. Check the original.</p>}
            <p className="collaboration-excerpt">{currentDocument.text || "No plain text was found in this bounded source read."}</p>
            {currentDocument.sourceUrl && <a href={currentDocument.sourceUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Open original source ↗</a>}
            <div className="collaboration-prepare"><h3>Start with a structure.</h3><p className="collaboration-meta">Prepare a local draft. Publishing is a separate action after review.</p>
              <label>Notion destination<select value={destinationId} onChange={e => setDestination(e.target.value)} disabled={busy || dirty || !allowed.length}>{!allowed.length && <option value="">Allow a Notion destination below</option>}{allowed.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
              <label>Note template<select value={template} onChange={e => setTemplate(e.target.value as typeof template)} disabled={busy || dirty}><option value="meeting">Meeting notes</option><option value="class">Class notes</option></select></label>
              <button className="workspace-primary" disabled={busy || dirty || snapshot.paused || !destinationId} onClick={() => void act(async () => { const value = await service.prepare(currentDocument.id,destinationId,template,"create"); setDraft(value); window.requestAnimationFrame(() => window.document.getElementById("note-preview-heading")?.focus()); return "Draft prepared. Review and edit it before approving."; })}>Prepare note draft</button>
            </div>
          </> : <div className="collaboration-empty"><h2>Read first. Decide next.</h2><p>Choose a source on the left. Its evidence and a starting point for your notes will appear here.</p><p className="collaboration-meta">Source content is reference material. It cannot authorize an action.</p></div>}
        </section>
      </div>
      {currentDraft && <CollaborationDraftEditor key={`${currentDraft.id}:${currentDraft.revision}:${currentDraft.status}`} draft={currentDraft} destination={snapshot.sources.find(s => s.id === currentDraft.destinationId)?.label ?? "Unavailable destination"} allowAppend={snapshot.sources.find(s => s.id === currentDraft.destinationId)?.kind === "page"} sample={sample} busy={busy} paused={snapshot.paused} markDirty={markDirty} close={closeDraft}
        save={value => act(async () => { setDraft(await service.edit(currentDraft.id,value)); markDirty(false); return "Preview saved. Review this revision before approval."; })}
        approve={() => act(async () => { await service.execute(currentDraft.id,currentDraft.revision,true); setDraft(await service.draft(currentDraft.id)); return sample ? "Sample approval recorded. Nothing was published." : "Notion confirmed the write."; })}
        discard={() => act(async () => { await service.discard(currentDraft.id); closeDraft(); return "Local draft removed. Published notes remain in Notion."; })} />}
      <section className="collaboration-drafts" aria-label="Saved note drafts"><div className="collaboration-section-heading"><div><p className="collaboration-kicker">03 · Review</p><h2>Your note drafts</h2></div></div>
        {!snapshot.drafts.length && <p className="collaboration-meta">No drafts yet. Open a source and prepare one above.</p>}
        <ul>{snapshot.drafts.map(item => <li key={item.id}><div><strong>{item.title}</strong><p className="collaboration-meta">{item.operation} · Revision {item.revision} · {item.status}{sample ? " (sample)" : ""}</p>{item.status === "uncertain" && <p className="collaboration-warning">Check Notion directly. This write will not be resent.</p>}</div><button disabled={busy || dirty || snapshot.paused} onClick={() => void act(async () => { setDraft(await service.draft(item.id)); return "Saved draft opened after source revalidation."; })}>Review draft</button></li>)}</ul>
      </section>
      <section className="collaboration-sources" aria-label="Source permissions"><div className="collaboration-section-heading"><div><p className="collaboration-kicker">04 · Access</p><h2>Choose what comes in.</h2></div></div>
        <p className="collaboration-meta">Notion consent can grant parent pages and their children. Teams requires a work or school account and organization-wide delegated read scopes. NEXUS only ingests your selections below. Teams stays read-only.</p>
        <div className="collaboration-provider-row">{(["notion","teams"] as const).map(provider => { const conn = snapshot.connections.find(c => c.provider === provider); return <div key={provider}><h3>{provider === "notion" ? "Notion" : "Microsoft Teams"}</h3><p className="collaboration-meta">{sample ? "Sample only" : conn ? `${conn.status} · ${time(conn.lastSyncedAt)}` : "Disconnected"}</p>{conn?.error && <p className="collaboration-warning">Latest sync incomplete. Refresh or reconnect before relying on this copy.</p>}
          <div className="collaboration-actions"><button disabled={busy || dirty || snapshot.paused || !snapshot.providers[provider]} onClick={() => void act(async () => { window.location.assign(await service.connect(provider)); return "Opening provider consent…"; })}>{conn?.status === "connected" ? "Reconnect" : "Connect"} {provider === "notion" ? "Notion" : "Teams"}</button>
          {conn?.status === "connected" && <button disabled={busy || dirty || snapshot.paused} onClick={() => { setConnection(conn.id); setTeam(""); setChoices(null); }}>Select sources</button>}
          {conn?.status === "connected" && <button disabled={busy || dirty || snapshot.paused} onClick={() => void act(async () => { await service.sync(conn.id); return "Sync queued. A worker must confirm the next read."; })}>Request sync</button>}
          {conn && conn.status !== "disconnected" && <button disabled={busy || dirty} onClick={() => { if (window.confirm("Disconnect and erase this provider’s selected sources, credentials and local drafts? Provider consent and published notes remain; revoke the app in provider settings separately.")) void act(async () => { closeDraft(); setDocument(null); setChoices(null); await service.disconnect(conn.id); return "Disconnected and local copies erased. Provider grants can be revoked separately."; }); }}>Disconnect &amp; erase</button>}</div>
          {!snapshot.providers[provider] && <p className="collaboration-meta">{sample ? "Connectors are disabled in demonstration mode." : "Provider configuration is unavailable."}</p>}</div>; })}</div>
        {selectedConnection && <div className="collaboration-discovery"><h3>Select {selectedConnection.provider === "notion" ? "Notion pages or data sources" : team ? "a channel" : "a team"}</h3>{selectedConnection.provider === "notion" && <label>Search available sources<input maxLength={80} value={query} onChange={e => setQuery(e.target.value)} /></label>}
          <div className="collaboration-actions"><button disabled={busy || dirty || snapshot.paused} onClick={() => void act(async () => { setChoices(await service.discover(connection,query,team || undefined)); return "Metadata loaded. Content is not ingested until selected."; })}>Find sources</button>{team && <button disabled={busy} onClick={() => { setTeam(""); setChoices(null); }}>Back to teams</button>}<button disabled={busy} onClick={() => { setConnection(""); setChoices(null); }}>Close selection</button></div>
          {choices?.limited && <p className="collaboration-warning">More sources exist than this bounded list. Refine the Notion search or use a supported channel from the selected team.</p>}
          {choices && !choices.items.length && <p>No available sources matched.</p>}
          <ul>{choices?.items.map(choice => <li key={choice.resource_id}><span>{choice.label} · {choice.kind.replace("_"," ")}</span><button disabled={busy || dirty || snapshot.paused} onClick={() => { if (choice.kind === "team") { setTeam(choice.resource_id); setChoices(null); } else void act(async () => { await service.select(connection,{ kind: choice.kind,resource_id: choice.resource_id,team_id: choice.team_id } as SourceSelection); return "Source selected for read-only ingestion. Request sync to read its content."; }); }}>{choice.kind === "team" ? "Choose team" : "Select source"}</button></li>)}</ul>
        </div>}
        <ul className="collaboration-selected-sources">{snapshot.sources.map(source => <li key={source.id}><div><strong>{source.label}</strong><p className="collaboration-meta">{source.kind.replace("_"," ")} · {time(source.lastSyncedAt)}{source.limited ? " · Incomplete snapshot" : ""}</p>{source.error && <p className="collaboration-warning">Read not confirmed. Access may have changed; recheck at the provider.</p>}{source.kind !== "channel" && <label className="collaboration-permission"><input type="checkbox" checked={source.writable} disabled={busy || dirty || snapshot.paused} onChange={e => { const value = e.target.checked; if (window.confirm(`${value ? "Allow approval-gated note writes to" : "Remove note-write permission from"} “${source.label}”? Existing local drafts targeting it will be erased.`)) void act(async () => { await service.writable(source.id,value); closeDraft(); return "Destination permission updated. Every future write still needs approval."; }); }} />Allow approved note writes here</label>}</div><button disabled={busy || dirty} onClick={() => { if (window.confirm(`Remove “${source.label}” and its NEXUS excerpts and derived drafts? Published notes stay in Notion.`)) void act(async () => { await service.remove(source.id); closeDraft(); setDocument(null); return "Source and derived local copies removed."; }); }}>Remove source</button></li>)}</ul>
        <p className="collaboration-meta">Live snapshots refresh about every five minutes and expire after 15 minutes without a confirmed read. Notion reads include 50 top-level blocks per page or 10 rows per data source. Teams reads include 20 root messages; replies, chats, attachments and transcripts are excluded. Drafts expire within 24 hours or when their source is removed. Drive is not connected.</p>
      </section>
    </>}
  </div>;
}
