"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  TimelineEntry,
  TimelineEntryKind,
  TimelineSnapshot,
} from "@/lib/domain/contracts";
import { timelineService } from "@/lib/mocks/mock-phase2-services";
import { useNexusAuth } from "@/lib/auth/AuthProvider";
import {
  durableCaptureToTimeline,
  loadDurableCaptures,
  PHASE6_CAPTURE_CHANGE_EVENT,
} from "@/lib/services/phase6-live-services";
import {
  BlockingState,
  HealthStrip,
  MetaLine,
  PhaseHeader,
  ScenarioBanner,
} from "@/components/nexus/Phase2Shared";
import {
  ProductIcon,
  timelineStatusIcon,
} from "@/components/nexus/ProductIcon";

const filters: Array<{ value: "all" | TimelineEntryKind; label: string }> = [
  { value: "all", label: "All" },
  { value: "event", label: "Events" },
  { value: "task", label: "Tasks" },
  { value: "travel", label: "Travel" },
  { value: "preparation", label: "Preparation" },
  { value: "focus", label: "Focus" },
];

export function TimelineExperience({
  initialSnapshot,
  capturedEntryId,
}: {
  initialSnapshot: TimelineSnapshot;
  capturedEntryId?: string;
}) {
  const auth = useNexusAuth();
  const live = auth.mode === "phase6-live" && Boolean(auth.apiClient);
  const [selectedDay, setSelectedDay] = useState(initialSnapshot.selectedDay);
  const [groups, setGroups] = useState(initialSnapshot.groups);
  const [filter, setFilter] = useState<"all" | TimelineEntryKind>("all");
  const [selectedEntry, setSelectedEntry] = useState<TimelineEntry | null>(null);
  const [outcomes, setOutcomes] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");

  const group =
    groups.find((item) => item.date === selectedDay) ??
    groups[0];
  const entries = useMemo(
    () =>
      (group?.entries ?? []).filter(
        (entry) => filter === "all" || entry.kind === filter,
      ),
    [filter, group],
  );

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (live && auth.apiClient) {
        const captures = await loadDurableCaptures(auth.apiClient);
        const durableEntries = captures
          .map(durableCaptureToTimeline)
          .filter((entry): entry is TimelineEntry => Boolean(entry));
        const nextGroups = structuredClone(initialSnapshot.groups);
        for (const entry of durableEntries) {
          let target = nextGroups.find((item) => item.date === entry.day);
          if (!target) {
            target = {
              id: `capture-day-${entry.day}`,
              date: entry.day,
              label: entry.day,
              shortLabel: entry.day.slice(5),
              entries: [],
            };
            nextGroups.unshift(target);
          }
          target.entries = [
            entry,
            ...target.entries.filter((item) => item.id !== entry.id),
          ];
        }
        if (!active) return;
        setGroups(nextGroups);
        if (capturedEntryId) {
          const captured = durableEntries.find(
            (entry) => entry.id === capturedEntryId,
          );
          if (captured) {
            setSelectedDay(captured.day);
            setSelectedEntry(captured);
          }
        }
        return;
      }
      const next = await timelineService.getTimeline(initialSnapshot.scenario);
      if (!active) return;
      setGroups(next.groups);
      if (capturedEntryId) {
        const captured = next.groups
          .flatMap((item) => item.entries)
          .find((entry) => entry.id === capturedEntryId);
        if (captured) {
          setSelectedDay(captured.day);
          setSelectedEntry(captured);
        }
      }
    };
    const handleSessionChange = (event: Event) => {
      const detail = (event as CustomEvent<{ scenario?: string }>).detail;
      if (detail?.scenario === initialSnapshot.scenario) void refresh();
    };
    void refresh();
    window.addEventListener("nexus:mock-session-change", handleSessionChange);
    window.addEventListener(PHASE6_CAPTURE_CHANGE_EVENT, refresh);
    return () => {
      active = false;
      window.removeEventListener("nexus:mock-session-change", handleSessionChange);
      window.removeEventListener(PHASE6_CAPTURE_CHANGE_EVENT, refresh);
    };
  }, [
    auth.apiClient,
    capturedEntryId,
    initialSnapshot.groups,
    initialSnapshot.scenario,
    live,
  ]);

  const resolve = async (
    entry: TimelineEntry,
    decision: "accept" | "reject" | "reschedule",
  ) => {
    const result = await timelineService.resolveSuggestion(
      initialSnapshot.scenario,
      entry.id,
      decision,
    );
    setOutcomes((current) => ({ ...current, [entry.id]: result.status }));
    setFeedback(result.message);
    setSelectedEntry({ ...entry });
  };

  return (
    <div
      className={
        initialSnapshot.scenario === "reduced-motion"
          ? "phase2-page timeline-page is-reduced"
          : "phase2-page timeline-page"
      }
    >
      <PhaseHeader
        kicker="Time, preparation and change"
        title="Timeline"
        summary={initialSnapshot.summary}
        action={
          <button
            className="quiet-button"
            type="button"
            onClick={() => {
              setSelectedDay("2026-07-25");
              setFeedback("Returned to the current-time marker.");
            }}
          >
            Now · {initialSnapshot.currentTimeLabel}
          </button>
        }
      />
      <ScenarioBanner
        notice={initialSnapshot.notice}
        tone={initialSnapshot.viewState === "error" ? "danger" : "warning"}
      />
      <BlockingState
        state={groups.length > 0 ? "populated" : initialSnapshot.viewState}
        noun="timeline"
        scenario={initialSnapshot.scenario}
      />

      {groups.length > 0 ? (
        <>
          <div className="timeline-toolbar">
            <div className="timeline-days" role="group" aria-label="Visible day">
              {groups.map((item) => (
                <button
                  className={selectedDay === item.date ? "is-active" : undefined}
                  type="button"
                  aria-pressed={selectedDay === item.date}
                  key={item.id}
                  onClick={() => {
                    setSelectedDay(item.date);
                    setSelectedEntry(null);
                  }}
                >
                  <small>{item.shortLabel}</small>
                  <b>{item.label}</b>
                </button>
              ))}
            </div>
            <div className="timeline-filters" role="group" aria-label="Timeline filters">
              {filters.map((item) => (
                <button
                  className={filter === item.value ? "is-active" : undefined}
                  type="button"
                  aria-pressed={filter === item.value}
                  key={item.value}
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className={selectedEntry ? "timeline-workspace has-detail" : "timeline-workspace"}>
            <section className="timeline-rail" aria-labelledby="timeline-day-heading">
              <div className="timeline-rail-heading">
                <div>
                  <p className="section-kicker">Visible day</p>
                  <h2 id="timeline-day-heading">{group?.label}</h2>
                </div>
                <span>{entries.length} moments</span>
              </div>

              {selectedDay === "2026-07-25" ? (
                <div className="current-time-marker">
                  <time>{initialSnapshot.currentTimeLabel}</time>
                  <span aria-hidden="true" />
                  <small>Current time</small>
                </div>
              ) : null}

              <div className="timeline-track">
                {entries.length === 0 ? (
                  <div className="inline-empty">
                    <b>No matching moments</b>
                    <p>Clear the filter to see the full day.</p>
                  </div>
                ) : null}
                {entries.map((entry) => {
                  const outcome = outcomes[entry.id];
                  const visibleStatus = outcome ?? entry.status;
                  return (
                    <article
                      className={`timeline-entry is-${entry.kind} status-${visibleStatus}`}
                      key={entry.id}
                    >
                      <button
                        className="timeline-entry-main"
                        type="button"
                        aria-expanded={selectedEntry?.id === entry.id}
                        onClick={() =>
                          setSelectedEntry((current) =>
                            current?.id === entry.id ? null : entry,
                          )
                        }
                      >
                        <time>
                          <b>{entry.timeLabel}</b>
                          {entry.endLabel ? <small>{entry.endLabel}</small> : null}
                        </time>
                        <ProductIcon
                          name={timelineStatusIcon(visibleStatus)}
                          className={`timeline-entry-icon status-${visibleStatus}`}
                          size={24}
                        />
                        <span>
                          <small>{entry.kind}</small>
                          <strong>{entry.title}</strong>
                          <em>{entry.detail}</em>
                        </span>
                        <span className="timeline-entry-status">
                          {visibleStatus.replace("-", " ")}
                        </span>
                      </button>
                      {entry.proposedAction &&
                      !outcome &&
                      !["running", "succeeded", "failed"].includes(entry.status) ? (
                        <div className="timeline-inline-actions">
                          <button type="button" onClick={() => resolve(entry, "accept")}>
                            Accept
                          </button>
                          <button type="button" onClick={() => resolve(entry, "reschedule")}>
                            Reschedule
                          </button>
                          <button type="button" onClick={() => resolve(entry, "reject")}>
                            Reject
                          </button>
                        </div>
                      ) : null}
                      {entry.proposedAction &&
                      !outcome &&
                      entry.status === "failed" ? (
                        <div className="timeline-inline-actions">
                          <button type="button" onClick={() => resolve(entry, "accept")}>
                            Retry safely
                          </button>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>

            {selectedEntry ? (
              <aside className="timeline-detail" aria-label={`${selectedEntry.title} details`}>
                <button
                  className="detail-close"
                  type="button"
                  aria-label="Close timeline detail"
                  onClick={() => setSelectedEntry(null)}
                >
                  ×
                </button>
                <p className="section-kicker">
                  {selectedEntry.kind} · {selectedEntry.status.replace("-", " ")}
                </p>
                <h2>{selectedEntry.title}</h2>
                <p>{selectedEntry.detail}</p>
                <MetaLine
                  source={selectedEntry.source}
                  freshness={selectedEntry.freshness}
                  confidence={selectedEntry.confidence}
                  authority={selectedEntry.requiredAuthority}
                />
                {selectedEntry.provenance === "manual-paste" ? (
                  <div className="timeline-reasoning">
                    <span>Manual-paste provenance</span>
                    <p>{selectedEntry.sourceEvidence}</p>
                    <small>
                      {selectedEntry.timezone} · reviewed before confirmation
                    </small>
                  </div>
                ) : null}
                {selectedEntry.reasoning ? (
                  <div className="timeline-reasoning">
                    <span>Why it appears here</span>
                    <p>{selectedEntry.reasoning}</p>
                  </div>
                ) : null}
                {selectedEntry.proposedAction ? (
                  <div className="action-preview-compact">
                    <span>Prepared action · Ask</span>
                    <b>{selectedEntry.proposedAction.reason}</b>
                    <small>No calendar write occurs in Phase 2.</small>
                  </div>
                ) : null}
                <button
                  className="quiet-button"
                  type="button"
                  onClick={() =>
                    setFeedback("Source and deterministic reasoning are shown above.")
                  }
                >
                  Show source and reasoning
                </button>
              </aside>
            ) : null}
          </div>
          {feedback ? <p className="phase2-feedback" role="status">{feedback}</p> : null}
          <HealthStrip health={initialSnapshot.sourceHealth} />
        </>
      ) : null}
    </div>
  );
}
