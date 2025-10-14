import { test, expect } from '@playwright/test';

const DEMO_PROJECT_ID = 'b434c7af-5501-4ef7-a640-9cb19b2fe28d';

test.describe('Action Dashboard Icon Verification', () => {
  test('Icons render correctly and are not emoji', async ({ page }) => {
    await page.goto(`http://localhost:5173/project/${DEMO_PROJECT_ID}`);

    // Wait for ActionDashboard to load
    await page.waitForSelector('text=Loading actions...', { state: 'hidden', timeout: 5000 });

    // Verify ActionDashboard header is visible
    const actionHeader = page.locator('#actions h3:has-text("Action")');
    await expect(actionHeader).toBeVisible();

    // Click to expand ActionDashboard
    const expandButton = page.locator('#actions button').first();
    await expandButton.click();

    // Wait for cards to appear
    await page.waitForTimeout(500);

    // Verify lucide-react icons are present (check for SVG elements with lucide classes)
    const lucideIcons = page.locator('#actions svg.lucide');
    const iconCount = await lucideIcons.count();

    // Should have multiple lucide icons (severity icons + Clock + X + AlertTriangle in header)
    expect(iconCount).toBeGreaterThan(0);

    // Verify specific severity icons exist in ActionDashboard cards
    const alertCircleIcons = page.locator('#actions svg.lucide-alert-circle, #actions svg.lucide-circle-alert');
    const checkCircleIcons = page.locator('#actions svg.lucide-check-circle, #actions svg.lucide-circle-check');
    const alertTriangleIcons = page.locator('#actions svg.lucide-alert-triangle, #actions svg.lucide-triangle-alert');

    const totalSeverityIcons =
      (await alertCircleIcons.count()) +
      (await checkCircleIcons.count()) +
      (await alertTriangleIcons.count());

    // Should have at least some severity icons
    expect(totalSeverityIcons).toBeGreaterThan(0);

    // Verify NO emoji in ActionDashboard cards (using specific selector for ActionDashboard only)
    const actionCards = page.locator('#actions [class*="border-l-4"]');
    const cardCount = await actionCards.count();

    if (cardCount > 0) {
      const firstCard = actionCards.first();
      const cardText = await firstCard.textContent();

      // Check that card doesn't contain standalone emoji (🔴, 🟡, 🟢)
      expect(cardText).not.toContain('🔴');
      expect(cardText).not.toContain('🟡');
      expect(cardText).not.toContain('🟢');
    }
  });

  test('Collapsible functionality works with icon changes', async ({ page }) => {
    await page.goto(`http://localhost:5173/project/${DEMO_PROJECT_ID}`);

    // Wait for ActionDashboard to load
    await page.waitForSelector('text=Loading actions...', { state: 'hidden', timeout: 5000 });

    // Find the collapsible button (specifically in #actions div)
    const collapseButton = page.locator('#actions button').first();
    await expect(collapseButton).toBeVisible();

    // Verify collapsed state initially
    const actionCards = page.locator('#actions [class*="border-l-4"]');
    const initiallyVisible = await actionCards.first().isVisible().catch(() => false);

    // Click to expand (if not already expanded)
    if (!initiallyVisible) {
      await collapseButton.click();
      await page.waitForTimeout(500);
    }

    // Verify cards are visible after expand
    await expect(actionCards.first()).toBeVisible();

    // Click to collapse
    await collapseButton.click();
    await page.waitForTimeout(500);

    // Verify cards are hidden after collapse
    await expect(actionCards.first()).not.toBeVisible();
  });

  test('No ActionDashboard-specific console errors', async ({ page }) => {
    const actionDashboardErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Only catch errors specifically about ActionDashboard component or icon rendering
        // Exclude MilestoneGantt hydration errors (even if ActionDashboard is in component tree)
        if (
          (text.includes('getSeverityIcon') ||
           text.includes('lucide') ||
           text.includes('AlertCircle') ||
           text.includes('CheckCircle')) &&
          !text.includes('MilestoneGantt') &&
          !text.includes('hydrated')
        ) {
          actionDashboardErrors.push(text);
        }
      }
    });

    await page.goto(`http://localhost:5173/project/${DEMO_PROJECT_ID}`);

    // Wait for ActionDashboard to load
    await page.waitForSelector('text=Loading actions...', { state: 'hidden', timeout: 5000 });

    // Expand dashboard
    const collapseButton = page.locator('#actions button').first();
    if (await collapseButton.isVisible()) {
      await collapseButton.click();
      await page.waitForTimeout(500);
    }

    // Check for ActionDashboard-specific errors only (excludes pre-existing hydration issues)
    expect(actionDashboardErrors).toHaveLength(0);
  });
});
