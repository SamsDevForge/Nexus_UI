"use client";

import { useEffect, useRef, useState } from "react";
import { useNexusAuth } from "@/lib/auth/AuthProvider";
import { WorkspaceHeader, WorkspaceNotice } from "./WorkspaceChrome";
import "./CommutePlanner.css";

interface Place { name: string; region?: string; country?: string; latitude: number | null; longitude: number | null }
interface Forecast { available: boolean; provider: string; kind: string; temperature_c: number | null;
  rain_probability_percent: number | null; fetched_at?: string; message: string | null }
interface Plan { event_at: string; arrive_at: string; leave_at: string; prepare_at: string;
  travel_minutes: number; preparation_minutes: number; arrival_buffer_minutes: number;
  origin_weather: Forecast; destination_weather: Forecast; route_source: string;
  umbrella_advice: string; explanation: string; late: boolean; preparation_due: boolean;
  warnings: string[]; refresh_after: string }

export function CommutePlanner() {
  const auth = useNexusAuth();
  const [queries, setQueries] = useState({ origin: "", destination: "" });
  const [places, setPlaces] = useState<{ origin: Place | null; destination: Place | null }>({ origin: null, destination: null });
  const [matches, setMatches] = useState<{ origin: Place[]; destination: Place[] }>({ origin: [], destination: [] });
  const [eventAt, setEventAt] = useState("");
  const [journey, setJourney] = useState("");
  const [preparation, setPreparation] = useState(15);
  const [buffer, setBuffer] = useState(10);
  const [driving, setDriving] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const resultRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (plan) {
      resultRef.current?.focus({ preventScroll: true });
      resultRef.current?.scrollIntoView({ block: "start" });
      const timer = window.setInterval(() => setNow(Date.now()), 30_000);
      return () => window.clearInterval(timer);
    }
  }, [plan]);

  async function request<T>(operation: string, body: unknown): Promise<T> {
    const token = auth.firebaseUser ? await auth.firebaseUser.getIdToken() : null;
    const response = await fetch(`/api/public-context/${operation}`, {
      method: "POST", signal: AbortSignal.timeout(20000),
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || result.message || "Context request failed.");
    if (!result || typeof result !== "object" || !("data" in result) || !result.requestId) {
      throw new Error("The context service returned an incomplete response. Please retry.");
    }
    return result.data as T;
  }

  function invalidate() { setPlan(null); setError(""); }
  async function search(kind: "origin" | "destination") {
    setBusy(kind); setError(""); setMatches(current => ({ ...current, [kind]: [] }));
    try {
      const results = await request<Place[]>("search", { query: queries[kind] });
      setMatches(current => ({ ...current, [kind]: results }));
      if (!results.length) setError("No matching places. Try a nearby city or enter coordinates.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Location search failed."); }
    finally { setBusy(""); }
  }

  async function calculate(event: React.FormEvent) {
    event.preventDefault(); setPlan(null); setError("");
    if (!places.origin || !places.destination
      || !Number.isFinite(places.origin.latitude) || !Number.isFinite(places.origin.longitude)
      || !Number.isFinite(places.destination.latitude) || !Number.isFinite(places.destination.longitude)) {
      setError("Choose an origin and destination, or enter both coordinates for each."); return;
    }
    setBusy("plan"); setNow(Date.now());
    try {
      const point = (p: Place) => ({ latitude: p.latitude, longitude: p.longitude });
      setPlan(await request<Plan>("plan", { origin: point(places.origin), destination: point(places.destination),
        event_at: new Date(eventAt).toISOString(), travel_minutes: Number(journey),
        preparation_minutes: preparation, arrival_buffer_minutes: buffer, use_driving_estimate: driving }));
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not prepare a plan."); }
    finally { setBusy(""); }
  }

  const formatTime = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  return <div className="commute-page workspace-page">
    <WorkspaceHeader eyebrow="Commute & weather" title="Plan your departure." description="Bring your commitment, journey time and weather into one clear plan." mode="Public forecasts" />
    <WorkspaceNotice>This planner requests real public forecasts. The other daily screens still use sample data. Nothing is added to a calendar and no notification is sent.</WorkspaceNotice>
    <form id="commute-form" onSubmit={calculate} className="commute-form">
      <div className="commute-places">{(["origin", "destination"] as const).map(kind => <fieldset key={kind}>
        <legend>{kind === "origin" ? "Starting point" : "Destination"}</legend>
        <label>Search city or place<input minLength={3} maxLength={80} value={queries[kind]} disabled={!!busy}
          onChange={e => { setQueries(current => ({ ...current, [kind]: e.target.value }));
            setMatches(current => ({ ...current, [kind]: [] })); setPlaces(current => ({ ...current, [kind]: null })); invalidate(); }} /></label>
        <button type="button" disabled={!!busy || queries[kind].trim().length < 3} onClick={() => void search(kind)}>
          {busy === kind ? "Searching…" : "Find locations"}</button>
        {!!matches[kind].length && <ul className="commute-matches" aria-label={`${kind} matches`}>{matches[kind].map((place, index) => <li key={index}>
          <button type="button" disabled={!!busy} onClick={() => { setPlaces(current => ({ ...current, [kind]: place }));
            setMatches(current => ({ ...current, [kind]: [] })); invalidate(); }}>{[place.name, place.region, place.country].filter(Boolean).join(", ")}</button>
        </li>)}</ul>}
        <p>{places[kind]?.name || "Select a result, or enter coordinates below."}</p>
        <div className="commute-coordinates">{(["latitude", "longitude"] as const).map(axis => <label key={axis}>{axis === "latitude" ? "Latitude" : "Longitude"}
          <input aria-label={`${kind} ${axis}`} type="number" step="any" min={axis === "latitude" ? -90 : -180} max={axis === "latitude" ? 90 : 180}
            disabled={!!busy} value={places[kind]?.[axis] ?? ""} onChange={e => { const number = e.target.valueAsNumber;
              setPlaces(current => ({ ...current, [kind]: { ...(current[kind] || { name: "Manual coordinates", latitude: null, longitude: null }), [axis]: Number.isFinite(number) ? number : null } })); invalidate(); }} />
        </label>)}</div><small>Search results are city/place centers. Adjust coordinates for a specific venue.</small>
      </fieldset>)}</div>
      <div className="commute-options">
        <label>Event starts (your device’s local time)<input type="datetime-local" required value={eventAt} disabled={!!busy} onChange={e => { setEventAt(e.target.value); invalidate(); }} /></label>
        <label>Journey estimate / fallback (minutes)<input type="number" min={1} max={1440} required value={journey} disabled={!!busy} onChange={e => { setJourney(e.target.value); invalidate(); }} /></label>
        <label>Preparation (minutes)<input type="number" min={0} max={240} required value={preparation} disabled={!!busy} onChange={e => { setPreparation(e.target.valueAsNumber); invalidate(); }} /></label>
        <label>Arrival buffer (minutes)<input type="number" min={0} max={180} required value={buffer} disabled={!!busy} onChange={e => { setBuffer(e.target.valueAsNumber); invalidate(); }} /></label>
      </div>
      <label className="commute-checkbox"><input type="checkbox" checked={driving} disabled={!!busy} onChange={e => { setDriving(e.target.checked); invalidate(); }} />Request a driving estimate if configured; use my fallback if unavailable</label>
      <p className="commute-consent">Searching sends the place query to Open-Meteo/GeoNames. Preparing sends coordinates to Open-Meteo for forecasts;
        optional driving estimates use the configured OSRM service. No live traffic is available.</p>
      <button className="primary-button workspace-primary" disabled={!!busy} type="submit">{busy === "plan" ? "Preparing your plan…" : "Prepare departure plan"}</button>
    </form>
    {error && <p className="commute-error" role="alert">{error}</p>}
    {plan && <section ref={resultRef} tabIndex={-1} className="commute-result" aria-label="Departure plan" aria-live="polite">
      <p className="section-kicker">Suggested plan · no actions executed</p>
      <h2>{plan.late ? "The suggested departure time has passed." : `Leave at ${formatTime(plan.leave_at)}`}</h2>
      {plan.preparation_due && !plan.late && <p>Preparation time has already started.</p>}
      <ol>{[["Prepare", plan.prepare_at], ["Leave", plan.leave_at], ["Arrive by", plan.arrive_at], ["Event starts", plan.event_at]].map(([label, time]) => <li key={label}><span>{label}</span><strong>{formatTime(time)}</strong></li>)}</ol>
      <p>{plan.explanation}</p><p>{plan.route_source}</p>
      <div className="commute-forecasts">{([["Starting point", plan.origin_weather], ["Destination", plan.destination_weather]] as const).map(([label, forecast]) => <div key={label}>
        <h3>{label} forecast</h3><p>{forecast.available ? `${forecast.temperature_c}°C · ${forecast.rain_probability_percent}% rain probability` : forecast.message}</p>
        <small>{forecast.provider} · forecast, not an observation{forecast.fetched_at ? ` · retrieved ${formatTime(forecast.fetched_at)}` : ""}</small>
      </div>)}</div>
      <p>{plan.umbrella_advice}</p>{plan.warnings.map(warning => <p key={warning} className="commute-warning">{warning}</p>)}
      <small>Refresh by {formatTime(plan.refresh_after)} or after your plans change. Forecasts can change; check local conditions.</small>
      {now >= new Date(plan.refresh_after).getTime() && <p className="commute-warning" role="status">This plan needs refreshing. Its forecast refresh time has passed.</p>}
      <button type="submit" form="commute-form" disabled={!!busy}>Refresh departure plan</button>
      <p><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather: Open-Meteo</a> · <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">Places: GeoNames</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Route map data: OpenStreetMap contributors</a></p>
    </section>}
  </div>;
}
