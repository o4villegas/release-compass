// TEST ROUTE - Verify direct DB access in loader
// Access at: http://localhost:5173/test-direct-db

import type { Route } from "./+types/test-direct-db";

export async function loader({ context }: Route.LoaderArgs) {
  try {
    // Test 1: Verify context.cloudflare exists
    if (!context || !('cloudflare' in context)) {
      return {
        success: false,
        error: "context.cloudflare not available",
        hasContext: !!context,
        contextKeys: context ? Object.keys(context) : []
      };
    }

    // Test 2: Verify env exists
    const cloudflare = context.cloudflare as any;
    if (!cloudflare || !cloudflare.env) {
      return {
        success: false,
        error: "context.cloudflare.env not available",
        hasCloudflare: !!cloudflare,
        cloudflareKeys: cloudflare ? Object.keys(cloudflare) : []
      };
    }

    // Test 3: Verify DB binding exists
    const env = cloudflare.env;
    if (!env.DB) {
      return {
        success: false,
        error: "DB binding not available",
        envKeys: Object.keys(env)
      };
    }

    // Test 4: Execute actual DB query
    const testQuery = await env.DB.prepare("SELECT 1 as test_value").first();

    // Test 5: Query real projects table
    const projectCount = await env.DB.prepare("SELECT COUNT(*) as count FROM projects").first();

    // Test 6: Get a real project
    const sampleProject = await env.DB.prepare("SELECT id, artist_name, release_title FROM projects LIMIT 1").first();

    return {
      success: true,
      tests: {
        contextExists: true,
        cloudflareExists: true,
        dbBindingExists: true,
        simpleQueryWorks: !!testQuery,
        testValue: testQuery?.test_value,
        projectTableQueryWorks: !!projectCount,
        totalProjects: projectCount?.count,
        sampleProjectFetched: !!sampleProject,
        sampleProject: sampleProject
      }
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

export default function TestDirectDB({ loaderData }: Route.ComponentProps) {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Direct DB Access Test</h1>

        {loaderData.success ? (
          <div className="space-y-4">
            <div className="bg-green-100 border border-green-500 p-4 rounded">
              <h2 className="font-bold text-green-800">✅ SUCCESS</h2>
              <p className="text-green-700">Direct DB access works in loader!</p>
            </div>

            <div className="bg-white border p-4 rounded">
              <h3 className="font-bold mb-2">Test Results:</h3>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                {JSON.stringify(loaderData.tests, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-red-100 border border-red-500 p-4 rounded">
              <h2 className="font-bold text-red-800">❌ FAILED</h2>
              <p className="text-red-700">Error: {loaderData.error}</p>
            </div>

            <div className="bg-white border p-4 rounded">
              <h3 className="font-bold mb-2">Debug Info:</h3>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                {JSON.stringify(loaderData, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
