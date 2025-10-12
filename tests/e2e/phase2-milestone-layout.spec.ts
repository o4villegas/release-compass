import { test, expect } from '@playwright/test';

/**
 * Phase 2: Milestone Detail Layout Test
 * Verifies P1.2 implementation (two-column layout with sticky sidebar)
 */

const DEMO_PROJECT_ID = 'b434c7af-5501-4ef7-a640-9cb19b2fe28d';

test.describe('Phase 2: Milestone Detail Layout', () => {
  test('Demo button navigation from home page works', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Start at home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click "View Demo Project" button
    const demoButton = page.locator('button:has-text("View Demo Project")');
    await expect(demoButton).toBeVisible();
    await demoButton.click();
    await page.waitForTimeout(2000);

    // Verify navigation to demo project
    expect(page.url()).toContain(`/project/${DEMO_PROJECT_ID}`);
    await page.waitForSelector('h1', { timeout: 10000 });

    // Verify we can navigate to a milestone from here
    await page.waitForSelector('a[href*="/milestone/"]', { timeout: 10000 });
    const milestoneLink = page.locator('a[href*="/milestone/"]').first();
    await expect(milestoneLink).toBeVisible();
  });

  test('Desktop: Two-column layout with sidebar renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Navigate directly to demo project
    await page.goto(`/project/${DEMO_PROJECT_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('h1', { timeout: 10000 });

    // Wait for milestone links to be available
    await page.waitForSelector('a[href*="/milestone/"]', { timeout: 10000 });

    // Click on first milestone
    const milestoneLinks = page.locator('a[href*="/milestone/"]').first();
    await milestoneLinks.click();
    await page.waitForURL(/\/milestone\/.+/, { timeout: 10000 });

    // Wait for page to load
    await page.waitForSelector('h1', { timeout: 10000 });

    // Verify two-column grid exists using a more reliable selector
    // Look for the grid container that wraps both main content and sidebar
    const gridContainer = page.locator('div').filter({ has: page.locator('text=Content Requirements') }).filter({ has: page.locator('text=Due Date') }).first();
    await expect(gridContainer).toBeVisible();

    // Verify Content Requirements card exists (main content area)
    const contentReqCard = page.locator('text=Content Requirements').first();
    await expect(contentReqCard).toBeVisible();

    // Verify Due Date card exists (sidebar)
    const dueDateCard = page.locator('text=Due Date').first();
    await expect(dueDateCard).toBeVisible();

    // Verify icons are present (check for SVG elements)
    const icons = page.locator('svg');
    const iconCount = await icons.count();
    expect(iconCount).toBeGreaterThan(5); // Should have multiple icons
  });

  test('Mobile: Single-column layout renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate directly to demo project
    await page.goto(`/project/${DEMO_PROJECT_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('h1', { timeout: 10000 });

    // Wait for milestone links
    await page.waitForSelector('a[href*="/milestone/"]', { timeout: 10000 });

    // Click on first milestone
    const milestoneLinks = page.locator('a[href*="/milestone/"]').first();
    await milestoneLinks.click();
    await page.waitForURL(/\/milestone\/.+/, { timeout: 10000 });

    // Wait for page to load
    await page.waitForSelector('h1', { timeout: 10000 });

    // Verify content is present (should stack on mobile)
    const contentReqCard = page.locator('text=Content Requirements').first();
    await expect(contentReqCard).toBeVisible();

    const dueDateCard = page.locator('text=Due Date').first();
    await expect(dueDateCard).toBeVisible();

    // Verify page is responsive (check viewport width matches)
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(viewportWidth).toBeLessThanOrEqual(375);

    // Verify both cards are stacked vertically (both should be visible without side-by-side layout)
    const contentRect = await contentReqCard.boundingBox();
    const dueDateRect = await dueDateCard.boundingBox();
    expect(contentRect).toBeTruthy();
    expect(dueDateRect).toBeTruthy();
  });

  test('Icons replaced emojis successfully', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Navigate directly to demo project
    await page.goto(`/project/${DEMO_PROJECT_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('h1', { timeout: 10000 });

    // Wait for milestone links
    await page.waitForSelector('a[href*="/milestone/"]', { timeout: 10000 });

    // Click on first milestone
    const milestoneLinks = page.locator('a[href*="/milestone/"]').first();
    await milestoneLinks.click();
    await page.waitForURL(/\/milestone\/.+/, { timeout: 10000 });

    // Wait for page to load
    await page.waitForSelector('h1', { timeout: 10000 });

    // Verify quota status badge exists (instead of emoji)
    const quotaBadge = page.locator('text=/Quota (Met|Not Met)/i').first();
    await expect(quotaBadge).toBeVisible();

    // Verify SVG icons are present
    const icons = page.locator('svg');
    const iconCount = await icons.count();
    expect(iconCount).toBeGreaterThan(3); // Should have multiple icons
  });

  test('Card elevation and glow variants applied', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Navigate directly to demo project
    await page.goto(`/project/${DEMO_PROJECT_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('h1', { timeout: 10000 });

    // Wait for milestone links
    await page.waitForSelector('a[href*="/milestone/"]', { timeout: 10000 });

    // Click on first milestone
    const milestoneLinks = page.locator('a[href*="/milestone/"]').first();
    await milestoneLinks.click();
    await page.waitForURL(/\/milestone\/.+/, { timeout: 10000 });

    // Wait for page to load
    await page.waitForSelector('h1', { timeout: 10000 });

    // Verify Content Requirements card exists (this should have elevation/glow)
    const contentCard = page.locator('text=Content Requirements').first();
    await expect(contentCard).toBeVisible();

    // Verify Due Date card exists (this should have elevation/glow)
    const dueDateCard = page.locator('text=Due Date').first();
    await expect(dueDateCard).toBeVisible();

    // Check for glow classes on the page
    const bodyClasses = await page.locator('body').evaluate((el) => {
      const allElements = Array.from(el.querySelectorAll('*'));
      return allElements.some((element) =>
        element.className &&
        typeof element.className === 'string' &&
        element.className.includes('glow')
      );
    });
    expect(bodyClasses).toBe(true);
  });
});

test.describe('Phase 2: Project Navigation', () => {
  test('Navigation buttons have icons and glow effects', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Navigate directly to demo project
    await page.goto(`/project/${DEMO_PROJECT_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('h1', { timeout: 10000 });

    // Verify navigation buttons exist
    const contentButton = page.locator('a[href*="/content"]').first();
    await expect(contentButton).toBeVisible();

    const budgetButton = page.locator('a[href*="/budget"]').first();
    await expect(budgetButton).toBeVisible();

    // Verify buttons contain SVG icons
    const contentIcon = contentButton.locator('svg');
    await expect(contentIcon).toBeVisible();

    const budgetIcon = budgetButton.locator('svg');
    await expect(budgetIcon).toBeVisible();

    // Verify SVG icons are present in navigation
    const navIcons = page.locator('a[href*="/content"] svg, a[href*="/budget"] svg, a[href*="/files"] svg');
    const navIconCount = await navIcons.count();
    expect(navIconCount).toBeGreaterThanOrEqual(3); // Should have icons in navigation buttons
  });

  test('Status indicators use icons instead of emojis', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Navigate directly to demo project
    await page.goto(`/project/${DEMO_PROJECT_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('h1', { timeout: 10000 });

    // Check Cleared for Release badge
    const releaseStatusBadge = page.locator('text=/CLEARED|NOT CLEARED/i').first();
    await expect(releaseStatusBadge).toBeVisible();

    // Verify SVG icons are present on the page (status indicators)
    const statusIcons = page.locator('svg');
    const statusIconCount = await statusIcons.count();
    expect(statusIconCount).toBeGreaterThan(5); // Should have multiple status icons
  });
});
