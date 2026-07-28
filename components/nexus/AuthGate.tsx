"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useNexusAuth } from "@/lib/auth/AuthProvider";

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const auth = useNexusAuth();
  const returnTo = `${pathname}${searchParams.size ? `?${searchParams}` : ""}`;

  useEffect(() => {
    if (auth.mode !== "phase6-live" || auth.loading || !auth.configured) return;
    if (!auth.firebaseUser) {
      router.replace(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    if (auth.nexusUser && !auth.nexusUser.onboardingCompleted) {
      router.replace(`/onboarding?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [
    auth.configured,
    auth.firebaseUser,
    auth.loading,
    auth.mode,
    auth.nexusUser,
    returnTo,
    router,
  ]);

  if (auth.mode === "mock") return children;
  if (!auth.configured) {
    return (
      <main className="phase6-auth-state" tabIndex={-1}>
        <p className="section-kicker">Phase 6 live mode</p>
        <h1>Configuration required</h1>
        <p>{auth.error}</p>
      </main>
    );
  }
  if (auth.loading || (auth.firebaseUser && !auth.nexusUser)) {
    return (
      <main className="phase6-auth-state" aria-busy="true" tabIndex={-1}>
        <span className="phase6-auth-orbit" aria-hidden="true" />
        <p className="section-kicker">Verifying identity</p>
        <h1>Opening your NEXUS.</h1>
        <p>Your private context stays closed until identity verification completes.</p>
      </main>
    );
  }
  if (!auth.firebaseUser || !auth.nexusUser?.onboardingCompleted) return null;
  return children;
}
