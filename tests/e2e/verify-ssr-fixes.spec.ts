import { test, expect } from '@playwright/test';

/**
 * Quick SSR Verification Test
 *
 * Verifies that the 3 fixed routes load properly with SSR:
 * - Project dashboard (project.$id.tsx) ✅
 * - Milestone details (milestone.$id.tsx) ✅
 * - Budget page (project.$id.budget.tsx) ✅
 *
 * Uses the existing test project from production.
 */

const PRODUCTION_URL = 'https://release-compass.lando555.workers.dev';
const TEST_PROJECT_ID = '591d7f6f-cfe4-447f-9e3d-77ca71ef634b'; // From previous session

test.describe('Verify SSR Fixes in Production', () => {
  test('Project dashboard loads with SSR (no .data 404s)', async ({ page }) => {
    // Monitor network for .data 404 errors
    const dataErrors: string[] = [];
    page.on('response', (response) => {
      if (response.status() === 404 && response.url().includes('.data')) {
        dataErrors.push(response.url());
      }
    });

    await page.goto(`${PRODUCTION_URL}/project/${TEST_PROJECT_ID}`);

    // Verify page loaded
    await expect(page.locator('h1')).toContainText('Fix Test', { timeout: 10000 });
    await expect(page.locator('text=Project Progress')).toBeVisible();
    await expect(page.locator('text=Cleared for Release')).toBeVisible();

    // Check for .data errors
    if (dataErrors.length > 0) {
      console.log(`❌ Found ${dataErrors.length} .data 404 errors:`);
      dataErrors.forEach(url => console.log(`  - ${url}`));
      throw new Error(`Project dashboard has ${dataErrors.length} .data 404 error(s)`);
    }

    console.log('✅ Project dashboard: No .data 404 errors');
  });

  test('Milestone page loads with SSR (no .data 404s)', async ({ page }) => {
    // First get a milestone ID from the project page
    await page.goto(`${PRODUCTION_URL}/project/${TEST_PROJECT_ID}`);
    const milestoneLink = page.locator('a:has-text("View Details")').first();
    const href = await milestoneLink.getAttribute('href');
    const milestoneId = href?.split('/milestone/')[1];

    expect(milestoneId).toBeTruthy();

    // Monitor network for .data 404 errors
    const dataErrors: string[] = [];
    page.on('response', (response) => {
      if (response.status() === 404 && response.url().includes('.data')) {
        dataErrors.push(response.url());
      }
    });

    await page.goto(`${PRODUCTION_URL}/milestone/${milestoneId}`);

    // Verify page loaded
    await expect(page.locator('h1')).toContainText('Complete', { timeout: 10000 });
    await expect(page.locator('text=Due Date')).toBeVisible();
    await expect(page.locator('text=Quota Status')).toBeVisible();

    // Check for .data errors
    if (dataErrors.length > 0) {
      console.log(`❌ Found ${dataErrors.length} .data 404 errors:`);
      dataErrors.forEach(url => console.log(`  - ${url}`));
      throw new Error(`Milestone page has ${dataErrors.length} .data 404 error(s)`);
    }

    console.log('✅ Milestone page: No .data 404 errors');
  });

  test('Budget page loads with SSR (no .data 404s)', async ({ page }) => {
    // Monitor network for .data 404 errors
    const dataErrors: string[] = [];
    page.on('response', (response) => {
      if (response.status() === 404 && response.url().includes('.data')) {
        dataErrors.push(response.url());
      }
    });

    await page.goto(`${PRODUCTION_URL}/project/${TEST_PROJECT_ID}/budget`);

    // Verify page loaded
    await expect(page.locator('h1')).toContainText('Budget Management', { timeout: 10000 });
    await expect(page.locator('text=Total Budget')).toBeVisible();
    await expect(page.locator('text=Production')).toBeVisible();

    // Check for .data errors
    if (dataErrors.length > 0) {
      console.log(`❌ Found ${dataErrors.length} .data 404 errors:`);
      dataErrors.forEach(url => console.log(`  - ${url}`));
      throw new Error(`Budget page has ${dataErrors.length} .data 404 error(s)`);
    }

    console.log('✅ Budget page: No .data 404 errors');
  });

  test('Verify remaining routes still have .data issues', async ({ page }) => {
    console.log('\n=== Checking unfixed routes for .data errors ===');

    const routes = [
      { name: 'Content Library', path: `/project/${TEST_PROJECT_ID}/content`, expected: 'Content Library' },
      { name: 'Production Files', path: `/project/${TEST_PROJECT_ID}/files`, expected: 'Production Files' },
      { name: 'Master Upload', path: `/project/${TEST_PROJECT_ID}/master`, expected: 'Master' },
      { name: 'Teasers', path: `/project/${TEST_PROJECT_ID}/teasers`, expected: 'Teaser' },
    ];

    for (const route of routes) {
      const dataErrors: string[] = [];
      page.on('response', (response) => {
        if (response.status() === 404 && response.url().includes('.data')) {
          dataErrors.push(response.url());
        }
      });

      try {
        await page.goto(`${PRODUCTION_URL}${route.path}`, { timeout: 15000 });
        await page.waitForLoadState('networkidle', { timeout: 5000 });

        if (dataErrors.length > 0) {
          console.log(`⚠️ ${route.name}: ${dataErrors.length} .data 404 error(s) (expected - not yet fixed)`);
        } else {
          console.log(`✓ ${route.name}: No .data errors (may already be fixed!)`);
        }
      } catch (error) {
        console.log(`⚠️ ${route.name}: Failed to load (${error})`);
      }
    }
  });
});
