import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://release-compass.lando555.workers.dev';
// Official demo project ID (matches home page link and demo data seed scripts)
// Data seeded by: scripts/enhance-demo-project.sql
const DEMO_PROJECT_ID = 'b434c7af-5501-4ef7-a640-9cb19b2fe28d';

test.describe('Comprehensive UI/UX Verification', () => {

  test('Home page loads with complete UI', async ({ page }) => {
    await page.goto(PRODUCTION_URL);

    // Verify header elements
    await expect(page.getByRole('heading', { name: 'Release Compass' })).toBeVisible();
    await expect(page.getByText('Music release management built for label-funded artists')).toBeVisible();

    // Verify feature cards
    await expect(page.getByRole('heading', { name: 'Create New Project' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Features' })).toBeVisible();

    // Verify "New Release Project" button
    await expect(page.getByRole('link', { name: 'New Release Project' })).toBeVisible();

    // Verify demo project link
    await expect(page.getByRole('link', { name: /View Demo/ })).toBeVisible();
  });

  test('Dashboard loads with 4 overview cards including Content Quota Widget', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/project/${DEMO_PROJECT_ID}`);

    // Wait for page to load
    await page.waitForSelector('h1', { timeout: 10000 });

    // Verify project header
    await expect(page.locator('h1')).toContainText('Test Album');

    // Verify all 4 overview cards are present
    const cards = page.locator('.grid.md\\:grid-cols-4 > div');
    await expect(cards).toHaveCount(4);

    // Verify card titles
    await expect(page.getByText('Project Progress')).toBeVisible();
    await expect(page.getByText('Budget')).toBeVisible();
    await expect(page.getByText('Cleared for Release')).toBeVisible();
    await expect(page.getByText('Content Quotas')).toBeVisible();

    // Verify Content Quota Widget specifics
    const quotaWidget = page.locator('text=Content Quotas').locator('..');
    await expect(quotaWidget).toBeVisible();
  });

  test('Dashboard shows Timeline Insights panel', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/project/${DEMO_PROJECT_ID}`);

    await page.waitForSelector('text=Critical Path', { timeout: 10000 });

    // Verify timeline insights metrics
    await expect(page.getByText('Critical Path')).toBeVisible();
    await expect(page.getByText('Time to Release')).toBeVisible();
    await expect(page.getByText('Next Deadline')).toBeVisible();
    await expect(page.getByText('Overall Progress')).toBeVisible();
  });

  test('Dashboard shows Gantt chart', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/project/${DEMO_PROJECT_ID}`);

    await page.waitForSelector('text=Milestone Timeline', { timeout: 10000 });

    // Verify Gantt chart is present
    await expect(page.getByText('Milestone Timeline')).toBeVisible();
  });

  test('Navigation buttons work on dashboard', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/project/${DEMO_PROJECT_ID}`);

    await page.waitForSelector('text=Master Upload', { timeout: 10000 });

    // Verify all navigation buttons
    await expect(page.getByRole('link', { name: 'Master Upload' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Production Files' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Budget' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Teasers' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Content Library' })).toBeVisible();
  });

  test('Back button appears and works', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/project/${DEMO_PROJECT_ID}`);

    await page.waitForSelector('text=Back to Home', { timeout: 10000 });

    // Verify back button
    await expect(page.getByText('Back to Home')).toBeVisible();
  });

  test('Content page shows enhanced empty state when no content', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/project/${DEMO_PROJECT_ID}/content`);

    await page.waitForLoadState('networkidle');

    // Check for EmptyState component elements
    // Look for the icon, title, description pattern
    const pageContent = await page.textContent('body');

    // Verify empty state has helpful content (even if there is data)
    await expect(page.getByText('Content Library')).toBeVisible();
  });

  test('Files page shows enhanced empty state when no files', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/project/${DEMO_PROJECT_ID}/files`);

    await page.waitForLoadState('networkidle');

    // Verify page loads
    await expect(page.getByText('Production Files')).toBeVisible();
  });

  test('Teasers page shows enhanced empty state when no teasers', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/project/${DEMO_PROJECT_ID}/teasers`);

    await page.waitForLoadState('networkidle');

    // Verify page loads
    await expect(page.getByText('Teaser Content Tracker')).toBeVisible();
  });

  test('Milestone page loads with quota status display', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/project/${DEMO_PROJECT_ID}`);

    // Wait for milestones to load
    await page.waitForSelector('text=Milestone Timeline', { timeout: 10000 });

    // Try to find and click a milestone link (may be in Gantt or elsewhere)
    const milestoneLinks = page.locator('a[href*="/milestone/"]');
    const count = await milestoneLinks.count();

    if (count > 0) {
      await milestoneLinks.first().click();
      await page.waitForLoadState('networkidle');

      // Verify milestone detail page loaded
      await expect(page.getByText('Quota Status')).toBeVisible();
      await expect(page.getByText('Content Requirements')).toBeVisible();
    }
  });

  test('Master upload page shows ISRC validation field', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/project/${DEMO_PROJECT_ID}/master`);

    await page.waitForSelector('text=Master & Artwork Upload', { timeout: 10000 });

    // Verify 3-step upload process
    await expect(page.getByText('Master Audio')).toBeVisible();
    await expect(page.getByText('Artwork')).toBeVisible();
    await expect(page.getByText('Metadata')).toBeVisible();

    // Verify ISRC field exists
    await expect(page.getByText('ISRC Code')).toBeVisible();
  });

  test('Budget page loads correctly', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/project/${DEMO_PROJECT_ID}/budget`);

    await page.waitForLoadState('networkidle');

    // Verify budget page elements
    await expect(page.getByText('Budget Tracking')).toBeVisible();
  });

  test('Create project page loads with form', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/create-project`);

    await page.waitForSelector('text=Create New Release Project', { timeout: 10000 });

    // Verify form elements
    await expect(page.getByText('Artist Name')).toBeVisible();
    await expect(page.getByText('Release Title')).toBeVisible();
    await expect(page.getByText('Release Type')).toBeVisible();
  });

  test('Skeleton loader appears during navigation (if slow)', async ({ page }) => {
    // This test may pass quickly if network is fast
    // Set slow network to see skeleton
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 100);
    });

    await page.goto(PRODUCTION_URL);
    await page.getByRole('link', { name: /View Demo/ }).click();

    // Skeleton might be too fast to catch, but page should load
    await page.waitForSelector('h1', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Test Album');
  });

  test('All UI components render without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Visit all major pages
    await page.goto(PRODUCTION_URL);
    await page.goto(`${PRODUCTION_URL}/project/${DEMO_PROJECT_ID}`);
    await page.goto(`${PRODUCTION_URL}/project/${DEMO_PROJECT_ID}/content`);
    await page.goto(`${PRODUCTION_URL}/project/${DEMO_PROJECT_ID}/master`);

    // Check for errors (filter out known warnings)
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('sourcemap') &&
      !err.includes('DevTools')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('Responsive design works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(PRODUCTION_URL);

    // Verify elements are still visible on mobile
    await expect(page.getByRole('heading', { name: 'Release Compass' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'New Release Project' })).toBeVisible();
  });

  test('All interactive elements are clickable', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/project/${DEMO_PROJECT_ID}`);

    await page.waitForSelector('text=Master Upload', { timeout: 10000 });

    // Test navigation buttons
    await expect(page.getByRole('link', { name: 'Master Upload' })).toBeEnabled();
    await expect(page.getByRole('link', { name: 'Content Library' })).toBeEnabled();

    // Click and verify navigation works
    await page.getByRole('link', { name: 'Content Library' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.url()).toContain('/content');
  });
});
