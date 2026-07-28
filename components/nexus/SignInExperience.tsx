"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useNexusAuth } from "@/lib/auth/AuthProvider";

export function SignInExperience() {
  const searchParams = useSearchParams();
  const auth = useNexusAuth();
  const returnTo = searchParams.get("returnTo") ?? "/app/today";

  return (
    <main className="identity-page">
      <div className="identity-atmosphere" aria-hidden="true">
        <span />
        <i />
      </div>
      <section className="identity-panel" aria-labelledby="sign-in-title">
        <Link className="identity-brand" href="/" aria-label="NEXUS AI landing page">
          <span>
            <Image src="/nexus-logo.svg" alt="" fill sizes="32px" priority unoptimized />
          </span>
          NEXUS <b>AI</b>
        </Link>

        <div className="identity-copy">
          <p className="section-kicker">Private context, verified first</p>
          <h1 id="sign-in-title">Your day stays yours.</h1>
          <p>
            Sign in to retain your profile, places, preferences, and reviewed
            Quick Capture items. Identity sign-in does not grant Gmail,
            Calendar, Notion, Maps, or Teams access.
          </p>
        </div>

        <div className="identity-boundary" aria-label="Identity boundary">
          <span aria-hidden="true" />
          <div>
            <b>One purpose</b>
            <p>Google verifies who you are. Later connections request separate, revocable access.</p>
          </div>
        </div>

        {auth.error ? (
          <p className="identity-feedback is-error" role="alert">
            {auth.error}
          </p>
        ) : null}

        {auth.mode === "mock" ? (
          <div className="identity-actions">
            <Link className="primary-button" href={returnTo.startsWith("/app/") ? returnTo : "/app/today"}>
              Enter mock workspace
            </Link>
            <small>Mock mode uses no account, network, or durable storage.</small>
          </div>
        ) : (
          <div className="identity-actions">
            <button
              className="primary-button identity-google-button"
              type="button"
              disabled={auth.loading || !auth.configured}
              onClick={() => void auth.signIn(returnTo)}
            >
              {auth.loading ? "Verifying…" : "Continue with Google"}
            </button>
            <small>Only basic identity information is requested.</small>
          </div>
        )}

        <footer className="identity-footer">
          <Link href="/">Back to the landing page</Link>
          <span>Phase 6 identity foundation</span>
        </footer>
      </section>
    </main>
  );
}
