import { NEXUS_PROXY_AUTHORIZATION_HEADER } from "./proxy-transport";
import { getNexusPublicRuntimeConfig } from "../runtime/config";

const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "content-type",
  "x-idempotency-key",
  "x-request-id",
] as const;

const FORWARDED_RESPONSE_HEADERS = [
  "content-type",
  "retry-after",
  "x-request-id",
] as const;

type ProxyFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

function proxyError(
  status: number,
  code: string,
  message: string,
  requestId = crypto.randomUUID(),
) {
  return Response.json(
    {
      error: {
        code,
        message,
        requestId,
      },
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Request-ID": requestId,
      },
    },
  );
}

function upstreamBaseUrl() {
  const configured = getNexusPublicRuntimeConfig().apiBaseUrl;
  try {
    const parsed = new URL(configured);
    if (parsed.protocol !== "https:") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function forwardNexusApiRequest(
  request: Request,
  path: string[],
  fetchImplementation: ProxyFetch = fetch,
) {
  const baseUrl = upstreamBaseUrl();
  if (!baseUrl) {
    return proxyError(
      503,
      "persistence_not_configured",
      "Phase 6 live persistence is not configured.",
    );
  }

  const upstreamUrl = new URL(
    path.map((segment) => encodeURIComponent(segment)).join("/"),
    `${baseUrl.toString().replace(/\/+$/, "")}/`,
  );
  upstreamUrl.search = new URL(request.url).search;

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const nexusAuthorization = request.headers.get(
    NEXUS_PROXY_AUTHORIZATION_HEADER,
  );
  if (nexusAuthorization) {
    headers.set("authorization", nexusAuthorization);
  }

  const method = request.method.toUpperCase();
  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  try {
    const upstream = await fetchImplementation(upstreamUrl, {
      method,
      headers,
      body,
      redirect: "manual",
    });
    if (upstream.status >= 300 && upstream.status < 400) {
      return proxyError(
        502,
        "upstream_redirect_blocked",
        "NEXUS could not complete the persistence request.",
      );
    }

    const responseHeaders = new Headers({ "Cache-Control": "no-store" });
    for (const name of FORWARDED_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return proxyError(
      502,
      "upstream_unavailable",
      "NEXUS could not reach the persistence service. Your changes were not saved.",
      request.headers.get("x-request-id") ?? undefined,
    );
  }
}
