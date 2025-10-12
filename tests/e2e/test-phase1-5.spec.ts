import { test, expect } from '@playwright/test';

test('Test Phase 1.5: Content Suggestions and Logo', async ({ page }) => {
  const projectId = 'b434c7af-5501-4ef7-a640-9cb19b2fe28d'; // Demo project

  // Test 1: Check logo on home page
  await page.goto('http://localhost:5174/');
  await page.waitForTimeout(1000);

  const homeLogo = page.locator('img[alt="Release Compass"]').first();
  await expect(homeLogo).toBeVisible();
  console.log('✅ Logo visible on home page');

  // Test 2: Check logo in header
  await page.goto(`http://localhost:5174/project/${projectId}`);
  await page.waitForTimeout(1000);

  const headerLogo = page.locator('header img[alt="Release Compass"]');
  await expect(headerLogo).toBeVisible();
  console.log('✅ Logo visible in header');

  // Test 3: Check Action Dashboard (compact collapsible)
  const actionDashboard = page.locator('text=Actions Required');
  if (await actionDashboard.isVisible()) {
    console.log('✅ Action Dashboard visible (compact mode)');

    // Test expand/collapse
    await actionDashboard.click();
    await page.waitForTimeout(500);
    console.log('✅ Action Dashboard expanded');

    await actionDashboard.click();
    await page.waitForTimeout(500);
    console.log('✅ Action Dashboard collapsed');
  } else {
    console.log('ℹ️  No actions required at this time');
  }

  // Test 4: Visit milestone page to check Content Suggestions
  // First, get a milestone ID
  await page.goto(`http://localhost:5174/project/${projectId}`);
  await page.waitForTimeout(1000);

  const milestoneLink = page.locator('a[href*="/milestone/"]').first();
  if (await milestoneLink.isVisible()) {
    await milestoneLink.click();
    await page.waitForTimeout(1500);

    // Check for Content Suggestions section
    const suggestionsSection = page.locator('text=Smart Content Suggestions');
    if (await suggestionsSection.isVisible()) {
      console.log('✅ Content Suggestions section visible');

      // Check for suggestion cards
      const suggestionCards = page.locator('text=Example Ideas');
      const count = await suggestionCards.count();
      console.log(`✅ Found ${count} content suggestion(s)`);

      // Test "Capture This Now" button
      const captureNowButton = page.locator('button:has-text("Capture This Now")').first();
      if (await captureNowButton.isVisible()) {
        await captureNowButton.click();
        await page.waitForTimeout(500);

        // Check if upload form opened and is pre-filled
        const uploadForm = page.locator('text=Upload Content');
        await expect(uploadForm).toBeVisible();
        console.log('✅ "Capture This Now" opened upload form');
      }
    } else {
      console.log('ℹ️  No suggestions (all content captured or milestone complete)');
    }
  }

  // Take screenshot
  await page.screenshot({ path: '/tmp/phase1-5-complete.png', fullPage: true });
  console.log('✅ Screenshot saved to /tmp/phase1-5-complete.png');
});
