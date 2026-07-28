import type { ApiEnvelope, ApiErrorEnvelope } from "./contracts";

export type AuthTokenProvider = (forceRefresh: boolean) => Promise<string | null>;

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
}

export class NexusApiClient {
  private readonly fetchImplementation: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly options: NexusApiClientOptions) {
    this.fetchImplementation = options.fetchImplementation ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 10_000;
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
      const response = await this.fetchImplementation(
        `${this.options.baseUrl}${path}`,
        {
          ...init,
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...init.headers,
            Authorization: `Bearer ${token}`,
          },
        },
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
