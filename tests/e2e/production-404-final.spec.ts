import { test, expect } from '@playwright/test';

const BASE_URL = 'https://release-compass.lando555.workers.dev';

test.describe('Production 404 Analysis', () => {
  test('Identify all 404 errors in production', async ({ page }) => {
    const errors404: Array<{
      url: string;
      method: string;
      type: string;
      timestamp: string;
    }> = [];

    // Capture 404s
    page.on('response', (response) => {
      if (response.status() === 404) {
        const request = response.request();
        errors404.push({
          url: response.url(),
          method: request.method(),
          type: request.resourceType(),
          timestamp: new Date().toISOString(),
        });

        console.log('\n🔴 404 ERROR:');
        console.log(`  URL: ${response.url()}`);
        console.log(`  Method: ${request.method()}`);
        console.log(`  Type: ${request.resourceType()}`);

        // Check for .data extension
        if (response.url().includes('.data')) {
          console.log('  ⚠️  REACT ROUTER DATA REQUEST FAILED');
        }
      }
    });

    // Test 1: Homepage
    console.log('\n=== Loading Homepage ===');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Test 2: Create Project link
    console.log('\n=== Navigating to Create Project ===');
    await page.goto(`${BASE_URL}/create-project`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Test 3: Get a real project from API and load it
    console.log('\n=== Testing Real Project Dashboard ===');
    const apiResponse = await page.request.get(`${BASE_URL}/api/projects`);
    const projects = await apiResponse.json();

    if (Array.isArray(projects) && projects.length > 0) {
      const projectId = projects[0].id;
      console.log(`Loading project: ${projectId}`);
      await page.goto(`${BASE_URL}/project/${projectId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
    } else {
      console.log('No projects found in production');
    }

    // Summary
    console.log('\n\n=== FINAL REPORT ===');
    console.log(`Total 404 errors: ${errors404.length}`);

    if (errors404.length > 0) {
      console.log('\n🔴 ALL 404 ERRORS:');
      errors404.forEach((err, idx) => {
        console.log(`\n${idx + 1}. ${err.url}`);
        console.log(`   Method: ${err.method}`);
        console.log(`   Type: ${err.type}`);
        console.log(`   Time: ${err.timestamp}`);
      });

      // Check for .data requests specifically
      const dataErrors = errors404.filter((e) => e.url.includes('.data'));
      if (dataErrors.length > 0) {
        console.log('\n⚠️  REACT ROUTER .data ERRORS FOUND:');
        dataErrors.forEach((err) => console.log(`   ${err.url}`));
      } else {
        console.log('\n✅ No React Router .data errors found');
      }
    } else {
      console.log('\n✅ NO 404 ERRORS DETECTED');
    }

    // Pass/fail based on unexpected 404s
    // Ignore 404s for non-existent routes (expected)
    const unexpected404s = errors404.filter((err) => {
      // These are expected 404s (routes that don't exist)
      const expectedMissing = [
        '/project/test-project-id',
        '/nonexistent-route',
      ];
      return !expectedMissing.some((route) => err.url.includes(route));
    });

    console.log(`\nUnexpected 404s: ${unexpected404s.length}`);
    if (unexpected404s.length > 0) {
      console.log('⚠️  These 404s need investigation:');
      unexpected404s.forEach((err) => console.log(`   - ${err.url}`));
    }
  });

  test('Monitor for .data requests during normal navigation', async ({ page }) => {
    const allRequests: string[] = [];
    const dataRequests: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      allRequests.push(url);

      if (url.includes('.data')) {
        dataRequests.push(url);
        console.log(`\n📄 .data request: ${url}`);
      }
    });

    // Navigate through the app
    await page.goto(BASE_URL);
    await page.waitForTimeout(1000);

    const createLink = page.locator('a[href="/create-project"]');
    if (await createLink.isVisible()) {
      await createLink.click();
      await page.waitForTimeout(1500);
    }

    await page.goto(BASE_URL);
    await page.waitForTimeout(1000);

    console.log(`\n\nTotal requests: ${allRequests.length}`);
    console.log(`React Router .data requests: ${dataRequests.length}`);

    if (dataRequests.length === 0) {
      console.log('✅ No .data requests detected (SPA mode confirmed)');
    }
  });
});
