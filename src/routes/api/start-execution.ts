import { createFileRoute } from "@tanstack/react-router";
import handler from "../../../api/start-execution";

export const Route = createFileRoute("/api/start-execution")({
  server: {
    handlers: {
      POST: async ({ request }) => handler(request),
    },
  },
});