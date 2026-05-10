import { createFileRoute } from "@tanstack/react-router";
import { buildRoutePlan } from "../../../src/lib/overlord.server";
import { jsonResponse, readJsonBody } from "../../../api/_shared";

export const Route = createFileRoute("/api/plan-route")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await readJsonBody<{ data: Parameters<typeof buildRoutePlan>[0] }>(request);
          const result = await buildRoutePlan(body.data);
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