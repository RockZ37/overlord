import { createFileRoute } from "@tanstack/react-router";
import handler from "../../../api/complete-execution";

export const Route = createFileRoute("/api/complete-execution")({
  server: {
    handlers: {
      POST: async ({ request }) => handler(request),
    },
  },
});