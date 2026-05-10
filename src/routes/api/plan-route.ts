import { createFileRoute } from "@tanstack/react-router";
import handler from "../../../api/plan-route";

export const Route = createFileRoute("/api/plan-route")({
  server: {
    handlers: {
      POST: async ({ request }) => handler(request),
    },
  },
});