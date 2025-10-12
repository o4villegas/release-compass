import { test } from '@playwright/test';

test('Budget Pie Chart Visualization', async ({ page }) => {
  // Navigate to budget page
  await page.goto('http://localhost:5174/project/b434c7af-5501-4ef7-a640-9cb19b2fe28d/budget');
  await page.waitForTimeout(3000); // Wait for chart animation and data load

  // Take full page screenshot
  await page.screenshot({ path: '/tmp/budget-pie-chart.png', fullPage: true });
  console.log('✅ Budget pie chart screenshot saved');
});
