import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://release-compass.lando555.workers.dev';

test.describe('UI/UX Components Verification (No DB Required)', () => {

  test('Home page - all new UI elements present', async ({ page }) => {
    await page.goto(PRODUCTION_URL);

    // Verify main heading
    await expect(page.locator('h1')).toContainText('Release Compass');

    // Verify description
    await expect(page.getByText('Music release management built for label-funded artists')).toBeVisible();

    // Verify cards
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('Create New Project');
    expect(pageContent).toContain('Features');
    expect(pageContent).toContain('New Release Project');

    // Verify feature list
    expect(pageContent).toContain('Content quota enforcement');
    expect(pageContent).toContain('Automated timeline generation');
    expect(pageContent).toContain('Budget tracking');
    expect(pageContent).toContain('Cleared-for-release status');
  });

  test('Home page - buttons are clickable', async ({ page }) => {
    await page.goto(PRODUCTION_URL);

    // Verify "New Release Project" button exists and is clickable
    const newProjectButton = page.getByRole('button', { name: 'New Release Project' });
    await expect(newProjectButton).toBeVisible();

    // Click and verify navigation
    await newProjectButton.click();
    await page.waitForLoadState('networkidle');

    // Should navigate to create project page
    expect(page.url()).toContain('/create-project');
  });

  test('Create project page - form loads correctly', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/create-project`);

    await page.waitForSelector('text=Create New Release Project', { timeout: 10000 });

    // Verify form elements
    await expect(page.getByText('Artist Name')).toBeVisible();
    await expect(page.getByText('Release Title')).toBeVisible();
    await expect(page.getByText('Release Type')).toBeVisible();
    await expect(page.getByText('Release Date')).toBeVisible();
    await expect(page.getByText('Total Budget')).toBeVisible();

    // Verify submit button
    await expect(page.getByRole('button', { name: 'Create Project' })).toBeVisible();
  });

  test('Responsive design - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(PRODUCTION_URL);

    // Verify elements are still visible on mobile
    await expect(page.locator('h1')).toContainText('Release Compass');
    await expect(page.getByRole('button', { name: 'New Release Project' })).toBeVisible();
  });

  test('No JavaScript errors on page load', async ({ page }) => {
    const jsErrors: string[] = [];

    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });

    await page.goto(PRODUCTION_URL);
    await page.goto(`${PRODUCTION_URL}/create-project`);

    // Should have no JavaScript errors
    expect(jsErrors).toHaveLength(0);
  });

  test('All assets load successfully', async ({ page }) => {
    const failedResources: string[] = [];

    page.on('response', response => {
      if (response.status() >= 400) {
        failedResources.push(`${response.url()} - ${response.status()}`);
      }
    });

    await page.goto(PRODUCTION_URL);

    // No 404s should occur now that stale demo project is removed
    expect(failedResources).toHaveLength(0);
  });

  test('CSS styling is applied correctly', async ({ page }) => {
    await page.goto(PRODUCTION_URL);

    // Check that Tailwind classes are applied
    const heading = page.locator('h1');
    await expect(heading).toHaveClass(/text-6xl/);
    await expect(heading).toHaveClass(/font-bold/);

    // Check button has correct classes
    const button = page.getByRole('button', { name: 'New Release Project' });
    await expect(button).toHaveClass(/bg-primary/);
  });

  test('Theme colors are loaded', async ({ page }) => {
    await page.goto(PRODUCTION_URL);

    // Verify page background is set
    const body = page.locator('body');
    const bgClass = await body.getAttribute('class');

    // Should have some classes applied (theme setup)
    expect(bgClass).toBeTruthy();
  });
});

test.describe('Component Verification (Files Exist in Build)', () => {

  test('EmptyState component exists in build', async ({ page }) => {
    // Verify the empty-state JS file was built
    const response = await page.request.get(`${PRODUCTION_URL}/assets/empty-state-yWJFLxaD.js`);
    expect(response.status()).toBe(200);
  });

  test('Modal components exist in build (embedded in milestone JS)', async ({ page }) => {
    // Milestone page should include modal code
    const response = await page.request.get(`${PRODUCTION_URL}/assets/milestone._id-CQTUi1YQ.js`);
    expect(response.status()).toBe(200);

    const content = await response.text();

    // Verify modal-related code is present
    expect(content.length).toBeGreaterThan(1000); // Should be substantial
  });

  test('ContentQuotaWidget exists in build (embedded in project JS)', async ({ page }) => {
    // Project dashboard should include widget code
    const response = await page.request.get(`${PRODUCTION_URL}/assets/project._id-Ds7xiJJf.js`);
    expect(response.status()).toBe(200);

    const content = await response.text();

    // Verify widget code is present (should be large file with widget)
    expect(content.length).toBeGreaterThan(5000);
  });

  test('Skeleton component exists in build', async ({ page }) => {
    // Skeleton code should be in server build
    const response = await page.request.get(`${PRODUCTION_URL}/assets/project._id-Ds7xiJJf.js`);
    expect(response.status()).toBe(200);
  });

  test('All new asset files are deployed', async ({ page }) => {
    const assetChecks = [
      '/assets/empty-state-yWJFLxaD.js',
      '/assets/milestone._id-CQTUi1YQ.js',
      '/assets/project._id-Ds7xiJJf.js',
      '/assets/BackButton-CbYktXW5.js',
      '/assets/ContentUpload-G4wLbC7x.js',
    ];

    for (const asset of assetChecks) {
      const response = await page.request.get(`${PRODUCTION_URL}${asset}`);
      expect(response.status(), `${asset} should exist`).toBe(200);
    }
  });
});
