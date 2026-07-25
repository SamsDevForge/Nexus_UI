"use client";

import { useState } from "react";
import type {
  Evidence,
  FreshnessState,
  SystemState,
  TodaySnapshot,
} from "@/lib/domain/contracts";

const systemLabels: Record<SystemState, string> = {
  dormant: "Dormant",
  observing: "Observing",
  gathering: "Gathering context",
  processing: "Processing",
  "insight-ready": "Insight ready",
  "approval-needed": "Approval needed",
  success: "Action complete",
  degraded: "Degraded",
  "privacy-paused": "Privacy paused",
};

const freshnessLabels: Record<FreshnessState, string> = {
  live: "Live",
  fresh: "Fresh",
  stale: "Stale",
  disconnected: "Disconnected",
};

function NexusStateIndicator({ state }: { state: SystemState }) {
  return (
    <div className={`nexus-state state-${state}`}>
      <div className="state-core" aria-hidden="true">
        <span className="state-core-face" />
        <span className="state-core-light" />
      </div>
      <div>
        <span className="state-caption">NEXUS state</span>
        <strong>{systemLabels[state]}</strong>
      </div>
    </div>
  );
}

function EvidenceChip({ evidence }: { evidence: Evidence }) {
  return (
    <span className={`evidence-chip freshness-${evidence.freshness}`}>
      <i aria-hidden="true" />
      <span>{evidence.source}</span>
      <b>{freshnessLabels[evidence.freshness]}</b>
    </span>
  );
}

function StatusNotice({
  notice,
  onRetry,
}: {
  notice: NonNullable<TodaySnapshot["notice"]>;
  onRetry: () => void;
}) {
  return (
    <section className={`status-notice notice-${notice.tone}`} aria-live="polite">
      <span className="notice-symbol" aria-hidden="true">
        {notice.tone === "danger" ? "!" : "i"}
      </span>
      <div>
        <strong>{notice.title}</strong>
        <p>{notice.detail}</p>
      </div>
      {notice.tone === "danger" ? (
        <button className="quiet-button compact-button" type="button" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </section>
  );
}

function LoadingToday() {
  return (
    <div className="today-loading" aria-live="polite" aria-busy="true">
      <span className="sr-only">Gathering today’s context</span>
      <div className="loading-heading">
        <i />
        <i />
      </div>
      <div className="loading-hero">
        <span className="loading-orbit" aria-hidden="true" />
        <div>
          <i />
          <i />
          <i />
        </div>
      </div>
      <div className="loading-rows">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

function FirstUseState() {
  const [message, setMessage] = useState("");

  return (
    <section className="full-state-panel" aria-labelledby="first-use-title">
      <div className="empty-core" aria-hidden="true">
        <span />
      </div>
      <p className="section-kicker">Your context starts with one source</p>
      <h2 id="first-use-title">Make Today useful in under a minute.</h2>
      <p>
        Connect your calendar or add a timetable. NEXUS will only read the
        schedule you approve and will begin in Suggest mode.
      </p>
      <div className="state-steps" aria-label="Getting started">
        <span>
          <b>01</b> Choose a source
        </span>
        <span>
          <b>02</b> Review access
        </span>
        <span>
          <b>03</b> See your first brief
        </span>
      </div>
      <div className="state-actions">
        <button
          className="primary-button"
          type="button"
          onClick={() => setMessage("Calendar connection is mocked in Phase 1.")}
        >
          Connect calendar
        </button>
        <button
          className="quiet-button"
          type="button"
          onClick={() => setMessage("Timetable entry is mocked in Phase 1.")}
        >
          Add timetable manually
        </button>
      </div>
      {message ? <p className="inline-feedback">{message}</p> : null}
    </section>
  );
}

function PermissionState() {
  const [message, setMessage] = useState("");

  return (
    <section className="full-state-panel permission-panel" aria-labelledby="permission-title">
      <span className="permission-glyph" aria-hidden="true">
        ×
      </span>
      <p className="section-kicker">Calendar access paused</p>
      <h2 id="permission-title">NEXUS cannot verify what’s next.</h2>
      <p>
        Today remains private. Restore read-only schedule access to receive
        preparation and departure suggestions; no event changes will be allowed.
      </p>
      <div className="permission-scope">
        <span>
          <b>Requested</b>
          Read today’s event times and locations
        </span>
        <span>
          <b>Not requested</b>
          Create, move or delete events
        </span>
      </div>
      <button
        className="primary-button"
        type="button"
        onClick={() => setMessage("Permission review opened in mock mode.")}
      >
        Review permission
      </button>
      {message ? <p className="inline-feedback">{message}</p> : null}
    </section>
  );
}

function InsightHero({
  snapshot,
  whyOpen,
  actionState,
  feedback,
  onToggleWhy,
  onAction,
  onConfirm,
  onFeedback,
}: {
  snapshot: TodaySnapshot;
  whyOpen: boolean;
  actionState: "idle" | "approval" | "success";
  feedback: string;
  onToggleWhy: () => void;
  onAction: () => void;
  onConfirm: () => void;
  onFeedback: (message: string) => void;
}) {
  const insight = snapshot.insight!;
  const event = snapshot.nextEvent;

  return (
    <section className="insight-hero" aria-labelledby="primary-insight-title">
      <div className="insight-ambient" aria-hidden="true" />
      <div className="insight-main">
        <div className="insight-label-row">
          <span className="section-kicker">{insight.eyebrow}</span>
          <span className="confidence-readout">
            <b>{Math.round(insight.confidence * 100)}%</b> confidence
          </span>
        </div>
        <h2 id="primary-insight-title">{insight.title}</h2>
        <p className="insight-recommendation">{insight.recommendation}</p>

        <div className="evidence-row" aria-label="Insight evidence">
          {insight.evidence.map((evidence) => (
            <EvidenceChip key={evidence.id} evidence={evidence} />
          ))}
        </div>

        <div className="insight-actions">
          <button
            className="primary-button"
            type="button"
            onClick={onAction}
            disabled={!insight.proposedAction || actionState === "success"}
          >
            {actionState === "success"
              ? "Prepared"
              : insight.proposedAction?.label ?? "No action needed"}
            <span aria-hidden="true">↗</span>
          </button>
          <button
            className="quiet-button"
            type="button"
            aria-expanded={whyOpen}
            aria-controls="insight-explanation"
            onClick={onToggleWhy}
          >
            {whyOpen ? "Hide why" : "Why?"}
          </button>
          <button
            className="text-button"
            type="button"
            onClick={() => onFeedback("Snoozed until 9:18 AM.")}
          >
            Snooze
          </button>
          <button
            className="text-button"
            type="button"
            onClick={() => onFeedback("Dismissed for today.")}
          >
            Dismiss
          </button>
        </div>

        {whyOpen ? (
          <div className="why-panel" id="insight-explanation">
            <span className="why-rail" aria-hidden="true" />
            <div>
              <b>Why this matters now</b>
              <p>{insight.explanation}</p>
              <span>
                Fresh until 9:22 AM · Recommendation expires if traffic changes
              </span>
            </div>
          </div>
        ) : null}

        {actionState === "approval" && insight.proposedAction ? (
          <div className="approval-panel" aria-live="polite">
            <div>
              <span>Approval required · Ask</span>
              <strong>{insight.proposedAction.reason}</strong>
              <p>
                This prepares local information only. It does not change your
                calendar or send a message.
              </p>
            </div>
            <button className="approval-button" type="button" onClick={onConfirm}>
              Approve once
            </button>
          </div>
        ) : null}

        {feedback ? <p className="inline-feedback">{feedback}</p> : null}
      </div>

      <aside className="insight-timing" aria-label="Next event timing">
        <NexusStateIndicator state={snapshot.systemState} />
        <div className="timing-focus">
          <span>Recommended departure</span>
          <strong>{event?.leaveAt ? "9:12" : "—"}</strong>
          <small>48 min to campus</small>
        </div>
        <div className="timing-event">
          <span>
            <b>10:00</b>
            <i aria-hidden="true" />
          </span>
          <div>
            <strong>{event?.title ?? "No event"}</strong>
            <small>{event ? `${event.course} · ${event.place}` : "Calendar clear"}</small>
          </div>
        </div>
      </aside>
    </section>
  );
}

function TodayDetails({ snapshot }: { snapshot: TodaySnapshot }) {
  const [assetMessage, setAssetMessage] = useState("");

  return (
    <>
      <section className="today-band" aria-labelledby="next-event-heading">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Next event</p>
            <h2 id="next-event-heading">{snapshot.nextEvent?.title}</h2>
          </div>
          <span className="event-confirmed">
            <i aria-hidden="true" /> Confirmed
          </span>
        </div>
        <div className="event-route">
          <span>
            <small>Prepare</small>
            <b>9:00</b>
          </span>
          <i className="route-line" aria-hidden="true" />
          <span>
            <small>Leave</small>
            <b>9:12</b>
          </span>
          <i className="route-line is-bright" aria-hidden="true" />
          <span>
            <small>Arrive</small>
            <b>9:48</b>
          </span>
          <i className="route-line" aria-hidden="true" />
          <span>
            <small>Starts</small>
            <b>10:00</b>
          </span>
        </div>
      </section>

      <div className="today-detail-grid">
        <section className="timeline-section" aria-labelledby="timeline-heading">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Today’s timeline</p>
              <h2 id="timeline-heading">Four useful moments</h2>
            </div>
            <span className="section-meta">Until 3:30 PM</span>
          </div>
          <div className="timeline-list">
            {snapshot.timeline.map((item) => (
              <article className="timeline-row" key={item.id}>
                <time>{item.time}</time>
                <span className={`timeline-node node-${item.status}`} aria-hidden="true" />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
                <span className={`status-tag status-${item.status}`}>{item.status}</span>
              </article>
            ))}
          </div>
        </section>

        <aside className="deadline-section" aria-labelledby="deadline-heading">
          <p className="section-kicker">Deadline radar</p>
          <h2 id="deadline-heading">{snapshot.deadlines[0]?.title}</h2>
          <p className="deadline-course">{snapshot.deadlines[0]?.course}</p>
          <div className="deadline-progress" aria-label="42 percent complete">
            <span style={{ width: `${snapshot.deadlines[0]?.progress}%` }} />
          </div>
          <div className="deadline-meta">
            <span>
              <b>{snapshot.deadlines[0]?.progress}%</b> complete
            </span>
            <span className={`risk-${snapshot.deadlines[0]?.risk}`}>
              {snapshot.deadlines[0]?.remainingLabel}
            </span>
          </div>
          <p>{snapshot.deadlines[0]?.recommendation}</p>
        </aside>
      </div>

      <section className="prepared-section" aria-labelledby="prepared-heading">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Prepared for you</p>
            <h2 id="prepared-heading">Ready before you leave</h2>
          </div>
          <span className="section-meta">{snapshot.preparedAssets.length} items</span>
        </div>
        <div className="prepared-list">
          {snapshot.preparedAssets.map((asset) => (
            <article className="prepared-row" key={asset.id}>
              <span className="asset-mark" aria-hidden="true">
                {asset.kind === "offline-pack" ? "↓" : "·"}
              </span>
              <div>
                <strong>{asset.name}</strong>
                <p>{asset.detail}</p>
              </div>
              <button
                className="open-asset-button"
                type="button"
                onClick={() => setAssetMessage(`${asset.name} opened in mock mode.`)}
              >
                Open
              </button>
            </article>
          ))}
        </div>
        {assetMessage ? <p className="inline-feedback">{assetMessage}</p> : null}
      </section>

      <section className="signals-section" aria-labelledby="signals-heading">
        <div>
          <p className="section-kicker">Lower-priority context</p>
          <h2 id="signals-heading">Signals NEXUS is watching quietly</h2>
        </div>
        <div className="signals-list">
          {snapshot.signals.map((signal) => (
            <span className="signal-readout" key={signal.id}>
              <i className={`signal-${signal.freshness}`} aria-hidden="true" />
              <span>
                <small>{signal.label}</small>
                <b>{signal.value}</b>
              </span>
            </span>
          ))}
        </div>
      </section>
    </>
  );
}

export function TodayExperience({
  initialSnapshot,
}: {
  initialSnapshot: TodaySnapshot;
}) {
  const [whyOpen, setWhyOpen] = useState(false);
  const [actionState, setActionState] = useState<"idle" | "approval" | "success">(
    "idle",
  );
  const [feedback, setFeedback] = useState("");

  const snapshot = initialSnapshot;
  const reduced = snapshot.scenario === "reduced-motion";

  const handleRetry = () => {
    setFeedback("Preparation completed on retry. No schedule changes were made.");
    setActionState("success");
  };

  return (
    <div className={reduced ? "today-page is-reduced" : "today-page"}>
      <header className="today-heading">
        <div>
          <p className="page-kicker">
            <span aria-hidden="true" />
            Current context
          </p>
          <h1>{snapshot.greeting}</h1>
          <p>{snapshot.summary}</p>
        </div>
      </header>

      {snapshot.notice ? (
        <StatusNotice notice={snapshot.notice} onRetry={handleRetry} />
      ) : null}

      {snapshot.viewState === "loading" ? <LoadingToday /> : null}
      {snapshot.viewState === "first-use" ? <FirstUseState /> : null}
      {snapshot.viewState === "permission-denied" ? <PermissionState /> : null}

      {snapshot.insight && snapshot.nextEvent ? (
        <>
          <InsightHero
            snapshot={snapshot}
            whyOpen={whyOpen}
            actionState={actionState}
            feedback={feedback}
            onToggleWhy={() => setWhyOpen((current) => !current)}
            onAction={() => {
              if (snapshot.insight?.proposedAction) setActionState("approval");
            }}
            onConfirm={() => {
              setActionState("success");
              setFeedback("Commute and lecture pack prepared. No external changes made.");
            }}
            onFeedback={setFeedback}
          />
          <TodayDetails snapshot={snapshot} />
        </>
      ) : null}
    </div>
  );
}
