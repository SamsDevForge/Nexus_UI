"use client";

import type {
  AuthorityLevel,
  CoreViewState,
  Evidence,
  FreshnessState,
  SourceHealth,
} from "@/lib/domain/contracts";

const freshnessLabels: Record<FreshnessState, string> = {
  live: "Live",
  fresh: "Fresh",
  stale: "Stale",
  disconnected: "Disconnected",
};

export function PhaseHeader({
  kicker,
  title,
  summary,
  action,
}: {
  kicker: string;
  title: string;
  summary: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="phase2-heading">
      <div>
        <p className="page-kicker">
          <span aria-hidden="true" />
          {kicker}
        </p>
        <h1>{title}</h1>
        <p>{summary}</p>
      </div>
      {action ? <div className="phase2-heading-action">{action}</div> : null}
    </header>
  );
}

export function ScenarioBanner({
  notice,
  tone = "warning",
}: {
  notice?: string;
  tone?: "warning" | "danger" | "info";
}) {
  if (!notice) return null;
  return (
    <div className={`phase2-notice is-${tone}`} role="status">
      <span aria-hidden="true">{tone === "danger" ? "!" : "i"}</span>
      <p>{notice}</p>
    </div>
  );
}

export function BlockingState({
  state,
  noun,
}: {
  state: CoreViewState;
  noun: string;
}) {
  if (!["loading", "empty", "permission-denied"].includes(state)) return null;

  if (state === "loading") {
    return (
      <section className="phase2-state phase2-skeleton" aria-live="polite" aria-busy="true">
        <span className="sr-only">Gathering {noun}</span>
        <i />
        <i />
        <i />
        <i />
      </section>
    );
  }

  const denied = state === "permission-denied";
  return (
    <section className="phase2-state" aria-labelledby={`${noun}-state-title`}>
      <span className="phase2-state-glyph" aria-hidden="true">
        {denied ? "×" : "+"}
      </span>
      <p className="section-kicker">
        {denied ? "Permission boundary" : "No permitted sources yet"}
      </p>
      <h2 id={`${noun}-state-title`}>
        {denied
          ? `NEXUS cannot verify this ${noun}.`
          : `Build your first ${noun} from one source.`}
      </h2>
      <p>
        {denied
          ? "Restore the minimum read permission to continue. Missing information will not be invented."
          : "Calendar or permitted course material is enough to begin. Connections remain simulated in Phase 2."}
      </p>
      <button className="primary-button" type="button">
        {denied ? "Review permission" : "See connection plan"}
      </button>
    </section>
  );
}

export function EvidenceStack({ evidence }: { evidence: Evidence[] }) {
  return (
    <div className="phase2-evidence" aria-label="Evidence used">
      {evidence.map((item) => (
        <div key={item.id}>
          <span className={`meta-dot is-${item.freshness}`} aria-hidden="true" />
          <span>
            <b>{item.source}</b>
            <small>{item.detail}</small>
          </span>
          <em>{freshnessLabels[item.freshness]}</em>
        </div>
      ))}
    </div>
  );
}

export function MetaLine({
  source,
  freshness,
  confidence,
  authority,
}: {
  source: string;
  freshness: FreshnessState;
  confidence?: number;
  authority?: AuthorityLevel;
}) {
  return (
    <div className="phase2-meta-line">
      <span>
        <i className={`meta-dot is-${freshness}`} aria-hidden="true" />
        {source}
      </span>
      <span>{freshnessLabels[freshness]}</span>
      {typeof confidence === "number" ? (
        <span>{Math.round(confidence * 100)}% confidence</span>
      ) : null}
      {authority ? <span>Authority: {authority}</span> : null}
    </div>
  );
}

export function HealthStrip({ health }: { health: SourceHealth[] }) {
  return (
    <div className="health-strip" aria-label="Source health">
      {health.map((item) => (
        <span key={item.id} title={item.detail}>
          <i className={`health-dot is-${item.state}`} aria-hidden="true" />
          {item.source}
          <small>{item.state.replace("-", " ")}</small>
        </span>
      ))}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="phase2-segments" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          className={value === option.value ? "is-active" : undefined}
          type="button"
          aria-pressed={value === option.value}
          key={option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
