"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  MockDeletionRequest,
  NotificationPolicy,
  SettingsSnapshot,
  UserPreferences,
} from "@/lib/domain/contracts";
import { createMockPhase3Services } from "@/lib/mocks/mock-phase3-services";
import { scenarioHref } from "@/lib/mocks/phase2-fixtures";
import { InterfaceAssetIcon } from "@/components/nexus/InterfaceAssetIcon";
import type { SettingsSection } from "@/lib/services/settings-service";
import {
  ControlDialog,
  ControlHeader,
  ControlNotice,
  ControlToggle,
  ImpactList,
} from "./Phase3Shared";

type SettingsView = SettingsSection | "data";

const settingsSections: ReadonlyArray<{
  id: SettingsView;
  label: string;
  description: string;
}> = [
  { id: "profile", label: "Profile", description: "Identity and timezone" },
  { id: "places", label: "Places", description: "Travel defaults" },
  {
    id: "notifications",
    label: "Notifications",
    description: "Timing and interruption",
  },
  {
    id: "personalization",
    label: "Personalization",
    description: "Explanation preferences",
  },
  { id: "privacy", label: "Privacy", description: "Observation and retention" },
  {
    id: "accessibility",
    label: "Accessibility",
    description: "Motion, contrast, and text",
  },
  { id: "data", label: "Data and account", description: "Export and deletion" },
];

export function SettingsExperience({
  initialSnapshot,
}: {
  initialSnapshot: SettingsSnapshot;
}) {
  const services = useMemo(
    () => createMockPhase3Services(initialSnapshot.scenario),
    [initialSnapshot.scenario],
  );
  const service = services.settingsService;
  const [preferences, setPreferences] = useState(initialSnapshot.preferences);
  const [section, setSection] = useState<SettingsView>("profile");
  const [dialog, setDialog] = useState<
    "notification" | "export" | "delete-source" | "delete-account" | null
  >(null);
  const [notificationPreview, setNotificationPreview] = useState<{
    title: string;
    body: string;
    delivery: string;
  } | null>(null);
  const [deletion, setDeletion] = useState<MockDeletionRequest | null>(null);
  const [feedback, setFeedback] = useState("");

  const updatePreferences = (update: Partial<UserPreferences>) => {
    setPreferences((current) => ({ ...current, ...update }));
  };

  const saveSection = async (
    target: SettingsSection,
    update: Partial<UserPreferences>,
  ) => {
    const next = await service.saveSection(target, update);
    setPreferences(next);
    setFeedback(`${settingsSections.find((item) => item.id === target)?.label} saved.`);
  };

  const resetSection = async (target: SettingsSection) => {
    const next = await service.resetSection(target);
    setPreferences(next);
    setFeedback(`${settingsSections.find((item) => item.id === target)?.label} reset.`);
  };

  return (
    <div
      className={
        initialSnapshot.scenario === "reduced-motion"
          ? "control-page settings-page is-reduced"
          : "control-page settings-page"
      }
    >
      <ControlHeader
        kicker="Behaviour and privacy"
        title="Make NEXUS fit your life."
        summary={initialSnapshot.summary}
        action={
          <Link
            className="secondary-button"
            href={scenarioHref(
              "/app/settings/permissions",
              initialSnapshot.scenario,
            )}
          >
            Permission Centre
          </Link>
        }
      />
      <ControlNotice
        notice={initialSnapshot.notice}
        tone={initialSnapshot.viewState === "error" ? "danger" : "warning"}
      />

      <section className="control-hero settings-hero" aria-labelledby="settings-summary">
        <div className="control-hero-copy">
          <p className="section-kicker">Current behaviour</p>
          <h2 id="settings-summary">
            Balanced notifications. Quiet after{" "}
            {preferences.notifications.quietHours.startsAt}.
          </h2>
          <p>
            Profile and convenience preferences stay separate from permission,
            privacy, export, and deletion controls.
          </p>
        </div>
        <div className="settings-compass" aria-hidden="true">
          <span />
          <i />
        </div>
        <div className="control-hero-metrics">
          <span><b>{preferences.timezone}</b>Timezone</span>
          <span><b>{preferences.notifications.style}</b>Notification style</span>
          <span>
            <b>{preferences.privacy.observationPaused ? "Paused" : "Observing"}</b>
            Privacy state
          </span>
        </div>
      </section>

      {feedback ? <p className="control-feedback" role="status">{feedback}</p> : null}

      <div className="settings-workspace">
        <nav className="settings-nav" aria-label="Settings sections">
          {settingsSections.map((item) => (
            <button
              type="button"
              key={item.id}
              className={section === item.id ? "is-active" : undefined}
              aria-current={section === item.id ? "page" : undefined}
              onClick={() => setSection(item.id)}
            >
              <span aria-hidden="true" />
              <span>
                <b>{item.label}</b>
                <small>{item.description}</small>
              </span>
            </button>
          ))}
        </nav>

        <section className="settings-content" aria-live="polite">
          {section === "profile" ? (
            <>
              <header className="settings-section-heading">
                <div>
                  <p className="section-kicker">Profile and timezone</p>
                  <h2>How NEXUS addresses your day</h2>
                  <p>Used for display and deterministic time calculations only.</p>
                </div>
              </header>
              <div className="settings-form">
                <label className="control-field">
                  <span>Display name</span>
                  <input
                    value={preferences.displayName}
                    onChange={(event) =>
                      updatePreferences({ displayName: event.target.value })
                    }
                  />
                </label>
                <label className="control-field">
                  <span>Timezone</span>
                  <select
                    value={preferences.timezone}
                    onChange={(event) =>
                      updatePreferences({ timezone: event.target.value })
                    }
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata · IST</option>
                    <option value="Asia/Singapore">Asia/Singapore · SGT</option>
                    <option value="Europe/London">Europe/London · GMT/BST</option>
                  </select>
                </label>
                <label className="control-field">
                  <span>Locale</span>
                  <select
                    value={preferences.locale}
                    onChange={(event) =>
                      updatePreferences({ locale: event.target.value })
                    }
                  >
                    <option value="en-IN">English · India</option>
                    <option value="en-GB">English · United Kingdom</option>
                    <option value="en-US">English · United States</option>
                  </select>
                </label>
              </div>
              <SettingsActions
                onSave={() =>
                  saveSection("profile", {
                    displayName: preferences.displayName,
                    timezone: preferences.timezone,
                    locale: preferences.locale,
                  })
                }
                onReset={() => resetSection("profile")}
              />
            </>
          ) : null}

          {section === "places" ? (
            <>
              <header className="settings-section-heading">
                <div>
                  <p className="section-kicker">Important places</p>
                  <h2>Routes without a location trail</h2>
                  <p>
                    Saved labels support preparation. Continuous precise history
                    is not represented or retained.
                  </p>
                </div>
              </header>
              <div className="place-list">
                {preferences.places.map((place) => (
                  <div key={place.id}>
                    <span className="place-node" aria-hidden="true" />
                    <label className="control-field">
                      <span>Label</span>
                      <input
                        value={place.label}
                        onChange={(event) =>
                          updatePreferences({
                            places: preferences.places.map((item) =>
                              item.id === place.id
                                ? { ...item, label: event.target.value }
                                : item,
                            ),
                          })
                        }
                      />
                    </label>
                    <label className="control-field">
                      <span>General area</span>
                      <input
                        value={place.address}
                        onChange={(event) =>
                          updatePreferences({
                            places: preferences.places.map((item) =>
                              item.id === place.id
                                ? { ...item, address: event.target.value }
                                : item,
                            ),
                          })
                        }
                      />
                    </label>
                    <label className="control-field">
                      <span>Travel mode</span>
                      <select
                        value={place.travelMode}
                        onChange={(event) =>
                          updatePreferences({
                            places: preferences.places.map((item) =>
                              item.id === place.id
                                ? {
                                    ...item,
                                    travelMode: event.target
                                      .value as typeof place.travelMode,
                                  }
                                : item,
                            ),
                          })
                        }
                      >
                        <option value="walk">Walk</option>
                        <option value="cycle">Cycle</option>
                        <option value="transit">Transit</option>
                        <option value="drive">Drive</option>
                      </select>
                    </label>
                  </div>
                ))}
              </div>
              <SettingsActions
                onSave={() => saveSection("places", { places: preferences.places })}
                onReset={() => resetSection("places")}
              />
            </>
          ) : null}

          {section === "notifications" ? (
            <>
              <header className="settings-section-heading">
                <div>
                  <p className="section-kicker">Notification policy</p>
                  <h2>Interrupt only when it helps</h2>
                  <p>
                    Channels, style, quiet hours, and brief schedules remain
                    independent from source notification permission.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setNotificationPreview(
                      await service.previewNotification(
                        preferences.notifications,
                      ),
                    );
                    setDialog("notification");
                  }}
                >
                  Preview behaviour
                </button>
              </header>
              <div className="settings-form settings-form-wide">
                <label className="control-field">
                  <span>Interruption style</span>
                  <select
                    value={preferences.notifications.style}
                    onChange={(event) =>
                      updatePreferences({
                        notifications: {
                          ...preferences.notifications,
                          style: event.target
                            .value as NotificationPolicy["style"],
                        },
                      })
                    }
                  >
                    <option value="essential">Essential only</option>
                    <option value="balanced">Balanced</option>
                    <option value="proactive">More proactive</option>
                  </select>
                </label>
                <ControlToggle
                  checked={preferences.notifications.inApp}
                  label="In-app"
                  description="Keep useful insights visible in NEXUS."
                  onChange={(inApp) =>
                    updatePreferences({
                      notifications: { ...preferences.notifications, inApp },
                    })
                  }
                />
                <ControlToggle
                  checked={preferences.notifications.emailDigest}
                  label="Email digest"
                  description="Future daily digest; no email is sent in Phase 3."
                  onChange={(emailDigest) =>
                    updatePreferences({
                      notifications: {
                        ...preferences.notifications,
                        emailDigest,
                      },
                    })
                  }
                />
                <ControlToggle
                  checked={preferences.notifications.devicePush}
                  label="Device push"
                  description="Future channel; not connected in Phase 3."
                  onChange={(devicePush) =>
                    updatePreferences({
                      notifications: {
                        ...preferences.notifications,
                        devicePush,
                      },
                    })
                  }
                />
              </div>
              <div className="quiet-hours-block">
                <ControlToggle
                  checked={preferences.notifications.quietHours.enabled}
                  label="Quiet hours"
                  description="Hold non-essential notifications."
                  onChange={(enabled) =>
                    updatePreferences({
                      notifications: {
                        ...preferences.notifications,
                        quietHours: {
                          ...preferences.notifications.quietHours,
                          enabled,
                        },
                      },
                    })
                  }
                />
                <label className="control-field">
                  <span>Starts</span>
                  <input
                    type="time"
                    value={preferences.notifications.quietHours.startsAt}
                    onChange={(event) =>
                      updatePreferences({
                        notifications: {
                          ...preferences.notifications,
                          quietHours: {
                            ...preferences.notifications.quietHours,
                            startsAt: event.target.value,
                          },
                        },
                      })
                    }
                  />
                </label>
                <label className="control-field">
                  <span>Ends</span>
                  <input
                    type="time"
                    value={preferences.notifications.quietHours.endsAt}
                    onChange={(event) =>
                      updatePreferences({
                        notifications: {
                          ...preferences.notifications,
                          quietHours: {
                            ...preferences.notifications.quietHours,
                            endsAt: event.target.value,
                          },
                        },
                      })
                    }
                  />
                </label>
              </div>
              <div className="brief-schedule">
                <label className="control-field">
                  <span>Morning brief</span>
                  <input
                    type="time"
                    value={preferences.notifications.morningBriefAt}
                    onChange={(event) =>
                      updatePreferences({
                        notifications: {
                          ...preferences.notifications,
                          morningBriefAt: event.target.value,
                        },
                      })
                    }
                  />
                </label>
                <label className="control-field">
                  <span>Evening preparation</span>
                  <input
                    type="time"
                    value={preferences.notifications.eveningBriefAt}
                    onChange={(event) =>
                      updatePreferences({
                        notifications: {
                          ...preferences.notifications,
                          eveningBriefAt: event.target.value,
                        },
                      })
                    }
                  />
                </label>
              </div>
              <SettingsActions
                onSave={() =>
                  saveSection("notifications", {
                    notifications: preferences.notifications,
                  })
                }
                onReset={() => resetSection("notifications")}
              />
            </>
          ) : null}

          {section === "personalization" ? (
            <>
              <header className="settings-section-heading">
                <div>
                  <p className="section-kicker">Personalization</p>
                  <h2>Preference, not hidden authority</h2>
                  <p>
                    Feedback may change ranking and wording. It never silently
                    expands permissions or action authority.
                  </p>
                </div>
              </header>
              <div className="settings-toggle-list">
                <ControlToggle
                  checked={preferences.personalization.conciseExplanations}
                  label="Concise explanations"
                  description="Lead with the decision, then reveal evidence."
                  onChange={(conciseExplanations) =>
                    updatePreferences({
                      personalization: {
                        ...preferences.personalization,
                        conciseExplanations,
                      },
                    })
                  }
                />
                <ControlToggle
                  checked={preferences.personalization.learnFromFeedback}
                  label="Learn from explicit feedback"
                  description="Use helpful, incorrect, early, and late feedback for timing."
                  onChange={(learnFromFeedback) =>
                    updatePreferences({
                      personalization: {
                        ...preferences.personalization,
                        learnFromFeedback,
                      },
                    })
                  }
                />
                <label className="control-field">
                  <span>Preferred travel mode</span>
                  <select
                    value={preferences.personalization.preferredTravelMode}
                    onChange={(event) =>
                      updatePreferences({
                        personalization: {
                          ...preferences.personalization,
                          preferredTravelMode: event.target.value as UserPreferences["personalization"]["preferredTravelMode"],
                        },
                      })
                    }
                  >
                    <option value="walk">Walk</option>
                    <option value="cycle">Cycle</option>
                    <option value="transit">Transit</option>
                    <option value="drive">Drive</option>
                  </select>
                </label>
              </div>
              <SettingsActions
                onSave={() =>
                  saveSection("personalization", {
                    personalization: preferences.personalization,
                  })
                }
                onReset={() => resetSection("personalization")}
              />
            </>
          ) : null}

          {section === "privacy" ? (
            <>
              <header className="settings-section-heading">
                <div>
                  <p className="section-kicker">Privacy and retention</p>
                  <h2>Global stops and conservative defaults</h2>
                  <p>
                    These global controls complement—not replace—each explicit
                    permission in the Permission Centre.
                  </p>
                </div>
              </header>
              <div className="privacy-settings">
                <ControlToggle
                  checked={preferences.privacy.observationPaused}
                  danger
                  label="Pause observation"
                  description="Stop new reads across all permitted sources."
                  onChange={(observationPaused) =>
                    updatePreferences({
                      privacy: { ...preferences.privacy, observationPaused },
                    })
                  }
                />
                <ControlToggle
                  checked={preferences.privacy.automationsPaused}
                  danger
                  label="Pause all automations"
                  description="Emergency policy gate for proactive behaviour."
                  onChange={(automationsPaused) =>
                    updatePreferences({
                      privacy: { ...preferences.privacy, automationsPaused },
                    })
                  }
                />
                <label className="control-field">
                  <span>Default normalized-data retention</span>
                  <select
                    value={preferences.privacy.defaultRetention}
                    onChange={(event) =>
                      updatePreferences({
                        privacy: {
                          ...preferences.privacy,
                          defaultRetention: event.target.value as UserPreferences["privacy"]["defaultRetention"],
                        },
                      })
                    }
                  >
                    <option value="none">Do not retain</option>
                    <option value="working-context">Working context only</option>
                    <option value="30-days">30 days</option>
                    <option value="until-disconnected">Until disconnected</option>
                  </select>
                </label>
                <label className="control-field">
                  <span>Future model-use default</span>
                  <select
                    value={preferences.privacy.futureModelUse}
                    onChange={(event) =>
                      updatePreferences({
                        privacy: {
                          ...preferences.privacy,
                          futureModelUse: event.target.value as UserPreferences["privacy"]["futureModelUse"],
                        },
                      })
                    }
                  >
                    <option value="never">Never</option>
                    <option value="allowed-for-purpose">Only for an explicit purpose</option>
                  </select>
                </label>
                <Link
                  className="settings-related-link"
                  href={scenarioHref(
                    "/app/settings/permissions",
                    initialSnapshot.scenario,
                  )}
                >
                  Review each permission dimension
                </Link>
              </div>
              <SettingsActions
                onSave={() =>
                  saveSection("privacy", { privacy: preferences.privacy })
                }
                onReset={() => resetSection("privacy")}
              />
            </>
          ) : null}

          {section === "accessibility" ? (
            <>
              <header className="settings-section-heading">
                <div>
                  <p className="section-kicker">Appearance and accessibility</p>
                  <h2>Clarity without relying on motion</h2>
                  <p>
                    Core meaning remains available through labels, hierarchy,
                    contrast, and focus—not animation alone.
                  </p>
                </div>
              </header>
              <div className="settings-toggle-list">
                <ControlToggle
                  checked={preferences.accessibility.reducedMotion}
                  label="Reduced motion"
                  description="Stop continuous product motion and use calm transitions."
                  onChange={(reducedMotion) =>
                    updatePreferences({
                      accessibility: {
                        ...preferences.accessibility,
                        reducedMotion,
                      },
                    })
                  }
                />
                <ControlToggle
                  checked={preferences.accessibility.highContrast}
                  label="Higher contrast"
                  description="Increase surface and control separation."
                  onChange={(highContrast) =>
                    updatePreferences({
                      accessibility: {
                        ...preferences.accessibility,
                        highContrast,
                      },
                    })
                  }
                />
                <ControlToggle
                  checked={preferences.accessibility.largerText}
                  label="Larger product text"
                  description="Increase body and control text without changing hierarchy."
                  onChange={(largerText) =>
                    updatePreferences({
                      accessibility: {
                        ...preferences.accessibility,
                        largerText,
                      },
                    })
                  }
                />
              </div>
              <SettingsActions
                onSave={() =>
                  saveSection("accessibility", {
                    accessibility: preferences.accessibility,
                  })
                }
                onReset={() => resetSection("accessibility")}
              />
            </>
          ) : null}

          {section === "data" ? (
            <>
              <header className="settings-section-heading">
                <div>
                  <p className="section-kicker">Data and account</p>
                  <h2>Export, remove, or leave</h2>
                  <p>
                    These are deterministic mock surfaces. No real archive,
                    provider deletion, or account deletion occurs in Phase 3.
                  </p>
                </div>
              </header>
              <div className="data-control-list">
                <div>
                  <InterfaceAssetIcon
                    kind="download"
                    className="data-transfer-glyph"
                    size={26}
                  />
                  <span>
                    <b>Export NEXUS data</b>
                    <p>Prepare a mock manifest of profile, memory, permissions, and activity.</p>
                  </span>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={async () => {
                      const result = await service.requestExport();
                      setFeedback(result.summary);
                      setDialog("export");
                    }}
                  >
                    <InterfaceAssetIcon
                      kind="download"
                      className="button-transfer-icon"
                      size={16}
                    />
                    Request export
                  </button>
                </div>
                <div>
                  <span className="data-control-glyph" aria-hidden="true" />
                  <span>
                    <b>Delete source-derived data</b>
                    <p>Remove normalized records and inferred memory while keeping profile settings.</p>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDeletion(null);
                      setDialog("delete-source");
                    }}
                  >
                    Review deletion
                  </button>
                </div>
              </div>
              <div className="danger-zone">
                <p className="section-kicker">Irreversible account control</p>
                <div>
                  <span>
                    <b>Delete demo account</b>
                    <p>Clear profile, memories, permissions, and activity fixtures.</p>
                  </span>
                  <button
                    className="destructive-button"
                    type="button"
                    onClick={() => {
                      setDeletion(null);
                      setDialog("delete-account");
                    }}
                  >
                    Review account deletion
                  </button>
                </div>
              </div>
              <div className="settings-related-grid">
                <Link href={scenarioHref("/app/connections", initialSnapshot.scenario)}>
                  <b>Connections</b>
                  <small>Disconnect source access</small>
                </Link>
                <Link href={scenarioHref("/app/memory", initialSnapshot.scenario)}>
                  <b>Memory</b>
                  <small>Correct or forget specific items</small>
                </Link>
                <Link href={scenarioHref("/app/activity", initialSnapshot.scenario)}>
                  <b>Activity</b>
                  <small>Review recorded control changes</small>
                </Link>
              </div>
            </>
          ) : null}
        </section>
      </div>

      <ControlDialog
        open={dialog === "notification"}
        eyebrow="Notification preview"
        title={notificationPreview?.title ?? "Preview"}
        onClose={() => setDialog(null)}
      >
        <div className="notification-preview">
          <span aria-hidden="true" />
          <div>
            <b>{notificationPreview?.title}</b>
            <p>{notificationPreview?.body}</p>
            <small>{notificationPreview?.delivery}</small>
          </div>
        </div>
      </ControlDialog>

      <ControlDialog
        open={dialog === "export"}
        eyebrow="Mock export"
        title="Export manifest prepared"
        onClose={() => setDialog(null)}
      >
        <p>
          The demo records an export request but does not create or download a
          real archive. Live export arrives with the backend and identity phases.
        </p>
      </ControlDialog>

      <ControlDialog
        open={dialog === "delete-source" || dialog === "delete-account"}
        eyebrow="Fresh confirmation required"
        title={
          dialog === "delete-account"
            ? "Delete the demo account?"
            : "Delete source-derived demo data?"
        }
        onClose={() => setDialog(null)}
        footer={
          <>
            <button type="button" onClick={() => setDialog(null)}>Cancel</button>
            <button
              className="destructive-button"
              type="button"
              onClick={async () => {
                const scope =
                  dialog === "delete-account" ? "account" : "source-derived";
                const result = await service.requestDeletion(scope);
                setDeletion(result);
                setFeedback(result.summary);
              }}
            >
              Confirm mock deletion
            </button>
          </>
        }
      >
        <p>
          {deletion?.summary ??
            "Review the full impact before confirming. This prototype records the request only."}
        </p>
        <ImpactList
          features={
            deletion?.impact.affectedFeatures ??
            ["Today", "Timeline", "Insights", "Knowledge"]
          }
          automations={
            deletion?.impact.affectedAutomations ??
            ["Morning brief", "Rain-aware commute", "Class preparation"]
          }
          reversible={false}
        />
      </ControlDialog>
    </div>
  );
}

function SettingsActions({
  onSave,
  onReset,
}: {
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <footer className="settings-actions">
      <button type="button" onClick={onReset}>Reset section</button>
      <button className="primary-button" type="button" onClick={onSave}>
        Save changes
      </button>
    </footer>
  );
}
