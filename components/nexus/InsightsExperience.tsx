"use client";

import { useMemo, useState } from "react";
import type {
  InsightCategory,
  InsightLifecycle,
  InsightsSnapshot,
  RankedInsight,
} from "@/lib/domain/contracts";
import { insightsService } from "@/lib/mocks/mock-phase2-services";
import {
  BlockingState,
  EvidenceStack,
  HealthStrip,
  MetaLine,
  PhaseHeader,
  ScenarioBanner,
  SegmentedControl,
} from "@/components/nexus/Phase2Shared";

type LifecycleFilter = "active" | "snoozed" | "acted" | "expired";
type CategoryFilter = "all" | InsightCategory;

export function InsightsExperience({
  initialSnapshot,
}: {
  initialSnapshot: InsightsSnapshot;
}) {
  const [lifecycle, setLifecycle] = useState<LifecycleFilter>("active");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(
    initialSnapshot.primary?.id ?? null,
  );
  const [evidenceOpen, setEvidenceOpen] = useState<string | null>(null);
  const [states, setStates] = useState<Record<string, InsightLifecycle>>({});
  const [approval, setApproval] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  const allInsights = useMemo(
    () =>
      [
        ...(initialSnapshot.primary ? [initialSnapshot.primary] : []),
        ...initialSnapshot.stream,
        ...initialSnapshot.history,
      ].filter(
        (insight, index, items) =>
          items.findIndex((candidate) => candidate.id === insight.id) === index,
      ),
    [initialSnapshot],
  );

  const visible = allInsights.filter((insight) => {
    const state = states[insight.id] ?? insight.lifecycle;
    const stateMatches =
      lifecycle === "active"
        ? state === "active"
        : lifecycle === "snoozed"
          ? state === "snoozed"
          : lifecycle === "acted"
            ? state === "acted"
            : state === "expired";
    return stateMatches && (category === "all" || insight.category === category);
  });

  const recordFeedback = async (
    insight: RankedInsight,
    value: "helpful" | "not-useful" | "dismissed" | "snoozed",
  ) => {
    await insightsService.recordFeedback({
      insightId: insight.id,
      value,
      recordedAt: "2026-07-25T09:18:00+05:30",
    });
    if (value === "snoozed" || value === "dismissed") {
      setStates((current) => ({
        ...current,
        [insight.id]: value === "snoozed" ? "snoozed" : "dismissed",
      }));
    }
    setFeedback(
      value === "helpful"
        ? "Marked helpful."
        : value === "not-useful"
          ? "Feedback recorded without changing authority."
          : value === "snoozed"
            ? "Snoozed until 1:30 PM."
            : "Dismissed from active insights.",
    );
  };

  const resolveAction = async (
    insight: RankedInsight,
    decision: "approve" | "reject",
  ) => {
    const result = await insightsService.resolveAction(insight.id, decision);
    setStates((current) => ({
      ...current,
      [insight.id]: decision === "approve" ? "acted" : "dismissed",
    }));
    setApproval(null);
    setFeedback(result.message);
  };

  return (
    <div
      className={
        initialSnapshot.scenario === "reduced-motion"
          ? "phase2-page insights-page is-reduced"
          : "phase2-page insights-page"
      }
    >
      <PhaseHeader
        kicker="Ranked recommendations"
        title="Insights"
        summary={initialSnapshot.summary}
        action={
          <span className="quiet-count">
            {allInsights.filter((item) => item.quiet).length} quiet · in app only
          </span>
        }
      />
      <ScenarioBanner
        notice={initialSnapshot.notice}
        tone={initialSnapshot.viewState === "error" ? "danger" : "warning"}
      />
      <BlockingState
        state={initialSnapshot.viewState}
        noun="insight stream"
        scenario={initialSnapshot.scenario}
      />

      {initialSnapshot.primary ? (
        <>
          <div className="insights-controls">
            <SegmentedControl
              label="Insight lifecycle"
              value={lifecycle}
              options={[
                { value: "active", label: "Active" },
                { value: "snoozed", label: "Snoozed" },
                { value: "acted", label: "Acted" },
                { value: "expired", label: "Expired" },
              ]}
              onChange={setLifecycle}
            />
            <label>
              Category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as CategoryFilter)}
              >
                <option value="all">All categories</option>
                <option value="travel">Travel</option>
                <option value="deadline">Deadline</option>
                <option value="preparation">Preparation</option>
                <option value="knowledge">Knowledge</option>
                <option value="quiet">Quiet</option>
              </select>
            </label>
          </div>

          {lifecycle === "active" &&
          (category === "all" || initialSnapshot.primary.category === category) &&
          (states[initialSnapshot.primary.id] ?? initialSnapshot.primary.lifecycle) ===
            "active" ? (
            <section className="ranked-insight-primary" aria-labelledby="ranked-primary-title">
              <div className="ranked-insight-index">
                <span>01</span>
                <small>Highest value now</small>
              </div>
              <div className="ranked-insight-copy">
                <p className="section-kicker">
                  {initialSnapshot.primary.urgency} · {initialSnapshot.primary.category}
                </p>
                <h2 id="ranked-primary-title">{initialSnapshot.primary.title}</h2>
                <p>{initialSnapshot.primary.recommendation}</p>
                <MetaLine
                  source={initialSnapshot.primary.evidence[0]?.source ?? "NEXUS"}
                  freshness={
                    initialSnapshot.primary.evidence[0]?.freshness ?? "fresh"
                  }
                  confidence={initialSnapshot.primary.confidence}
                  authority={initialSnapshot.primary.requiredAuthority}
                />
                <div className="ranked-primary-actions">
                  <button
                    className="primary-button"
                    type="button"
                    disabled={
                      !initialSnapshot.primary.proposedAction ||
                      ["running", "succeeded"].includes(
                        initialSnapshot.state.action,
                      )
                    }
                    onClick={() => {
                      if (initialSnapshot.state.action === "failed-recoverably") {
                        setFeedback(
                          "The recorded failure is recoverable. Retry from Activity after reviewing the evidence.",
                        );
                        return;
                      }
                      setApproval(initialSnapshot.primary?.id ?? null);
                    }}
                  >
                    {initialSnapshot.state.action === "running"
                      ? "Action running"
                      : initialSnapshot.state.action === "succeeded"
                        ? "Result recorded"
                        : initialSnapshot.state.action === "failed-recoverably"
                          ? "Review failure"
                          : initialSnapshot.primary.proposedAction?.label ??
                            "Suggestion only"}
                  </button>
                  <button
                    className="quiet-button"
                    type="button"
                    aria-expanded={expanded === initialSnapshot.primary.id}
                    onClick={() =>
                      setExpanded((current) =>
                        current === initialSnapshot.primary?.id
                          ? null
                          : initialSnapshot.primary?.id ?? null,
                      )
                    }
                  >
                    Why
                  </button>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => recordFeedback(initialSnapshot.primary!, "snoozed")}
                  >
                    Snooze
                  </button>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => recordFeedback(initialSnapshot.primary!, "dismissed")}
                  >
                    Dismiss
                  </button>
                </div>
                {expanded === initialSnapshot.primary.id ? (
                  <div className="ranked-why">
                    <p>{initialSnapshot.primary.explanation}</p>
                    <button
                      type="button"
                      onClick={() =>
                        setEvidenceOpen((current) =>
                          current === initialSnapshot.primary?.id
                            ? null
                            : initialSnapshot.primary?.id ?? null,
                        )
                      }
                    >
                      {evidenceOpen === initialSnapshot.primary.id
                        ? "Hide evidence"
                        : "Open evidence"}
                    </button>
                  </div>
                ) : null}
                {evidenceOpen === initialSnapshot.primary.id ? (
                  <EvidenceStack evidence={initialSnapshot.primary.evidence} />
                ) : null}
              </div>
              <aside className="ranked-insight-expiry">
                <span>Fresh until</span>
                <b>9:22 AM</b>
                <small>Expires if the underlying context changes.</small>
              </aside>
            </section>
          ) : null}

          {approval === initialSnapshot.primary.id &&
          initialSnapshot.primary.proposedAction ? (
            <section className="phase2-approval" aria-live="polite">
              <div>
                <p className="section-kicker">Approval required · Ask</p>
                <h2>{initialSnapshot.primary.proposedAction.label}</h2>
                <p>{initialSnapshot.primary.proposedAction.reason}</p>
                <small>No provider is connected; approval updates demo state only.</small>
              </div>
              <div>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => resolveAction(initialSnapshot.primary!, "approve")}
                >
                  Approve once
                </button>
                <button
                  className="quiet-button"
                  type="button"
                  onClick={() => resolveAction(initialSnapshot.primary!, "reject")}
                >
                  Reject
                </button>
              </div>
            </section>
          ) : null}

          <section className="insight-stream" aria-labelledby="insight-stream-title">
            <div className="stream-heading">
              <div>
                <p className="section-kicker">Ranked stream</p>
                <h2 id="insight-stream-title">
                  {lifecycle === "active"
                    ? "What can wait"
                    : `${lifecycle[0].toUpperCase()}${lifecycle.slice(1)} insights`}
                </h2>
              </div>
              <span>{visible.length} shown</span>
            </div>
            {visible.length === 0 ? (
              <div className="inline-empty">
                <b>No insights in this view</b>
                <p>Choose another lifecycle or category.</p>
              </div>
            ) : null}
            {visible
              .filter((item) => item.id !== initialSnapshot.primary?.id)
              .map((insight) => (
                <article className={insight.quiet ? "insight-row is-quiet" : "insight-row"} key={insight.id}>
                  <span className="insight-rank">{String(insight.rank).padStart(2, "0")}</span>
                  <div>
                    <span>
                      {insight.category} · {insight.urgency}
                    </span>
                    <h3>{insight.title}</h3>
                    <p>{insight.recommendation}</p>
                    <MetaLine
                      source={insight.evidence[0]?.source ?? "NEXUS"}
                      freshness={insight.evidence[0]?.freshness ?? "fresh"}
                      confidence={insight.confidence}
                      authority={insight.requiredAuthority}
                    />
                    {expanded === insight.id ? (
                      <>
                        <p className="insight-row-explanation">{insight.explanation}</p>
                        <EvidenceStack evidence={insight.evidence} />
                      </>
                    ) : null}
                  </div>
                  <div className="insight-row-actions">
                    <button
                      type="button"
                      aria-expanded={expanded === insight.id}
                      onClick={() =>
                        setExpanded((current) =>
                          current === insight.id ? null : insight.id,
                        )
                      }
                    >
                      Why
                    </button>
                    <button type="button" onClick={() => recordFeedback(insight, "helpful")}>
                      Helpful
                    </button>
                    <button type="button" onClick={() => recordFeedback(insight, "not-useful")}>
                      Not useful
                    </button>
                  </div>
                </article>
              ))}
          </section>
          {feedback ? <p className="phase2-feedback" role="status">{feedback}</p> : null}
          <HealthStrip health={initialSnapshot.sourceHealth} />
        </>
      ) : null}
    </div>
  );
}
