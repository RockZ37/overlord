import type { IncomingMessage, ServerResponse } from "node:http";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverPromise) {
    serverPromise = import("../src/server").then((m) => {
      const entry = m as { default?: ServerEntry };
      return entry.default ?? (m as unknown as ServerEntry);
    });
  }

  return serverPromise;
}

function getRequestUrl(request: IncomingMessage): string {
  const protocolHeader = request.headers["x-forwarded-proto"];
  const protocol = Array.isArray(protocolHeader) ? protocolHeader[0] : (protocolHeader ?? "https");
  const host = request.headers.host ?? "localhost";

  return `${protocol}://${host}${request.url ?? "/"}`;
}

async function readRequestBody(request: IncomingMessage): Promise<Buffer | undefined> {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

function toHeaders(request: IncomingMessage): Headers {
  const headers = new Headers();

  for (const [key, value] of Object.entries(request.headers)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
      continue;
    }

    headers.set(key, value);
  }

  return headers;
}

async function toRequest(request: IncomingMessage): Promise<Request> {
  const body = await readRequestBody(request);
  const init: RequestInit & { duplex?: "half" } = {
    method: request.method ?? "GET",
    headers: toHeaders(request),
  };

  if (body !== undefined) {
    init.body = new Uint8Array(body);
    init.duplex = "half";
  }

  return new Request(getRequestUrl(request), init);
}

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  try {
    const webRequest = await toRequest(request);
    const server = await getServerEntry();
    const webResponse = await server.fetch(webRequest, {}, {});

    response.statusCode = webResponse.status;
    webResponse.headers.forEach((value, key) => {
      response.setHeader(key, value);
    });

    const body = Buffer.from(await webResponse.arrayBuffer());
    response.end(body);
  } catch (error) {
    console.error(error);
    response.statusCode = 500;
    response.setHeader("content-type", "text/plain; charset=utf-8");
    response.end("Internal Server Error");
  }
}
