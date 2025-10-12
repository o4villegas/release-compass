import { test, expect } from '@playwright/test';

test.describe('Form in Dialog Test', () => {
  test('should verify if form submission works in Radix Dialog', async ({ page }) => {
    // Capture alerts
    const alerts: string[] = [];
    page.on('dialog', async dialog => {
      alerts.push(dialog.message());
      await dialog.accept();
    });

    // Capture console
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Go to home page
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('text=Open Test Dialog', { timeout: 10000 });

    // Open the test dialog
    await page.click('button:has-text("Open Test Dialog")');
    await page.waitForTimeout(500);

    // Verify dialog is open
    await expect(page.getByRole('heading', { name: 'Form Test' })).toBeVisible();
    console.log('✅ Dialog opened');

    // Type in the input
    await page.locator('input[placeholder="Type something..."]').fill('test value 123');
    await page.waitForTimeout(300);
    console.log('✅ Input filled');

    // Test 1: Try clicking the submit button (type="submit")
    console.log('\n=== TEST 1: Submit button (type="submit") ===');
    await page.click('button:has-text("Submit Form")');
    await page.waitForTimeout(1000);

    const submitAlerts = alerts.filter(a => a.includes('Form submitted'));
    const submitConsole = consoleMessages.filter(m => m.includes('FORM SUBMIT FIRED'));

    console.log('Submit button alerts:', submitAlerts);
    console.log('Submit button console:', submitConsole);

    if (submitAlerts.length > 0) {
      console.log('✅ FORM SUBMISSION WORKS IN DIALOG!');
    } else {
      console.log('❌ Form submission did NOT work');
    }

    // Clear for next test
    alerts.length = 0;

    // Test 2: Try clicking the onClick button
    console.log('\n=== TEST 2: onClick button (type="button") ===');
    await page.click('button:has-text("Click Button")');
    await page.waitForTimeout(1000);

    const clickAlerts = alerts.filter(a => a.includes('Button clicked'));
    const clickConsole = consoleMessages.filter(m => m.includes('BUTTON CLICK FIRED'));

    console.log('onClick button alerts:', clickAlerts);
    console.log('onClick button console:', clickConsole);

    if (clickAlerts.length > 0) {
      console.log('✅ onClick WORKS IN DIALOG');
    } else {
      console.log('❌ onClick did NOT work');
    }

    // Final verdict
    console.log('\n=== VERDICT ===');
    if (submitAlerts.length > 0) {
      console.log('FORMS DO WORK IN DIALOGS - Something else is wrong with ScheduleContentDialog');
    } else {
      console.log('FORMS DO NOT WORK IN DIALOGS - Must use onClick pattern');
    }

    // Test should pass if either method works
    expect(submitAlerts.length + clickAlerts.length).toBeGreaterThan(0);
  });
});
