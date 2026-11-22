"use client";

import { useEffect, useState } from "react";
import type { NoteDraft, NoteEdit } from "@/lib/services/collaboration-service";

export function CollaborationDraftEditor({ draft, destination, allowAppend, sample, busy, paused, markDirty, save, approve, discard, close }: {
  draft: NoteDraft; destination: string; allowAppend: boolean; sample: boolean; busy: boolean; paused: boolean;
  markDirty(dirty: boolean): void; save(value: NoteEdit): Promise<void>; approve(): Promise<void>; discard(): Promise<void>; close(): void;
}) {
  const [title,setTitle] = useState(draft.title), [body,setBody] = useState(draft.body ?? "");
  const [operation,setOperation] = useState(draft.operation);
  const dirty = title !== draft.title || body !== draft.body || operation !== draft.operation;
  const blocked = busy || draft.status === "executing" || draft.status === "uncertain";
  useEffect(() => { markDirty(dirty); return () => markDirty(false); }, [dirty,markDirty]);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const navigation = (event: MouseEvent) => {
      if ((event.target as Element).closest("a[href]") && !window.confirm("Leave this page and discard unsaved note edits?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload",unload); document.addEventListener("click",navigation,true);
    return () => { window.removeEventListener("beforeunload",unload); document.removeEventListener("click",navigation,true); };
  }, [dirty]);
  return <section className="collaboration-editor" aria-label="Note preview">
    <div className="collaboration-section-heading"><div><p className="collaboration-kicker">Your approval, this revision</p><h2 tabIndex={-1} id="note-preview-heading">Review before publishing.</h2></div><button disabled={busy} onClick={() => { if (!dirty || window.confirm("Discard unsaved note edits?")) close(); }}>Close preview</button></div>
    <p className="collaboration-meta">Destination: <strong>{destination}</strong> · Revision {draft.revision} · {draft.status}{sample ? " (sample)" : ""}</p>
    {draft.status === "uncertain" && <p role="alert">The remote result is uncertain. Check Notion directly before preparing another note. This write cannot be retried here.</p>}
    {draft.error && <p role="alert">{draft.error === "write_conflict" ? "Someone changed or moved the published block. NEXUS will not overwrite it." : "This write was not confirmed. Refresh the source and check Notion before continuing."}</p>}
    {draft.resultUrl && <a href={draft.resultUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Open published note ↗</a>}
    {draft.status === "succeeded" && sample && <p role="status">Sample approval recorded. Nothing was written to Notion.</p>}
    <form onSubmit={event => { event.preventDefault(); void save({ revision: draft.revision,title,body,operation }); }}>
      <fieldset disabled={blocked}><legend className="sr-only">Edit note preview</legend>
        <label>Note title<input maxLength={200} required value={title} onChange={e => { setTitle(e.target.value); if (draft.canUpdate) setOperation("update"); }} /></label>
        <label>Publish action<select value={operation} onChange={e => setOperation(e.target.value as typeof operation)}>
          {draft.canUpdate ? <>{draft.operation !== "update" && <option value={draft.operation} disabled>Already published · choose Update to revise</option>}<option value="update">Update the block created by this draft</option></> : <><option value="create">Create a new Notion page</option>{allowAppend && <option value="append">Append to the selected Notion page</option>}</>}
        </select></label>
        <label>Note content<textarea required maxLength={7000} rows={16} value={body} onChange={e => { setBody(e.target.value); if (draft.canUpdate) setOperation("update"); }} /></label>
        <p className="collaboration-meta">This is a structured template with a source excerpt. Add your own conclusions, owners and dates. No AI summary is being claimed.</p>
        {draft.sourceUrl && <a href={draft.sourceUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Check source evidence ↗</a>}
      </fieldset>
      <div className="collaboration-actions"><button type="submit" disabled={blocked || !dirty}>Save preview</button><button type="button" disabled={busy || draft.status === "executing"} onClick={() => { if (window.confirm("Remove this local draft? Any published Notion note will remain.")) void discard(); }}>Remove local draft</button></div>
    </form>
    <div className="collaboration-approval"><p>{dirty ? "Save your edits before approving this revision." : draft.status === "prepared" ? `${operation === "update" ? "Update one managed block" : operation === "append" ? "Append one block" : "Create one page"} in ${destination}. Source access is checked again before the write.` : "Only a saved, prepared revision can be approved."}</p>
      <button className="workspace-primary" disabled={blocked || dirty || paused || draft.status !== "prepared"} onClick={() => { if (window.confirm(`${sample ? "Simulate" : "Approve"} ${operation} in “${destination}” for “${title}”, revision ${draft.revision}?`)) void approve(); }}>{sample ? "Simulate approval" : "Approve & publish"}</button>
    </div>
  </section>;
}
