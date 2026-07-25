"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ProductLandingCubeBackdrop } from "./ProductLandingCubeBackdrop";

const dailyNavigation = [
  { label: "Today", description: "Your day now", href: "/app/today" },
  { label: "Timeline", description: "What happens next", href: "/app/timeline" },
  { label: "Insights", description: "Useful recommendations", href: "/app/insights" },
  { label: "NEXUS", description: "Ask and understand", href: "/app/nexus" },
  { label: "Knowledge", description: "Find your sources", href: "/app/knowledge" },
];

const controlNavigation = [
  { label: "Automations", href: "/app/automations" },
  { label: "Connections", href: "/app/connections" },
  { label: "Memory", href: "/app/memory" },
  { label: "Activity", href: "/app/activity" },
  { label: "Settings", href: "/app/settings" },
];

function BrandLockup() {
  return (
    <Link className="app-brand" href="/" aria-label="NEXUS AI landing page">
      <span className="app-brand-mark">
        <Image
          src="/nexus-logo.svg"
          alt=""
          fill
          sizes="42px"
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

export function ProductShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="product-shell">
      <div className="product-cube-field" aria-hidden="true">
        <ProductLandingCubeBackdrop />
        <span className="product-cube-halo" />
        <div className="product-glass-squircle-wrap">
          <div className="product-glass-squircle">
            <span className="product-squircle-face squircle-face-front" />
            <span className="product-squircle-face squircle-face-back" />
            <span className="product-squircle-face squircle-face-right" />
            <span className="product-squircle-face squircle-face-left" />
            <span className="product-squircle-face squircle-face-top" />
            <span className="product-squircle-face squircle-face-bottom" />
          </div>
        </div>
      </div>

      <aside className="app-sidebar">
        <BrandLockup />

        <div className="sidebar-state" aria-label="NEXUS is observing">
          <span className="sidebar-state-light" aria-hidden="true" />
          <span>
            <b>Observing</b>
            <small>3 live signals</small>
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
                  href={item.href}
                  className={
                    active
                      ? "nav-link nav-link-daily is-active"
                      : "nav-link nav-link-daily"
                  }
                  aria-current={active ? "page" : undefined}
                >
                  <span className="nav-section-cue" aria-hidden="true" />
                  <span className="nav-copy">
                    <b>{item.label}</b>
                    <small>{item.description}</small>
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
                  href={item.href}
                  className={active ? "nav-link is-active" : "nav-link"}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="nav-control-dot" aria-hidden="true" />
                  <span>{item.label}</span>
                  {active ? <i aria-hidden="true" /> : null}
                </Link>
              );
            })}
          </div>
        </nav>

        <Link
          href="/app/technicals"
          className={
            pathname === "/app/technicals"
              ? "sidebar-technicals is-active"
              : "sidebar-technicals"
          }
          aria-current={pathname === "/app/technicals" ? "page" : undefined}
        >
          <span className="technicals-glyph" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            <b>Dive into the technicals</b>
            <small>States, sources and boundaries</small>
          </span>
        </Link>

        <div className="sidebar-account">
          <span className="account-monogram">AS</span>
          <span>
            <b>Aadi Sharma</b>
            <small>Student profile</small>
          </span>
          <Link href="/app/settings" aria-label="Open account settings">
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
          <Link className="mobile-technicals-link" href="/app/technicals">
            Technicals
          </Link>
        </header>

        <main className="product-main">{children}</main>
      </div>

      <nav className="mobile-navigation" aria-label="Primary product navigation">
        {dailyNavigation.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "mobile-nav-link is-active" : "mobile-nav-link"}
              aria-current={active ? "page" : undefined}
            >
              <span className="mobile-nav-cue" aria-hidden="true" />
              <b>{item.label}</b>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
