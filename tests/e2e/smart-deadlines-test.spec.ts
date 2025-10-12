import { test } from '@playwright/test';

test('Smart Deadlines Visualization', async ({ page }) => {
  // Navigate to project page with smart deadlines
  await page.goto('http://localhost:5174/project/b434c7af-5501-4ef7-a640-9cb19b2fe28d');
  await page.waitForTimeout(3000); // Wait for data load and animations

  // Scroll to smart deadlines section
  await page.evaluate(() => {
    const smartDeadlinesSection = document.querySelector('h3')?.parentElement;
    if (smartDeadlinesSection) {
      smartDeadlinesSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
  await page.waitForTimeout(1000);

  // Take full page screenshot
  await page.screenshot({ path: '/tmp/smart-deadlines.png', fullPage: true });
  console.log('✅ Smart deadlines screenshot saved');
});
