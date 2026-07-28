import type { Metadata } from "next";
import Link from "next/link";
import { TODAY_SCENARIOS } from "@/lib/mocks/today-fixtures";
import { scenarioHref } from "@/lib/mocks/phase2-fixtures";
import {
  PHASE4_SCENARIO_BY_STATE,
  ROUTE_STATE_COVERAGE,
} from "@/lib/domain/state-coverage";

export const metadata: Metadata = {
  title: "Technicals",
  description:
    "Explore NEXUS prototype states, data boundaries and mocked capabilities.",
};

const implementationFacts = [
  {
    label: "Decision data",
    value: "Separate state dimensions",
    detail: "Provider-neutral",
  },
  {
    label: "Behaviour",
    value: "Deterministic scenarios",
    detail: "Repeatable",
  },
  {
    label: "Live connections",
    value: "Not connected yet",
    detail: "Phase 4 mock boundary",
  },
  {
    label: "External actions",
    value: "Previewed, never executed",
    detail: "Safe by default",
  },
];

const phaseTwoServices = [
  {
    name: "TimelineService",
    route: "/app/timeline",
    detail: "Time groups, source reasoning and approval-safe schedule proposals",
  },
  {
    name: "InsightsService",
    route: "/app/insights",
    detail: "Ranked recommendations, lifecycle, feedback and prepared actions",
  },
  {
    name: "NexusService",
    route: "/app/nexus",
    detail: "Scripted conversations, evidence and recorded mock tool results",
  },
  {
    name: "KnowledgeService",
    route: "/app/knowledge",
    detail: "Provider-neutral sources, documents and permission-aware retrieval",
  },
  {
    name: "NotesService",
    route: "/app/notes",
    detail: "Source-grounded drafts, review state and future provider preparation",
  },
  {
    name: "SearchService",
    route: "/app/search",
    detail: "Unified cross-domain results with type and source filters",
  },
];

const phaseThreeServices = [
  {
    name: "AutomationService",
    route: "/app/automations",
    detail: "Recipes, safe authority, dry-runs, recovery and global pause",
  },
  {
    name: "ConnectionService",
    route: "/app/connections",
    detail: "Capability, health, resync, reconnect and dependency impact",
  },
  {
    name: "PermissionService",
    route: "/app/settings/permissions",
    detail: "Purpose, retention, model use, notifications, authority and revocation",
  },
  {
    name: "MemoryService",
    route: "/app/memory",
    detail: "Provenance, confidence, correction, confirmation and deletion",
  },
  {
    name: "ActivityService",
    route: "/app/activity",
    detail: "Audit filters, recorded results, retry, reversal and mock export",
  },
  {
    name: "SettingsService",
    route: "/app/settings",
    detail: "Profile, places, notification policy, privacy and data controls",
  },
];

const permissionDimensions = [
  "Provider capability",
  "NEXUS read purpose",
  "Normalized-data retention",
  "Future model use",
  "Notification permission",
  "Action authority",
];

export default function TechnicalsPage() {
  return (
    <section className="technicals-page">
      <header className="technicals-heading">
        <p className="page-kicker">
          <span aria-hidden="true" />
          Inside NEXUS
        </p>
        <h1>Technicals, in one place.</h1>
        <p>
          Explore how the prototype behaves, what each recommendation is built
          from, and where the current product boundary sits. Everyday product
          views stay focused on daily use.
        </p>
      </header>

      <section className="technical-overview" aria-labelledby="boundary-heading">
        <div className="technical-section-heading">
          <div>
            <p className="section-kicker">Current build</p>
            <h2 id="boundary-heading">What is real, and what is simulated</h2>
          </div>
          <span>Phase 03 · Control and configuration</span>
        </div>

        <div className="technical-facts">
          {implementationFacts.map((fact) => (
            <div className="technical-fact" key={fact.label}>
              <span>{fact.label}</span>
              <strong>{fact.value}</strong>
              <small>{fact.detail}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="scenario-lab" aria-labelledby="coverage-matrix-heading">
        <div className="technical-section-heading">
          <div>
            <p className="section-kicker">Phase 4 coverage</p>
            <h2 id="coverage-matrix-heading">Route-to-state applicability matrix</h2>
          </div>
          <span>{ROUTE_STATE_COVERAGE.length} product experiences</span>
        </div>
        <p className="technical-boundary-note">
          Each row separates applicable state coverage from intentionally
          non-applicable conditions. Implemented states exactly cover the
          applicable cells.
        </p>
        <div
          className="state-coverage-table"
          role="table"
          aria-label="Phase 4 state coverage"
        >
          <div className="state-coverage-header" role="row">
            <span role="columnheader">Route</span>
            <span role="columnheader">Applicable and implemented</span>
            <span role="columnheader">Boundary and recovery</span>
          </div>
          {ROUTE_STATE_COVERAGE.map((entry) => (
            <div className="state-coverage-row" role="row" key={entry.route}>
              <span role="cell">
                <b>{entry.label}</b>
                <code>{entry.route}</code>
              </span>
              <span role="cell">
                <small>
                  {entry.implemented.length}/{entry.applicable.length} implemented
                </small>
                <span className="state-coverage-chips">
                  {entry.applicable.map((state) => (
                    <Link
                      key={state}
                      href={scenarioHref(
                        entry.route,
                        PHASE4_SCENARIO_BY_STATE[state],
                      )}
                    >
                      {state}
                    </Link>
                  ))}
                </span>
              </span>
              <span role="cell">
                <b>{entry.service}</b>
                <p>{entry.recovery}</p>
                {Object.keys(entry.nonApplicable).length ? (
                  <details>
                    <summary>Why some states do not apply</summary>
                    {Object.entries(entry.nonApplicable).map(([state, reason]) => (
                      <p key={state}>
                        <strong>{state}</strong> · {reason}
                      </p>
                    ))}
                  </details>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="scenario-lab" aria-labelledby="capture-boundary-heading">
        <div className="technical-section-heading">
          <div>
            <p className="section-kicker">Manual input boundary</p>
            <h2 id="capture-boundary-heading">
              Quick Capture composes four existing services
            </h2>
          </div>
          <span>Session-only · plain text · no clipboard read</span>
        </div>
        <div className="technical-permission-model">
          {[
            "NotesService",
            "TimelineService",
            "SettingsService",
            "ActivityService",
          ].map((service, index) => (
            <div key={service}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <b>{service}</b>
            </div>
          ))}
        </div>
        <p className="technical-boundary-note">
          The user pastes text manually. Deterministic parsing prepares an
          editable preview, ambiguous scheduling details stay unresolved, and
          an event requires explicit confirmation. Captured items reset with
          the scenario or browser session.
        </p>
      </section>

      <section className="scenario-lab" aria-labelledby="control-services-heading">
        <div className="technical-section-heading">
          <div>
            <p className="section-kicker">Phase 3 boundaries</p>
            <h2 id="control-services-heading">Six deterministic control services</h2>
          </div>
          <span>Stateful session mocks · no live providers</span>
        </div>

        <div className="phase2-service-list">
          {phaseThreeServices.map((service) => (
            <Link
              className="phase2-service-row"
              href={scenarioHref(service.route, "rain-and-traffic")}
              key={service.name}
            >
              <span aria-hidden="true" />
              <span>
                <strong>{service.name}</strong>
                <small>{service.detail}</small>
              </span>
              <b>Open route</b>
            </Link>
          ))}
        </div>
      </section>

      <section className="scenario-lab" aria-labelledby="permission-model-heading">
        <div className="technical-section-heading">
          <div>
            <p className="section-kicker">Action safety</p>
            <h2 id="permission-model-heading">One provider scope, six separate decisions</h2>
          </div>
          <span>Automatic Act unavailable by default</span>
        </div>
        <div className="technical-permission-model">
          {permissionDimensions.map((dimension, index) => (
            <div key={dimension}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <b>{dimension}</b>
            </div>
          ))}
        </div>
        <p className="technical-boundary-note">
          Connection health, permission changes, memory corrections, exports,
          deletions, dry-runs, retries, reversals, and action results are
          deterministic fixtures. No OAuth, provider SDK, database, model,
          notification service, or external tool is connected.
        </p>
      </section>

      <section className="scenario-lab" aria-labelledby="services-heading">
        <div className="technical-section-heading">
          <div>
            <p className="section-kicker">Provider-neutral boundaries</p>
            <h2 id="services-heading">Six deterministic services</h2>
          </div>
          <span>Typed contracts · isolated fixtures</span>
        </div>

        <div className="phase2-service-list">
          {phaseTwoServices.map((service) => (
            <Link
              className="phase2-service-row"
              href={scenarioHref(service.route, "rain-and-traffic")}
              key={service.name}
            >
              <span aria-hidden="true" />
              <span>
                <strong>{service.name}</strong>
                <small>{service.detail}</small>
              </span>
              <b>Open route →</b>
            </Link>
          ))}
        </div>
      </section>

      <section className="scenario-lab" aria-labelledby="scenario-heading">
        <div className="technical-section-heading">
          <div>
            <p className="section-kicker">Experience states</p>
            <h2 id="scenario-heading">See how the core product responds</h2>
          </div>
          <span>{TODAY_SCENARIOS.length} deterministic views</span>
        </div>

        <div className="scenario-list">
          {TODAY_SCENARIOS.map((scenario) => (
            <Link
              className="scenario-link"
              href={scenarioHref("/app/timeline", scenario.value)}
              key={scenario.value}
            >
              <i aria-hidden="true" />
              <span>
                <strong>{scenario.label}</strong>
                <small>{scenario.description}</small>
              </span>
              <b>
                Open Timeline <span aria-hidden="true">→</span>
              </b>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
