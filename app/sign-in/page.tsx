import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInExperience } from "@/components/nexus/SignInExperience";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the private NEXUS AI product experience.",
};

export default function SignInPage() {
  return (
    <Suspense fallback={<main className="phase6-auth-state" aria-busy="true" />}>
      <SignInExperience />
    </Suspense>
  );
}
