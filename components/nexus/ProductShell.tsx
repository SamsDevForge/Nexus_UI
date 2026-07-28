"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { GlobalSearch } from "./GlobalSearch";
import { ProductIcon } from "./ProductIcon";
import { ProductLandingCubeBackdrop } from "./ProductLandingCubeBackdrop";
import { QuickCapture } from "./QuickCapture";
import {
  parseNexusScenario,
  scenarioHref,
} from "@/lib/mocks/phase2-fixtures";
import {
  canonicalScenario,
  stateDimensionsForScenario,
} from "@/lib/domain/state-coverage";

const focusModeCookie = "nexus-focus-mode";

const dailyNavigation = [
  { label: "Today", compact: "T", description: "Your day now", href: "/app/today" },
  {
    label: "Timeline",
    compact: "TL",
    description: "What happens next",
    href: "/app/timeline",
  },
  {
    label: "Insights",
    compact: "I",
    description: "Useful recommendations",
    href: "/app/insights",
  },
  {
    label: "NEXUS",
    compact: "N",
    description: "Ask and understand",
    href: "/app/nexus",
  },
  {
    label: "Knowledge",
    compact: "K",
    description: "Find your sources",
    href: "/app/knowledge",
  },
];

const controlNavigation = [
  { label: "Automations", compact: "AU", href: "/app/automations" },
  { label: "Connections", compact: "CO", href: "/app/connections" },
  { label: "Memory", compact: "M", href: "/app/memory" },
  { label: "Activity", compact: "AC", href: "/app/activity" },
  { label: "Settings", compact: "S", href: "/app/settings" },
];

function BrandLockup() {
  return (
    <Link className="app-brand" href="/" aria-label="NEXUS AI landing page">
      <span className="app-brand-mark">
        <Image
          src="/nexus-logo.svg"
          alt=""
          fill
          sizes="18px"
          priority
          unoptimized
        />
      </span>
      <span className="app-wordmark">
        NEXUS <b>AI</b>
      </span>
    </Link>
  );
}

export function ProductShell({
  children,
  initialFocusMode = false,
}: {
  children: ReactNode;
  initialFocusMode?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scenario = parseNexusScenario(searchParams.get("scenario") ?? undefined);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [focusMode, setFocusMode] = useState(initialFocusMode);
  const [searchOpen, setSearchOpen] = useState(false);
  const canonical = canonicalScenario(scenario);
  const productState = stateDimensionsForScenario(scenario);
  const shellClassName = [
    "product-shell",
    sidebarMinimized ? "is-sidebar-minimized" : "",
    focusMode ? "is-focus-mode" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const shellState =
    canonical === "privacy-paused"
      ? { label: "Privacy paused", detail: "0 new signals" }
      : canonical === "offline"
        ? { label: "Offline", detail: "Prepared state" }
        : canonical === "permission-revoked"
          ? { label: "Limited", detail: "Permission blocked" }
          : canonical === "no-connections"
            ? { label: "Manual", detail: "No connections" }
            : canonical === "degraded-ai"
              ? { label: "Degraded", detail: "Manual tools ready" }
              : productState.action === "pending-approval"
                ? { label: "Approval", detail: "Action pending" }
                : productState.action === "running"
                  ? { label: "Acting", detail: "Waiting for result" }
                  : productState.action === "succeeded"
                    ? { label: "Success", detail: "Result recorded" }
                    : productState.source === "rate-limited"
                      ? { label: "Limited", detail: "Last-known data" }
        : { label: "Observing", detail: "3 live signals" };

  const toggleFocusMode = () => {
    const nextFocusMode = !focusMode;
    setFocusMode(nextFocusMode);
    document.cookie = `${focusModeCookie}=${nextFocusMode ? "on" : "off"}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <div className={shellClassName}>
      {!focusMode ? (
        <div className="product-cube-field" aria-hidden="true">
          <ProductLandingCubeBackdrop />
          <span className="product-cube-halo" />
        </div>
      ) : null}

      <aside className="app-sidebar" id="product-sidebar">
        <div className="sidebar-brand-row">
          <BrandLockup />
          <button
            className="sidebar-minimize"
            type="button"
            aria-controls="product-sidebar"
            aria-expanded={!sidebarMinimized}
            aria-label={
              sidebarMinimized ? "Expand product sidebar" : "Minimize product sidebar"
            }
            title={sidebarMinimized ? "Expand sidebar" : "Minimize sidebar"}
            onClick={() => setSidebarMinimized((current) => !current)}
          >
            <span aria-hidden="true" />
          </button>
        </div>

        <div
          className={`sidebar-state is-${scenario}`}
          aria-label={`NEXUS state: ${shellState.label}`}
        >
          <span className="sidebar-state-light" aria-hidden="true" />
          <span>
            <b>{shellState.label}</b>
            <small>{shellState.detail}</small>
          </span>
        </div>

        <nav className="app-navigation" aria-label="Product navigation">
          <div className="nav-group">
            <p>Daily intelligence</p>
            {dailyNavigation.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={scenarioHref(item.href, scenario)}
                  className={
                    active
                      ? "nav-link nav-link-daily is-active"
                      : "nav-link nav-link-daily"
                  }
                  aria-current={active ? "page" : undefined}
                  aria-label={item.label}
                  title={sidebarMinimized ? item.label : undefined}
                >
                  <span className="nav-section-cue" aria-hidden="true" />
                  <span className="nav-copy">
                    <b>{item.label}</b>
                    <small>{item.description}</small>
                  </span>
                  <span className="nav-compact-label" aria-hidden="true">
                    {item.compact}
                  </span>
                  {active ? <i aria-hidden="true" /> : null}
                </Link>
              );
            })}
          </div>

          <div className="nav-group nav-group-controls">
            <p>System controls</p>
            {controlNavigation.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={scenarioHref(item.href, scenario)}
                  className={active ? "nav-link is-active" : "nav-link"}
                  aria-current={active ? "page" : undefined}
                  aria-label={item.label}
                  title={sidebarMinimized ? item.label : undefined}
                >
                  <span className="nav-control-dot" aria-hidden="true" />
                  <span className="nav-control-label">{item.label}</span>
                  <span className="nav-compact-label" aria-hidden="true">
                    {item.compact}
                  </span>
                  {active ? <i aria-hidden="true" /> : null}
                </Link>
              );
            })}
          </div>
        </nav>

        <Link
          href={scenarioHref("/app/technicals", scenario)}
          className={
            pathname === "/app/technicals"
              ? "sidebar-technicals is-active"
              : "sidebar-technicals"
          }
          aria-current={pathname === "/app/technicals" ? "page" : undefined}
          title={sidebarMinimized ? "Dive into the technicals" : undefined}
        >
          <span className="technicals-glyph" aria-hidden="true">
            <ProductIcon name="code-sandbox" size={18} />
          </span>
          <span>
            <b>Dive into the technicals</b>
            <small>States, sources and boundaries</small>
          </span>
        </Link>

        <div className="sidebar-account">
          <span className="account-monogram" title="Aadi Sharma">
            AS
          </span>
          <span>
            <b>Aadi Sharma</b>
            <small>Student profile</small>
          </span>
          <Link
            href={scenarioHref("/app/settings", scenario)}
            aria-label="Open account settings"
          >
            ···
          </Link>
        </div>
      </aside>

      <div className="product-stage">
        <header className="app-context-bar">
          <div className="mobile-brand">
            <BrandLockup />
          </div>
          <div className="context-location">
            <span className="context-pulse" aria-hidden="true" />
            <span>
              <b>Saturday, 25 July</b>
              <small>Bengaluru · IST</small>
            </span>
          </div>
          <div className="context-actions">
            <button
              className={
                focusMode
                  ? "focus-mode-trigger is-active"
                  : "focus-mode-trigger"
              }
              type="button"
              aria-pressed={focusMode}
              aria-label={
                focusMode
                  ? "Disable Focus mode and show the cube"
                  : "Enable Focus mode and hide the cube"
              }
              title={
                focusMode
                  ? "Disable Focus mode and show the cube"
                  : "Enable Focus mode and hide the cube"
              }
              onClick={toggleFocusMode}
            >
              <span className="focus-mode-glyph" aria-hidden="true">
                <i />
              </span>
              <span className="focus-mode-copy">
                <b>Focus mode</b>
                <small>{focusMode ? "Cube hidden" : "Cube visible"}</small>
              </span>
            </button>
            <button
              className="global-search-trigger"
              type="button"
              aria-label="Open global search"
              onClick={() => setSearchOpen(true)}
            >
              <span aria-hidden="true" />
              <b>Search</b>
              <kbd>⌘K</kbd>
            </button>
            <Link
              className="mobile-controls-link"
              href={scenarioHref("/app/settings", scenario)}
            >
              Controls
            </Link>
            <Link
              className="mobile-technicals-link"
              href={scenarioHref("/app/technicals", scenario)}
            >
              Technicals
            </Link>
          </div>
        </header>

        <main className="product-main">{children}</main>
      </div>

      <nav className="mobile-navigation" aria-label="Primary product navigation">
        {dailyNavigation.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={scenarioHref(item.href, scenario)}
              className={active ? "mobile-nav-link is-active" : "mobile-nav-link"}
              aria-current={active ? "page" : undefined}
            >
              <span className="mobile-nav-cue" aria-hidden="true" />
              <b>{item.label}</b>
            </Link>
          );
        })}
      </nav>

      <GlobalSearch
        scenario={scenario}
        open={searchOpen}
        onOpenChange={setSearchOpen}
      />
      <QuickCapture key={scenario} scenario={scenario} />
    </div>
  );
}
