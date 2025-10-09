// TEST ROUTE - Verify import from workers/api-handlers/ works
// Access at: http://localhost:5173/test-import-handler

import type { Route } from "./+types/test-import-handler";

export async function loader({ context }: Route.LoaderArgs) {
  try {
    const env = context.cloudflare as { env: { DB: D1Database; BUCKET: R2Bucket } };

    // Test importing from workers/api-handlers/
    const { testHandler } = await import("../../workers/api-handlers/test-handler");

    const result = await testHandler(env.env.DB);

    return {
      success: true,
      handlerResult: result,
      message: "Import from workers/api-handlers/ works!"
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

export default function TestImportHandler({ loaderData }: Route.ComponentProps) {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Import Resolution Test</h1>

        {loaderData.success ? (
          <div className="space-y-4">
            <div className="bg-green-100 border border-green-500 p-4 rounded">
              <h2 className="font-bold text-green-800">✅ SUCCESS</h2>
              <p className="text-green-700">{loaderData.message}</p>
            </div>

            <div className="bg-white border p-4 rounded">
              <h3 className="font-bold mb-2">Handler Result:</h3>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                {JSON.stringify(loaderData.handlerResult, null, 2)}
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
              <h3 className="font-bold mb-2">Stack Trace:</h3>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                {loaderData.stack}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
