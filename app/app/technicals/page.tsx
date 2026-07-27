import type { Metadata } from "next";
import Link from "next/link";
import { TODAY_SCENARIOS } from "@/lib/mocks/today-fixtures";
import { scenarioHref } from "@/lib/mocks/phase2-fixtures";

export const metadata: Metadata = {
  title: "Technicals",
  description:
    "Explore NEXUS prototype states, data boundaries and mocked capabilities.",
};

const implementationFacts = [
  {
    label: "Decision data",
    value: "Seven typed core snapshots",
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
    detail: "Phase 2 mock boundary",
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
          <span>Phase 02 · Core product experience</span>
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
