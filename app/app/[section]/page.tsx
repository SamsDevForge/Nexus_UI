import Link from "next/link";
import { notFound } from "next/navigation";

const phaseTwoSections: Record<string, { title: string; description: string }> = {
  timeline: {
    title: "Timeline",
    description: "Calendar, travel, focus and preparation in one ordered view.",
  },
  insights: {
    title: "Insights",
    description: "Ranked recommendations with evidence, freshness and authority.",
  },
  nexus: {
    title: "NEXUS",
    description: "Context-aware explanations and prepared actions.",
  },
  knowledge: {
    title: "Knowledge",
    description: "Search and browse connected course material.",
  },
  automations: {
    title: "Automations",
    description: "Permissioned recipes, previews and run history.",
  },
  connections: {
    title: "Connections",
    description: "Provider access, granted capabilities and sync health.",
  },
  memory: {
    title: "Memory",
    description: "Inspect, correct and remove what NEXUS remembers.",
  },
  activity: {
    title: "Activity",
    description: "A human-readable record of reads, insights and actions.",
  },
  settings: {
    title: "Settings",
    description: "Profile, places, notification policy and privacy.",
  },
};

export default async function PhasePlaceholder({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const content = phaseTwoSections[section];

  if (!content) notFound();

  return (
    <section className="phase-placeholder">
      <span className="placeholder-index">Phase 01 / Foundation</span>
      <div className="placeholder-core" aria-hidden="true">
        <span />
      </div>
      <h1>{content.title}</h1>
      <p>{content.description}</p>
      <div className="placeholder-rule" />
      <p className="placeholder-note">
        Navigation is ready. This screen is intentionally reserved for its
        scheduled product phase.
      </p>
      <Link className="primary-button" href="/app/today">
        Return to Today
      </Link>
    </section>
  );
}
