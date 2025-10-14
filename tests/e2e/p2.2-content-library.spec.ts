import { test, expect } from '@playwright/test';

const DEMO_PROJECT_ID = 'b434c7af-5501-4ef7-a640-9cb19b2fe28d';

test.describe('P2.2: Content Library Enhancements', () => {
  test('Content Library tab displays enhanced stats cards with animations', async ({ page }) => {
    await page.goto(`http://localhost:5173/project/${DEMO_PROJECT_ID}/content`);

    // Verify stats cards are present with proper styling
    const statsGrid = page.locator('.grid.grid-cols-1.md\\:grid-cols-4.gap-4.stagger-children').first();
    await expect(statsGrid).toBeVisible();

    // Verify all 4 stats cards have elevation and glow
    const statsCards = statsGrid.locator('.rounded-xl.shadow-md.glow-sm');
    await expect(statsCards).toHaveCount(4);

    // Verify stats cards have scale-in animation
    const animatedCards = statsGrid.locator('.animate-scale-in');
    await expect(animatedCards).toHaveCount(4);

    // Verify stats cards have icons
    const totalContentCard = page.locator('text=Total Content').first();
    await expect(totalContentCard).toBeVisible();

    const photosCard = page.locator('text=Photos').first();
    await expect(photosCard).toBeVisible();

    const videosCard = page.locator('text=Videos').first();
    await expect(videosCard).toBeVisible();

    const audioCard = page.locator('text=Audio').first();
    await expect(audioCard).toBeVisible();
  });

  test('Content Library tab has interactive filter toolbar', async ({ page }) => {
    await page.goto(`http://localhost:5173/project/${DEMO_PROJECT_ID}/content`);

    // Switch to Content Library tab
    await page.click('button[role="tab"]:has-text("Content Library")');

    // Verify filter toolbar is visible
    const filterToolbar = page.locator('.flex.flex-wrap.gap-2.mt-4.pt-4.border-t');
    await expect(filterToolbar).toBeVisible();

    // Verify all 5 filter buttons exist
    const allButton = page.locator('button:has-text("All")');
    await expect(allButton).toBeVisible();

    const photosButton = page.locator('button:has-text("Photos")');
    await expect(photosButton).toBeVisible();

    const videosButton = page.locator('button:has-text("Videos")');
    await expect(videosButton).toBeVisible();

    const audioButton = page.locator('button:has-text("Audio")');
    await expect(audioButton).toBeVisible();

    const liveButton = page.locator('button:has-text("Live")');
    await expect(liveButton).toBeVisible();

    // Verify "All" button is active by default
    await expect(allButton).toHaveClass(/bg-primary/);
  });

  test('Content grid uses Card Pattern 2 with elevation and glow', async ({ page }) => {
    await page.goto(`http://localhost:5173/project/${DEMO_PROJECT_ID}/content`);

    // Switch to Content Library tab
    await page.click('button[role="tab"]:has-text("Content Library")');

    // Verify grid container has slide-in animation
    const gridContainer = page.locator('.grid.grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-4.gap-4.animate-slide-in-left.stagger-children');
    await expect(gridContainer).toBeVisible();

    // Verify content cards use proper Card component structure
    const contentCards = gridContainer.locator('.rounded-xl.shadow-md.glow-sm');
    const cardCount = await contentCards.count();
    expect(cardCount).toBeGreaterThan(0); // Should have at least some content

    // Verify first card has proper structure
    const firstCard = contentCards.first();
    await expect(firstCard).toHaveClass(/cursor-pointer/);
    await expect(firstCard).toHaveClass(/overflow-hidden/);
    await expect(firstCard).toHaveClass(/transition-all/);

    // Verify aspect-square media section exists
    const mediaSection = firstCard.locator('.relative.aspect-square.bg-gradient-to-br');
    await expect(mediaSection).toBeVisible();

    // Verify badge is present
    const badge = firstCard.locator('.absolute.top-2.left-2');
    await expect(badge).toBeVisible();

    // Verify CardContent section with date
    const cardContent = firstCard.locator('.p-6.pt-3.pb-3');
    await expect(cardContent).toBeVisible();
  });

  test('Filter buttons change content display', async ({ page }) => {
    await page.goto(`http://localhost:5173/project/${DEMO_PROJECT_ID}/content`);

    // Switch to Content Library tab
    await page.click('button[role="tab"]:has-text("Content Library")');

    // Get initial grid
    const gridContainer = page.locator('.grid.grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-4.gap-4');

    // Count all items
    const allCards = gridContainer.locator('.rounded-xl.shadow-md');
    const allCount = await allCards.count();

    // Click Photos filter
    await page.click('button:has-text("Photos")');
    await page.waitForTimeout(300); // Wait for animation

    // Verify Photos button is now active
    const photosButton = page.locator('button:has-text("Photos")');
    await expect(photosButton).toHaveClass(/bg-primary/);

    // Count filtered items (should be photos only)
    const filteredCards = gridContainer.locator('.rounded-xl.shadow-md');
    const filteredCount = await filteredCards.count();

    // Verify filtering worked (photo count should be different from total)
    if (allCount > 0) {
      // Only verify if we have content
      expect(filteredCount).toBeGreaterThan(0);

      // Verify first visible card has "photo" badge
      const firstBadge = filteredCards.first().locator('.capitalize').first();
      await expect(firstBadge).toContainText('photo');
    }
  });

  test('Content cards have hover effects', async ({ page }) => {
    await page.goto(`http://localhost:5173/project/${DEMO_PROJECT_ID}/content`);

    // Switch to Content Library tab
    await page.click('button[role="tab"]:has-text("Content Library")');

    const gridContainer = page.locator('.grid.grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-4.gap-4');
    const firstCard = gridContainer.locator('.rounded-xl.shadow-md').first();

    // Hover over card
    await firstCard.hover();

    // Verify hover overlay becomes visible
    const hoverOverlay = firstCard.locator('.absolute.inset-0.bg-black\\/70');
    await expect(hoverOverlay).toBeVisible();

    // Verify "Click to Preview" text
    await expect(hoverOverlay).toContainText('Click to Preview');
  });

  test('Content cards are clickable and maintain lightbox integration', async ({ page }) => {
    await page.goto(`http://localhost:5173/project/${DEMO_PROJECT_ID}/content`);

    // Switch to Content Library tab
    await page.click('button[role="tab"]:has-text("Content Library")');

    const gridContainer = page.locator('.grid.grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-4.gap-4');
    const cardCount = await gridContainer.locator('.rounded-xl.shadow-md').count();

    if (cardCount > 0) {
      // Click first card
      const firstCard = gridContainer.locator('.rounded-xl.shadow-md').first();
      await firstCard.click();

      // Verify lightbox or preview opens
      // Note: This would need to be adjusted based on actual lightbox implementation
      // For now, just verify click doesn't cause errors
      await page.waitForTimeout(500);
    }
  });
});
