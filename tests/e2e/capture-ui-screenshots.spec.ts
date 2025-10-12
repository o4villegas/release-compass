import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const DEMO_PROJECT_ID = 'b434c7af-5501-4ef7-a640-9cb19b2fe28d';

test.describe('Capture UI Screenshots for Audit', () => {
  test('Capture all major pages', async ({ page }) => {
    // Home page
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/screenshots/01-home.png', fullPage: true });

    // Projects list
    await page.goto(`${BASE_URL}/projects`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/screenshots/02-projects-list.png', fullPage: true });

    // Project detail
    await page.goto(`${BASE_URL}/project/${DEMO_PROJECT_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/screenshots/03-project-detail.png', fullPage: true });

    // Milestone detail (Recording)
    await page.goto(`${BASE_URL}/milestone/d3efdf2d-d816-4e70-b605-63e9e4079802`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/screenshots/04-milestone-recording.png', fullPage: true });

    // Milestone detail (Marketing - unmet quota)
    await page.goto(`${BASE_URL}/milestone/53f14235-4ae0-4db5-980b-4c66e9bef746`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/screenshots/05-milestone-marketing.png', fullPage: true });

    // Content library
    await page.goto(`${BASE_URL}/project/${DEMO_PROJECT_ID}/content`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/screenshots/06-content-library.png', fullPage: true });

    // Budget page
    await page.goto(`${BASE_URL}/project/${DEMO_PROJECT_ID}/budget`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/screenshots/07-budget.png', fullPage: true });

    // Files page
    await page.goto(`${BASE_URL}/project/${DEMO_PROJECT_ID}/files`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/screenshots/08-files.png', fullPage: true });
  });
});
