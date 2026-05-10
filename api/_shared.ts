export async function readJsonBody<T>(request: Request): Promise<T> {
  if (request.method !== "POST" && request.method !== "PUT" && request.method !== "PATCH") {
    throw new Error("This endpoint expects a JSON request body.");
  }

  return (await request.json()) as T;
}

export function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers ?? {}),
    },
  });
}
