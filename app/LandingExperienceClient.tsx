"use client";

import dynamic from "next/dynamic";

const ClientNexusExperience = dynamic(
  () =>
    import("./NexusExperience").then(
      ({ NexusExperience }) => NexusExperience,
    ),
  {
    ssr: false,
    loading: () => (
      <main className="scene" aria-busy="true">
        <span className="sr-only">Loading the NEXUS experience</span>
      </main>
    ),
  },
);

export function LandingExperienceClient() {
  return <ClientNexusExperience />;
}
