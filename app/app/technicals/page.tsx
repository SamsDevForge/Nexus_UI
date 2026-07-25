import type { Metadata } from "next";
import Link from "next/link";
import { TODAY_SCENARIOS } from "@/lib/mocks/today-fixtures";

export const metadata: Metadata = {
  title: "Technicals",
  description:
    "Explore NEXUS prototype states, data boundaries and mocked capabilities.",
};

const implementationFacts = [
  {
    label: "Decision data",
    value: "Typed Today snapshots",
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
    detail: "Phase 1",
  },
  {
    label: "External actions",
    value: "Previewed, never executed",
    detail: "Safe by default",
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
          from, and where the current product boundary sits. The everyday Today
          view stays focused on your day.
        </p>
      </header>

      <section className="technical-overview" aria-labelledby="boundary-heading">
        <div className="technical-section-heading">
          <div>
            <p className="section-kicker">Current build</p>
            <h2 id="boundary-heading">What is real, and what is simulated</h2>
          </div>
          <span>Phase 01 · UI foundation</span>
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

      <section className="scenario-lab" aria-labelledby="scenario-heading">
        <div className="technical-section-heading">
          <div>
            <p className="section-kicker">Experience states</p>
            <h2 id="scenario-heading">See how Today responds</h2>
          </div>
          <span>{TODAY_SCENARIOS.length} deterministic views</span>
        </div>

        <div className="scenario-list">
          {TODAY_SCENARIOS.map((scenario) => (
            <Link
              className="scenario-link"
              href={`/app/today?scenario=${scenario.value}`}
              key={scenario.value}
            >
              <i aria-hidden="true" />
              <span>
                <strong>{scenario.label}</strong>
                <small>{scenario.description}</small>
              </span>
              <b>
                Open Today <span aria-hidden="true">→</span>
              </b>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
