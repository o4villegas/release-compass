import { test, expect } from '@playwright/test';

test.describe('Content Calendar - Debug Investigation', () => {
  test('should investigate why form is not submitting', async ({ page }) => {
    // Capture console messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Capture JavaScript errors
    const pageErrors: string[] = [];
    page.on('pageerror', error => {
      pageErrors.push(`PAGE ERROR: ${error.message}`);
    });

    // Capture network requests
    const apiRequests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiRequests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postDataJSON()
        });
      }
    });

    // Capture network responses
    const apiResponses: any[] = [];
    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        const body = await response.text().catch(() => 'Could not read body');
        apiResponses.push({
          url: response.url(),
          status: response.status(),
          body: body.substring(0, 200)
        });
      }
    });

    // Navigate to the calendar
    await page.goto('http://localhost:5173/project/b434c7af-5501-4ef7-a640-9cb19b2fe28d/calendar');
    await page.waitForSelector('text=Content Calendar', { timeout: 10000 });

    console.log('=== STEP 1: Calendar loaded ===');

    // Click a future date
    const futureDateCell = page.locator('.cursor-pointer').first();
    await futureDateCell.click();
    await page.waitForTimeout(500);

    console.log('=== STEP 2: Date clicked ===');
    console.log('Console messages so far:', consoleMessages);
    console.log('Page errors so far:', pageErrors);

    // Select content
    const contentItems = page.locator('[role="dialog"] button[type="button"]').filter({ hasText: /photo|video|voice|live/i });
    await contentItems.first().click();
    await page.waitForTimeout(300);

    console.log('=== STEP 3: Content selected ===');

    // Click Continue to Schedule
    await page.locator('button:has-text("Continue to Schedule")').click();
    await page.waitForTimeout(500);

    console.log('=== STEP 4: Continue clicked ===');
    console.log('Console messages:', consoleMessages);
    console.log('Page errors:', pageErrors);

    // Fill in the form
    await page.locator('input#platforms').fill('instagram,tiktok');
    await page.locator('textarea#notes').fill('Debug test');
    await page.waitForTimeout(300);

    console.log('=== STEP 5: Form filled ===');

    // Check if button is enabled
    const submitButton = page.locator('button:has-text("Schedule Content")');
    const isDisabled = await submitButton.getAttribute('disabled');
    console.log('Submit button disabled:', isDisabled);

    // Check if form element exists
    const form = page.locator('form');
    const formExists = await form.count();
    console.log('Number of forms found:', formExists);

    // Try to get form's onSubmit attribute
    if (formExists > 0) {
      const formHtml = await form.first().evaluate(el => el.outerHTML.substring(0, 200));
      console.log('Form HTML:', formHtml);
    }

    // Wait for form to be fully ready
    await page.waitForTimeout(1000);

    // Try pressing Enter in the date field to submit the form
    console.log('=== STEP 6a: Pressing Enter in date field ===');
    await page.locator('input#scheduled-date').press('Enter');
    await page.waitForTimeout(2000);

    console.log('Console after Enter press:', consoleMessages);

    // If that didn't work, try clicking the submit button
    console.log('=== STEP 6b: Clicking submit button ===');
    await submitButton.click();
    await page.waitForTimeout(3000); // Wait longer for any async operations

    console.log('=== STEP 7: After button click ===');
    console.log('Console messages:', consoleMessages);
    console.log('Page errors:', pageErrors);
    console.log('API requests made:', apiRequests);
    console.log('API responses received:', apiResponses);

    // Check if dialog is still open
    const dialogStillOpen = await page.getByRole('heading', { name: /Schedule Content for Posting/i }).isVisible();
    console.log('Dialog still open after submit:', dialogStillOpen);

    // Check if success alert appeared
    const successAlertVisible = await page.locator('text=Content scheduled successfully').isVisible().catch(() => false);
    console.log('Success alert visible:', successAlertVisible);

    // Check if error alert appeared
    const errorAlertVisible = await page.locator('[role="alert"]').filter({ hasText: /error|failed/i }).isVisible().catch(() => false);
    console.log('Error alert visible:', errorAlertVisible);

    // Get current page HTML structure around dialogs
    const dialogContent = await page.locator('[role="dialog"]').first().evaluate(el => {
      return {
        visible: el.offsetParent !== null,
        innerHTML: el.innerHTML.substring(0, 500)
      };
    }).catch(() => ({ visible: false, innerHTML: 'Could not read' }));
    console.log('Dialog state:', dialogContent);

    // Final summary
    console.log('\n=== INVESTIGATION SUMMARY ===');
    console.log('Total console messages:', consoleMessages.length);
    console.log('Total page errors:', pageErrors.length);
    console.log('Total API requests:', apiRequests.length);
    console.log('Total API responses:', apiResponses.length);
    console.log('Form submitted successfully:', !dialogStillOpen && (successAlertVisible || apiRequests.length > 0));

    // Fail the test with detailed info
    if (dialogStillOpen && apiRequests.length === 0) {
      throw new Error(`
        FORM DID NOT SUBMIT
        - Dialog still open: ${dialogStillOpen}
        - API requests made: ${apiRequests.length}
        - Console messages: ${consoleMessages.join(', ')}
        - Page errors: ${pageErrors.join(', ')}
        - Submit button was disabled: ${isDisabled}
      `);
    }
  });
});
