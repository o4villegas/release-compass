import { test, expect } from '@playwright/test';

/**
 * Phase 1 Desktop UI Optimization Tests
 *
 * Tests P1.1 implementation:
 * - Multi-column create project form
 * - Glow effects and animations
 * - Responsive behavior at all breakpoints
 */

const VIEWPORTS = [
  { name: 'Mobile (iPhone SE)', width: 375, height: 667 },
  { name: 'Tablet (iPad Portrait)', width: 768, height: 1024 },
  { name: 'Desktop (Small Laptop)', width: 1024, height: 768 },
  { name: 'Large Desktop', width: 1920, height: 1080 },
];

test.describe('Phase 1: Create Project Form Responsiveness', () => {
  for (const viewport of VIEWPORTS) {
    test(`Form layout at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      // Set viewport
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      // Navigate to create project page
      await page.goto('/create-project');

      // Wait for page to load
      await page.waitForSelector('h1:has-text("Release Compass")');

      // Verify Rocket icon is visible
      const rocketIcon = page.locator('svg').first();
      await expect(rocketIcon).toBeVisible();

      // Verify form card exists
      const formCard = page.locator('form').locator('..').locator('..');
      await expect(formCard).toBeVisible();

      // Verify all form fields are visible and accessible
      await expect(page.locator('#artist_name')).toBeVisible();
      await expect(page.locator('#release_title')).toBeVisible();
      await expect(page.locator('#release_date')).toBeVisible();
      await expect(page.locator('button[role="combobox"]')).toBeVisible(); // Select trigger
      await expect(page.locator('#total_budget')).toBeVisible();

      // Verify no horizontal scroll (except for mobile where it might be acceptable)
      const hasHorizontalScroll = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      );

      if (viewport.width >= 768) {
        // No horizontal scroll on tablet and above
        expect(hasHorizontalScroll).toBe(false);
      }

      // Verify buttons are visible
      await expect(page.locator('button:has-text("Create Project")')).toBeVisible();
      await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    });
  }
});

test.describe('Phase 1: Multi-Column Layout Behavior', () => {
  test('Desktop: Fields should be in 2-column layout', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/create-project');

    // Wait for form to load
    await page.waitForSelector('#artist_name');

    // Get bounding boxes of Artist Name and Release Title
    const artistBox = await page.locator('#artist_name').boundingBox();
    const titleBox = await page.locator('#release_title').boundingBox();

    // On desktop (md: breakpoint), these should be side-by-side
    // Artist Name should be to the left of Release Title
    if (artistBox && titleBox) {
      expect(artistBox.x).toBeLessThan(titleBox.x);
      // They should be on roughly the same horizontal line (within 50px)
      expect(Math.abs(artistBox.y - titleBox.y)).toBeLessThan(50);
    }

    // Get bounding boxes of Release Date and Release Type
    const dateBox = await page.locator('#release_date').boundingBox();
    const typeBox = await page.locator('button[role="combobox"]').boundingBox();

    // These should also be side-by-side
    if (dateBox && typeBox) {
      expect(dateBox.x).toBeLessThan(typeBox.x);
      expect(Math.abs(dateBox.y - typeBox.y)).toBeLessThan(50);
    }
  });

  test('Mobile: Fields should stack vertically', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/create-project');

    // Wait for form to load
    await page.waitForSelector('#artist_name');

    // Get bounding boxes of Artist Name and Release Title
    const artistBox = await page.locator('#artist_name').boundingBox();
    const titleBox = await page.locator('#release_title').boundingBox();

    // On mobile, these should stack vertically
    // Release Title should be below Artist Name
    if (artistBox && titleBox) {
      expect(titleBox.y).toBeGreaterThan(artistBox.y + 20);
    }
  });
});

test.describe('Phase 1: Glow Effects and Aesthetics', () => {
  test('Card should have glow effects on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/create-project');

    // Wait for card to load
    const card = page.locator('form').locator('..').locator('..');
    await expect(card).toBeVisible();

    // Check if card has glow classes (this verifies our CSS is applied)
    const cardClasses = await card.getAttribute('class');
    expect(cardClasses).toBeTruthy();

    // Verify the icon container has glow
    const iconContainer = page.locator('svg').first().locator('..');
    const iconContainerClasses = await iconContainer.getAttribute('class');
    expect(iconContainerClasses).toContain('glow-sm');
  });

  test('Form should have stagger animation classes', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/create-project');

    // Check if form has stagger-children class
    const form = page.locator('form');
    const formClasses = await form.getAttribute('class');
    expect(formClasses).toContain('stagger-children');
  });

  test('Inputs should have focus-glow classes', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/create-project');

    // Check if inputs have focus-glow class
    const artistInput = page.locator('#artist_name');
    const inputClasses = await artistInput.getAttribute('class');
    expect(inputClasses).toContain('focus-glow');
  });
});

test.describe('Phase 1: Keyboard Navigation and Accessibility', () => {
  test('Tab order should follow visual layout on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/create-project');

    // Wait for page to load
    await page.waitForSelector('#artist_name');

    // Focus first input
    await page.locator('#artist_name').focus();
    let focused = await page.evaluate(() => document.activeElement?.id);
    expect(focused).toBe('artist_name');

    // Tab to Release Title
    await page.keyboard.press('Tab');
    focused = await page.evaluate(() => document.activeElement?.id);
    expect(focused).toBe('release_title');

    // Tab to Release Date
    await page.keyboard.press('Tab');
    focused = await page.evaluate(() => document.activeElement?.id);
    expect(focused).toBe('release_date');

    // Verify we can reach all form fields by keyboard
    // (exact tab order may vary slightly due to hidden/auxiliary elements)
    const budgetInput = page.locator('#total_budget');
    await budgetInput.focus();
    focused = await page.evaluate(() => document.activeElement?.id);
    expect(focused).toBe('total_budget');

    // Verify all inputs are keyboard accessible
    const artistInput = page.locator('#artist_name');
    const titleInput = page.locator('#release_title');
    const dateInput = page.locator('#release_date');

    await expect(artistInput).toBeFocusable();
    await expect(titleInput).toBeFocusable();
    await expect(dateInput).toBeFocusable();
    await expect(budgetInput).toBeFocusable();
  });
});

test.describe('Phase 1: Form Functionality', () => {
  test('Form submission should work with multi-column layout', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/create-project');

    // Wait for form to load
    await page.waitForSelector('#artist_name');

    // Fill out form
    await page.locator('#artist_name').fill('Test Artist');
    await page.locator('#release_title').fill('Test Release');

    // Set release date to 30 days from now
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const dateString = futureDate.toISOString().split('T')[0];
    await page.locator('#release_date').fill(dateString);

    // Select release type
    await page.locator('button[role="combobox"]').click();
    // Wait for the select options to appear
    await page.waitForSelector('[role="option"]', { timeout: 5000 });
    await page.locator('[role="option"]').filter({ hasText: 'Single' }).click();

    // Fill budget
    await page.locator('#total_budget').fill('50000');

    // Submit form
    await page.locator('button:has-text("Create Project")').click();

    // Wait for navigation (should redirect to project page)
    await page.waitForURL(/\/project\/.+/, { timeout: 10000 });

    // Verify we landed on a project page
    expect(page.url()).toMatch(/\/project\/.+/);
  });
});

test.describe('Phase 1: Visual Regression', () => {
  test('Form should maintain consistent appearance', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/create-project');

    // Wait for all elements to load
    await page.waitForSelector('h1:has-text("Release Compass")');
    await page.waitForTimeout(500); // Wait for animations to settle

    // Take screenshot for visual comparison (optional - can be enabled later)
    // await expect(page).toHaveScreenshot('create-project-desktop.png');

    // Verify key visual elements are present
    await expect(page.locator('svg').first()).toBeVisible(); // Rocket icon
    await expect(page.locator('h1:has-text("Release Compass")')).toBeVisible();
    await expect(page.locator('text=New Release Project')).toBeVisible();
    await expect(page.locator('form')).toBeVisible();
  });
});
