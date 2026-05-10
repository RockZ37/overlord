import { createFileRoute } from "@tanstack/react-router";
import handler from "../../../api/parse-intent";

export const Route = createFileRoute("/api/parse-intent")({
  server: {
    handlers: {
      POST: async ({ request }) => handler(request),
    },
  },
});