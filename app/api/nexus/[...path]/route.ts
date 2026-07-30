import { forwardNexusApiRequest } from "@/lib/api/server-proxy";

interface NexusProxyContext {
  params: Promise<{ path: string[] }>;
}

async function forward(request: Request, context: NexusProxyContext) {
  const { path } = await context.params;
  return forwardNexusApiRequest(request, path);
}

export async function GET(request: Request, context: NexusProxyContext) {
  return forward(request, context);
}

export async function POST(request: Request, context: NexusProxyContext) {
  return forward(request, context);
}

export async function PUT(request: Request, context: NexusProxyContext) {
  return forward(request, context);
}

export async function PATCH(request: Request, context: NexusProxyContext) {
  return forward(request, context);
}

export async function DELETE(request: Request, context: NexusProxyContext) {
  return forward(request, context);
}
