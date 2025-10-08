import { test, expect } from '@playwright/test';

const BASE_URL = 'https://release-compass.lando555.workers.dev';

test.describe('404 Investigation', () => {
  test('Capture all requests with detailed logging', async ({ page }) => {
    const requests: Array<{
      url: string;
      status: number;
      method: string;
      resourceType: string;
    }> = [];

    // Capture all requests
    page.on('response', async (response) => {
      const request = response.request();
      const url = response.url();
      const status = response.status();
      const method = request.method();
      const resourceType = request.resourceType();

      requests.push({ url, status, method, resourceType });

      // Log 404s immediately with full context
      if (status === 404) {
        console.log('\n🔴 404 ERROR DETECTED:');
        console.log(`  URL: ${url}`);
        console.log(`  Method: ${method}`);
        console.log(`  Type: ${resourceType}`);
        console.log(`  Timestamp: ${new Date().toISOString()}`);

        // Check if it's a .data request
        if (url.includes('.data')) {
          console.log('  ⚠️  THIS IS A REACT ROUTER DATA REQUEST');
        }
      }
    });

    // Test 1: Homepage
    console.log('\n=== TEST 1: Homepage ===');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Test 2: Create Project page (correct route)
    console.log('\n=== TEST 2: Create Project Page ===');
    await page.goto(`${BASE_URL}/create-project`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Test 3: Create a real project
    console.log('\n=== TEST 3: Submit Project Creation Form ===');
    const userUuid = `test-${Date.now()}`;

    // Fill out the form
    await page.fill('input[name="artist_name"]', 'Test Artist 404 Debug');
    await page.fill('input[name="release_title"]', 'Test Album 404');
    await page.fill('input[name="release_date"]', '2025-12-31');
    await page.selectOption('select[name="release_type"]', 'album');
    await page.fill('input[name="total_budget"]', '50000');
    await page.fill('input[name="user_uuid"]', userUuid);

    // Submit and wait for navigation
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Get current URL after submission
    const currentUrl = page.url();
    console.log(`Current URL after submit: ${currentUrl}`);

    // Test 4: Try to access a project dashboard
    console.log('\n=== TEST 4: Access Project Dashboard ===');
    // Let's use a known project ID from the API
    const response = await fetch(`${BASE_URL}/api/projects`);
    const projects = await response.json();

    if (projects.length > 0) {
      const projectId = projects[0].id;
      console.log(`Accessing project: ${projectId}`);
      await page.goto(`${BASE_URL}/project/${projectId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
    }

    // Summary
    console.log('\n\n=== REQUEST SUMMARY ===');
    console.log(`Total requests: ${requests.length}`);

    const byStatus = requests.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    console.log('\nBy Status Code:');
    Object.entries(byStatus).sort(([a], [b]) => Number(a) - Number(b)).forEach(([status, count]) => {
      const icon = status === '404' ? '🔴' : status.startsWith('2') ? '✅' : '⚠️';
      console.log(`  ${icon} ${status}: ${count} requests`);
    });

    // Show all 404s
    const failures = requests.filter((r) => r.status === 404);
    if (failures.length > 0) {
      console.log('\n🔴 ALL 404 ERRORS:');
      failures.forEach((r) => {
        console.log(`  [${r.method}] ${r.resourceType}: ${r.url}`);
      });
    }

    // Show .data requests
    const dataRequests = requests.filter((r) => r.url.includes('.data'));
    if (dataRequests.length > 0) {
      console.log('\n📄 React Router .data requests:');
      dataRequests.forEach((r) => {
        const icon = r.status === 404 ? '🔴' : r.status >= 400 ? '⚠️' : '✅';
        console.log(`  ${icon} [${r.status}] ${r.url}`);
      });
    } else {
      console.log('\n📄 No React Router .data requests detected');
    }

    // Don't fail the test, just report
    console.log(`\n${failures.length === 0 ? '✅' : '⚠️'} Test completed with ${failures.length} 404 error(s)`);
  });

  test('Check if .data requests happen during navigation', async ({ page }) => {
    let dataRequestFound = false;

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('.data')) {
        dataRequestFound = true;
        console.log('\n📄 .data request detected:');
        console.log(`  URL: ${url}`);
        console.log(`  Method: ${request.method()}`);
      }
    });

    // Navigate through the app
    await page.goto(BASE_URL);
    await page.waitForTimeout(1000);

    // Click to create project
    const createLink = page.locator('a[href="/create-project"]');
    if (await createLink.isVisible()) {
      console.log('\n📍 Clicking "Create Project" link...');
      await createLink.click();
      await page.waitForTimeout(2000);
    }

    console.log(`\n.data requests detected: ${dataRequestFound ? 'YES' : 'NO'}`);
  });
});
