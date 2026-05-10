import { createFileRoute } from "@tanstack/react-router";
import { completeExecution } from "../../../src/lib/overlord.server";
import { jsonResponse, readJsonBody } from "../../../api/_shared";

export const Route = createFileRoute("/api/complete-execution")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await readJsonBody<{ data: string }>(request);
          const result = await completeExecution(body.data);
          return jsonResponse(result);
        } catch (error) {
          console.error(error);
          const message = error instanceof Error ? error.message : "Internal Server Error";
          return jsonResponse({ error: message }, { status: 500 });
        }
      },
    },
  },
});