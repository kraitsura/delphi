import { createFileRoute } from "@tanstack/react-router";
import { reactStartHandler } from "@convex-dev/better-auth/react-start";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return reactStartHandler(request);
      },
      POST: async ({ request }) => {
        return reactStartHandler(request);
      },
    },
  },
});
