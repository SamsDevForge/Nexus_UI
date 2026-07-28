"use client";

import Link from "next/link";
import type {
  AuthorityLevel,
  CoreViewState,
  Evidence,
  FreshnessState,
  SourceHealth,
  NexusScenario,
} from "@/lib/domain/contracts";
import { canonicalScenario } from "@/lib/domain/state-coverage";
import { scenarioHref } from "@/lib/mocks/phase2-fixtures";

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
  mark,
}: {
  kicker: string;
  title: string;
  summary: string;
  action?: React.ReactNode;
  mark?: React.ReactNode;
}) {
  return (
    <header className="phase2-heading">
      <div>
        <p className="page-kicker">
          <span aria-hidden="true" />
          {kicker}
        </p>
        {mark ? (
          <div className="phase2-title-lockup">
            {mark}
            <h1>{title}</h1>
          </div>
        ) : (
          <h1>{title}</h1>
        )}
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
      <span className={`notice-glyph is-${tone}`} aria-hidden="true">
        <i />
      </span>
      <p>{notice}</p>
    </div>
  );
}

export function BlockingState({
  state,
  noun,
  scenario = "rain-and-traffic",
}: {
  state: CoreViewState;
  noun: string;
  scenario?: NexusScenario;
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
  const canonical = canonicalScenario(scenario);
  const noConnections = canonical === "no-connections";
  const configuredEmpty = canonical === "empty";
  return (
    <section className="phase2-state" aria-labelledby={`${noun}-state-title`}>
      <span
        className={
          denied
            ? "phase2-state-glyph is-denied"
            : "phase2-state-glyph is-empty"
        }
        aria-hidden="true"
      >
        <i />
        <i />
        <i />
      </span>
      <p className="section-kicker">
        {denied
          ? "Permission boundary"
          : noConnections
            ? "Manual tools remain available"
            : configuredEmpty
              ? "No items in this view"
              : "No permitted sources yet"}
      </p>
      <h2 id={`${noun}-state-title`}>
        {denied
          ? `NEXUS cannot verify this ${noun}.`
          : noConnections
            ? `Use ${noun} without connecting another app.`
            : configuredEmpty
              ? `There is nothing to show in this ${noun} yet.`
              : `Build your first ${noun} from one source.`}
      </h2>
      <p>
        {denied
          ? "Restore the minimum read permission to continue. Missing information will not be invented."
          : noConnections
            ? "Quick Capture and manual Nexus Notes remain available. Provider-derived content stays absent."
            : configuredEmpty
              ? "Your configuration is intact. Try another view or add something manually with Quick Capture."
              : "Calendar or permitted course material is enough to begin. Connections remain simulated in Phase 2."}
      </p>
      <Link
        className="primary-button"
        href={scenarioHref(
          denied ? "/app/settings/permissions" : "/app/connections",
          scenario,
        )}
      >
        {denied
          ? "Review permission"
          : noConnections
            ? "Review connections"
            : configuredEmpty
              ? "Check sources"
              : "See connection plan"}
      </Link>
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
        <span className="is-confidence">
          <b>{Math.round(confidence * 100)}%</b> confidence
        </span>
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
