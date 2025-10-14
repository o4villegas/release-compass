import { useState } from "react";
import type { Route } from "./+types/test-use-state-ssr";

// Test data from loader
export async function loader({ context }: Route.LoaderArgs) {
  console.log('[LOADER] Running on:', typeof window === 'undefined' ? 'SERVER' : 'CLIENT');

  return {
    items: [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
      { id: '3', name: 'Item 3' },
    ],
    timestamp: new Date().toISOString(),
  };
}

// Test component with useState initializer
export default function TestUseStateSSR({ loaderData }: Route.ComponentProps) {
  console.log('[COMPONENT] Rendering on:', typeof window === 'undefined' ? 'SERVER' : 'CLIENT');
  console.log('[COMPONENT] loaderData items:', loaderData.items.length);

  // Test Pattern 1: useState with initializer function
  const [transformedItems, setTransformedItems] = useState(() => {
    console.log('[INITIALIZER] Running on:', typeof window === 'undefined' ? 'SERVER' : 'CLIENT');
    console.log('[INITIALIZER] Transforming items:', loaderData.items.length);

    return loaderData.items.map(item => ({
      ...item,
      transformed: true,
      upperName: item.name.toUpperCase(),
    }));
  });

  console.log('[COMPONENT] transformedItems length:', transformedItems.length);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">useState Initializer SSR Test</h1>

      <div className="space-y-4">
        <div className="border p-4">
          <h2 className="font-bold">Loader Data (from loaderData prop)</h2>
          <pre className="text-xs">{JSON.stringify(loaderData.items, null, 2)}</pre>
        </div>

        <div className="border p-4 bg-green-100">
          <h2 className="font-bold">Transformed State (from useState initializer)</h2>
          <pre className="text-xs">{JSON.stringify(transformedItems, null, 2)}</pre>
          <p className="mt-2 text-sm">Count: {transformedItems.length}</p>
        </div>

        <div className="border p-4">
          <h2 className="font-bold">Instructions</h2>
          <ol className="list-decimal list-inside text-sm space-y-1">
            <li>Open browser DevTools Console</li>
            <li>Look for [LOADER], [COMPONENT], [INITIALIZER] logs</li>
            <li>Check if SERVER logs appear (SSR running)</li>
            <li>Check if CLIENT logs appear (hydration running)</li>
            <li>Verify transformedItems shows 3 items with uppercase names</li>
            <li>View page source (Ctrl+U) - check if transformed data is in HTML</li>
          </ol>
        </div>

        <div className="border p-4">
          <h2 className="font-bold">Expected Results</h2>
          <ul className="list-disc list-inside text-sm space-y-1">
            <li>✅ transformedItems should have 3 items immediately</li>
            <li>✅ No hydration mismatch errors in console</li>
            <li>✅ Page source should contain uppercase names in HTML</li>
            <li>✅ Both SERVER and CLIENT logs should appear</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
