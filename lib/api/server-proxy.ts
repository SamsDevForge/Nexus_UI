import {
  NEXUS_PROXY_METHODS,
  NEXUS_PROXY_TRANSPORT_VERSION,
  type NexusProxyMethod,
  type NexusProxyRequestEnvelope,
} from "./proxy-transport";
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

interface UpstreamRequest {
  method: string;
  headers: Headers;
  body?: BodyInit;
  requestId?: string;
}

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

function upstreamUrlFor(request: Request, path: string[]) {
  const baseUrl = upstreamBaseUrl();
  if (!baseUrl) return null;
  const upstreamUrl = new URL(
    path.map((segment) => encodeURIComponent(segment)).join("/"),
    `${baseUrl.toString().replace(/\/+$/, "")}/`,
  );
  upstreamUrl.search = new URL(request.url).search;
  return upstreamUrl;
}

async function forwardUpstream(
  request: Request,
  path: string[],
  upstreamRequest: UpstreamRequest,
  fetchImplementation: ProxyFetch = fetch,
) {
  const upstreamUrl = upstreamUrlFor(request, path);
  if (!upstreamUrl) {
    return proxyError(
      503,
      "persistence_not_configured",
      "Phase 6 live persistence is not configured.",
    );
  }

  try {
    const upstream = await fetchImplementation(upstreamUrl, {
      method: upstreamRequest.method,
      headers: upstreamRequest.headers,
      body: upstreamRequest.body,
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
      upstreamRequest.requestId,
    );
  }
}

function isProxyEnvelope(value: unknown): value is NexusProxyRequestEnvelope {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<NexusProxyRequestEnvelope>;
  const nested = candidate.request;
  if (
    candidate.version !== NEXUS_PROXY_TRANSPORT_VERSION ||
    typeof candidate.token !== "string" ||
    candidate.token.length === 0 ||
    candidate.token.length > 16_384 ||
    /[\r\n]/.test(candidate.token) ||
    !nested ||
    typeof nested !== "object" ||
    !NEXUS_PROXY_METHODS.includes(nested.method as NexusProxyMethod) ||
    (nested.body !== null && typeof nested.body !== "string") ||
    typeof nested.headers !== "object" ||
    nested.headers === null
  ) {
    return false;
  }
  return Object.values(nested.headers).every(
    (value) => value === undefined || typeof value === "string",
  );
}

export async function forwardNexusProxyEnvelope(
  request: Request,
  path: string[],
  fetchImplementation: ProxyFetch = fetch,
) {
  let envelope: unknown;
  try {
    envelope = await request.json();
  } catch {
    return proxyError(
      400,
      "invalid_proxy_envelope",
      "NEXUS could not complete the persistence request.",
    );
  }
  if (!isProxyEnvelope(envelope)) {
    return proxyError(
      400,
      "invalid_proxy_envelope",
      "NEXUS could not complete the persistence request.",
    );
  }

  const headers = new Headers();
  const metadata = envelope.request.headers;
  if (metadata.accept) headers.set("accept", metadata.accept);
  if (metadata.contentType) {
    headers.set("content-type", metadata.contentType);
  }
  if (metadata.idempotencyKey) {
    headers.set("x-idempotency-key", metadata.idempotencyKey);
  }
  if (metadata.requestId) headers.set("x-request-id", metadata.requestId);
  headers.set("authorization", `Bearer ${envelope.token}`);

  const method = envelope.request.method;
  return forwardUpstream(
    request,
    path,
    {
      method,
      headers,
      body:
        method === "GET" || envelope.request.body === null
          ? undefined
          : envelope.request.body,
      requestId: metadata.requestId,
    },
    fetchImplementation,
  );
}

export async function forwardNexusApiRequest(
  request: Request,
  path: string[],
  fetchImplementation: ProxyFetch = fetch,
) {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const method = request.method.toUpperCase();
  return forwardUpstream(
    request,
    path,
    {
      method,
      headers,
      body:
        method === "GET" || method === "HEAD"
          ? undefined
          : await request.arrayBuffer(),
      requestId: request.headers.get("x-request-id") ?? undefined,
    },
    fetchImplementation,
  );
}
