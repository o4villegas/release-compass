import { test, expect } from '@playwright/test';

test.describe('Form Comparison Test', () => {
  test('should test both simple and schedule form dialogs', async ({ page }) => {
    // Capture alerts
    const alerts: string[] = [];
    page.on('dialog', async dialog => {
      alerts.push(dialog.message());
      console.log('ALERT:', dialog.message());
      await dialog.accept();
    });

    // Capture console
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(`[${msg.type()}] ${text}`);
      if (text.includes('FORM SUBMIT') || text.includes('===')) {
        console.log(text);
      }
    });

    // Go to home page
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('text=Open Test Dialog', { timeout: 10000 });

    console.log('\n=== TEST 1: Simple Form Dialog ===');
    await page.click('button:has-text("Open Test Dialog")');
    await page.waitForTimeout(500);
    await page.locator('input[placeholder="Type something..."]').fill('simple test');
    await page.click('button:has-text("Submit Form")');
    await page.waitForTimeout(1000);

    const simpleFormWorked = alerts.some(a => a.includes('Form submitted'));
    console.log('Simple form worked:', simpleFormWorked);
    console.log('Simple form console:', consoleMessages.filter(m => m.includes('FORM SUBMIT')));

    // Close the dialog explicitly by pressing Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // Verify first dialog is closed
    await expect(page.getByRole('heading', { name: 'Test Simple Form' })).not.toBeVisible();

    // Clear for next test
    alerts.length = 0;

    console.log('\n=== TEST 2: Schedule Form Dialog (replicating ScheduleContentDialog) ===');
    await page.click('button:has-text("Open Test Schedule Dialog")');
    await page.waitForTimeout(500);

    // Verify dialog opened
    await expect(page.getByRole('heading', { name: 'Test Schedule Form' })).toBeVisible();

    // Fill the form
    await page.locator('input#test-platforms').fill('instagram,tiktok');
    await page.waitForTimeout(300);

    console.log('About to click Schedule Content button...');

    // Click submit
    await page.click('button:has-text("Schedule Content")');
    await page.waitForTimeout(2000);

    const scheduleFormWorked = alerts.some(a => a.includes('Form submitted successfully'));
    const submitLogs = consoleMessages.filter(m => m.includes('TEST FORM SUBMIT'));

    console.log('Schedule form worked:', scheduleFormWorked);
    console.log('Schedule form console:', submitLogs);

    console.log('\n=== VERDICT ===');
    console.log('Simple form:', simpleFormWorked ? '✅ WORKS' : '❌ BROKEN');
    console.log('Schedule form:', scheduleFormWorked ? '✅ WORKS' : '❌ BROKEN');

    if (!scheduleFormWorked) {
      console.log('\n🔍 INVESTIGATION:');
      console.log('If schedule form is broken, the issue is in our test component structure');
      console.log('If schedule form works, the issue is specific to the real ScheduleContentDialog');
    }

    // Test should pass if schedule form works
    expect(scheduleFormWorked).toBe(true);
  });
});
