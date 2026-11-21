"use client";

import type { FormEvent } from "react";
import { mailIsImportant, type MailCorrection, type MailMessage } from "@/lib/services/mail-service";

export function MailReviewForm({ message, busy, sample, dirty, save, markDirty, discard }: {
  message: MailMessage; busy: boolean; sample: boolean; dirty: boolean;
  save: (value: MailCorrection) => Promise<void>; markDirty: () => void; discard: () => void;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    await save({ revision: message.revision, important: data.has("important"), items: message.original.items.flatMap(item => {
      const status = String(data.get(`${item.id}:status`));
      if (status !== "confirmed" && status !== "dismissed") return [];
      return [{ id: item.id, title: String(data.get(`${item.id}:title`)), value: status === "dismissed" ? null : String(data.get(`${item.id}:value`) ?? "").trim() || null, status }];
    }) });
  }
  return <form className="mail-review-form" onSubmit={submit} onInput={markDirty} onChange={markDirty}>
    <label className="mail-check"><input type="checkbox" name="important" defaultChecked={mailIsImportant(message)} />Important to me</label>
    {message.original.items.map(item => {
      const corrected = !message.sourceChanged ? message.correction?.items.find(i => i.id === item.id) : null;
      return <fieldset key={item.id}><legend>{item.kind === "deadline" ? "Deadline suggestion" : "Event suggestion"}</legend>
        <blockquote>{item.evidence}</blockquote><p className="mail-meta">Evidence: {item.location} · {item.reason}</p>
        <label>Item title<input name={`${item.id}:title`} maxLength={120} required defaultValue={corrected?.title ?? item.title} /></label>
        <label>Date or time with offset<input name={`${item.id}:value`} maxLength={120} defaultValue={corrected?.value ?? item.value ?? ""} placeholder="YYYY-MM-DD or YYYY-MM-DDTHH:MM+05:30" /></label>
        <label>Review decision<select name={`${item.id}:status`} defaultValue={corrected?.status ?? "suggested"}><option value="suggested">Leave unreviewed</option><option value="confirmed">Confirm my correction</option><option value="dismissed">Dismiss this suggestion</option></select></label>
        {corrected && <p className="mail-meta">Your previous decision: {corrected.status}. Original value: {item.value ?? "Unresolved"}.</p>}
      </fieldset>;
    })}
    {!message.original.items.length && <p>No deadline or event pattern was extracted. You can still correct importance.</p>}
    <p className="mail-meta">Confirming requires an ISO date or a timestamp with an explicit offset. Review decisions stay in NEXUS; they do not create tasks or calendar events.</p>
    <div className="mail-actions"><button disabled={busy}>{sample ? "Save sample review" : "Save review"}</button>{dirty && <button type="button" disabled={busy} onClick={discard}>Discard unsaved edits</button>}</div>
  </form>;
}
