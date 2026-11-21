"use client";

import { useRef, type FormEvent } from "react";
import type { CalendarEvent, CalendarService } from "@/lib/services/calendar-service";

export type CalendarAction = (work: () => Promise<string>) => Promise<boolean>;
const field = (data: FormData, name: string) => String(data.get(name) ?? "");
const localInput = (value: string) => { const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

export function ManualCalendarForm({ service, act, busy, editing, close, sample }: {
  service: CalendarService; act: CalendarAction; busy: boolean; editing: CalendarEvent | null; close: () => void; sample: boolean;
}) {
  const saveKey = useRef<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, data = new FormData(form);
    saveKey.current ??= crypto.randomUUID();
    const key = saveKey.current;
    const done = await act(async () => {
      await service.save({ title: field(data, "title"), location: field(data, "location"),
        starts_at: new Date(field(data, "start")).toISOString(), ends_at: new Date(field(data, "end")).toISOString(),
        preparation_minutes: Number(data.get("preparation")), idempotency_key: key }, editing?.id);
      return sample ? "Sample event saved for this screen." : "Event saved to NEXUS.";
    });
    if (done) { form.reset(); saveKey.current = null; close(); }
  }
  return <form onSubmit={submit} onInput={() => { saveKey.current = null; }}>
    <p className="calendar-note">Times below use your browser timezone. The agenda displays your account timezone. Manual events stay in NEXUS.</p>
    <div className="calendar-form-grid">
      <label>Event title<input name="title" required maxLength={200} defaultValue={editing?.title} /></label>
      <label>Location<input name="location" maxLength={300} defaultValue={editing?.location} /></label>
      <label>Starts<input name="start" type="datetime-local" required defaultValue={editing ? localInput(editing.startsAt) : undefined} /></label>
      <label>Ends<input name="end" type="datetime-local" required defaultValue={editing ? localInput(editing.endsAt) : undefined} /></label>
      <label>Preparation minutes<input name="preparation" type="number" required min={0} max={240} defaultValue={editing?.preparationMinutes ?? 15} /></label>
    </div>
    <div className="calendar-actions"><button disabled={busy} type="submit">{editing ? "Save event changes" : sample ? "Add sample event" : "Add event"}</button>{editing && <button type="button" disabled={busy} onClick={close}>Cancel editing</button>}</div>
  </form>;
}

export function CalendarImportForms({ service, act, busy, sample, timezone, start }: {
  service: CalendarService; act: CalendarAction; busy: boolean; sample: boolean; timezone: string; start: string;
}) {
  async function ics(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, data = new FormData(form), file = data.get("file");
    if (!(file instanceof File)) return;
    const done = await act(async () => {
      if (file.size > 1_000_000) throw new Error("Choose an ICS file under 1 MB.");
      const result = await service.importIcs({ name: field(data, "name"), timezone: field(data, "timezone"), contents: await file.text(), replace: data.has("replace") });
      return `${result.imported} event occurrences imported. Uploaded files are not retained.`;
    });
    if (done) form.reset();
  }
  async function timetable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, data = new FormData(form);
    const done = await act(async () => {
      const result = await service.timetable({ name: field(data, "name"), title: field(data, "title"), location: field(data, "location"), timezone: field(data, "timezone"),
        starts_on: field(data, "first"), ends_on: field(data, "last"), start_time: field(data, "start"), end_time: field(data, "end"),
        weekdays: data.getAll("weekdays").map(Number), preparation_minutes: Number(data.get("preparation")), replace: data.has("replace") });
      return `${result.imported} timetable sessions saved to NEXUS.`;
    });
    if (done) form.reset();
  }
  return <>
    <details className="calendar-disclosure"><summary>Import an ICS file</summary>
      <p>Import a fixed copy from 30 days ago through the next 90 days. Up to 200 definitions and 5,000 occurrences. Daily, weekly, monthly and yearly recurrence with exclusions is supported; unsupported files are rejected together.</p>
      {sample && <p className="calendar-note">Imports require a live account. You can explore manual sample events above.</p>}
      <form onSubmit={ics}><fieldset disabled={busy || sample}><div className="calendar-form-grid">
        <label>Import name<input name="name" required maxLength={100} /></label><label>ICS timezone<input name="timezone" required defaultValue={timezone} /></label>
        <label>ICS file<input name="file" type="file" accept=".ics,text/calendar" required /></label>
      </div><label className="calendar-check"><input name="replace" type="checkbox" />Replace an existing import with this name</label><button>Import calendar copy</button></fieldset></form>
    </details>
    <details className="calendar-disclosure"><summary>Add a weekly timetable</summary>
      <p>Generate same-day sessions over a maximum 120-day term. Times use the selected IANA timezone. At a daylight-saving gap NEXUS uses the first valid minute; repeated times use the earlier occurrence.</p>
      <form onSubmit={timetable}><fieldset disabled={busy || sample}><div className="calendar-form-grid">
        <label>Timetable name<input name="name" required maxLength={100} /></label><label>Session title<input name="title" required maxLength={200} /></label>
        <label>Session location<input name="location" maxLength={300} /></label><label>Timetable timezone<input name="timezone" required defaultValue={timezone} /></label>
        <label>First date<input name="first" type="date" required defaultValue={start} /></label><label>Last date<input name="last" type="date" required defaultValue={start} /></label>
        <label>Session starts<input name="start" type="time" required /></label><label>Session ends<input name="end" type="time" required /></label>
        <label>Session preparation minutes<input name="preparation" type="number" min={0} max={240} required defaultValue={15} /></label>
      </div><fieldset><legend>Days of the week</legend><div className="calendar-weekdays">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => <label className="calendar-check" key={day}><input type="checkbox" name="weekdays" value={i} />{day}</label>)}</div></fieldset>
      <label className="calendar-check"><input type="checkbox" name="replace" />Replace an existing timetable with this name</label><button>Save timetable</button></fieldset></form>
    </details>
  </>;
}
