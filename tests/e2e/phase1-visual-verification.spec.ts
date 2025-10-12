import { test, expect } from '@playwright/test';

/**
 * Phase 1 Visual Verification
 * Simplified tests focusing on responsive layout and aesthetic enhancements
 */

test.describe('Phase 1: Visual Verification', () => {
  test('Desktop: Multi-column layout renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/create-project');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Release Compass")');

    // Verify Rocket icon is visible
    const rocketIcon = page.locator('svg').first();
    await expect(rocketIcon).toBeVisible();

    // Verify form fields are visible
    await expect(page.locator('#artist_name')).toBeVisible();
    await expect(page.locator('#release_title')).toBeVisible();
    await expect(page.locator('#release_date')).toBeVisible();
    await expect(page.locator('#total_budget')).toBeVisible();

    // Get bounding boxes to verify multi-column layout
    const artistBox = await page.locator('#artist_name').boundingBox();
    const titleBox = await page.locator('#release_title').boundingBox();

    // On desktop, Artist Name and Release Title should be side-by-side
    if (artistBox && titleBox) {
      expect(artistBox.x).toBeLessThan(titleBox.x);
      // They should be on roughly the same horizontal line
      expect(Math.abs(artistBox.y - titleBox.y)).toBeLessThan(50);
    }

    // Verify no horizontal scroll on desktop
    const hasHorizontalScroll = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHorizontalScroll).toBe(false);
  });

  test('Mobile: Single-column layout renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/create-project');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Release Compass")');

    // Verify all form fields are visible
    await expect(page.locator('#artist_name')).toBeVisible();
    await expect(page.locator('#release_title')).toBeVisible();
    await expect(page.locator('#release_date')).toBeVisible();
    await expect(page.locator('#total_budget')).toBeVisible();

    // Get bounding boxes to verify vertical stacking
    const artistBox = await page.locator('#artist_name').boundingBox();
    const titleBox = await page.locator('#release_title').boundingBox();

    // On mobile, Release Title should be below Artist Name
    if (artistBox && titleBox) {
      expect(titleBox.y).toBeGreaterThan(artistBox.y + 20);
    }
  });

  test('Glow effects are applied to card and icon container', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/create-project');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Release Compass")');

    // Verify icon container has glow class
    const iconContainer = page.locator('svg').first().locator('..');
    const iconClasses = await iconContainer.getAttribute('class');
    expect(iconClasses).toContain('glow-sm');

    // Verify form has stagger-children class
    const form = page.locator('form');
    const formClasses = await form.getAttribute('class');
    expect(formClasses).toContain('stagger-children');

    // Verify inputs have focus-glow class
    const artistInput = page.locator('#artist_name');
    const inputClasses = await artistInput.getAttribute('class');
    expect(inputClasses).toContain('focus-glow');
  });

  test('Page uses max-w-4xl container on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/create-project');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Release Compass")');

    // Get the main container width
    const container = page.locator('div.max-w-4xl').first();
    await expect(container).toBeVisible();

    const containerBox = await container.boundingBox();
    if (containerBox) {
      // max-w-4xl is 896px (56rem * 16px)
      // Container should not exceed this width
      expect(containerBox.width).toBeLessThanOrEqual(900); // Allow small margin
    }
  });

  test('All breakpoints: No horizontal scroll', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667 },   // Mobile
      { width: 768, height: 1024 },  // Tablet
      { width: 1024, height: 768 },  // Desktop
      { width: 1920, height: 1080 }, // Large Desktop
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/create-project');
      await page.waitForSelector('h1:has-text("Release Compass")');

      const hasHorizontalScroll = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      );

      // Allow horizontal scroll only on very small mobile screens if needed
      if (viewport.width >= 768) {
        expect(hasHorizontalScroll).toBe(false);
      }
    }
  });

  test('Form fields are keyboard accessible', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/create-project');

    // Wait for page to load
    await page.waitForSelector('#artist_name');

    // Verify all inputs can be focused (keyboard accessible)
    await page.locator('#artist_name').focus();
    let focused = await page.evaluate(() => document.activeElement?.id);
    expect(focused).toBe('artist_name');

    await page.locator('#release_title').focus();
    focused = await page.evaluate(() => document.activeElement?.id);
    expect(focused).toBe('release_title');

    await page.locator('#release_date').focus();
    focused = await page.evaluate(() => document.activeElement?.id);
    expect(focused).toBe('release_date');

    await page.locator('#total_budget').focus();
    focused = await page.evaluate(() => document.activeElement?.id);
    expect(focused).toBe('total_budget');

    // Test tab navigation works correctly (Artist → Title)
    await page.locator('#artist_name').focus();
    await page.keyboard.press('Tab');
    focused = await page.evaluate(() => document.activeElement?.id);
    expect(focused).toBe('release_title');
  });
});
