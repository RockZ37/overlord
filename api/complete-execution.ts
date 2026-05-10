import { completeExecution } from "../src/lib/overlord.server";
import { jsonResponse, readJsonBody } from "./_shared";

export default async function handler(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody<{ data: string }>(request);
    const result = await completeExecution(body.data);
    return jsonResponse(result);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return jsonResponse({ error: message }, { status: 500 });
  }
}
