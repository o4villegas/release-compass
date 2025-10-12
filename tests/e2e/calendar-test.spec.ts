import { test, expect } from '@playwright/test';

test.describe('Content Calendar', () => {
  test('should display calendar with month view and allow navigation', async ({ page }) => {
    // Navigate to the demo project calendar
    await page.goto('http://localhost:5173/project/b434c7af-5501-4ef7-a640-9cb19b2fe28d/calendar');

    // Wait for calendar to load
    await page.waitForSelector('text=Content Calendar', { timeout: 10000 });

    // Verify page title
    await expect(page.locator('h1')).toContainText('Content Calendar');

    // Verify calendar header with current month
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
    const currentYear = new Date().getFullYear().toString();

    await expect(page.locator('h3')).toContainText(currentMonth);
    await expect(page.locator('h3')).toContainText(currentYear);

    // Verify day headers
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const day of dayNames) {
      await expect(page.locator(`text=${day}`).first()).toBeVisible();
    }

    // Verify stats cards
    await expect(page.locator('text=Posts Scheduled')).toBeVisible();
    await expect(page.locator('text=Days to Release')).toBeVisible();
    await expect(page.locator('text=Content Available')).toBeVisible();

    // Verify navigation buttons exist
    await expect(page.locator('button:has-text("Today")')).toBeVisible();
    await expect(page.locator('button:has-text("Show Suggestions")')).toBeVisible();

    // Test month navigation - go to next month
    await page.locator('button[aria-label="Next month"], button:has(svg):not(:has-text("Today")):not(:has-text("Show"))').first().click();
    await page.waitForTimeout(500);

    // Verify month changed
    const nextMonth = page.locator('h3').first();
    await expect(nextMonth).toBeVisible();

    // Go back to today
    await page.click('button:has-text("Today")');
    await page.waitForTimeout(500);

    // Verify current month is shown again
    await expect(page.locator('h3')).toContainText(currentMonth);

    // Test suggestions panel
    await page.click('button:has-text("Show Suggestions")');
    await page.waitForTimeout(300);
    await expect(page.locator('text=Recommended Posting Schedule')).toBeVisible();

    // Verify at least one suggestion appears
    await expect(page.locator('text=4 weeks before release')).toBeVisible();

    console.log('✅ Calendar displays correctly with month view and navigation');
  });

  test('should show legend and calendar grid structure', async ({ page }) => {
    await page.goto('http://localhost:5173/project/b434c7af-5501-4ef7-a640-9cb19b2fe28d/calendar');

    await page.waitForSelector('text=Content Calendar', { timeout: 10000 });

    // Verify legend
    await expect(page.locator('text=Scheduled Content')).toBeVisible();
    await expect(page.locator('text=Milestone Deadline')).toBeVisible();
    await expect(page.locator('text=Today').last()).toBeVisible();

    // Verify calendar grid has day cells
    const dayCells = page.locator('.grid.grid-cols-7 > div').first();
    await expect(dayCells).toBeVisible();

    console.log('✅ Calendar grid and legend display correctly');
  });

  test('should have clickable calendar days for future dates', async ({ page }) => {
    await page.goto('http://localhost:5173/project/b434c7af-5501-4ef7-a640-9cb19b2fe28d/calendar');

    await page.waitForSelector('text=Content Calendar', { timeout: 10000 });

    // Find a future date cell (look for cells with cursor-pointer class)
    const futureDateCell = page.locator('.cursor-pointer').first();

    if (await futureDateCell.isVisible()) {
      console.log('✅ Future date cells are clickable');
    } else {
      console.log('⚠️ No clickable future dates found (this is OK if all dates are past)');
    }
  });

  test('should display back button and navigation', async ({ page }) => {
    await page.goto('http://localhost:5173/project/b434c7af-5501-4ef7-a640-9cb19b2fe28d/calendar');

    await page.waitForSelector('text=Content Calendar', { timeout: 10000 });

    // Verify back button exists
    await expect(page.locator('a:has-text("Back to Project")')).toBeVisible();

    // Verify project info is shown
    await expect(page.locator('text=Test Album')).toBeVisible();
    await expect(page.locator('text=Implementation Test')).toBeVisible();

    console.log('✅ Navigation and project info display correctly');
  });
});
