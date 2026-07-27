"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  ActivityEvent,
  ActivityEventType,
  ActivityOutcome,
  ActivitySnapshot,
  AuthorityLevel,
} from "@/lib/domain/contracts";
import { createMockPhase3Services } from "@/lib/mocks/mock-phase3-services";
import { scenarioHref } from "@/lib/mocks/phase2-fixtures";
import {
  ControlBlockingState,
  ControlHeader,
  ControlNotice,
  StatusPill,
} from "./Phase3Shared";

const eventTypes: ReadonlyArray<{ value: "" | ActivityEventType; label: string }> = [
  { value: "", label: "All events" },
  { value: "source-read", label: "Source reads" },
  { value: "connection-sync", label: "Connection syncs" },
  { value: "insight", label: "Insights" },
  { value: "notification", label: "Notifications" },
  { value: "prepared-action", label: "Prepared actions" },
  { value: "approved-action", label: "Approved actions" },
  { value: "rejected-action", label: "Rejected actions" },
  { value: "permission-change", label: "Permission changes" },
  { value: "memory-change", label: "Memory changes" },
  { value: "automation-run", label: "Automation runs" },
];

export function ActivityExperience({
  initialSnapshot,
}: {
  initialSnapshot: ActivitySnapshot;
}) {
  const service = useMemo(
    () => createMockPhase3Services(initialSnapshot.scenario).activityService,
    [initialSnapshot.scenario],
  );
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [selectedId, setSelectedId] = useState(
    initialSnapshot.events[0]?.id ?? "",
  );
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"" | ActivityEventType>("");
  const [source, setSource] = useState("");
  const [authority, setAuthority] = useState<"" | AuthorityLevel>("");
  const [outcome, setOutcome] = useState<"" | ActivityOutcome>("");
  const [feedback, setFeedback] = useState("");
  const selected =
    snapshot.events.find((event) => event.id === selectedId) ??
    snapshot.events[0];
  const blocking = ["loading", "empty"].includes(snapshot.viewState);

  const runFilters = async (
    next: Partial<{
      query: string;
      type: "" | ActivityEventType;
      source: string;
      authority: "" | AuthorityLevel;
      outcome: "" | ActivityOutcome;
    }> = {},
  ) => {
    const values = {
      query: next.query ?? query,
      type: next.type ?? type,
      source: next.source ?? source,
      authority: next.authority ?? authority,
      outcome: next.outcome ?? outcome,
    };
    const response = await service.getActivity(initialSnapshot.scenario, {
      query: values.query,
      types: values.type ? [values.type] : [],
      sources: values.source ? [values.source] : [],
      authorities: values.authority ? [values.authority] : [],
      outcomes: values.outcome ? [values.outcome] : [],
    });
    setSnapshot(response);
    setSelectedId(response.events[0]?.id ?? "");
  };

  const updateEvent = (next: ActivityEvent) => {
    setSnapshot((current) => ({
      ...current,
      events: current.events.map((event) =>
        event.id === next.id ? next : event,
      ),
    }));
  };

  const dateGroups = snapshot.events.reduce<Record<string, ActivityEvent[]>>(
    (groups, event) => {
      (groups[event.dateLabel] ??= []).push(event);
      return groups;
    },
    {},
  );

  return (
    <div
      className={
        initialSnapshot.scenario === "reduced-motion"
          ? "control-page is-reduced"
          : "control-page"
      }
    >
      <ControlHeader
        kicker="Human-readable audit"
        title="Every meaningful action leaves a trace."
        summary={snapshot.summary}
        action={
          <button
            className="secondary-button"
            type="button"
            onClick={async () => {
              const result = await service.exportActivity({
                query,
                types: type ? [type] : [],
                sources: source ? [source] : [],
                authorities: authority ? [authority] : [],
                outcomes: outcome ? [outcome] : [],
              });
              setFeedback(result.summary);
            }}
          >
            Export filtered summary
          </button>
        }
      />
      <ControlNotice
        notice={snapshot.notice}
        tone={snapshot.viewState === "error" ? "danger" : "warning"}
      />
      <ControlBlockingState
        state={snapshot.viewState}
        noun="activity"
        scenario={snapshot.scenario}
      />

      {!blocking ? (
        <>
          <section className="control-hero activity-hero" aria-labelledby="activity-summary">
            <div className="control-hero-copy">
              <p className="section-kicker">Last 24 hours</p>
              <h2 id="activity-summary">
                {snapshot.events.filter((event) => event.outcome === "failed").length
                  ? "One recoverable failure, with no hidden side effect."
                  : "Every read and proposal has an explainable outcome."}
              </h2>
              <p>
                Automatic actions appear only as future mock states. A recorded
                result—not generated language—is the source of truth.
              </p>
            </div>
            <div className="activity-pulse" aria-hidden="true">
              <span />
              <i />
              <i />
              <i />
            </div>
            <div className="control-hero-metrics">
              <span>
                <b>{snapshot.events.length}</b>
                Visible events
              </span>
              <span>
                <b>{snapshot.events.filter((event) => event.outcome === "success").length}</b>
                Successful
              </span>
              <span>
                <b>{snapshot.events.filter((event) => event.reversible).length}</b>
                Reversible
              </span>
            </div>
          </section>

          {feedback ? <p className="control-feedback" role="status">{feedback}</p> : null}

          <section className="activity-filters" aria-label="Activity filters">
            <label className="activity-search">
              <span aria-hidden="true" />
              <input
                value={query}
                placeholder="Search the audit trail"
                aria-label="Search activity"
                onChange={(event) => {
                  const next = event.target.value;
                  setQuery(next);
                  void runFilters({ query: next });
                }}
              />
            </label>
            <label>
              <span>Event</span>
              <select
                value={type}
                onChange={(event) => {
                  const next = event.target.value as "" | ActivityEventType;
                  setType(next);
                  void runFilters({ type: next });
                }}
              >
                {eventTypes.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Source</span>
              <select
                value={source}
                onChange={(event) => {
                  const next = event.target.value;
                  setSource(next);
                  void runFilters({ source: next });
                }}
              >
                <option value="">All sources</option>
                {initialSnapshot.availableSources.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Authority</span>
              <select
                value={authority}
                onChange={(event) => {
                  const next = event.target.value as "" | AuthorityLevel;
                  setAuthority(next);
                  void runFilters({ authority: next });
                }}
              >
                <option value="">All authority</option>
                {["observe", "suggest", "prepare", "ask", "act"].map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Outcome</span>
              <select
                value={outcome}
                onChange={(event) => {
                  const next = event.target.value as "" | ActivityOutcome;
                  setOutcome(next);
                  void runFilters({ outcome: next });
                }}
              >
                <option value="">All outcomes</option>
                {["success", "pending", "denied", "failed", "reversed"].map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
          </section>

          <div className="control-workspace activity-workspace">
            <section className="activity-stream" aria-labelledby="activity-stream-heading">
              <h2 className="sr-only" id="activity-stream-heading">Activity stream</h2>
              {Object.entries(dateGroups).map(([dateLabel, events]) => (
                <section key={dateLabel} className="activity-date-group">
                  <header>
                    <h3>{dateLabel}</h3>
                    <span>{events.length} events</span>
                  </header>
                  {events.map((event) => (
                    <button
                      type="button"
                      key={event.id}
                      className={
                        selected?.id === event.id
                          ? "activity-row is-active"
                          : "activity-row"
                      }
                      aria-pressed={selected?.id === event.id}
                      onClick={() => setSelectedId(event.id)}
                    >
                      <time>
                        {new Intl.DateTimeFormat("en-IN", {
                          hour: "numeric",
                          minute: "2-digit",
                        }).format(new Date(event.occurredAt))}
                      </time>
                      <span className={`activity-node is-${event.outcome}`} aria-hidden="true" />
                      <span>
                        <b>{event.title}</b>
                        <small>{event.summary}</small>
                      </span>
                      <StatusPill value={event.outcome} />
                    </button>
                  ))}
                </section>
              ))}
              {snapshot.events.length === 0 ? (
                <div className="activity-empty">
                  <b>No activity matches these filters.</b>
                  <p>Broaden the query or clear one filter.</p>
                </div>
              ) : null}
            </section>

            {selected ? (
              <aside className="control-detail activity-detail" aria-labelledby="activity-detail-heading">
                <header className="control-detail-heading">
                  <div>
                    <StatusPill value={selected.outcome} />
                    <h2 id="activity-detail-heading">{selected.title}</h2>
                    <p>{selected.summary}</p>
                  </div>
                </header>

                <dl className="activity-facts">
                  <div>
                    <dt>Source</dt>
                    <dd>{selected.source}</dd>
                  </div>
                  <div>
                    <dt>Actor</dt>
                    <dd>{selected.actor.label} · {selected.actor.kind}</dd>
                  </div>
                  <div>
                    <dt>Required authority</dt>
                    <dd>{selected.requiredAuthority}</dd>
                  </div>
                  <div>
                    <dt>Granted authority</dt>
                    <dd>{selected.grantedAuthority}</dd>
                  </div>
                </dl>

                <div className="activity-result">
                  <p className="section-kicker">Recorded result</p>
                  <h3>{selected.result}</h3>
                  {selected.failure ? (
                    <div className="activity-failure">
                      <b>{selected.failure.message}</b>
                      <small>{selected.failure.code} · {selected.failure.recoverable ? "Recoverable" : "Final"}</small>
                    </div>
                  ) : null}
                </div>

                {selected.evidence.length ? (
                  <div className="activity-evidence">
                    <p className="section-kicker">Evidence</p>
                    {selected.evidence.map((evidence) => (
                      <div key={evidence.id}>
                        <span aria-hidden="true" />
                        <span>
                          <b>{evidence.source}</b>
                          <small>{evidence.detail}</small>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}

                <details className="technical-details">
                  <summary>Technical details</summary>
                  <p>{selected.technicalDetail}</p>
                </details>

                <footer className="control-detail-actions">
                  <Link href={scenarioHref(selected.relatedHref, snapshot.scenario)}>
                    Open related control
                  </Link>
                  {selected.failure?.recoverable ? (
                    <button
                      className="primary-button"
                      type="button"
                      onClick={async () => {
                        const next = await service.retryEvent(selected.id);
                        updateEvent(next);
                        setFeedback("Retry succeeded in demo state.");
                      }}
                    >
                      Retry safely
                    </button>
                  ) : null}
                  {selected.reversible && selected.reversalState === "available" ? (
                    <button
                      type="button"
                      onClick={async () => {
                        const next = await service.reverseEvent(selected.id);
                        updateEvent(next);
                        setFeedback("Reversal recorded in deterministic demo state.");
                      }}
                    >
                      Reverse
                    </button>
                  ) : null}
                </footer>
              </aside>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
