"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useNexusAuth } from "@/lib/auth/AuthProvider";
import { enableBrowserPush, observeForegroundBriefs, revokeBrowserPush } from "@/lib/notifications/browser-push";
import { createLiveNotificationService, createSampleNotificationService,
  type BriefPreferences, type BriefSnapshot } from "@/lib/services/notification-service";
import { WorkspaceHeader, WorkspaceNotice } from "./WorkspaceChrome";
import "./NotificationsExperience.css";

const reasons: Record<string, string> = {
  expired: "The brief expired before delivery.",
  permission_or_schedule_paused: "A privacy control or schedule was paused.",
  timezone_changed: "Your profile timezone changed.",
  channels_disabled: "All available delivery channels were off.",
  quiet_hours_or_cooldown: "Held for quiet hours or the 30-minute cooldown.",
  permission_revoked: "Delivery permission was revoked.",
  registration_invalid: "The device registration is no longer valid.",
  acceptance_unconfirmed: "Push acceptance could not be confirmed; it will not be resent automatically.",
  worker_interrupted: "The worker stopped during a send; the outcome is uncertain.",
  push_unavailable: "Push delivery is not configured.",
  token_key_unavailable: "This device needs registering again after a server key change.",
};
const format = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export function NotificationsExperience() {
  const auth = useNexusAuth();
  // Account changes must discard the previous account's inbox and unsaved preferences.
  return <NotificationsWorkspace key={`${auth.mode}:${auth.firebaseUser?.uid ?? "signed-out"}`} />;
}

function NotificationsWorkspace() {
  const auth = useNexusAuth();
  const service = useMemo(() => auth.apiClient
    ? createLiveNotificationService(auth.apiClient)
    : auth.mode === "mock" ? createSampleNotificationService() : null, [auth.apiClient, auth.mode]);
  const [snapshot, setSnapshot] = useState<BriefSnapshot | null>(null);
  const [draft, setDraft] = useState<BriefPreferences | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [observedAt, setObservedAt] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    const refresh = () => {
      if (!service) return;
      void service.load().then(value => {
        if (active) { setSnapshot(value); setObservedAt(Date.now()); setDraft(current => current ?? value.preferences); }
      }).catch(failure => { if (active) setError(failure instanceof Error ? failure.message : "Could not load notifications."); });
    };
    refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 30_000);
    if (auth.mode === "phase6-live") {
      void observeForegroundBriefs(refresh).then(stop => { if (active) unsubscribe = stop; else stop(); }).catch(() => {});
    }
    return () => { active = false; unsubscribe(); window.clearInterval(timer); };
  }, [service, auth.mode]);

  async function act(work: () => Promise<string>) {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await work();
      if (service) { setSnapshot(await service.load()); setObservedAt(Date.now()); }
      setMessage(result);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The request could not be confirmed."); }
    finally { setBusy(false); }
  }

  const sample = auth.mode === "mock";
  return <div className="notifications-page workspace-page">
    <WorkspaceHeader eyebrow="Briefs & quiet hours" title="Your day, at the right moment." description="Choose when NEXUS prepares your day and helps you close it." mode={sample ? "Demonstration" : "Scheduled briefs"} />
    <WorkspaceNotice>{sample
      ? "Demonstration mode. Changes last only on this screen; no background job runs and no notification is sent."
      : "Briefs use your saved NEXUS event drafts. Calendar copies are not consulted by these briefs. Push acceptance does not confirm device receipt."}</WorkspaceNotice>
    {error && <p className="notifications-error" role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    {!service && <p role="alert">Live notifications require a configured account and API connection.</p>}
    {service && !snapshot && !error && <p role="status">Loading your notification preferences…</p>}
    {service && error && <button disabled={busy} onClick={() => void act(async () => { const value = await service.load(); setDraft(value.preferences); return "Notifications refreshed."; })}>Retry / refresh</button>}
    {snapshot && draft && service && <div className="notification-layout">
      <form className="notification-schedule" onSubmit={event => {
        event.preventDefault();
        void act(async () => { setDraft(await service.save(draft)); return sample ? "Sample preferences updated for this screen." : "Notification preferences saved."; });
      }}>
        <div className="notification-section-heading"><h2>Your daily rhythm</h2><span>{snapshot.preferences.timezone}</span></div>
        <p>Schedules use your profile timezone. <Link href="/app/settings">Edit your profile</Link>.</p>
        {snapshot.preferences.paused && <p className="notifications-error">Your privacy or automation pause is active. Scheduled delivery is blocked.</p>}
        <div className="notification-time-row">
          <label className="notification-toggle"><input type="checkbox" disabled={busy} checked={draft.morningEnabled} onChange={event => setDraft({ ...draft, morningEnabled: event.target.checked })} />Morning brief</label>
          <label>Morning time<input type="time" required disabled={busy} value={draft.morningBriefAt} onChange={event => setDraft({ ...draft, morningBriefAt: event.target.value })} /></label>
        </div>
        <div className="notification-time-row">
          <label className="notification-toggle"><input type="checkbox" disabled={busy} checked={draft.eveningEnabled} onChange={event => setDraft({ ...draft, eveningEnabled: event.target.checked })} />Evening preparation</label>
          <label>Evening time<input type="time" required disabled={busy} value={draft.eveningBriefAt} onChange={event => setDraft({ ...draft, eveningBriefAt: event.target.value })} /></label>
        </div>
        <fieldset><legend>Quiet hours</legend>
          <label className="notification-toggle"><input type="checkbox" disabled={busy} checked={draft.quietHours.enabled} onChange={event => setDraft({ ...draft, quietHours: { ...draft.quietHours, enabled: event.target.checked } })} />Protect quiet hours</label>
          <div className="notification-time-row">
            <label>Quiet hours start<input type="time" required disabled={busy} value={draft.quietHours.startsAt} onChange={event => setDraft({ ...draft, quietHours: { ...draft.quietHours, startsAt: event.target.value } })} /></label>
            <label>Quiet hours end<input type="time" required disabled={busy} value={draft.quietHours.endsAt} onChange={event => setDraft({ ...draft, quietHours: { ...draft.quietHours, endsAt: event.target.value } })} /></label>
          </div>
        </fieldset>
        <label className="notification-toggle"><input type="checkbox" disabled={busy} checked={draft.inApp} onChange={event => setDraft({ ...draft, inApp: event.target.checked })} />Enable the in-app delivery channel</label>
        <details><summary>Schedule rules and limits</summary><p className="notification-meta">At most one brief of each kind per local day. Briefs expire two hours after their original scheduled time; quiet hours and a 30-minute cooldown can delay or suppress them. Email briefs are not available yet.</p></details>
        <button type="submit" disabled={busy}>{busy ? "Working…" : sample ? "Update sample preferences" : "Save brief preferences"}</button>
      </form>
      <section className="notification-push" aria-labelledby="push-heading">
        <h2 id="push-heading">This browser</h2>
        <p>Push messages say only that a brief is ready. Sign in to read its contents.</p>
        {!snapshot.preferences.pushAvailable && <p className="notification-meta">{sample ? "Browser push is unavailable in demonstration mode." : "Web push is not configured on this server. The inbox remains available."}</p>}
        <button disabled={busy || sample || !snapshot.preferences.pushAvailable || !snapshot.preferences.webVapidPublicKey} onClick={() => void act(async () => {
          if (!auth.firebaseUser || !snapshot.preferences.webVapidPublicKey) throw new Error("Sign in to enable push.");
          await enableBrowserPush(service, auth.firebaseUser.uid, snapshot.preferences.webVapidPublicKey);
          const updated = await service.load(); setDraft(updated.preferences);
          return "Browser registered. Delivery still depends on the worker, preferences, browser and network.";
        })}>Enable browser push</button>
        {!!snapshot.devices.length && <ul>{snapshot.devices.map(device => <li key={device.id}>
          <span>{device.platform === "web" ? "Web browser" : "Android registration"}</span>
          <button disabled={busy} onClick={() => void act(async () => {
            if (auth.apiClient && auth.firebaseUser) await revokeBrowserPush(auth.apiClient, auth.firebaseUser.uid, device.id);
            else await service.revoke(device.id);
            const updated = await service.load(); setDraft(updated.preferences);
            return "Server push registration revoked.";
          })}>Revoke device {device.id.slice(0, 8)}</button>
        </li>)}</ul>}
      </section>
      <section className="notification-inbox" aria-labelledby="inbox-heading">
        <div className="notification-section-heading"><h2 id="inbox-heading">Briefs and delivery history</h2>
          <button disabled={busy} onClick={() => void act(async () => "Inbox refreshed.")}>Refresh inbox</button></div>
        <button disabled={busy || snapshot.preferences.paused} onClick={() => void act(async () => {
          await service.queueTest(crypto.randomUUID());
          return sample ? "A labeled sample brief is shown below. Nothing was sent." : "Test brief queued. Delivery has not yet been confirmed.";
        })}>{sample ? "Show a sample brief" : "Queue a test brief"}</button>
        {!snapshot.items.length && <div className="notification-empty"><h3>Your inbox is quiet.</h3><p>Enable a schedule or request a test brief. No scheduled brief has been recorded yet.</p></div>}
        <ul className="notification-items">{snapshot.items.map(item => <li key={item.id}>
          <article>
            <div className="notification-section-heading"><h3>{item.title || `${item.kind === "test" ? "Test" : item.kind === "morning" ? "Morning" : "Evening"} brief`}</h3><span>{item.status === "delivered" ? new Date(item.expiresAt).getTime() <= observedAt ? "Expired · history" : sample ? "Sample" : "Available in NEXUS" : item.status === "queued" ? "Queued" : "Suppressed"}</span></div>
            {item.body && <p>{item.body}</p>}
            <p className="notification-meta">{item.status === "queued" ? `Queued for ${format(item.dueAt)} · delivery checks still apply.` : item.deliveredAt ? `Available since ${format(item.deliveredAt)}` : `Scheduled for ${format(item.dueAt)}`}</p>
            {item.reason && <p>{reasons[item.reason] || "Delivery requires review."}</p>}
            {item.push.map((delivery, index) => <p className="notification-meta" key={index}>{delivery.status === "accepted" ? "Push accepted by provider · device receipt unconfirmed." : delivery.status === "uncertain" ? "Push outcome uncertain · no automatic resend." : `Push ${delivery.status}.`}{delivery.reason ? ` ${reasons[delivery.reason] || "Review registration."}` : ""}</p>)}
            <details><summary>Why this brief?</summary><p>{item.evidence.source || "An explicit schedule or test request."}</p>
              <p>Expires {format(item.expiresAt)}. No external calendar, model or private provider was consulted.</p>
              {item.evidence.generatedAt && <p>Generated {format(item.evidence.generatedAt)}.</p>}
            </details>
            {item.status === "delivered" && !item.readAt && <button disabled={busy} onClick={() => void act(async () => { await service.read(item.id); return sample ? "Sample marked read." : "Brief marked read."; })}>Mark as read</button>}
            {item.readAt && <span className="notification-meta">Read</span>}
          </article>
        </li>)}</ul>
      </section>
    </div>}
  </div>;
}
