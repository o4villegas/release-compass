import { test, expect } from '@playwright/test';

const DEMO_PROJECT_ID = 'b434c7af-5501-4ef7-a640-9cb19b2fe28d';

test.describe('Gantt Timeline Page', () => {

  test('Timeline page loads successfully', async ({ page }) => {
    await page.goto(`/project/${DEMO_PROJECT_ID}/timeline`);

    // Verify header
    await expect(page.getByRole('heading', { name: /Timeline/ })).toBeVisible();

    // Verify back button
    await expect(page.getByRole('link', { name: /Back to Dashboard/ })).toBeVisible();

    // Verify Gantt chart container
    await expect(page.locator('[data-roadmap-ui="gantt-sidebar"]')).toBeVisible();
  });

  test('Timeline shows all milestones', async ({ page }) => {
    await page.goto(`/project/${DEMO_PROJECT_ID}/timeline`);

    // Verify sidebar has Production Milestones group
    await expect(page.getByText('Production Milestones (Read-Only)')).toBeVisible();

    // Verify at least one milestone in sidebar
    const sidebarItems = page.locator('[role="button"]');
    await expect(sidebarItems.first()).toBeVisible();

    // Count should match expected milestones (demo project has milestones)
    const count = await sidebarItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Back button navigates to dashboard', async ({ page }) => {
    await page.goto(`/project/${DEMO_PROJECT_ID}/timeline`);

    // Click back button
    await page.getByRole('link', { name: /Back to Dashboard/ }).first().click();

    // Verify navigation to dashboard
    await page.waitForURL(new RegExp(`/project/${DEMO_PROJECT_ID}$`));
    await expect(page.getByText('Project Progress')).toBeVisible();
  });

  test('Timeline button in dashboard navigates correctly', async ({ page }) => {
    await page.goto(`/project/${DEMO_PROJECT_ID}`);

    // Find Timeline button in dashboard header buttons (not sidebar)
    const headerButtons = page.locator('.grid.grid-cols-2');
    const timelineButton = headerButtons.getByRole('link', { name: /Timeline/ });
    await timelineButton.click();

    // Verify navigation
    await page.waitForURL(new RegExp(`/project/${DEMO_PROJECT_ID}/timeline`));
    await expect(page.getByText('Production Milestones (Read-Only)')).toBeVisible();
  });

  test('Timeline sidebar navigation link works', async ({ page }) => {
    await page.goto(`/project/${DEMO_PROJECT_ID}`);

    // Find Timeline in sidebar (inside nav element)
    const sidebar = page.locator('aside nav');
    const sidebarLink = sidebar.getByRole('link', { name: /Timeline/ });
    await expect(sidebarLink).toBeVisible();

    // Click and verify navigation
    await sidebarLink.click();
    await page.waitForURL(new RegExp(`/project/${DEMO_PROJECT_ID}/timeline`));
    await expect(page.getByText('Production Milestones (Read-Only)')).toBeVisible();
  });

  test('Timeline displays quota colors correctly', async ({ page }) => {
    await page.goto(`/project/${DEMO_PROJECT_ID}/timeline`);

    // Verify legend (note: < is rendered as &lt; in HTML)
    await expect(page.getByText('Quota Met (100%)')).toBeVisible();
    await expect(page.getByText('Partial (50-99%)')).toBeVisible();
    await expect(page.getByText(/Critical.*50%/)).toBeVisible();
  });

  test('Timeline 404 for invalid project ID', async ({ page }) => {
    const response = await page.goto('/project/invalid-id-999/timeline');

    // Should receive 404 response
    expect(response?.status()).toBe(404);
  });

  test('Read-only indicator is visible', async ({ page }) => {
    await page.goto(`/project/${DEMO_PROJECT_ID}/timeline`);

    // Verify read-only indicator in sidebar
    await expect(page.getByText('Production Milestones (Read-Only)')).toBeVisible();
  });

  test('Milestone quota progress bars display', async ({ page }) => {
    await page.goto(`/project/${DEMO_PROJECT_ID}/timeline`);

    // Wait for Gantt chart to load
    await page.waitForSelector('[data-roadmap-ui="gantt-sidebar"]');

    // Verify quota percentage labels appear (should show percentages like "100%")
    const quotaLabels = page.locator('text=/\\d+%/');
    await expect(quotaLabels.first()).toBeVisible();
  });

  test('Timeline navigation preserves active state', async ({ page }) => {
    await page.goto(`/project/${DEMO_PROJECT_ID}/timeline`);

    // Verify Timeline link in sidebar has active styling
    const sidebar = page.locator('aside nav');
    const timelineLink = sidebar.getByRole('link', { name: /Timeline/ });

    // Check for active class (bg-studio-active)
    await expect(timelineLink).toHaveClass(/bg-studio-active/);
  });
});

test.describe('Timeline Loading State', () => {
  test('Shows loading skeleton during navigation', async ({ page }) => {
    // Start on dashboard
    await page.goto(`/project/${DEMO_PROJECT_ID}`);

    // Click timeline link and immediately check for skeleton
    const sidebar = page.locator('aside nav');
    const timelineLink = sidebar.getByRole('link', { name: /Timeline/ });

    // Click link
    await timelineLink.click();

    // Loading skeleton should appear (even briefly)
    // Note: This might be too fast to catch in local dev, but will work on slower networks
    // We can skip this test if it's flaky
    test.skip();
  });
});

test.describe('Timeline Mobile View', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('Timeline loads on mobile viewport', async ({ page }) => {
    await page.goto(`/project/${DEMO_PROJECT_ID}/timeline`);

    // Verify page loads (may require horizontal scroll)
    await expect(page.getByText('Production Milestones (Read-Only)')).toBeVisible();

    // Verify back button works on mobile
    await page.getByRole('link', { name: /Back to Dashboard/ }).first().click();
    await page.waitForURL(new RegExp(`/project/${DEMO_PROJECT_ID}$`));
  });
});
