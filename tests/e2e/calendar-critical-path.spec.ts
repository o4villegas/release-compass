import { test, expect } from '@playwright/test';

test.describe('Content Calendar - Critical Path', () => {
  test('should complete the full scheduling flow', async ({ page }) => {
    // Navigate to calendar
    await page.goto('http://localhost:5173/project/b434c7af-5501-4ef7-a640-9cb19b2fe28d/calendar');

    // Wait for calendar to load
    await expect(page.getByRole('heading', { name: 'Content Calendar' })).toBeVisible({ timeout: 10000 });
    console.log('✅ Calendar loaded');

    // Find and click a future date (first clickable date in current month)
    const futureDate = page.locator('.cursor-pointer').filter({ hasNot: page.locator('.opacity-40') }).first();
    await futureDate.click();
    console.log('✅ Clicked future date');

    // STEP 1: ContentPickerDialog should open
    await expect(page.getByRole('heading', { name: 'Select Content to Schedule' })).toBeVisible({ timeout: 5000 });
    console.log('✅ ContentPickerDialog opened');

    // STEP 2: Select first content item
    const firstContent = page.locator('button[type="button"]').filter({ hasText: /photo|video|voice|live/i }).first();
    await firstContent.click();
    console.log('✅ Content item selected');

    // STEP 3: Click Continue to Schedule
    await page.getByRole('button', { name: 'Continue to Schedule' }).click();
    console.log('✅ Clicked Continue to Schedule');

    // STEP 4: ScheduleContentDialog should open
    await expect(page.getByRole('heading', { name: /Schedule Content for Posting/i })).toBeVisible({ timeout: 5000 });
    console.log('✅ ScheduleContentDialog opened');

    // STEP 5: Fill in the form
    await page.locator('input#platforms').fill('Instagram, TikTok');
    await page.locator('textarea#notes').fill('Test scheduling from automated test');
    console.log('✅ Form filled');

    // STEP 6: Submit the form
    const submitButton = page.getByRole('button', { name: 'Schedule Content' });
    await submitButton.click();
    console.log('✅ Submit button clicked');

    // STEP 7: Wait for success (either dialog closes or success message appears)
    await Promise.race([
      // Option 1: Dialog closes
      page.getByRole('heading', { name: /Schedule Content for Posting/i }).waitFor({ state: 'hidden', timeout: 5000 }),
      // Option 2: Success alert appears
      page.getByText(/scheduled successfully/i).waitFor({ state: 'visible', timeout: 5000 })
    ]);
    console.log('✅ Form submitted successfully');

    // STEP 8: Verify success message is visible
    await expect(page.getByText(/scheduled successfully/i)).toBeVisible({ timeout: 2000 });
    console.log('✅ Success message displayed');

    console.log('\n🎉 CRITICAL PATH TEST PASSED - Full scheduling flow works!');
  });
});
