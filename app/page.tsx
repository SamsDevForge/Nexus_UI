import type { Metadata } from "next";
import { LandingEntryAction } from "./LandingEntryAction";
import { LandingExperienceClient } from "./LandingExperienceClient";

export const metadata: Metadata = {
  title: "NEXUS AI — Predictive Personal Intelligence",
  description:
    "The AI that knows what you need before you ask. A cinematic preview of predictive personal intelligence.",
};

export default function Home() {
  return (
    <>
      <LandingExperienceClient />
      <LandingEntryAction />
    </>
  );
}
