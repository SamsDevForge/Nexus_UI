"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { NexusScenario } from "@/lib/domain/contracts";
import { scenarioHref } from "@/lib/mocks/phase2-fixtures";
import "./MobileProductNavigation.css";

interface Destination { label: string; href: string; description?: string }
const frequent = ["/app/today", "/app/calendar", "/app/mail", "/app/context"];
const shortLabels: Record<string, string> = { "/app/today": "Today", "/app/calendar": "Calendar", "/app/mail": "Mail", "/app/context": "Commute" };

export function MobileProductNavigation({ daily, controls, pathname, scenario, accountName, live, signOut }: {
  daily: readonly Destination[]; controls: readonly Destination[]; pathname: string;
  scenario: NexusScenario; accountName: string; live: boolean; signOut: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const close = () => dialog.current?.close();
  const moreActive = !frequent.includes(pathname);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 781px)");
    const handle = () => { if (media.matches) dialog.current?.close(); };
    media.addEventListener("change", handle);
    return () => media.removeEventListener("change", handle);
  }, []);

  return <>
    <nav className="mobile-navigation refined-mobile-navigation" aria-label="Primary product navigation">
      {frequent.map(href => <Link key={href} className={pathname === href ? "mobile-nav-link is-active" : "mobile-nav-link"} href={scenarioHref(href, scenario)} aria-current={pathname === href ? "page" : undefined}>
        <span className="mobile-nav-cue" aria-hidden="true" /><b>{shortLabels[href]}</b>
      </Link>)}
      <button type="button" className={moreActive ? "mobile-nav-link is-active" : "mobile-nav-link"} aria-haspopup="dialog" aria-expanded={open} aria-controls="nexus-more-navigation" onClick={() => { dialog.current?.showModal(); setOpen(true); }}>
        <span className="mobile-more-cue" aria-hidden="true">···</span><b>More</b>
      </button>
    </nav>
    <dialog className="mobile-destinations" id="nexus-more-navigation" ref={dialog} aria-labelledby="more-navigation-title" onClose={() => setOpen(false)} onKeyDown={event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") close();
      if (event.key !== "Tab") return;
      const targets = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not([disabled])'));
      const first = targets[0], last = targets[targets.length-1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }} onMouseDown={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
    }}>
      <header><div><p>NEXUS WORKSPACE</p><h2 id="more-navigation-title">Where to next?</h2></div><button type="button" onClick={close} aria-label="Close navigation">Close</button></header>
      <nav aria-label="All product destinations"><h3>Daily tools</h3><div className="mobile-destination-grid">{daily.map(item => <Link prefetch={false} href={scenarioHref(item.href, scenario)} key={item.href} aria-current={pathname === item.href ? "page" : undefined} onClick={close}><strong>{item.label}</strong><small>{item.description}</small><span aria-hidden="true">→</span></Link>)}</div>
        <h3>Your workspace</h3><div className="mobile-destination-grid">{controls.map(item => <Link prefetch={false} href={scenarioHref(item.href, scenario)} key={item.href} aria-current={pathname === item.href ? "page" : undefined} onClick={close}><strong>{item.label}</strong><span aria-hidden="true">→</span></Link>)}</div>
      </nav>
      <footer><div><strong>{accountName}</strong><p>{live ? "Signed-in account" : "Sample profile"}</p></div><Link href={scenarioHref("/app/technicals", scenario)} onClick={close}>Technicals</Link>{live && <button disabled={signingOut} onClick={async () => { setSigningOut(true); setSignOutError(""); try { await signOut(); close(); } catch { setSignOutError("Sign-out could not be confirmed. Try again."); } finally { setSigningOut(false); } }}>Sign out</button>}{signOutError && <p role="alert">{signOutError}</p>}</footer>
    </dialog>
  </>;
}
