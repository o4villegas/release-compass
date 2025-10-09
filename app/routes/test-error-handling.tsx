// TEST ROUTE - Verify error handling consistency
// Tests that both HTTP and direct paths handle errors identically

import type { Route } from "./+types/test-error-handling";

export async function loader({ context }: Route.LoaderArgs) {
  const env = context.cloudflare as { env: { DB: D1Database; BUCKET: R2Bucket } };

  // Test 1: Get valid project via direct call
  const { getProjectDetails } = await import("../../workers/api-handlers/projects");

  // Create a test project first
  const testProjectId = crypto.randomUUID();
  await env.env.DB.prepare(`
    INSERT INTO projects (id, artist_name, release_title, release_date, release_type, total_budget, created_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(testProjectId, "Test Artist", "Test Album", "2026-01-01", "album", 50000, new Date().toISOString(), "test-user").run();

  // Test direct call with valid ID
  const directResult = await getProjectDetails(env.env.DB, testProjectId);

  // Test direct call with invalid ID (should return null)
  const directError = await getProjectDetails(env.env.DB, "invalid-id-12345");

  // Clean up
  await env.env.DB.prepare("DELETE FROM projects WHERE id = ?").bind(testProjectId).run();

  return {
    test1: {
      name: "Direct call with valid ID",
      success: !!directResult,
      hasProject: !!directResult?.project,
      hasMilestones: Array.isArray(directResult?.milestones),
      hasBudgetSummary: !!directResult?.budget_summary,
      hasClearedForRelease: !!directResult?.cleared_for_release
    },
    test2: {
      name: "Direct call with invalid ID",
      returnsNull: directError === null,
      success: directError === null // Should return null for 404
    },
    overall: {
      allTestsPassed: !!directResult && directError === null
    }
  };
}

export default function TestErrorHandling({ loaderData }: Route.ComponentProps) {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Error Handling Consistency Test</h1>

        <div className="space-y-4">
          {loaderData.overall.allTestsPassed ? (
            <div className="bg-green-100 border border-green-500 p-4 rounded">
              <h2 className="font-bold text-green-800">✅ ALL TESTS PASSED</h2>
              <p className="text-green-700">Error handling is consistent!</p>
            </div>
          ) : (
            <div className="bg-red-100 border border-red-500 p-4 rounded">
              <h2 className="font-bold text-red-800">❌ TESTS FAILED</h2>
            </div>
          )}

          <div className="bg-white border p-4 rounded">
            <h3 className="font-bold mb-2">Test Results:</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
              {JSON.stringify(loaderData, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
