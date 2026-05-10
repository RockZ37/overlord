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

export const config = {
  runtime: "edge",
};

export default async function handler(request: Request): Promise<Response> {
  try {
    const server = await getServerEntry();
    return await server.fetch(request, {}, {});
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Unknown server error";
    return new Response(`Internal Server Error: ${message}`, {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}
