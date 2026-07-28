import type { Metadata } from "next";
import { Suspense } from "react";
import { OnboardingExperience } from "@/components/nexus/OnboardingExperience";

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Set up the profile and everyday preferences NEXUS may retain.",
};

export default function OnboardingPage() {
  return (
    <Suspense fallback={<main className="phase6-auth-state" aria-busy="true" />}>
      <OnboardingExperience />
    </Suspense>
  );
}
