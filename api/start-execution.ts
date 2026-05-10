import { startExecution } from "../src/lib/overlord.server";
import { jsonResponse, readJsonBody } from "./_shared";

export default async function handler(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody<{ data: Parameters<typeof startExecution>[0] }>(request);
    const result = await startExecution(body.data);
    return jsonResponse(result);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return jsonResponse({ error: message }, { status: 500 });
  }
}
