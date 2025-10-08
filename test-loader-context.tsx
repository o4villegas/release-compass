// TEST FILE - Verify loader context access pattern
// This tests if we can access Cloudflare bindings in React Router loaders

import type { Route } from "./app/routes/+types/project.$id";

// Test loader to verify context.cloudflare.env is available
export async function loader({ params, context }: Route.LoaderArgs) {
  // @ts-expect-error - Testing if cloudflare context exists
  const env = context?.cloudflare?.env as { DB: D1Database; BUCKET: R2Bucket } | undefined;

  if (!env) {
    throw new Error("Cloudflare context not available in loader");
  }

  // Test DB query
  const result = await env.DB.prepare("SELECT 1 as test").first();

  return { test: "success", dbTest: result };
}

// Expected behavior:
// - context.cloudflare.env should be available (passed from workers/app.ts line 42)
// - env.DB should be the D1 binding
// - env.BUCKET should be the R2 binding
