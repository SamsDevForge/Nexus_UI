"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import type { OnboardingPayload } from "@/lib/api/contracts";
import { useNexusAuth } from "@/lib/auth/AuthProvider";

const steps = ["Why", "Profile", "Places", "Preferences", "Review"] as const;
const timezoneOptions = [
  ["Asia/Kolkata", "Asia/Kolkata · IST"],
  ["Asia/Singapore", "Asia/Singapore · SGT"],
  ["Europe/London", "Europe/London · GMT/BST"],
] as const;

interface PlaceDraft {
  label: "Home" | "Campus" | "Work";
  address: string;
}

function initialPayload(): OnboardingPayload {
  return {
    profile: {
      displayName: "",
      timezone: "Asia/Kolkata",
      locale: "en-IN",
    },
    places: [],
    preferences: {
      notifications: {
        style: "balanced",
        inApp: true,
        emailDigest: false,
        devicePush: false,
        morningBriefAt: "07:30",
        eveningBriefAt: "20:30",
        quietHours: {
          enabled: true,
          startsAt: "22:30",
          endsAt: "07:00",
        },
      },
      personalization: {
        conciseExplanations: true,
        learnFromFeedback: true,
        preferredTravelMode: "transit",
      },
      privacy: {
        observationPaused: false,
        automationsPaused: false,
        defaultRetention: "30-days",
        futureModelUse: "allowed-for-purpose",
      },
      accessibility: {
        reducedMotion: false,
        highContrast: false,
        largerText: false,
      },
    },
  };
}

export function OnboardingExperience() {
  const auth = useNexusAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(0);
  const [payload, setPayload] = useState(initialPayload);
  const [places, setPlaces] = useState<PlaceDraft[]>([
    { label: "Home", address: "" },
    { label: "Campus", address: "" },
    { label: "Work", address: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const returnTo = searchParams.get("returnTo");
  const destination = returnTo?.startsWith("/app/") ? returnTo : "/app/today";

  const resolvedPayload = useMemo<OnboardingPayload>(
    () => ({
      ...payload,
      profile: {
        ...payload.profile,
        displayName:
          payload.profile.displayName.trim() ||
          auth.nexusUser?.displayName ||
          auth.firebaseUser?.displayName ||
          "",
      },
      places: places
        .filter((place) => place.address.trim())
        .map((place, index) => ({
          label: place.label,
          address: place.address.trim(),
          role: place.label.toLowerCase() as "home" | "campus" | "work",
          travelMode: payload.preferences.personalization.preferredTravelMode,
          latitude: null,
          longitude: null,
          isDefaultOrigin: index === 0,
        })),
    }),
    [
      auth.firebaseUser?.displayName,
      auth.nexusUser?.displayName,
      payload,
      places,
    ],
  );

  const moveTo = (next: number) => {
    setStep(Math.min(Math.max(next, 0), steps.length - 1));
    window.requestAnimationFrame(() => headingRef.current?.focus());
  };

  const complete = async () => {
    if (!resolvedPayload.profile.displayName.trim()) {
      setFeedback("Add the name NEXUS should use.");
      moveTo(1);
      return;
    }
    setSaving(true);
    setFeedback("");
    try {
      if (auth.mode === "phase6-live") {
        await auth.completeOnboarding(resolvedPayload);
      }
      router.replace(destination);
    } catch (reason) {
      setFeedback(
        reason instanceof Error
          ? reason.message
          : "NEXUS could not save onboarding. Nothing was claimed as persisted.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (auth.mode === "phase6-live" && !auth.firebaseUser && !auth.loading) {
    return (
      <main className="phase6-auth-state">
        <p className="section-kicker">Identity required</p>
        <h1>Sign in before creating a private profile.</h1>
        <Link className="primary-button" href="/sign-in">
          Go to sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="onboarding-page">
      <aside className="onboarding-progress" aria-label="Onboarding progress">
        <Link href="/" className="onboarding-wordmark">NEXUS <b>AI</b></Link>
        <ol>
          {steps.map((label, index) => (
            <li key={label} className={index === step ? "is-current" : index < step ? "is-complete" : ""}>
              <span>{index + 1}</span>
              <b>{label}</b>
            </li>
          ))}
        </ol>
        <p>Only the values you review are saved. Connections come later.</p>
      </aside>

      <section className="onboarding-stage">
        <header>
          <p className="section-kicker">Step {step + 1} of {steps.length}</p>
          <h1 ref={headingRef} tabIndex={-1}>
            {step === 0 && "Start with usefulness, not permissions."}
            {step === 1 && "Name your local context."}
            {step === 2 && "Add only the places that help."}
            {step === 3 && "Choose calm defaults."}
            {step === 4 && "Review what NEXUS will retain."}
          </h1>
        </header>

        {step === 0 ? (
          <div className="onboarding-value">
            <p>
              NEXUS uses your timezone, travel preference, quiet hours, and
              optional places to make deterministic timing and interruption
              decisions. This step requests no Calendar, Gmail, Notion, Teams,
              Maps, weather, location, or notification permission.
            </p>
            <div>
              <span><b>Identity</b><small>Verified with Firebase</small></span>
              <span><b>Control</b><small>Editable in Settings</small></span>
              <span><b>Scope</b><small>Profile data only</small></span>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="onboarding-form">
            <label>
              <span>Display name</span>
              <input
                autoComplete="name"
                value={payload.profile.displayName}
                placeholder={auth.firebaseUser?.displayName ?? "Aadi"}
                onChange={(event) =>
                  setPayload((current) => ({
                    ...current,
                    profile: { ...current.profile, displayName: event.target.value },
                  }))
                }
              />
            </label>
            <label>
              <span>IANA timezone</span>
              <select
                value={payload.profile.timezone}
                onChange={(event) =>
                  setPayload((current) => ({
                    ...current,
                    profile: { ...current.profile, timezone: event.target.value },
                  }))
                }
              >
                {timezoneOptions.map(([value, label]) => (
                  <option value={value} key={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Locale</span>
              <select
                value={payload.profile.locale}
                onChange={(event) =>
                  setPayload((current) => ({
                    ...current,
                    profile: { ...current.profile, locale: event.target.value },
                  }))
                }
              >
                <option value="en-IN">English · India</option>
                <option value="en-SG">English · Singapore</option>
                <option value="en-GB">English · United Kingdom</option>
              </select>
            </label>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="onboarding-places">
            <p>Type a place or address manually. NEXUS does not geocode it in Phase 6.</p>
            {places.map((place, index) => (
              <label key={place.label}>
                <span>{place.label} <small>Optional</small></span>
                <input
                  value={place.address}
                  placeholder={
                    place.label === "Home"
                      ? "Koramangala, Bengaluru"
                      : place.label === "Campus"
                        ? "Engineering campus"
                        : "Office or studio"
                  }
                  onChange={(event) =>
                    setPlaces((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, address: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </label>
            ))}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="onboarding-form onboarding-preferences">
            <label>
              <span>Preferred travel mode</span>
              <select
                value={payload.preferences.personalization.preferredTravelMode}
                onChange={(event) =>
                  setPayload((current) => ({
                    ...current,
                    preferences: {
                      ...current.preferences,
                      personalization: {
                        ...current.preferences.personalization,
                        preferredTravelMode: event.target.value as "walk" | "cycle" | "transit" | "drive",
                      },
                    },
                  }))
                }
              >
                <option value="walk">Walk</option>
                <option value="cycle">Cycle</option>
                <option value="transit">Public transit</option>
                <option value="drive">Drive</option>
              </select>
            </label>
            <div className="onboarding-time-pair">
              <label>
                <span>Quiet hours start</span>
                <input
                  type="time"
                  value={payload.preferences.notifications.quietHours.startsAt}
                  onChange={(event) =>
                    setPayload((current) => ({
                      ...current,
                      preferences: {
                        ...current.preferences,
                        notifications: {
                          ...current.preferences.notifications,
                          quietHours: {
                            ...current.preferences.notifications.quietHours,
                            startsAt: event.target.value,
                          },
                        },
                      },
                    }))
                  }
                />
              </label>
              <label>
                <span>Quiet hours end</span>
                <input
                  type="time"
                  value={payload.preferences.notifications.quietHours.endsAt}
                  onChange={(event) =>
                    setPayload((current) => ({
                      ...current,
                      preferences: {
                        ...current.preferences,
                        notifications: {
                          ...current.preferences.notifications,
                          quietHours: {
                            ...current.preferences.notifications.quietHours,
                            endsAt: event.target.value,
                          },
                        },
                      },
                    }))
                  }
                />
              </label>
            </div>
            <label>
              <span>Interruption style</span>
              <select
                value={payload.preferences.notifications.style}
                onChange={(event) =>
                  setPayload((current) => ({
                    ...current,
                    preferences: {
                      ...current.preferences,
                      notifications: {
                        ...current.preferences.notifications,
                        style: event.target.value as "essential" | "balanced" | "proactive",
                      },
                    },
                  }))
                }
              >
                <option value="essential">Essential only</option>
                <option value="balanced">Balanced</option>
                <option value="proactive">Proactive</option>
              </select>
            </label>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="onboarding-review">
            <dl>
              <div><dt>Profile</dt><dd>{resolvedPayload.profile.displayName || "Name required"} · {resolvedPayload.profile.timezone}</dd></div>
              <div><dt>Places</dt><dd>{resolvedPayload.places.length ? resolvedPayload.places.map((place) => place.label).join(", ") : "None yet"}</dd></div>
              <div><dt>Travel</dt><dd>{resolvedPayload.preferences.personalization.preferredTravelMode}</dd></div>
              <div><dt>Quiet hours</dt><dd>{resolvedPayload.preferences.notifications.quietHours.startsAt}–{resolvedPayload.preferences.notifications.quietHours.endsAt}</dd></div>
              <div><dt>Authority</dt><dd>Suggestion and preparation only</dd></div>
            </dl>
            <p>
              No external productivity connection is authorized by completing
              this setup.
            </p>
          </div>
        ) : null}

        {feedback ? <p className="identity-feedback is-error" role="alert">{feedback}</p> : null}

        <footer className="onboarding-actions">
          <button type="button" disabled={step === 0 || saving} onClick={() => moveTo(step - 1)}>
            Back
          </button>
          {step < steps.length - 1 ? (
            <button className="primary-button" type="button" onClick={() => moveTo(step + 1)}>
              Continue
            </button>
          ) : (
            <button className="primary-button" type="button" disabled={saving} onClick={() => void complete()}>
              {saving ? "Saving…" : auth.mode === "mock" ? "Enter mock workspace" : "Save and enter NEXUS"}
            </button>
          )}
        </footer>
      </section>
    </main>
  );
}
