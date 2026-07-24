import type { Metadata } from "next";
import { NexusExperience } from "./NexusExperience";

export const metadata: Metadata = {
  title: "NEXUS AI — Predictive Personal Intelligence",
  description:
    "The AI that knows what you need before you ask. A cinematic preview of predictive personal intelligence.",
};

export default function Home() {
  return <NexusExperience />;
}
