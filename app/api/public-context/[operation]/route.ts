import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ operation: string }> }) {
  const { operation } = await params;
  if (!["search", "plan"].includes(operation)) {
    return NextResponse.json({ message: "Unknown context operation." }, { status: 404 });
  }
  try {
    const raw = await request.text();
    if (raw.length > 12000) return NextResponse.json({ message: "Request too large." }, { status: 413 });
    try { JSON.parse(raw); } catch {
      return NextResponse.json({ message: "Send a JSON request." }, { status: 400 });
    }
    const base = process.env.NEXUS_CONTEXT_API_URL || "http://127.0.0.1:8000";
    const response = await fetch(`${base.replace(/\/$/, "")}/api/public-context/${operation}`, {
      method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000),
      headers: { "Content-Type": "application/json", ...(request.headers.get("authorization")
        ? { Authorization: request.headers.get("authorization")! } : {}) }, body: raw,
    });
    const payload: unknown = await response.json();
    return NextResponse.json(payload, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "The context service is unavailable. Please retry." }, { status: 502 });
  }
}
