import { test, expect } from '@playwright/test';

const BASE_URL = 'https://release-compass.lando555.workers.dev';

test.describe('Production UI Network Debugging', () => {
  test('Track all network requests and identify 404 errors', async ({ page }) => {
    const failed404Requests: string[] = [];
    const allRequests: { url: string; status: number }[] = [];

    // Listen to all network responses
    page.on('response', (response) => {
      const url = response.url();
      const status = response.status();

      allRequests.push({ url, status });

      if (status === 404) {
        console.log('🔴 404 ERROR:', url);
        failed404Requests.push(url);
      } else if (status >= 400) {
        console.log('⚠️  Error', status, ':', url);
      } else if (url.includes('/api/')) {
        console.log('✅', status, ':', url);
      }
    });

    // Navigate to the home page
    console.log('\n📍 Loading homepage...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Try navigating to project creation
    console.log('\n📍 Clicking "Create New Project"...');
    const createButton = page.getByRole('link', { name: /create new project/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(2000);
    }

    // Try loading a project (if we can find one)
    console.log('\n📍 Attempting to load project dashboard...');
    await page.goto(`${BASE_URL}/project/test-project-id`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Summary
    console.log('\n\n=== NETWORK REQUEST SUMMARY ===');
    console.log(`Total requests: ${allRequests.length}`);
    console.log(`404 errors: ${failed404Requests.length}`);

    if (failed404Requests.length > 0) {
      console.log('\n🔴 FAILED REQUESTS (404):');
      failed404Requests.forEach((url) => {
        console.log(`  - ${url}`);
      });
    }

    // Group by status code
    const statusGroups = allRequests.reduce((acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    console.log('\n📊 Requests by status:');
    Object.entries(statusGroups)
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([status, count]) => {
        console.log(`  ${status}: ${count} requests`);
      });

    // Log all .data requests specifically
    const dataRequests = allRequests.filter((req) => req.url.includes('.data'));
    console.log(`\n📄 React Router .data requests: ${dataRequests.length}`);
    dataRequests.forEach((req) => {
      const icon = req.status === 404 ? '🔴' : req.status >= 400 ? '⚠️' : '✅';
      console.log(`  ${icon} ${req.status}: ${req.url}`);
    });

    // Fail the test if there are 404s
    expect(failed404Requests.length).toBe(0);
  });

  test('Test specific page routes for data loader failures', async ({ page }) => {
    const routes = [
      '/',
      '/project/create',
    ];

    for (const route of routes) {
      console.log(`\n📍 Testing route: ${route}`);

      const failed: string[] = [];

      page.on('response', (response) => {
        if (response.status() === 404) {
          failed.push(response.url());
        }
      });

      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      if (failed.length > 0) {
        console.log(`  🔴 Found ${failed.length} 404 errors on ${route}:`);
        failed.forEach((url) => console.log(`    - ${url}`));
      } else {
        console.log(`  ✅ No 404 errors on ${route}`);
      }
    }
  });
});
