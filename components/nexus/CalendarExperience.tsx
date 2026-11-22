"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useNexusAuth } from "@/lib/auth/AuthProvider";
import { createLiveCalendarService, createSampleCalendarService, type CalendarEvent, type CalendarSnapshot } from "@/lib/services/calendar-service";
import { CalendarImportForms, ManualCalendarForm } from "./CalendarForms";
import { WorkspaceHeader, WorkspaceNotice } from "./WorkspaceChrome";
import "./CalendarExperience.css";

const sourceName: Record<string, string> = { manual: "Manual", timetable: "Timetable", ics: "ICS copy", google: "Google Calendar", microsoft: "Outlook Calendar" };
const dayKey = (date: Date, timezone: string) => new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const today = () => dayKey(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone);
const timestamp = (value: string, timezone: string) => new Date(value).toLocaleString(undefined, { timeZone: timezone, dateStyle: "medium", timeStyle: "short" });
const reasons: Record<string, string> = { consent_required: "Reconnect to restore read access.", paused_or_revoked: "Observation is paused or access was revoked.", provider_unavailable: "The provider could not be reached. The last confirmed copy is retained.", calendar_sync_unavailable: "Sync failed. The last confirmed copy is retained.", invalid_provider_response: "The provider response could not be safely normalized.", oauth_unavailable: "Credentials could not be refreshed. Try again or reconnect.", provider_limit: "The calendar exceeded this release’s sync limit.", watch_unavailable: "Change signals are unavailable; polling continues." };

export function CalendarExperience() {
  const auth = useNexusAuth();
  return <CalendarWorkspace key={`${auth.mode}:${auth.firebaseUser?.uid ?? "signed-out"}`} />;
}

function CalendarWorkspace() {
  const auth = useNexusAuth(), params = useSearchParams();
  const service = useMemo(() => auth.apiClient ? createLiveCalendarService(auth.apiClient) : auth.mode === "mock" ? createSampleCalendarService() : null, [auth.apiClient, auth.mode]);
  const [start, setStart] = useState(today), [source, setSource] = useState("all");
  const [snapshot, setSnapshot] = useState<CalendarSnapshot | null>(null);
  const [error, setError] = useState(""), [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false), [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [editorOpen, setEditorOpen] = useState(false), [editorDirty, setEditorDirty] = useState(false);
  const [observedAt, setObservedAt] = useState(0);
  const version = useRef(0), working = useRef(false);
  const sample = auth.mode === "mock";

  useEffect(() => {
    let active = true;
    async function refresh() {
      if (!service || working.current) return;
      const request = ++version.current;
      try {
        const value = await service.load(start);
        if (active && request === version.current) { setSnapshot(value); setObservedAt(Date.now()); setError(""); }
      } catch (failure) { if (active && request === version.current) setError(failure instanceof Error ? failure.message : "Calendar could not be loaded."); }
    }
    void refresh();
    const timer = window.setInterval(() => { setObservedAt(Date.now()); if (document.visibilityState === "visible") void refresh(); }, 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [service, start]);

  useEffect(() => { if (editorOpen) document.getElementById("calendar-edit-heading")?.focus(); }, [editing, editorOpen]);

  async function act(work: () => Promise<string>): Promise<boolean> {
    if (working.current) return false;
    working.current = true; version.current++; setBusy(true); setError(""); setMessage("");
    try {
      const result = await work();
      if (service) { setSnapshot(await service.load(start)); setObservedAt(Date.now()); }
      setMessage(result); return true;
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The result could not be confirmed. Refresh before retrying."); return false; }
    finally { working.current = false; setBusy(false); }
  }
  const items = (snapshot?.items ?? []).filter(e => source === "all" || e.source === source);
  const groups = Map.groupBy(items, e => e.allDay ? e.startsOn ?? dayKey(new Date(e.startsAt), snapshot!.timezone) : dayKey(new Date(e.startsAt), snapshot!.timezone));
  function closeEditor(saved = false) {
    if (!saved && editorDirty && !window.confirm("Discard unsaved event edits?")) return;
    setEditing(null); setEditorDirty(false);
    if (!saved) setEditorOpen(false);
  }
  function editEvent(event: CalendarEvent) {
    if (editorDirty && !window.confirm("Discard unsaved event edits?")) return;
    setEditorDirty(false); setEditing(event); setEditorOpen(true);
  }
  const consent = params.get("consent");
  return <div className="calendar-page workspace-page">
    <WorkspaceHeader eyebrow="Calendar & preparation" title="Room for what matters." description="See the commitments, notice the collisions, leave time to prepare." mode={sample ? "Demonstration" : "Read-only sources"} action={<button className="workspace-primary" disabled={!service || busy || !snapshot} onClick={() => { setEditorOpen(true); document.getElementById("calendar-edit-heading")?.focus(); }}>Add event</button>} />
    <WorkspaceNotice>{sample ? "Demonstration mode. Manual sample events stay on this screen and reset on reload. No calendar account is connected." : "Google and Outlook are read-only. Your manual events and imported copies stay in NEXUS. Check source freshness before relying on the schedule."}</WorkspaceNotice>
    {consent && <p role="status">{consent === "connected" ? "Read-only consent saved. Events appear after the first confirmed sync." : consent === "denied" ? "Calendar consent was declined. Manual entry and imports remain available." : "Calendar connection could not be completed. Start consent again."}</p>}
    {error && <p role="alert" className="calendar-error">{error}</p>}{message && <p role="status">{message}</p>}
    {!service && <p role="alert">Sign in to a configured live account to use your calendar.</p>}
    {service && <>
      <div className="calendar-toolbar"><label>Week starting<input type="date" value={start} required disabled={busy} onChange={e => { if (e.target.value) { setSnapshot(null); setStart(e.target.value); } }} /></label>
        <label>Source<select value={source} onChange={e => setSource(e.target.value)}><option value="all">All sources</option>{Object.entries(sourceName).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
        <button disabled={busy} onClick={() => void act(async () => "Agenda refreshed.")}>Refresh agenda</button></div>
      {!snapshot && !error && <p role="status">Loading your agenda…</p>}
      {snapshot && <>
        <p className="calendar-note">{snapshot.timezone} · Seven-day view · {sample ? "Sample session" : `Checked ${new Date(observedAt).toLocaleTimeString()}`}</p>
        {snapshot.paused && <p className="calendar-warning">Observation or automations are paused. Provider reads are blocked; existing copies remain visible until you remove them.</p>}
        {snapshot.truncated && <p className="calendar-warning">Only the first 1,000 matching events are shown. This view and its conflict checks are incomplete.</p>}
        {snapshot.conflicts.length > 0 && <aside className="calendar-conflicts" aria-label="Schedule conflicts"><h2>Make a little room</h2>
          <ul>{snapshot.conflicts.map(c => <li key={`${c.firstId}:${c.secondId}`}><strong>{snapshot.items.find(e => e.id === c.firstId)?.title} / {snapshot.items.find(e => e.id === c.secondId)?.title}</strong><span>{c.message}</span></li>)}</ul>
          {snapshot.conflicts.length >= 200 && <p>Showing the first 200 conflicts.</p>}<p>These are suggestions. NEXUS does not move or edit provider events.</p></aside>}
        <section className="calendar-agenda" aria-label="Seven-day agenda"><h2>Your agenda</h2>
          {!items.length && <div className="calendar-empty"><h3>A little room to plan.</h3><p>No events in this view. Add a manual event or connect a source.</p><button disabled={busy} onClick={() => setEditorOpen(true)}>{sample ? "Create a sample event" : "Create your first event"}</button></div>}
          {[...groups].map(([day, events]) => <div className="calendar-day" key={day}><h3>{new Date(`${day}T12:00:00Z`).toLocaleDateString(undefined, { timeZone: "UTC", weekday: "long", month: "short", day: "numeric" })}</h3>
            <ol>{events.map(event => <li className="calendar-event" key={event.id}>
              <div className="calendar-event-time">{event.allDay ? "All day" : new Date(event.startsAt).toLocaleTimeString(undefined, { timeZone: snapshot.timezone, hour: "2-digit", minute: "2-digit" })}<span>{event.allDay ? `${event.startsOn} → ${event.endsOn} (exclusive)` : `until ${timestamp(event.endsAt, snapshot.timezone)}`}</span></div>
              <div className="calendar-event-main"><h4>{event.title}</h4><p>{event.location || "No location"}</p><p className="calendar-note">{sourceName[event.source]} · {event.status} · {event.busy ? "Busy" : "Free"}</p>
                {!event.allDay && <p className="calendar-note">{event.preparationMinutes ? `Prepare ${event.preparationMinutes} min before · ${timestamp(event.prepareAt!, snapshot.timezone)}` : "No preparation buffer"}</p>}
                <div className="calendar-actions">{event.source === "manual" && <><button disabled={busy} onClick={() => editEvent(event)}>Edit {event.title}</button><button disabled={busy} onClick={() => { if (window.confirm(`Remove “${event.title}” from NEXUS?`)) void act(async () => { await service.remove(event.id); return "Event removed."; }); }}>Remove event</button></>}
                  {!event.allDay && <details><summary>Preparation buffer</summary><form onSubmit={e => { e.preventDefault(); const minutes = Number(new FormData(e.currentTarget).get("minutes")); void act(async () => { await service.preparation(event.id, minutes); return "NEXUS preparation buffer updated. Source event unchanged."; }); }}><label>Minutes before {event.title}<input name="minutes" type="number" min={0} max={240} required defaultValue={event.preparationMinutes} /></label><button disabled={busy}>Update buffer</button></form></details>}</div>
              </div></li>)}</ol></div>)}
        </section>
        {editorOpen && <section className="calendar-editor" aria-label="Manual event editor"><div className="calendar-editor-heading"><h2 id="calendar-edit-heading" tabIndex={-1}>{editing ? `Edit ${editing.title}` : "Add something of your own"}</h2><button disabled={busy} onClick={() => closeEditor(false)} aria-label="Close event editor">Close</button></div>
          <ManualCalendarForm key={editing?.id ?? "new"} service={service} act={act} busy={busy} editing={editing} close={closeEditor} sample={sample} onDirty={() => setEditorDirty(true)} />
        </section>}
        <section className="calendar-sources" aria-label="Calendar sources"><h2>Your sources</h2><p>Separate consent from sign-in. NEXUS requests read access to event titles, locations and times, plus offline access for synchronization. Descriptions and attachments are not stored.</p>
          {(["google", "microsoft"] as const).map(provider => { const connection = snapshot.connections.find(c => c.provider === provider); const stale = connection?.freshUntil ? Date.parse(connection.freshUntil) < observedAt : true;
            return <div className="calendar-source" key={provider}><div><h3>{sourceName[provider]}</h3><p>{provider === "google" ? "Primary calendar" : "Default calendar"} · Read-only</p>
              <p className="calendar-note">{connection?.status === "connected" ? connection.lastSyncedAt ? `${stale ? "Stale copy" : "Last confirmed copy"} · ${timestamp(connection.lastSyncedAt, snapshot.timezone)}` : "Waiting for first sync" : connection?.status === "reauthorize" ? "Access expired. Reconnect to resume." : "Disconnected"}</p>
              {connection?.status === "connected" && <p className="calendar-note">{connection.watchExpiresAt && Date.parse(connection.watchExpiresAt) > observedAt ? `Change-signal subscription expires ${timestamp(connection.watchExpiresAt, snapshot.timezone)}. Polling remains enabled.` : "No active change-signal subscription confirmed. Polling remains enabled."}</p>}
              {connection?.error && <p className="calendar-warning">{reasons[connection.error] ?? "Sync could not be confirmed. Refresh or reconnect."}</p>}
              {!snapshot.providers[provider] && <p className="calendar-note">{sample ? "Unavailable in demonstration mode." : "Provider setup is unavailable. Manual entry and imports still work."}</p>}</div>
              <div className="calendar-actions"><button disabled={busy || snapshot.paused || !snapshot.providers[provider]} onClick={() => void act(async () => { const url = await service.connect(provider); window.location.assign(url); return "Opening provider consent…"; })}>{connection?.status === "connected" ? "Reconnect" : "Connect"} {provider === "google" ? "Google" : "Outlook"}</button>
                {connection?.status === "connected" && <button disabled={busy || snapshot.paused} onClick={() => void act(async () => { await service.sync(connection.id); return "Sync requested. Your agenda updates after the source confirms its data."; })}>Request sync</button>}
                {connection && connection.status !== "revoked" && <button disabled={busy} onClick={() => { if (window.confirm("Disconnect and delete this provider’s NEXUS copies? Revoke the app in your provider account too if you want to withdraw its provider grant.")) void act(async () => { setSnapshot(null); await service.disconnect(connection.id); return "Disconnected. NEXUS credentials and event copies removed. Provider account consent can be withdrawn in its app settings."; }); }}>Disconnect &amp; remove copies</button>}</div></div>;
          })}
          <p className="calendar-note">Connected calendars cover the past 30 and next 90 days. Requested updates can take a moment. ICS imports are fixed copies and do not refresh automatically.</p>
          <CalendarImportForms service={service} act={act} busy={busy} sample={sample} timezone={snapshot.timezone} start={start} />
          {snapshot.collections.filter(c => c.kind !== "manual").map(c => <div className="calendar-source" key={c.id}><p><strong>{c.name}</strong> · {sourceName[c.kind] ?? c.kind}</p><button disabled={busy} onClick={() => { if (window.confirm(`Remove the “${c.name}” import and its events?`)) void act(async () => { await service.removeCollection(c.id); return "Imported collection removed."; }); }}>Remove import</button></div>)}
        </section>
      </>}
    </>}
  </div>;
}
