"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const dailyNavigation = [
  { label: "Today", href: "/app/today", marker: "01" },
  { label: "Timeline", href: "/app/timeline", marker: "02" },
  { label: "Insights", href: "/app/insights", marker: "03" },
  { label: "NEXUS", href: "/app/nexus", marker: "04" },
  { label: "Knowledge", href: "/app/knowledge", marker: "05" },
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
                  className={active ? "nav-link is-active" : "nav-link"}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="nav-index">{item.marker}</span>
                  <span>{item.label}</span>
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
          <div className="context-meta">
            <span>Prototype</span>
            <b>Deterministic mock data</b>
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
              href={item.href}
              className={active ? "mobile-nav-link is-active" : "mobile-nav-link"}
              aria-current={active ? "page" : undefined}
            >
              <span>{item.marker}</span>
              <b>{item.label}</b>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
