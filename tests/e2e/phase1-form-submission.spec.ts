import { test, expect } from '@playwright/test';

/**
 * Phase 1: Critical Form Submission Test
 * Verifies the multi-column form still submits correctly
 */

test('Create project form submission works with multi-column layout', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/create-project');

  // Wait for form to load
  await page.waitForSelector('#artist_name');

  // Fill out all required fields
  await page.locator('#artist_name').fill('Test Artist Phase 1');
  await page.locator('#release_title').fill('Test Release Phase 1');

  // Set release date to 30 days from now
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const dateString = futureDate.toISOString().split('T')[0];
  await page.locator('#release_date').fill(dateString);

  // Select release type using keyboard (more reliable)
  const selectTrigger = page.locator('button[role="combobox"]');
  await selectTrigger.click();

  // Wait a moment for dropdown to open
  await page.waitForTimeout(300);

  // Press down arrow and enter to select first option
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  // Fill budget
  await page.locator('#total_budget').fill('50000');

  // Wait a moment to ensure all state is updated
  await page.waitForTimeout(200);

  // Submit form
  const submitButton = page.locator('button:has-text("Create Project")');
  await submitButton.click();

  // Wait for navigation with generous timeout
  try {
    await page.waitForURL(/\/project\/.+/, { timeout: 15000 });

    // Verify we landed on a project page
    expect(page.url()).toMatch(/\/project\/.+/);

    // Verify the project page loaded
    await page.waitForSelector('h1', { timeout: 5000 });

  } catch (error) {
    // If navigation failed, capture the current state
    const currentUrl = page.url();
    const pageContent = await page.content();

    console.log('Navigation failed. Current URL:', currentUrl);
    console.log('Page contains error:', pageContent.includes('error'));

    throw error;
  }
});
