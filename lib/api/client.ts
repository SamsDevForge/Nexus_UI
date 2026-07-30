import type { ApiEnvelope, ApiErrorEnvelope } from "./contracts";
import {
  NEXUS_PROXY_METHODS,
  NEXUS_PROXY_TRANSPORT_VERSION,
  type NexusProxyMethod,
  type NexusProxyRequestEnvelope,
} from "./proxy-transport";

export type AuthTokenProvider = (forceRefresh: boolean) => Promise<string | null>;
export type NexusApiAuthenticationTransport =
  | "authorization-header"
  | "same-origin-envelope";

export class NexusApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "NexusApiError";
  }
}

export interface NexusApiClientOptions {
  baseUrl: string;
  getToken: AuthTokenProvider;
  fetchImplementation?: typeof fetch;
  timeoutMs?: number;
  authenticationTransport?: NexusApiAuthenticationTransport;
}

export class NexusApiClient {
  private readonly fetchImplementation: typeof fetch;
  private readonly timeoutMs: number;
  private readonly authenticationTransport: NexusApiAuthenticationTransport;

  constructor(private readonly options: NexusApiClientOptions) {
    this.fetchImplementation = options.fetchImplementation ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.authenticationTransport =
      options.authenticationTransport ?? "authorization-header";
  }

  async request<T>(
    path: string,
    init: RequestInit = {},
    retryAuthentication = true,
  ): Promise<ApiEnvelope<T>> {
    const token = await this.options.getToken(false);
    if (!token) {
      throw new NexusApiError(401, "authentication_required", "Sign in to continue.");
    }

    const controller = new AbortController();
    const timeout = globalThis.setTimeout(
      () => controller.abort(),
      this.timeoutMs,
    );
    try {
      const headers = new Headers(init.headers);
      if (!headers.has("Accept")) headers.set("Accept", "application/json");
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      let requestInit: RequestInit;
      if (this.authenticationTransport === "same-origin-envelope") {
        const method = (init.method ?? "GET").toUpperCase();
        if (!NEXUS_PROXY_METHODS.includes(method as NexusProxyMethod)) {
          throw new NexusApiError(
            405,
            "unsupported_proxy_method",
            "NEXUS could not complete the persistence request.",
          );
        }
        if (init.body !== undefined && typeof init.body !== "string") {
          throw new NexusApiError(
            400,
            "unsupported_proxy_body",
            "NEXUS could not complete the persistence request.",
          );
        }

        const envelope: NexusProxyRequestEnvelope = {
          version: NEXUS_PROXY_TRANSPORT_VERSION,
          token,
          request: {
            method: method as NexusProxyMethod,
            headers: {
              accept: headers.get("Accept") ?? undefined,
              contentType: headers.get("Content-Type") ?? undefined,
              idempotencyKey:
                headers.get("X-Idempotency-Key") ?? undefined,
              requestId: headers.get("X-Request-ID") ?? undefined,
            },
            body: typeof init.body === "string" ? init.body : null,
          },
        };
        requestInit = {
          method: "POST",
          credentials: "same-origin",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(envelope),
        };
      } else {
        headers.set("Authorization", `Bearer ${token}`);
        requestInit = {
          ...init,
          signal: controller.signal,
          headers,
        };
      }

      const response = await this.fetchImplementation(
        `${this.options.baseUrl}${path}`,
        requestInit,
      );

      if (response.status === 401 && retryAuthentication) {
        const refreshed = await this.options.getToken(true);
        if (refreshed) {
          return this.request<T>(path, init, false);
        }
      }

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | ApiErrorEnvelope
          | null;
        throw new NexusApiError(
          response.status,
          body?.error.code ?? "request_failed",
          body?.error.message ?? "NEXUS could not complete the request.",
          body?.error.requestId ?? response.headers.get("X-Request-ID") ?? undefined,
        );
      }

      if (response.status === 204) {
        return {
          data: undefined as T,
          requestId: response.headers.get("X-Request-ID") ?? "",
        };
      }
      return (await response.json()) as ApiEnvelope<T>;
    } catch (error) {
      if (error instanceof NexusApiError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new NexusApiError(
          408,
          "request_timeout",
          "The request timed out. Your changes were not saved.",
        );
      }
      throw new NexusApiError(
        0,
        "network_unavailable",
        "NEXUS could not reach the persistence service. Your changes were not saved.",
      );
    } finally {
      globalThis.clearTimeout(timeout);
    }
  }
}
