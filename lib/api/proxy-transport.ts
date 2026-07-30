export const NEXUS_PROXY_TRANSPORT_VERSION = 1 as const;

export const NEXUS_PROXY_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
] as const;

export type NexusProxyMethod = (typeof NEXUS_PROXY_METHODS)[number];

export interface NexusProxyRequestEnvelope {
  version: typeof NEXUS_PROXY_TRANSPORT_VERSION;
  token: string;
  request: {
    method: NexusProxyMethod;
    headers: {
      accept?: string;
      contentType?: string;
      idempotencyKey?: string;
      requestId?: string;
    };
    body: string | null;
  };
}
