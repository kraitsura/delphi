import { createAuth } from "../../convex/auth";
import { setupFetchClient } from "@convex-dev/better-auth/react-start";
import { getCookie } from "@tanstack/react-start/server";

// Setup fetch client for server-side Convex operations
export const { fetchQuery, fetchMutation, fetchAction } =
  await setupFetchClient(createAuth, getCookie);
